"""Inspection Priority Score — deterministic expert model (no AI/ML).

Higher score → the object should be inspected sooner. The model is intentionally
data-driven and transparent: each factor is a small pure function, and the whole
set is declared in FACTORS, so adding/changing a factor is a one-line change.

    Priority Score = condition + age + inspection + importance + accident   (cap 100)
"""
from datetime import date

CURRENT_YEAR = 2026

# --- factor lookup tables (extend here) -------------------------------------
CONDITION_SCORE = {
    "good": 0,            # Исправное
    "monitoring": 20,     # Требует наблюдения
    "requires_repair": 40,  # Требует ремонта
    "emergency": 60,      # Аварийное
}

# our significance codes → expert "importance" score (низкая/средняя/высокая)
IMPORTANCE_SCORE = {"local": 0, "regional": 10, "national": 20}

LEVELS = [(30, "Низкий"), (50, "Средний"), (70, "Высокий"), (100, "Критический")]
INTERVAL_BY_LEVEL = {"Низкий": 180, "Средний": 90, "Высокий": 30, "Критический": 7}


def _age_score(age: int) -> int:
    if age < 10:
        return 0
    if age < 25:
        return 10
    if age <= 40:
        return 20
    return 30


def _inspection_score(days_since: int) -> int:
    if days_since < 183:        # < 6 месяцев
        return 0
    if days_since < 365:        # 6–12 месяцев
        return 10
    if days_since < 730:        # 12–24 месяцев
        return 20
    return 30                   # > 24 месяцев


def _accident_score(accidents: int) -> int:
    if accidents <= 0:
        return 0
    if accidents == 1:
        return 10
    return 20


# --- factors (name, fn(ctx) -> score) — declarative & extensible ------------
def _f_condition(ctx):  return CONDITION_SCORE.get(ctx["condition"], 0)
def _f_age(ctx):        return _age_score(ctx["age"])
def _f_inspection(ctx): return _inspection_score(ctx["days_since_inspection"])
def _f_importance(ctx): return IMPORTANCE_SCORE.get(ctx["significance"], 0)
def _f_accident(ctx):   return _accident_score(ctx["accident_count"])

FACTORS = [
    ("condition_score", _f_condition),
    ("age_score", _f_age),
    ("inspection_score", _f_inspection),
    ("importance_score", _f_importance),
    ("accident_score", _f_accident),
]


def _level(score: int) -> str:
    for threshold, label in LEVELS:
        if score <= threshold:
            return label
    return LEVELS[-1][1]


def compute_priority(*, condition: str | None, year_built: int | None,
                     last_inspection: date | None, significance: str | None,
                     accident_count: int = 0) -> dict:
    age = (CURRENT_YEAR - year_built) if year_built else 35
    days_since = (date.today() - last_inspection).days if last_inspection else 9999

    ctx = {
        "condition": condition,
        "age": age,
        "days_since_inspection": days_since,
        "significance": significance or "local",
        "accident_count": accident_count,
    }
    breakdown = {name: fn(ctx) for name, fn in FACTORS}
    score = min(100, sum(breakdown.values()))
    level = _level(score)
    interval = INTERVAL_BY_LEVEL[level]

    return {
        "priority_score": score,
        "priority_level": level,
        "breakdown": breakdown,
        "recommended_interval_days": interval,
        "next_inspection_recommendation": f"через {interval} дней",
    }
