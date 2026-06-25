"""/api/detection — coordinate-based structure discovery & deduplication.

Consumed by the frontend Detection page:
    GET /api/detection/search?lat=..&lon=..&radius_km=..
    → { structures: [{id?, name, type, lat, lon, confidence, source, condition?}], ... }
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..services import discovery

router = APIRouter(prefix="/api/detection", tags=["detection"])


@router.get("/search")
def search(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    radius_km: float = Query(50, ge=1, le=300),
    db: Session = Depends(get_db),
):
    return discovery.search(db, lat, lon, radius_km)
