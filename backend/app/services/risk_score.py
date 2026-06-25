"""Top-Risk expert model — deterministic Risk Score 0..100 (no AI/ML).

Separate, transparent expert model used by the "Top Risk Objects" module.
Each factor is a small pure function returning (score, reason|None); the whole
set is declared in FACTORS, so adding a future risk factor is a one-line change.

    Risk Score = condition + age + inspection + accident   (capped at 100)
"""
from datetime import date

CURRENT_YEAR = 2026

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
