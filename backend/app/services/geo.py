"""Geo helpers: deterministic coordinate generation within Zhambyl region
districts, plus a haversine distance (used later by the discovery/dedup module).
"""
import math
import random

from ..enums import DISTRICTS, DISTRICT_NAMES

# Bounding box of Zhambyl region (rough), used as a hard clamp.
LAT_MIN, LAT_MAX = 42.2, 45.0
LNG_MIN, LNG_MAX = 69.3, 75.2


def pick_district(seed: int) -> str:
    """Deterministically map an arbitrary integer to a real district."""
    return DISTRICT_NAMES[seed % len(DISTRICT_NAMES)]


def coords_for_district(district: str, seed: int, spread: float = 0.18) -> tuple[float, float]:
    """Reproducible (lat, lng) jittered around a district center."""
    center_lat, center_lng, _river = DISTRICTS.get(district, (42.9, 71.39, ""))
    rng = random.Random(f"{district}:{seed}")
    lat = center_lat + (rng.random() - 0.5) * 2 * spread
    lng = center_lng + (rng.random() - 0.5) * 2 * spread * 1.4
    lat = max(LAT_MIN, min(LAT_MAX, lat))
    lng = max(LNG_MIN, min(LNG_MAX, lng))
    return round(lat, 5), round(lng, 5)


def river_for_district(district: str) -> str:
    return DISTRICTS.get(district, (0, 0, "р. Талас"))[2]


def nearest_district(lat: float, lng: float) -> str:
    """District whose center is closest to the given point."""
    best, best_d = DISTRICT_NAMES[0], float("inf")
    for name, (clat, clng, _r) in DISTRICTS.items():
        d = (clat - lat) ** 2 + (clng - lng) ** 2
        if d < best_d:
            best, best_d = name, d
    return best


def haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance in meters."""
    r = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))
