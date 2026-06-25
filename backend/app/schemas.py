"""Pydantic schemas = the API contract shared with the frontend.

`StructureRead` is a superset of the frontend `Structure` interface:
the frontend reads the fields it knows and ignores the rest, so the
extra technical fields are non-breaking.
"""
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, computed_field


# --------------------------------------------------------------------------- #
#  Structures
# --------------------------------------------------------------------------- #
class StructureBase(BaseModel):
    name: str
    type: str = Field(examples=["Канал"])
    district: str = Field(examples=["Жамбылский"])
    latitude: float
    longitude: float
    condition: str | None = Field(default=None, examples=["good"])
    risk_level: str | None = Field(default=None, examples=["low"])
    length_km: float | None = None
    year_built: int | None = None
    last_inspection: date | None = None
    description: str | None = None
    water_source: str | None = None
    significance: str | None = "local"
    wear_percent: float | None = None
    capacity: float | None = None


class StructureCreate(StructureBase):
    """condition/risk_level are optional on create — derived if omitted."""


class StructureUpdate(BaseModel):
    name: str | None = None
    type: str | None = None
    district: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    condition: str | None = None
    risk_level: str | None = None
    length_km: float | None = None
    year_built: int | None = None
    last_inspection: date | None = None
    description: str | None = None
    water_source: str | None = None
    significance: str | None = None
    wear_percent: float | None = None
    capacity: float | None = None


class StructureRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    type: str
    type_code: str
    district: str
    latitude: float
    longitude: float
    condition: str
    risk_level: str
    risk_score: float | None = None
    length_km: float | None = None
    year_built: int | None = None
    last_inspection: date | None = None
    next_inspection: date | None = None
    description: str | None = None

    # extended / technical
    water_source: str | None = None
    locality: str | None = None
    significance: str | None = None
    length_earthen_km: float | None = None
    length_lined_km: float | None = None
    capacity: float | None = None
    area_ha: float | None = None
    efficiency_design: float | None = None
    efficiency_actual: float | None = None
    wear_percent: float | None = None
    structures_count: int | None = None
    cadastral_number: str | None = None
    state_act: str | None = None
    source: str | None = None
    verification_status: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class InspectionPublic(BaseModel):
    """Inspection shape consumed by the object card (frontend ObjectDetails)."""
    date: date
    inspector: str | None = None
    result: str | None = None      # mapped from Inspection.notes
    condition: str | None = None   # mapped from Inspection.condition_found


class StructureDetail(StructureRead):
    """Full object card: structure + its inspection history."""
    inspections: list[InspectionPublic] = []


class StructureMapItem(BaseModel):
    """Lightweight payload for the map (one record per marker)."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    type: str
    district: str
    condition: str
    risk_level: str
    latitude: float
    longitude: float


# --------------------------------------------------------------------------- #
#  Inspections
# --------------------------------------------------------------------------- #
class InspectionCreate(BaseModel):
    date: date
    inspector: str | None = None
    condition_found: str | None = None
    wear_found: float | None = None
    notes: str | None = None


class InspectionRead(InspectionCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    structure_id: int


# --------------------------------------------------------------------------- #
#  Risk
# --------------------------------------------------------------------------- #
class RiskAssessmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    risk_level: str
    score: float
    factors: dict | None = None
    recommendation: str | None = None
    computed_at: datetime | None = None
    next_inspection: date | None = None

    @computed_field  # alias so the frontend can read either `score` or `risk_score`
    @property
    def risk_score(self) -> float:
        return self.score


# --------------------------------------------------------------------------- #
#  Analytics
# --------------------------------------------------------------------------- #
class SummaryResponse(BaseModel):
    """Shape consumed by the Dashboard (frontend `getSummary`)."""
    total: int
    by_condition: dict[str, int]
    by_type: dict[str, int]
    # extras (ignored by current frontend, used by richer dashboard)
    by_district: dict[str, int]
    by_risk: dict[str, int]
    by_significance: dict[str, int]
    emergency: int
    requires_repair: int
    overall_condition_index: int
    total_length_km: float
    avg_age_years: float


# --------------------------------------------------------------------------- #
#  Meta / reference
# --------------------------------------------------------------------------- #
class TypeMeta(BaseModel):
    code: str
    name_ru: str
    icon: str
    color: str


class ConditionMeta(BaseModel):
    code: str
    name_ru: str
    color: str
    severity: int
