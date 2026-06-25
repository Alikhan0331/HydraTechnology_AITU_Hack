"""/api/structures — catalog CRUD, filtering, map data, risk, inspections."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import crud, models, schemas
from ..database import get_db
from ..services import priority, risk_engine

router = APIRouter(prefix="/api/structures", tags=["structures"])


@router.get("", response_model=list[schemas.StructureRead])
def list_structures(
    db: Session = Depends(get_db),
    type: str | None = Query(None, description="RU name or code, e.g. 'Канал' / 'canal'"),
    condition: str | None = Query(None, description="good|monitoring|requires_repair|emergency"),
    district: str | None = None,
    risk_level: str | None = Query(None, description="low|medium|high|critical"),
    significance: str | None = None,
    q: str | None = Query(None, description="search by name / district / locality"),
    year_min: int | None = None,
    year_max: int | None = None,
    sort: str = Query("id", description="id|name|risk|year"),
    limit: int = 2000,
    offset: int = 0,
):
    return crud.list_structures(
        db, type=type, condition=condition, district=district,
        risk_level=risk_level, significance=significance, q=q,
        year_min=year_min, year_max=year_max, sort=sort,
        limit=limit, offset=offset,
    )


@router.get("/map", response_model=list[schemas.StructureMapItem])
def map_data(
    db: Session = Depends(get_db),
    type: str | None = None,
    condition: str | None = None,
    district: str | None = None,
    risk_level: str | None = None,
):
    return crud.list_structures(
        db, type=type, condition=condition, district=district,
        risk_level=risk_level, limit=10000,
    )


@router.get("/{structure_id}", response_model=schemas.StructureDetail)
def get_structure(structure_id: int, db: Session = Depends(get_db)):
    obj = crud.get_structure(db, structure_id)
    if not obj:
        raise HTTPException(404, "Structure not found")
    # Build base fields from the ORM object, then attach inspection history in
    # the exact shape the object card expects (mapping notes→result, etc.).
    base = schemas.StructureRead.model_validate(obj).model_dump()
    inspections = [
        schemas.InspectionPublic(
            date=i.date, inspector=i.inspector,
            result=i.notes, condition=i.condition_found,
        )
        for i in sorted(obj.inspections, key=lambda x: x.date, reverse=True)
    ]
    return schemas.StructureDetail(**base, inspections=inspections)


@router.post("", response_model=schemas.StructureRead, status_code=201)
def create_structure(data: schemas.StructureCreate, db: Session = Depends(get_db)):
    return crud.create_structure(db, data)


@router.put("/{structure_id}", response_model=schemas.StructureRead)
def update_structure(structure_id: int, data: schemas.StructureUpdate,
                     db: Session = Depends(get_db)):
    obj = crud.update_structure(db, structure_id, data)
    if not obj:
        raise HTTPException(404, "Structure not found")
    return obj


@router.delete("/{structure_id}", status_code=204)
def delete_structure(structure_id: int, db: Session = Depends(get_db)):
    if not crud.delete_structure(db, structure_id):
        raise HTTPException(404, "Structure not found")


# --- Risk (TZ tasks 5 & 6) ----------------------------------------------------
@router.get("/{structure_id}/risk", response_model=schemas.RiskAssessmentRead)
def get_risk(structure_id: int, db: Session = Depends(get_db)):
    obj = crud.get_structure(db, structure_id)
    if not obj:
        raise HTTPException(404, "Structure not found")
    risk = risk_engine.compute_risk(
        year_built=obj.year_built, condition=obj.condition,
        wear_fraction=(obj.wear_percent / 100) if obj.wear_percent else None,
        eff_design=obj.efficiency_design,
        eff_actual=obj.efficiency_actual, last_inspection=obj.last_inspection,
        significance=obj.significance, type_code=obj.type_code,
    )
    return schemas.RiskAssessmentRead(
        risk_level=risk["risk_level"], score=risk["score"],
        factors=risk["factors"], recommendation=risk["recommendation"],
        next_inspection=obj.next_inspection,
    )


@router.post("/{structure_id}/risk", response_model=schemas.RiskAssessmentRead)
def recompute_risk(structure_id: int, db: Session = Depends(get_db)):
    obj = crud.get_structure(db, structure_id)
    if not obj:
        raise HTTPException(404, "Structure not found")
    risk = crud.recompute_risk(db, obj)
    return schemas.RiskAssessmentRead(
        risk_level=risk["risk_level"], score=risk["score"],
        factors=risk["factors"], recommendation=risk["recommendation"],
        next_inspection=obj.next_inspection,
    )


# --- Inspection Priority (deterministic expert model) -------------------------
@router.get("/{structure_id}/priority", response_model=schemas.PriorityDetail)
def get_priority(structure_id: int, db: Session = Depends(get_db)):
    obj = crud.get_structure(db, structure_id)
    if not obj:
        raise HTTPException(404, "Structure not found")
    accidents = (db.scalar(
        select(func.count()).select_from(models.Inspection).where(
            models.Inspection.structure_id == structure_id,
            models.Inspection.inspection_type == "Аварийный")
    ) or 0) + (db.scalar(
        select(func.count()).select_from(models.Repair).where(
            models.Repair.structure_id == structure_id,
            models.Repair.repair_type == "Аварийный ремонт")
    ) or 0)
    p = priority.compute_priority(
        condition=obj.condition, year_built=obj.year_built,
        last_inspection=obj.last_inspection, significance=obj.significance,
        accident_count=accidents,
    )
    return schemas.PriorityDetail(**{
        k: p[k] for k in ("priority_score", "priority_level",
                          "next_inspection_recommendation",
                          "recommended_interval_days", "breakdown")
    })


# --- Operation history: inspections + repairs ---------------------------------
def _insp_read(i: models.Inspection) -> schemas.InspectionRead:
    return schemas.InspectionRead(
        id=i.id, structure_id=i.structure_id, inspection_date=i.date,
        inspection_type=i.inspection_type, notes=i.notes,
        inspector=i.inspector, condition_found=i.condition_found,
    )


def _require(db, structure_id):
    obj = crud.get_structure(db, structure_id)
    if not obj:
        raise HTTPException(404, "Structure not found")
    return obj


@router.get("/{structure_id}/history", response_model=schemas.HistoryResponse)
def get_history(structure_id: int, db: Session = Depends(get_db)):
    """Inspection + repair history for the object card (newest first)."""
    _require(db, structure_id)
    insp = db.scalars(
        select(models.Inspection).where(models.Inspection.structure_id == structure_id)
        .order_by(models.Inspection.date.desc())
    )
    reps = db.scalars(
        select(models.Repair).where(models.Repair.structure_id == structure_id)
        .order_by(models.Repair.repair_date.desc())
    )
    return schemas.HistoryResponse(
        inspections=[_insp_read(i) for i in insp],
        repairs=list(reps),
    )


# --- Inspections CRUD ---------------------------------------------------------
@router.get("/{structure_id}/inspections", response_model=list[schemas.InspectionRead])
def list_inspections(structure_id: int, db: Session = Depends(get_db)):
    _require(db, structure_id)
    stmt = (select(models.Inspection).where(models.Inspection.structure_id == structure_id)
            .order_by(models.Inspection.date.desc()))
    return [_insp_read(i) for i in db.scalars(stmt)]


@router.post("/{structure_id}/inspections", response_model=schemas.InspectionRead,
             status_code=201)
def add_inspection(structure_id: int, data: schemas.InspectionCreate,
                   db: Session = Depends(get_db)):
    obj = _require(db, structure_id)
    insp = models.Inspection(
        structure_id=structure_id, date=data.inspection_date,
        inspection_type=data.inspection_type, notes=data.notes,
        inspector=data.inspector, condition_found=data.condition_found,
        wear_found=data.wear_found,
    )
    db.add(insp)
    if not obj.last_inspection or data.inspection_date >= obj.last_inspection:
        obj.last_inspection = data.inspection_date
        if data.condition_found:
            obj.condition = data.condition_found
        if data.wear_found is not None:
            obj.wear_percent = data.wear_found
    db.commit()
    db.refresh(insp)
    crud.recompute_risk(db, obj)
    return _insp_read(insp)


@router.delete("/{structure_id}/inspections/{inspection_id}", status_code=204)
def delete_inspection(structure_id: int, inspection_id: int, db: Session = Depends(get_db)):
    obj = db.get(models.Inspection, inspection_id)
    if not obj or obj.structure_id != structure_id:
        raise HTTPException(404, "Inspection not found")
    db.delete(obj)
    db.commit()


# --- Repairs CRUD -------------------------------------------------------------
@router.get("/{structure_id}/repairs", response_model=list[schemas.RepairRead])
def list_repairs(structure_id: int, db: Session = Depends(get_db)):
    _require(db, structure_id)
    stmt = (select(models.Repair).where(models.Repair.structure_id == structure_id)
            .order_by(models.Repair.repair_date.desc()))
    return list(db.scalars(stmt))


@router.post("/{structure_id}/repairs", response_model=schemas.RepairRead, status_code=201)
def add_repair(structure_id: int, data: schemas.RepairCreate, db: Session = Depends(get_db)):
    _require(db, structure_id)
    rep = models.Repair(structure_id=structure_id, **data.model_dump())
    db.add(rep)
    db.commit()
    db.refresh(rep)
    return rep


@router.delete("/{structure_id}/repairs/{repair_id}", status_code=204)
def delete_repair(structure_id: int, repair_id: int, db: Session = Depends(get_db)):
    obj = db.get(models.Repair, repair_id)
    if not obj or obj.structure_id != structure_id:
        raise HTTPException(404, "Repair not found")
    db.delete(obj)
    db.commit()
