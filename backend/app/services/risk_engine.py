"""Transparent risk + inspection-period model (TZ tasks 5 & 6).

Risk score is a weighted 0..100 sum of explainable factors. Every factor is
returned so the UI / AI-dispatcher can explain *why* an object is at risk.
"""
from datetime import date, timedelta

from ..enums import ConditionCode, RiskLevel

CURRENT_YEAR = 2026

# Weight of each factor (sums to 100). Condition dominates so the computed
# risk level stays coherent with the technical-condition classification.
W_AGE = 22
W_CONDITION = 38
W_WEAR = 18
W_EFFICIENCY = 12
W_INSPECTION = 10

CONDITION_SEVERITY = {
    ConditionCode.GOOD.value: 0,
    ConditionCode.MONITORING.value: 1,
    ConditionCode.REQUIRES_REPAIR.value: 2,
    ConditionCode.EMERGENCY.value: 3,
}

# Base inspection interval (days) by risk level.
BASE_INTERVAL_DAYS = {
    RiskLevel.LOW.value: 365,
    RiskLevel.MEDIUM.value: 180,
    RiskLevel.HIGH.value: 90,
    RiskLevel.CRITICAL.value: 30,
}

# Seasonal factor (TZ task 5): water-retaining / flow-control structures are most
# stressed by the spring snowmelt flood (паводок), so they are inspected more
# often and an inspection is scheduled BEFORE the flood season.
FLOOD_SENSITIVE_TYPES = {"dam", "dike", "sluice", "water_intake"}
SEASONAL_INTERVAL_MULT = 0.8          # inspect ~20% more often
FLOOD_SEASON_START = (3, 1)           # 1 March — start of spring flood
PRE_FLOOD_INSPECTION = (2, 20)        # target a check before 20 February


def _clamp01(x: float) -> float:
    return max(0.0, min(1.0, x))


def compute_risk(
    *,
    year_built: int | None,
    condition: str | None,
    wear_fraction: float | None = None,
    eff_design: float | None = None,
    eff_actual: float | None = None,
    last_inspection: date | None = None,
    significance: str | None = "local",
    type_code: str | None = None,
) -> dict:
    age = (CURRENT_YEAR - year_built) if year_built else 35

    # --- factor 0..1 each ---
    age_f = _clamp01(age / 70)
    cond_f = CONDITION_SEVERITY.get(condition, 1) / 3

    if wear_fraction is not None:
        wear_f = _clamp01(wear_fraction / 1.0)
    else:
        wear_f = age_f * 0.5  # mild estimate when not measured (avoid double-counting age)

    if eff_design and eff_actual and eff_design > 0:
        eff_f = _clamp01((eff_design - eff_actual) / eff_design / 0.5)
    else:
        eff_f = 0.0

    if last_inspection:
        days_since = (date.today() - last_inspection).days
        insp_f = _clamp01(days_since / (5 * 365))
    else:
        insp_f = 0.6  # never inspected → moderately risky

    score = (
        W_AGE * age_f
        + W_CONDITION * cond_f
        + W_WEAR * wear_f
        + W_EFFICIENCY * eff_f
        + W_INSPECTION * insp_f
    )

    # Critical-significance objects get a small risk bump.
    if significance == "national":
        score = min(100.0, score * 1.12)
    elif significance == "regional":
        score = min(100.0, score * 1.05)

    score = round(score, 1)

    if score < 25:
        level = RiskLevel.LOW.value
    elif score < 50:
        level = RiskLevel.MEDIUM.value
    elif score < 72:
        level = RiskLevel.HIGH.value
    else:
        level = RiskLevel.CRITICAL.value

    # Inspection interval (TZ task 5): base by risk level, shortened seasonally
    # for flood-sensitive structures.
    flood_sensitive = type_code in FLOOD_SENSITIVE_TYPES
    interval_days = BASE_INTERVAL_DAYS[level]
    if flood_sensitive:
        interval_days = round(interval_days * SEASONAL_INTERVAL_MULT)

    factors = {
        "age_years": age,
        "age_factor": round(age_f, 2),
        "condition_factor": round(cond_f, 2),
        "wear_factor": round(wear_f, 2),
        "efficiency_factor": round(eff_f, 2),
        "inspection_factor": round(insp_f, 2),
        "seasonal": {
            "flood_sensitive": flood_sensitive,
            "interval_days": interval_days,
            "note": ("Объект чувствителен к весеннему паводку — осмотр чаще и до "
                     "начала половодья." if flood_sensitive
                     else "Сезонная корректировка не требуется."),
        },
        "weights": {
            "age": W_AGE, "condition": W_CONDITION, "wear": W_WEAR,
            "efficiency": W_EFFICIENCY, "inspection": W_INSPECTION,
        },
    }

    return {
        "risk_level": level,
        "score": score,
        "factors": factors,
        "recommendation": _recommend(level, condition, age, factors),
        "interval_days": interval_days,
        "type_code": type_code,
    }


def next_inspection_date(
    last_inspection: date | None, interval_days: int, type_code: str | None = None
) -> date:
    base = last_inspection or date.today()
    nxt = base + timedelta(days=interval_days)

    # Flood-sensitive structures: ensure a check before the spring flood season.
    if type_code in FLOOD_SENSITIVE_TYPES:
        today = date.today()
        for yr in (nxt.year, nxt.year + 1):
            pre_flood = date(yr, *PRE_FLOOD_INSPECTION)
            flood_start = date(yr, *FLOOD_SEASON_START)
            # if the naive schedule lands at/after the flood season, pull it earlier
            if today <= pre_flood <= nxt and nxt >= flood_start:
                nxt = pre_flood
                break

    # Overdue → reschedule soon, prioritised by urgency (shorter interval = sooner).
    if nxt < date.today():
        nxt = date.today() + timedelta(days=max(7, min(interval_days // 6, 60)))
    return nxt


def _recommend(level: str, condition: str | None, age: int, factors: dict) -> str:
    if level == RiskLevel.CRITICAL.value:
        return (
            "Критический риск. Требуется внеплановое обследование и план "
            "капитального ремонта/реконструкции. Рассмотреть ограничение режима "
            "эксплуатации до устранения дефектов."
        )
    if level == RiskLevel.HIGH.value:
        return (
            "Высокий риск. Назначить детальное обследование в ближайший квартал, "
            "подготовить смету на ремонт несущих и облицовочных элементов."
        )
    if level == RiskLevel.MEDIUM.value:
        return (
            "Средний риск. Усилить мониторинг, провести плановый осмотр, "
            "контролировать износ и фактическую пропускную способность."
        )
    return "Низкий риск. Достаточно планового ежегодного осмотра и паспортного контроля."
