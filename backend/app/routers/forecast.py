"""Predictive Infrastructure Engine

GET /api/forecast/{structure_id}

Returns deterministic risk forecast for 6 / 12 / 24 months,
probability of going critical, residual service life, and
an actionable recommendation — all computed from existing
fields on HydraulicStructure (no ML model required).
"""
from __future__ import annotations

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import HydraulicStructure

router = APIRouter(prefix="/api/forecast", tags=["forecast"])

# ---------------------------------------------------------------------------
# Response schema
# ---------------------------------------------------------------------------

class ForecastPoint(BaseModel):
    months: int
    risk_score: float
    risk_level: str

class ForecastResponse(BaseModel):
    structure_id: int
    name: str
    current_risk: float
    current_level: str
    forecast: list[ForecastPoint]
    prob_critical: float          # 0.0 – 1.0
    residual_life_years: float
    recommendation: str
    methodology: str

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

TYPICAL_LIFESPAN: dict[str, int] = {
    "canal":           60,
    "dam":             80,
    "embankment":      70,
    "sluice":          50,
    "intake":          50,
    "pump_station":    40,
    "hydropost":       35,
    "other":           50,
}

CONDITION_MULTIPLIER: dict[str, float] = {
    "good":            0.6,
    "monitoring":      1.0,
    "requires_repair": 1.6,
    "emergency":       2.4,
}

LEVEL_THRESHOLDS = [
    (80, "critical"),
    (60, "high"),
    (40, "medium"),
    (0,  "low"),
]

def _risk_level(score: float) -> str:
    for threshold, level in LEVEL_THRESHOLDS:
        if score >= threshold:
            return level
    return "low"

def _project_score(base: float, rate: float, months: int) -> float:
    """Compound degradation model."""
    years = months / 12
    projected = base + rate * years
    # Soft ceiling — growth slows above 85
    if projected > 85:
        excess = projected - 85
        projected = 85 + excess * 0.3
    return round(min(projected, 100), 1)

def _recommendation(score_24m: float, residual: float, condition: str) -> str:
    # "Аварийный ремонт" is reserved for objects whose physical condition is
    # actually emergency — otherwise the banner contradicts a "Требует ремонта"
    # object (a high projected risk score is not the same as an emergency state).
    if condition == "emergency":
        return "Аварийный ремонт — немедленное вмешательство обязательно"
    if condition == "requires_repair" or score_24m >= 75 or residual < 3:
        return "Плановый капитальный ремонт в течение 12 месяцев"
    if score_24m >= 55:
        return "Расширенный мониторинг; текущий ремонт в течение 24 месяцев"
    if score_24m >= 40:
        return "Плановый осмотр согласно регламенту"
    return "Состояние удовлетворительное — стандартный регламент"

# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.get("/{structure_id}", response_model=ForecastResponse)
def get_forecast(structure_id: int, db: Session = Depends(get_db)):
    obj: Optional[HydraulicStructure] = db.get(HydraulicStructure, structure_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Structure not found")

    current_year = date.today().year

    # --- Base risk score ---------------------------------------------------
    base_score = float(obj.risk_score or 50)

    # --- Age ---------------------------------------------------------------
    age = (current_year - obj.year_built) if obj.year_built else 30

    # --- Wear --------------------------------------------------------------
    wear = float(obj.wear_percent or 40) / 100   # normalise to 0–1

    # --- Condition multiplier ---------------------------------------------
    cond_mult = CONDITION_MULTIPLIER.get(obj.condition or "monitoring", 1.0)

    # --- Annual degradation rate ------------------------------------------
    # Base rate: wear-driven + age-driven, scaled by condition severity
    base_rate = (wear * 3.5 + (age / 120)) * cond_mult
    # Efficiency loss adds pressure
    if obj.efficiency_design and obj.efficiency_actual:
        eff_loss = max(0.0, obj.efficiency_design - obj.efficiency_actual)
        base_rate += eff_loss * 4
    # Clamp to sensible range [0.5, 12] pts / year
    degradation_rate = max(0.5, min(base_rate, 12.0))

    # --- Forecast points --------------------------------------------------
    forecast_points = [
        ForecastPoint(
            months=m,
            risk_score=_project_score(base_score, degradation_rate, m),
            risk_level=_risk_level(_project_score(base_score, degradation_rate, m)),
        )
        for m in (6, 12, 24)
    ]

    score_24m = forecast_points[2].risk_score

    # --- Probability of going critical ------------------------------------
    # Logistic-like mapping from score_24m to probability
    if score_24m >= 100:
        prob = 1.0
    elif score_24m >= 80:
        prob = 0.75 + (score_24m - 80) / 80
    elif score_24m >= 60:
        prob = 0.35 + (score_24m - 60) / 57
    elif score_24m >= 40:
        prob = 0.08 + (score_24m - 40) / 111
    else:
        prob = score_24m / 500
    prob = round(max(0.0, min(prob, 1.0)), 2)

    # --- Residual service life --------------------------------------------
    # Years until the risk reaches end-of-life (~100) at the current degradation
    # rate. A serviceable object keeps a real reserve even if it is old; only a
    # critical object drops to ~0. Bounded to the type's typical lifespan.
    type_code = (obj.type_code or "other").lower()
    max_life = TYPICAL_LIFESPAN.get(type_code, 50) * 0.75   # realistic upper bound
    if base_score >= 100:
        residual = 0.0
    else:
        residual = (100.0 - base_score) / degradation_rate
    residual = round(max(0.0, min(residual, max_life)), 1)

    recommendation = _recommendation(score_24m, residual, obj.condition or "monitoring")

    return ForecastResponse(
        structure_id=obj.id,
        name=obj.name,
        current_risk=base_score,
        current_level=_risk_level(base_score),
        forecast=forecast_points,
        prob_critical=prob,
        residual_life_years=residual,
        recommendation=recommendation,
        methodology="Детерминированная модель деградации: износ × состояние × возраст × потеря КПД",
    )
