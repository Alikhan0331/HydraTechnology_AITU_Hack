"""/api/analytics — dashboard aggregates.

`/summary` matches the frontend `getSummary()` contract exactly; extra keys are
additive. `/charts` and `/dashboard` provide richer data for the full panel.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..enums import CONDITIONS, ConditionCode, RISK_LABELS

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

S = models.HydraulicStructure
_SEVERITY = {c.value: CONDITIONS[c][2] for c in ConditionCode}


def _count_by(db: Session, column) -> dict[str, int]:
    rows = db.execute(select(column, func.count()).group_by(column)).all()
    return {str(k): int(v) for k, v in rows}


def _condition_index(by_condition: dict[str, int], total: int) -> int:
    if not total:
        return 0
    weighted = sum(_SEVERITY.get(code, 0) * n for code, n in by_condition.items())
    return round(100 * (1 - weighted / (3 * total)))


@router.get("/summary", response_model=schemas.SummaryResponse)
def summary(db: Session = Depends(get_db)):
    total = db.scalar(select(func.count()).select_from(S)) or 0
    by_condition = _count_by(db, S.condition)
    # guarantee all 4 keys exist (frontend iterates them)
    for c in ConditionCode:
        by_condition.setdefault(c.value, 0)
    by_type = _count_by(db, S.type)
    by_district = _count_by(db, S.district)
    by_risk = _count_by(db, S.risk_level)
    by_significance = _count_by(db, S.significance)

    total_length = db.scalar(select(func.coalesce(func.sum(S.length_km), 0.0))) or 0.0
    avg_year = db.scalar(select(func.avg(S.year_built)))
    avg_age = round(2026 - avg_year, 1) if avg_year else 0.0

    return schemas.SummaryResponse(
        total=total,
        by_condition=by_condition,
        by_type=by_type,
        by_district=by_district,
        by_risk=by_risk,
        by_significance=by_significance,
        emergency=by_condition.get(ConditionCode.EMERGENCY.value, 0),
        requires_repair=by_condition.get(ConditionCode.REQUIRES_REPAIR.value, 0),
        overall_condition_index=_condition_index(by_condition, total),
        total_length_km=round(total_length, 1),
        avg_age_years=avg_age,
    )


@router.get("/charts")
def charts(db: Session = Depends(get_db)):
    """Richer aggregates for charts (donut, bars, risk distribution, by decade)."""
    by_condition = _count_by(db, S.condition)
    for c in ConditionCode:
        by_condition.setdefault(c.value, 0)

    # objects by construction decade (bucketed in Python for DB portability)
    years = db.scalars(select(S.year_built).where(S.year_built.isnot(None))).all()
    dec_counts: dict[int, int] = {}
    for y in years:
        d = (int(y) // 10) * 10
        dec_counts[d] = dec_counts.get(d, 0) + 1
    by_decade = {f"{d}s": dec_counts[d] for d in sorted(dec_counts)}

    return {
        "by_type": _count_by(db, S.type),
        "by_condition": by_condition,
        "by_district": _count_by(db, S.district),
        "by_risk": _count_by(db, S.risk_level),
        "by_significance": _count_by(db, S.significance),
        "by_water_source": _count_by(db, S.water_source),
        "by_decade": by_decade,
        "condition_labels": {c.value: CONDITIONS[c][0] for c in ConditionCode},
        "condition_colors": {c.value: CONDITIONS[c][1] for c in ConditionCode},
        "risk_labels": {k.value: v for k, v in RISK_LABELS.items()},
    }


@router.get("/top-risk", response_model=list[schemas.StructureRead])
def top_risk(limit: int = 10, db: Session = Depends(get_db)):
    """Most problematic objects first — 'intelligent dispatcher' priority list."""
    stmt = select(S).order_by(S.risk_score.desc().nullslast()).limit(limit)
    return list(db.scalars(stmt))
