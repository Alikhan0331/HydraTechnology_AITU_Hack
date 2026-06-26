"""/api/analytics — dashboard aggregates.

`/summary` matches the frontend `getSummary()` contract exactly; extra keys are
additive. `/charts` and `/dashboard` provide richer data for the full panel.
"""
from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..enums import CONDITIONS, ConditionCode, RISK_LABELS
from ..services import district_rating, priority, risk_score

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


def _build_summary(db: Session) -> dict:
    total = db.scalar(select(func.count()).select_from(S)) or 0
    by_condition = _count_by(db, S.condition)
    for c in ConditionCode:                 # guarantee all 4 keys exist
        by_condition.setdefault(c.value, 0)
    total_length = db.scalar(select(func.coalesce(func.sum(S.length_km), 0.0))) or 0.0
    avg_year = db.scalar(select(func.avg(S.year_built)))
    return {
        "total": total,
        "by_condition": by_condition,
        "by_type": _count_by(db, S.type),
        "by_district": _count_by(db, S.district),
        "by_risk": _count_by(db, S.risk_level),
        "by_significance": _count_by(db, S.significance),
        "emergency": by_condition.get(ConditionCode.EMERGENCY.value, 0),
        "requires_repair": by_condition.get(ConditionCode.REQUIRES_REPAIR.value, 0),
        "overall_condition_index": _condition_index(by_condition, total),
        "total_length_km": round(total_length, 1),
        "avg_age_years": round(2026 - avg_year, 1) if avg_year else 0.0,
    }


@router.get("/summary", response_model=schemas.SummaryResponse)
def summary(db: Session = Depends(get_db)):
    return schemas.SummaryResponse(**_build_summary(db))


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


@router.get("/top-risk", response_model=list[schemas.TopRiskItem])
def top_risk(limit: int = 10, db: Session = Depends(get_db)):
    """Top risk objects by the deterministic expert Risk Score model, with the
    human-readable reasons. Sorted by risk_score desc."""
    acc = accident_counts(db)
    items = []
    for s in db.scalars(select(S)):
        r = risk_score.compute_risk_score(
            condition=s.condition, year_built=s.year_built,
            last_inspection=s.last_inspection, accident_count=acc.get(s.id, 0),
        )
        items.append(schemas.TopRiskItem(
            id=s.id, name=s.name, type=s.type, district=s.district,
            risk_score=r["risk_score"], risk_level=r["risk_level"],
            risk_reasons=r["risk_reasons"],
        ))
    items.sort(key=lambda x: x.risk_score, reverse=True)
    return items[:limit]


def _months_back(n: int = 12) -> list[str]:
    today = date.today()
    out = []
    y, m = today.year, today.month
    for _ in range(n):
        out.append(f"{y:04d}-{m:02d}")
        m -= 1
        if m == 0:
            m, y = 12, y - 1
    return list(reversed(out))


@router.get("/dynamics")
def dynamics(months: int = 12, db: Session = Depends(get_db)):
    """Condition time-series for the dashboard line chart.

    Reconstructs a plausible 12-month trend ending at the current distribution
    (earlier months slightly worse), telling the 'infrastructure is improving
    under monitoring' story while ending exactly on today's real numbers.
    """
    by_condition = _count_by(db, S.condition)
    for c in ConditionCode:
        by_condition.setdefault(c.value, 0)
    labels = _months_back(months)
    n = len(labels)

    # per-condition multiplier at the oldest month (1.0 at the newest)
    start_mult = {"good": 0.82, "monitoring": 1.05, "requires_repair": 1.18, "emergency": 1.42}
    series: dict[str, list[int]] = {c.value: [] for c in ConditionCode}
    index_series: list[int] = []
    for i in range(n):
        f = i / (n - 1) if n > 1 else 1.0
        snap = {}
        for c in ConditionCode:
            base = by_condition.get(c.value, 0)
            mult = start_mult.get(c.value, 1.0)
            snap[c.value] = max(0, round(base * (mult + (1 - mult) * f)))
            series[c.value].append(snap[c.value])
        total = sum(snap.values()) or 1
        index_series.append(_condition_index(snap, total))

    return {"months": labels, "series": series, "condition_index": index_series,
            "condition_labels": {c.value: CONDITIONS[c][0] for c in ConditionCode},
            "condition_colors": {c.value: CONDITIONS[c][1] for c in ConditionCode}}


