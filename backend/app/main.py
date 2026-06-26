# backend/app/main.py
"""HydraTechnology API — intelligent monitoring & assessment of hydraulic
structures of the Zhambyl region.

Run (dev):  uvicorn app.main:app --reload --port 8000
Docs:       http://localhost:8000/docs
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from .config import settings
from .database import Base, engine
from .routers import analytics, detection, imports, meta, reports, structures, forecast
from .seed.seed import ensure_seeded

# ── 1. Create tables that don’t exist yet ────────────────────────────────────
Base.metadata.create_all(bind=engine)

# ── 2. Auto-migrate: add missing columns to existing tables ──────────────────
#    SQLite ALTER TABLE only supports ADD COLUMN, so we just add what’s missing.
_MIGRATIONS = [
    # (table, column, column_def)
    ("inspections",          "inspection_type",    "VARCHAR(40) NOT NULL DEFAULT 'Плановый'"),
    ("inspections",          "condition_found",    "VARCHAR(40)"),
    ("inspections",          "wear_found",         "FLOAT"),
    ("inspections",          "notes",              "TEXT"),
    ("repairs",              "repair_type",        "VARCHAR(40) NOT NULL DEFAULT 'Текущий ремонт'"),
    ("repairs",              "notes",              "TEXT"),
    ("hydraulic_structures", "risk_score",         "FLOAT"),
    ("hydraulic_structures", "next_inspection",    "DATE"),
    ("hydraulic_structures", "water_source",       "VARCHAR(120)"),
    ("hydraulic_structures", "locality",           "VARCHAR(160)"),
    ("hydraulic_structures", "significance",       "VARCHAR(40) DEFAULT 'local'"),
    ("hydraulic_structures", "length_earthen_km",  "FLOAT"),
    ("hydraulic_structures", "length_lined_km",    "FLOAT"),
    ("hydraulic_structures", "capacity",           "FLOAT"),
    ("hydraulic_structures", "area_ha",            "FLOAT"),
    ("hydraulic_structures", "efficiency_design",  "FLOAT"),
    ("hydraulic_structures", "efficiency_actual",  "FLOAT"),
    ("hydraulic_structures", "wear_percent",       "FLOAT"),
    ("hydraulic_structures", "structures_count",   "INTEGER"),
    ("hydraulic_structures", "cadastral_number",   "VARCHAR(80)"),
    ("hydraulic_structures", "state_act",          "VARCHAR(80)"),
    ("hydraulic_structures", "source",             "VARCHAR(40) DEFAULT 'dataset'"),
    ("hydraulic_structures", "verification_status","VARCHAR(40) DEFAULT 'verified'"),
    ("hydraulic_structures", "type_code",          "VARCHAR(40) DEFAULT 'other'"),
]

_inspector = inspect(engine)
_existing_tables = _inspector.get_table_names()

with engine.connect() as _conn:
    for _table, _column, _col_def in _MIGRATIONS:
        if _table not in _existing_tables:
            continue
        _existing_cols = {c["name"] for c in _inspector.get_columns(_table)}
        if _column not in _existing_cols:
            _conn.execute(text(f'ALTER TABLE "{_table}" ADD COLUMN "{_column}" {_col_def}'))
    _conn.commit()

# ── 3. Seed demo data if empty ───────────────────────────────────────────────
ensure_seeded()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Цифровой каталог и оценка состояния гидротехнических сооружений Жамбылской области.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(structures.router)
app.include_router(analytics.router)
app.include_router(meta.router)
app.include_router(detection.router)
app.include_router(reports.router)
app.include_router(imports.router)
app.include_router(forecast.router)


@app.get("/", tags=["health"])
def root():
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "status": "ok",
        "docs": "/docs",
    }


@app.get("/api/health", tags=["health"])
def health():
    return {"status": "ok"}
