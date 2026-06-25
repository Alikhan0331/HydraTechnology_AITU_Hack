# backend/app/main.py
"""HydraTechnology API — intelligent monitoring & assessment of hydraulic
structures of the Zhambyl region.

Run (dev):  uvicorn app.main:app --reload --port 8000
Docs:       http://localhost:8000/docs
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import Base, engine
from .routers import analytics, detection, meta, reports, structures
from .seed.seed import ensure_seeded

# Create tables and auto-seed an empty DB so the app is demo-ready on first run.
Base.metadata.create_all(bind=engine)
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
