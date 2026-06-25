"""SQLAlchemy ORM models.

Field names on HydraulicStructure intentionally match the frontend
`Structure` interface (name, type, district, condition, risk_level,
latitude, longitude, length_km, year_built, last_inspection, description)
so the read schema serializes 1:1 with no mapping.
"""
from datetime import date, datetime

from sqlalchemy import (
    JSON,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class StructureType(Base):
    __tablename__ = "structure_types"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    name_ru: Mapped[str] = mapped_column(String(80))
    icon: Mapped[str] = mapped_column(String(16), default="")
    color: Mapped[str] = mapped_column(String(16), default="#64748b")


class ConditionCategory(Base):
    __tablename__ = "condition_categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    name_ru: Mapped[str] = mapped_column(String(80))
    color: Mapped[str] = mapped_column(String(16), default="#64748b")
    severity: Mapped[int] = mapped_column(Integer, default=0)


class HydraulicStructure(Base):
    __tablename__ = "hydraulic_structures"

    id: Mapped[int] = mapped_column(primary_key=True)

    # --- Contract fields (consumed by the frontend) ---
    name: Mapped[str] = mapped_column(String(255), index=True)
    type: Mapped[str] = mapped_column(String(80), index=True)        # RU label
    type_code: Mapped[str] = mapped_column(String(40), index=True)   # machine code
    district: Mapped[str] = mapped_column(String(120), index=True)
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    condition: Mapped[str] = mapped_column(String(40), index=True)
    risk_level: Mapped[str] = mapped_column(String(40), index=True)
    length_km: Mapped[float | None] = mapped_column(Float, nullable=True)
    year_built: Mapped[int | None] = mapped_column(Integer, nullable=True)
    last_inspection: Mapped[date | None] = mapped_column(Date, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # --- Extended fields (rich object card + risk model + analytics) ---
    risk_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    next_inspection: Mapped[date | None] = mapped_column(Date, nullable=True)
    water_source: Mapped[str | None] = mapped_column(String(120), nullable=True)
    locality: Mapped[str | None] = mapped_column(String(160), nullable=True)
    significance: Mapped[str] = mapped_column(String(40), default="local")

    # Canal / technical parameters (from the official dataset)
    length_earthen_km: Mapped[float | None] = mapped_column(Float, nullable=True)
    length_lined_km: Mapped[float | None] = mapped_column(Float, nullable=True)
    capacity: Mapped[float | None] = mapped_column(Float, nullable=True)        # м³/с
    area_ha: Mapped[float | None] = mapped_column(Float, nullable=True)         # га
    efficiency_design: Mapped[float | None] = mapped_column(Float, nullable=True)
    efficiency_actual: Mapped[float | None] = mapped_column(Float, nullable=True)
    wear_percent: Mapped[float | None] = mapped_column(Float, nullable=True)
    structures_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cadastral_number: Mapped[str | None] = mapped_column(String(80), nullable=True)
    state_act: Mapped[str | None] = mapped_column(String(80), nullable=True)

    # Provenance / verification (TZ: data integration + dedup)
    source: Mapped[str] = mapped_column(String(40), default="dataset")          # dataset|generated|manual
    verification_status: Mapped[str] = mapped_column(String(40), default="verified")

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    inspections: Mapped[list["Inspection"]] = relationship(
        back_populates="structure", cascade="all, delete-orphan"
    )
    repairs: Mapped[list["Repair"]] = relationship(
        back_populates="structure", cascade="all, delete-orphan"
    )
    risk_assessments: Mapped[list["RiskAssessment"]] = relationship(
        back_populates="structure", cascade="all, delete-orphan"
    )


class Inspection(Base):
    __tablename__ = "inspections"

    id: Mapped[int] = mapped_column(primary_key=True)
    structure_id: Mapped[int] = mapped_column(
        ForeignKey("hydraulic_structures.id", ondelete="CASCADE"), index=True
    )
    date: Mapped[date] = mapped_column(Date)
    inspector: Mapped[str | None] = mapped_column(String(160), nullable=True)
    inspection_type: Mapped[str] = mapped_column(String(40), default="Плановый")
    condition_found: Mapped[str | None] = mapped_column(String(40), nullable=True)
    wear_found: Mapped[float | None] = mapped_column(Float, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    structure: Mapped["HydraulicStructure"] = relationship(back_populates="inspections")


class Repair(Base):
    __tablename__ = "repairs"

    id: Mapped[int] = mapped_column(primary_key=True)
    structure_id: Mapped[int] = mapped_column(
        ForeignKey("hydraulic_structures.id", ondelete="CASCADE"), index=True
    )
    repair_date: Mapped[date] = mapped_column(Date)
    repair_type: Mapped[str] = mapped_column(String(40), default="Текущий ремонт")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    structure: Mapped["HydraulicStructure"] = relationship(back_populates="repairs")


class RiskAssessment(Base):
    __tablename__ = "risk_assessments"

    id: Mapped[int] = mapped_column(primary_key=True)
    structure_id: Mapped[int] = mapped_column(
        ForeignKey("hydraulic_structures.id", ondelete="CASCADE"), index=True
    )
    computed_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    risk_level: Mapped[str] = mapped_column(String(40))
    score: Mapped[float] = mapped_column(Float)
    factors: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    recommendation: Mapped[str | None] = mapped_column(Text, nullable=True)

    structure: Mapped["HydraulicStructure"] = relationship(back_populates="risk_assessments")
