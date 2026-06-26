"""District Health Index — deterministic expert model (no AI/ML).

For each district the index (0..100, higher = healthier) is a weighted average of
four health components, each expressed 0..100 so the result is naturally bounded:

  risk_health     = 100 − average Risk Score
  priority_health = 100 − average Inspection Priority
  good_health     = share of serviceable objects × 100
  safety_health   = 100 − share of (emergency + repair-required) objects × 100

Weights live in WEIGHTS — change/extend the model in one place.
"""
# weights sum to 1.0 (extend here to add new components). "Health" is most
# directly about the condition mix, so condition components carry more weight
# than the age-driven risk/priority scores.
WEIGHTS = {"risk": 0.25, "priority": 0.15, "good": 0.30, "safety": 0.30}

# (min_index, status, color) — descending
STATUS_BANDS = [
    (90, "Отличное состояние", "#16a34a"),       # зелёный
    (75, "Хорошее состояние", "#84cc16"),        # светло-зелёный
    (60, "Удовлетворительное", "#eab308"),       # жёлтый
    (40, "Требует внимания", "#f97316"),         # оранжевый
    (0, "Критическое состояние", "#dc2626"),     # красный
]


def _status(index: int) -> tuple[str, str]:
    for threshold, status, color in STATUS_BANDS:
        if index >= threshold:
            return status, color
    return STATUS_BANDS[-1][1], STATUS_BANDS[-1][2]


def compute_health(*, objects_count: int, critical: int, repair: int, good: int,
                   avg_risk: float, avg_priority: float) -> dict:
    if objects_count <= 0:
        return {"health_index": 0, "status": STATUS_BANDS[-1][1], "color": STATUS_BANDS[-1][2]}

    crit_share = critical / objects_count
    repair_share = repair / objects_count
    good_share = good / objects_count

    components = {
        "risk": max(0.0, 100 - avg_risk),
        "priority": max(0.0, 100 - avg_priority),
        "good": good_share * 100,
        "safety": max(0.0, 100 - (crit_share + repair_share) * 100),
    }
    index = round(sum(WEIGHTS[k] * v for k, v in components.items()))
    index = max(0, min(100, index))
    status, color = _status(index)
    return {"health_index": index, "status": status, "color": color,
            "components": {k: round(v) for k, v in components.items()}}
