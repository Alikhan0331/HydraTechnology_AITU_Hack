"""Top-Risk expert model — deterministic Risk Score 0..100 (no AI/ML).

Separate, transparent expert model used by the "Top Risk Objects" module.
Each factor is a small pure function returning (score, reason|None); the whole
set is declared in FACTORS, so adding a future risk factor is a one-line change.

    Risk Score = condition + age + inspection + accident   (capped at 100)
"""
from datetime import date

from .risk_engine import next_inspection_date  # seasonal scheduling helper (reused)

CURRENT_YEAR = 2026

# RU level → frontend code (catalog filters/colors keep working on codes)
LEVEL_CODE = {"Низкий": "low", "Средний": "medium", "Высокий": "high", "Критический": "critical"}
# inspection interval (days) by risk level → stored next_inspection
INTERVAL_BY_LEVEL = {"Низкий": 365, "Средний": 180, "Высокий": 90, "Критический": 30}

CONDITION_SCORE = {"good": 0, "monitoring": 25, "requires_repair": 50, "emergency": 80}
CONDITION_REASON = {
    "monitoring": "Состояние: требует наблюдения",
    "requires_repair": "Состояние: требует ремонта",
    "emergency": "Аварийное состояние",
}

LEVELS = [(25, "Низкий"), (50, "Средний"), (75, "Высокий"), (100, "Критический")]
LEVEL_COLOR = {
    "Низкий": "#16a34a",      # зелёный
    "Средний": "#eab308",     # жёлтый
    "Высокий": "#ea580c",     # оранжевый
    "Критический": "#dc2626", # красный
}


def _f_condition(ctx):
    return CONDITION_SCORE.get(ctx["condition"], 0), CONDITION_REASON.get(ctx["condition"])


def _f_age(ctx):
    age = ctx["age"]
    if age < 10:
        return 0, None
    if age < 25:
        return 10, "Возраст 10–25 лет"
    if age <= 40:
        return 20, "Возраст 25–40 лет"
    return 30, "Возраст более 40 лет"


def _f_inspection(ctx):
    d = ctx["days_since_inspection"]
    if d < 365:
        return 0, None
    if d < 730:
        return 15, "Последний осмотр 12–24 месяцев назад"
    return 30, "Последний осмотр более 24 месяцев назад"


def _f_accident(ctx):
    n = ctx["accident_count"]
    if n <= 0:
        return 0, None
    if n == 1:
        return 10, "Зафиксирована авария"
    return 20, "История аварий (2 и более)"


# declarative & extensible — append a (name, fn) to add a factor
FACTORS = [
    ("condition", _f_condition),
    ("age", _f_age),
    ("inspection", _f_inspection),
    ("accident", _f_accident),
]


def _level(score: int) -> str:
    for threshold, label in LEVELS:
        if score <= threshold:
            return label
    return LEVELS[-1][1]


def compute_risk_score(*, condition: str | None, year_built: int | None,
                       last_inspection: date | None, accident_count: int = 0) -> dict:
    age = (CURRENT_YEAR - year_built) if year_built else 35
    days_since = (date.today() - last_inspection).days if last_inspection else 9999
    ctx = {
        "condition": condition,
        "age": age,
        "days_since_inspection": days_since,
        "accident_count": accident_count,
    }

    breakdown, reasons = {}, []
    for name, fn in FACTORS:
        score, reason = fn(ctx)
        breakdown[name] = score
        if reason:
            reasons.append(reason)

    score = min(100, sum(breakdown.values()))
    level = _level(score)
    return {
        "risk_score": score,
        "risk_level": level,
        "risk_reasons": reasons or ["Существенных факторов риска не выявлено"],
        "color": LEVEL_COLOR[level],
        "breakdown": breakdown,
    }


# Max contribution per factor — used for the card "factor weight" bars.
_FACTOR_MAX = {"condition": 80, "age": 30, "inspection": 30, "accident": 20}
_FACTOR_LABEL = {"condition": "Состояние", "age": "Возраст",
                 "inspection": "Давность осмотра", "accident": "История аварий"}


def storage_fields(*, condition, year_built, last_inspection, accident_count, type_code) -> dict:
    """Values to persist on a structure so the whole app shares one risk model:
    risk_score (float), risk_level (frontend code) and the seasonal next_inspection."""
    r = compute_risk_score(condition=condition, year_built=year_built,
                           last_inspection=last_inspection, accident_count=accident_count)
    interval = INTERVAL_BY_LEVEL[r["risk_level"]]
    return {
        "risk_score": float(r["risk_score"]),
        "risk_level": LEVEL_CODE[r["risk_level"]],
        "next_inspection": next_inspection_date(last_inspection, interval, type_code),
        "evaluation": r,
    }


def card_factors(evaluation: dict) -> list[dict]:
    """Convert the breakdown into the {name,value,weight,score} array the object
    card's risk-factor bars expect (keeps the existing UI working, new data)."""
    bd = evaluation["breakdown"]
    out = []
    for key in ("condition", "age", "inspection", "accident"):
        contrib = bd.get(key, 0)
        out.append({
            "name": _FACTOR_LABEL[key],
            "value": f"{contrib} из {_FACTOR_MAX[key]} баллов",
            "weight": _FACTOR_MAX[key],
            "score": round(contrib / _FACTOR_MAX[key] * 100) if _FACTOR_MAX[key] else 0,
        })
    return out
