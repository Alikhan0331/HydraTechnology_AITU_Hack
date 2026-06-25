"""Derive the 4-level technical condition from raw dataset attributes.

Maps the dataset's binary 'удов./не удов.' into the 4 categories required by
the case (good / monitoring / requires_repair / emergency), refined by age,
wear and efficiency loss so the classification is data-driven, not arbitrary.
"""
from ..enums import ConditionCode

CURRENT_YEAR = 2026


def derive_condition(
    tech_condition: str | None,
    year_built: int | None,
    wear_fraction: float | None,
    eff_design: float | None,
    eff_actual: float | None,
) -> str:
    age = (CURRENT_YEAR - year_built) if year_built else 35
    unsat = tech_condition == "unsatisfactory"

    eff_drop = None
    if eff_design and eff_actual and eff_design > 0:
        eff_drop = (eff_design - eff_actual) / eff_design

    high_wear = wear_fraction is not None and wear_fraction >= 0.65
    mid_wear = wear_fraction is not None and wear_fraction >= 0.5
    big_eff_drop = eff_drop is not None and eff_drop >= 0.4
    mid_eff_drop = eff_drop is not None and eff_drop >= 0.32

    if unsat:
        # unsatisfactory → repair by default, emergency only for the worst
        if age >= 68 or high_wear or big_eff_drop:
            return ConditionCode.EMERGENCY.value
        return ConditionCode.REQUIRES_REPAIR.value

    # satisfactory or unknown → mostly serviceable; monitoring only when old/worn
    if age >= 80 or mid_wear or mid_eff_drop:
        return ConditionCode.MONITORING.value
    return ConditionCode.GOOD.value