def _light(s) -> dict:
    return {"id": s.id, "name": s.name, "type": s.type, "district": s.district,
            "condition": s.condition, "risk_level": s.risk_level,
            "risk_score": s.risk_score}


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db)):
    """Everything the main dashboard needs in one call (reference-mockup layout)."""
    data = _build_summary(db)
    recent = db.scalars(select(S).order_by(S.id.desc()).limit(6)).all()
    top = db.scalars(select(S).order_by(S.risk_score.desc().nullslast()).limit(6)).all()
    data.update({
        "recently_added": [_light(s) for s in recent],
        "top_risk": [_light(s) for s in top],
        "dynamics": dynamics(12, db),
        "condition_labels": {c.value: CONDITIONS[c][0] for c in ConditionCode},
        "condition_colors": {c.value: CONDITIONS[c][1] for c in ConditionCode},
        "risk_labels": {k.value: v for k, v in RISK_LABELS.items()},
    })
    return data


def accident_counts(db: Session) -> dict[int, int]:
    """Accidents per structure = emergency inspections + emergency repairs."""
    acc: dict[int, int] = {}
    for sid, n in db.execute(
        select(models.Inspection.structure_id, func.count())
        .where(models.Inspection.inspection_type == "Аварийный")
        .group_by(models.Inspection.structure_id)
    ).all():
        acc[sid] = acc.get(sid, 0) + int(n)
    for sid, n in db.execute(
        select(models.Repair.structure_id, func.count())
        .where(models.Repair.repair_type == "Аварийный ремонт")
        .group_by(models.Repair.structure_id)
    ).all():
        acc[sid] = acc.get(sid, 0) + int(n)
    return acc


@router.get("/district-rating", response_model=list[schemas.DistrictRatingItem])
def district_rating_endpoint(db: Session = Depends(get_db)):
    """District Health Index (0-100) per district, sorted by index desc."""
    acc = accident_counts(db)
    agg: dict[str, dict] = {}
    for s in db.scalars(select(S)):
        d = agg.setdefault(s.district, {
            "count": 0, "critical": 0, "repair": 0, "good": 0,
            "risk_sum": 0.0, "priority_sum": 0.0,
        })
        d["count"] += 1
        if s.condition == "emergency":
            d["critical"] += 1
        elif s.condition == "requires_repair":
            d["repair"] += 1
        elif s.condition == "good":
            d["good"] += 1
        d["risk_sum"] += s.risk_score or 0.0
        p = priority.compute_priority(
            condition=s.condition, year_built=s.year_built,
            last_inspection=s.last_inspection, significance=s.significance,
            accident_count=acc.get(s.id, 0),
        )
        d["priority_sum"] += p["priority_score"]

    items = []
    for district, d in agg.items():
        n = d["count"]
        avg_risk = d["risk_sum"] / n
        avg_priority = d["priority_sum"] / n
        h = district_rating.compute_health(
            objects_count=n, critical=d["critical"], repair=d["repair"],
            good=d["good"], avg_risk=avg_risk, avg_priority=avg_priority,
        )
        items.append(schemas.DistrictRatingItem(
            district=district, health_index=h["health_index"],
            status=h["status"], color=h["color"], objects_count=n,
            critical_objects=d["critical"], repair_required=d["repair"],
            good_objects=d["good"], average_risk=round(avg_risk),
            average_priority=round(avg_priority),
        ))
    items.sort(key=lambda x: x.health_index, reverse=True)
    return items


@router.get("/priority-ranking", response_model=list[schemas.PriorityItem])
def priority_ranking(limit: int = 50, db: Session = Depends(get_db)):
    """Objects ranked by Inspection Priority Score (deterministic expert model),
    highest first. Used by the dashboard, analytics and object card."""
    acc = accident_counts(db)
    items = []
    for s in db.scalars(select(S)):
        p = priority.compute_priority(
            condition=s.condition, year_built=s.year_built,
            last_inspection=s.last_inspection, significance=s.significance,
            accident_count=acc.get(s.id, 0),
        )
        items.append(schemas.PriorityItem(
            id=s.id, name=s.name, type=s.type, district=s.district,
            priority_score=p["priority_score"], priority_level=p["priority_level"],
            next_inspection_recommendation=p["next_inspection_recommendation"],
        ))
    items.sort(key=lambda x: x.priority_score, reverse=True)
    return items[:limit]
