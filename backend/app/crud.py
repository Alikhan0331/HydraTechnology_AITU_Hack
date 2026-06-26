"""Query / mutation helpers for HydraulicStructure."""
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from . import models, schemas
from .enums import STRUCTURE_TYPES, TYPE_NAME_TO_CODE
from .services import classification, risk_score


def _accidents(db: Session, structure_id: int) -> int:
    """Accidents = emergency inspections + emergency repairs (drives Risk Score)."""
    return (db.scalar(select(func.count()).select_from(models.Inspection).where(
        models.Inspection.structure_id == structure_id,
        models.Inspection.inspection_type == "Аварийный")) or 0) + (
        db.scalar(select(func.count()).select_from(models.Repair).where(
        models.Repair.structure_id == structure_id,
        models.Repair.repair_type == "Аварийный ремонт")) or 0)


# --------------------------------------------------------------------------- #
#  Reads
# --------------------------------------------------------------------------- #
def _apply_filters(stmt, *, type=None, condition=None, district=None,
                   risk_level=None, q=None, year_min=None, year_max=None,
                   significance=None):
    if type and type not in ("Все", "all"):
        code = TYPE_NAME_TO_CODE.get(type, type)
        stmt = stmt.where(
            or_(models.HydraulicStructure.type_code == code,
                models.HydraulicStructure.type == type)
        )
    if condition and condition not in ("Все", "all"):
        stmt = stmt.where(models.HydraulicStructure.condition == condition)
    if district and district not in ("Все", "all"):
        stmt = stmt.where(models.HydraulicStructure.district == district)
    if risk_level and risk_level not in ("Все", "all"):
        stmt = stmt.where(models.HydraulicStructure.risk_level == risk_level)
    if significance:
        stmt = stmt.where(models.HydraulicStructure.significance == significance)
    if year_min is not None:
        stmt = stmt.where(models.HydraulicStructure.year_built >= year_min)
    if year_max is not None:
        stmt = stmt.where(models.HydraulicStructure.year_built <= year_max)
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(models.HydraulicStructure.name).like(like),
                func.lower(models.HydraulicStructure.district).like(like),
                func.lower(func.coalesce(models.HydraulicStructure.locality, "")).like(like),
            )
        )
    return stmt


def list_structures(db: Session, *, limit=2000, offset=0, sort="id", **filters):
    stmt = _apply_filters(select(models.HydraulicStructure), **filters)
    sort_col = {
        "id": models.HydraulicStructure.id,
        "name": models.HydraulicStructure.name,
        "risk": models.HydraulicStructure.risk_score,
        "year": models.HydraulicStructure.year_built,
    }.get(sort, models.HydraulicStructure.id)
    if sort == "risk":
        stmt = stmt.order_by(sort_col.desc().nullslast())
    else:
        stmt = stmt.order_by(sort_col)
    stmt = stmt.limit(limit).offset(offset)
    return list(db.scalars(stmt))


def get_structure(db: Session, structure_id: int):
    return db.get(models.HydraulicStructure, structure_id)


# --------------------------------------------------------------------------- #
#  Writes
# --------------------------------------------------------------------------- #
def _resolve_type(type_value: str | None) -> tuple[str, str]:
    """Return (ru_name, code) accepting either a RU name or a machine code."""
    if not type_value:
        return STRUCTURE_TYPES["other"][0], "other"
    if type_value in STRUCTURE_TYPES:                       # given a code
        return STRUCTURE_TYPES[type_value][0], type_value
    if type_value in TYPE_NAME_TO_CODE:                     # given a RU name
        return type_value, TYPE_NAME_TO_CODE[type_value]
    return type_value, "other"


def create_structure(db: Session, data: schemas.StructureCreate,
                     source: str = "manual", verification_status: str = "verified"):
    ru_name, code = _resolve_type(data.type)

    # model stores wear as a percent (30.0); services expect a fraction (0.30)
    wear_fraction = (data.wear_percent / 100) if data.wear_percent else None
    condition = data.condition or classification.derive_condition(
        None, data.year_built, wear_fraction, None, None
    )
    # single risk model (expert Risk Score); new object has no accident history yet
    sf = risk_score.storage_fields(
        condition=condition, year_built=data.year_built,
        last_inspection=data.last_inspection, accident_count=0, type_code=code,
    )
    risk_level = data.risk_level or sf["risk_level"]

    obj = models.HydraulicStructure(
        name=data.name, type=ru_name, type_code=code, district=data.district,
        latitude=data.latitude, longitude=data.longitude,
        condition=condition, risk_level=risk_level, risk_score=sf["risk_score"],
        length_km=data.length_km, year_built=data.year_built,
        last_inspection=data.last_inspection, next_inspection=sf["next_inspection"],
        description=data.description, water_source=data.water_source,
        significance=data.significance or "local",
        capacity=data.capacity, wear_percent=data.wear_percent,
        source=source, verification_status=verification_status,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    _log_risk(db, obj, sf["evaluation"])
    return obj


def update_structure(db: Session, structure_id: int, data: schemas.StructureUpdate):
    obj = db.get(models.HydraulicStructure, structure_id)
    if not obj:
        return None
    payload = data.model_dump(exclude_unset=True)
    if "type" in payload:
        payload["type"], payload["type_code"] = _resolve_type(payload["type"])
    for key, value in payload.items():
        setattr(obj, key, value)

    # Recompute derived risk whenever a risk-relevant field changed.
    if {"year_built", "condition", "last_inspection"} & set(payload):
        sf = risk_score.storage_fields(
            condition=obj.condition, year_built=obj.year_built,
            last_inspection=obj.last_inspection,
            accident_count=_accidents(db, obj.id), type_code=obj.type_code,
        )
        if "risk_level" not in payload:
            obj.risk_level = sf["risk_level"]
        obj.risk_score = sf["risk_score"]
        obj.next_inspection = sf["next_inspection"]
        db.commit()
        _log_risk(db, obj, sf["evaluation"])
    else:
        db.commit()
    db.refresh(obj)
    return obj


def delete_structure(db: Session, structure_id: int) -> bool:
    obj = db.get(models.HydraulicStructure, structure_id)
    if not obj:
        return False
    db.delete(obj)
    db.commit()
    return True


def recompute_risk(db: Session, obj: models.HydraulicStructure):
    sf = risk_score.storage_fields(
        condition=obj.condition, year_built=obj.year_built,
        last_inspection=obj.last_inspection,
        accident_count=_accidents(db, obj.id), type_code=obj.type_code,
    )
    obj.risk_level = sf["risk_level"]
    obj.risk_score = sf["risk_score"]
    obj.next_inspection = sf["next_inspection"]
    db.commit()
    _log_risk(db, obj, sf["evaluation"])
    return sf["evaluation"]


def _log_risk(db: Session, obj: models.HydraulicStructure, evaluation: dict):
    db.add(models.RiskAssessment(
        structure_id=obj.id, risk_level=evaluation["risk_level"],
        score=evaluation["risk_score"], factors=evaluation["breakdown"],
        recommendation="; ".join(evaluation["risk_reasons"]),
    ))
    db.commit()
