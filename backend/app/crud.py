"""Query / mutation helpers for HydraulicStructure."""
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from . import models, schemas
from .enums import STRUCTURE_TYPES, TYPE_NAME_TO_CODE
from .services import classification, risk_engine


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


def create_structure(db: Session, data: schemas.StructureCreate):
    ru_name, code = _resolve_type(data.type)

    # model stores wear as a percent (30.0); services expect a fraction (0.30)
    wear_fraction = (data.wear_percent / 100) if data.wear_percent else None
    condition = data.condition or classification.derive_condition(
        None, data.year_built, wear_fraction, None, None
    )
    risk = risk_engine.compute_risk(
        year_built=data.year_built,
        condition=condition,
        wear_fraction=wear_fraction,
        last_inspection=data.last_inspection,
        significance=data.significance,
    )
    risk_level = data.risk_level or risk["risk_level"]
    nxt = risk_engine.next_inspection_date(data.last_inspection, risk["interval_days"])

    obj = models.HydraulicStructure(
        name=data.name, type=ru_name, type_code=code, district=data.district,
        latitude=data.latitude, longitude=data.longitude,
        condition=condition, risk_level=risk_level, risk_score=risk["score"],
        length_km=data.length_km, year_built=data.year_built,
        last_inspection=data.last_inspection, next_inspection=nxt,
        description=data.description, water_source=data.water_source,
        significance=data.significance or "local",
        capacity=data.capacity, wear_percent=data.wear_percent,
        source="manual", verification_status="verified",
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    _log_risk(db, obj, risk)
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
    if {"year_built", "condition", "wear_percent", "last_inspection",
        "significance"} & set(payload):
        risk = risk_engine.compute_risk(
            year_built=obj.year_built, condition=obj.condition,
            wear_fraction=(obj.wear_percent / 100) if obj.wear_percent else None,
            eff_design=obj.efficiency_design,
            eff_actual=obj.efficiency_actual, last_inspection=obj.last_inspection,
            significance=obj.significance,
        )
        if "risk_level" not in payload:
            obj.risk_level = risk["risk_level"]
        obj.risk_score = risk["score"]
        obj.next_inspection = risk_engine.next_inspection_date(
            obj.last_inspection, risk["interval_days"]
        )
        db.commit()
        _log_risk(db, obj, risk)
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
    risk = risk_engine.compute_risk(
        year_built=obj.year_built, condition=obj.condition,
        wear_fraction=(obj.wear_percent / 100) if obj.wear_percent else None,
        eff_design=obj.efficiency_design,
        eff_actual=obj.efficiency_actual, last_inspection=obj.last_inspection,
        significance=obj.significance,
    )
    obj.risk_level = risk["risk_level"]
    obj.risk_score = risk["score"]
    obj.next_inspection = risk_engine.next_inspection_date(
        obj.last_inspection, risk["interval_days"]
    )
    db.commit()
    _log_risk(db, obj, risk)
    return risk


def _log_risk(db: Session, obj: models.HydraulicStructure, risk: dict):
    db.add(models.RiskAssessment(
        structure_id=obj.id, risk_level=risk["risk_level"], score=risk["score"],
        factors=risk["factors"], recommendation=risk["recommendation"],
    ))
    db.commit()
