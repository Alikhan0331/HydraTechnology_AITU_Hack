"""/api/meta — reference data for frontend dropdowns and legends."""
from fastapi import APIRouter

from ..enums import (
    CONDITIONS,
    DISTRICT_NAMES,
    RISK_LABELS,
    SIGNIFICANCE_LABELS,
    STRUCTURE_TYPES,
)

router = APIRouter(prefix="/api/meta", tags=["meta"])


@router.get("/types")
def types():
    return [
        {"code": code, "name_ru": ru, "icon": icon, "color": color}
        for code, (ru, icon, color) in STRUCTURE_TYPES.items()
    ]


@router.get("/conditions")
def conditions():
    return [
        {"code": c.value, "name_ru": ru, "color": color, "severity": sev}
        for c, (ru, color, sev) in CONDITIONS.items()
    ]


@router.get("/districts")
def districts():
    return DISTRICT_NAMES


@router.get("/risk-levels")
def risk_levels():
    return [{"code": k.value, "name_ru": v} for k, v in RISK_LABELS.items()]


@router.get("/significance")
def significance():
    return [{"code": k.value, "name_ru": v} for k, v in SIGNIFICANCE_LABELS.items()]
