"""Geo helpers: coordinate generation INSIDE real Zhambyl-region district
boundaries (GADM polygons), plus a haversine distance for the discovery module.
"""
import json
import math
import random
from pathlib import Path

from ..enums import DISTRICTS, DISTRICT_NAMES

# Bounding box of Zhambyl region (rough), used as a hard clamp.
LAT_MIN, LAT_MAX = 42.2, 45.0
LNG_MIN, LNG_MAX = 69.3, 75.2

_GEOJSON = Path(__file__).resolve().parent.parent / "seed" / "data" / "zhambyl_districts.geojson"
_POLYS: dict[str, list] | None = None   # district -> list of polygons ([exterior, *holes])


def _load_polys() -> dict[str, list]:
    global _POLYS
    if _POLYS is None:
        _POLYS = {}
        if _GEOJSON.exists():
            data = json.loads(_GEOJSON.read_text(encoding="utf-8"))
            for ft in data["features"]:
                d = ft["properties"]["district"]
                g = ft["geometry"]
                polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
                _POLYS.setdefault(d, []).extend(polys)
    return _POLYS


def _pt_in_ring(x: float, y: float, ring: list) -> bool:
    inside = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i][0], ring[i][1]
        xj, yj = ring[j][0], ring[j][1]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside


def _pt_in_poly(x: float, y: float, poly: list) -> bool:
    if not _pt_in_ring(x, y, poly[0]):
        return False
    return not any(_pt_in_ring(x, y, hole) for hole in poly[1:])


def pick_district(seed: int) -> str:
    """Deterministically map an arbitrary integer to a real district."""
    return DISTRICT_NAMES[seed % len(DISTRICT_NAMES)]


def coords_for_district(district: str, seed: int, spread: float = 0.18) -> tuple[float, float]:
    """Reproducible (lat, lng) sampled INSIDE the district's real boundary
    (rejection sampling); falls back to a jittered center if no polygon."""
    polys = _load_polys().get(district)
    rng = random.Random(f"{district}:{seed}")
    if polys:
        # use the largest polygon (skip tiny enclaves)
        poly = max(polys, key=lambda p: _bbox_area(p[0]))
        xs = [pt[0] for pt in poly[0]]
        ys = [pt[1] for pt in poly[0]]
        xmin, xmax, ymin, ymax = min(xs), max(xs), min(ys), max(ys)
        for _ in range(250):
            x = rng.uniform(xmin, xmax)
            y = rng.uniform(ymin, ymax)
            if _pt_in_poly(x, y, poly):
                return round(y, 5), round(x, 5)   # (lat, lng)

    center_lat, center_lng, _river = DISTRICTS.get(district, (42.9, 71.39, ""))
    lat = center_lat + (rng.random() - 0.5) * 2 * spread
    lng = center_lng + (rng.random() - 0.5) * 2 * spread * 1.4
    lat = max(LAT_MIN, min(LAT_MAX, lat))
    lng = max(LNG_MIN, min(LNG_MAX, lng))
    return round(lat, 5), round(lng, 5)


def _bbox_area(ring: list) -> float:
    xs = [p[0] for p in ring]
    ys = [p[1] for p in ring]
    return (max(xs) - min(xs)) * (max(ys) - min(ys))


def in_zhambyl(lat: float, lng: float) -> bool:
    """True if the point falls inside ANY Zhambyl-region district polygon."""
    for polys in _load_polys().values():
        for poly in polys:
            if _pt_in_poly(lng, lat, poly):
                return True
    return False


_CLUSTERS: dict[str, list[tuple[float, float]]] = {}   # district -> [(lng, lat), ...]


def _district_clusters(district: str, k: int = 3) -> list[tuple[float, float]]:
    """A few deterministic cluster centres inside the district (irrigation hubs)."""
    if district not in _CLUSTERS:
        centers: list[tuple[float, float]] = []
        polys = _load_polys().get(district)
        if polys:
            poly = max(polys, key=lambda p: _bbox_area(p[0]))
            xs = [pt[0] for pt in poly[0]]
            ys = [pt[1] for pt in poly[0]]
            xmin, xmax, ymin, ymax = min(xs), max(xs), min(ys), max(ys)
            rng = random.Random(f"clusters:{district}")
            tries = 0
            while len(centers) < k and tries < 400:
                tries += 1
                x, y = rng.uniform(xmin, xmax), rng.uniform(ymin, ymax)
                if _pt_in_poly(x, y, poly):
                    centers.append((x, y))
        _CLUSTERS[district] = centers
    return _CLUSTERS[district]


def cluster_coords_for_district(district: str, seed: int) -> tuple[float, float]:
    """Mix of clustered points (~78% around a few hubs → 'очаги') and scattered
    individual points (~22% uniform in the district). Always inside the boundary."""
    polys = _load_polys().get(district)
    if not polys:
        return coords_for_district(district, seed)
    poly = max(polys, key=lambda p: _bbox_area(p[0]))
    rng = random.Random(f"clu:{district}:{seed}")
    centers = _district_clusters(district)
    if centers and rng.random() < 0.78:
        cx, cy = rng.choice(centers)
        for _ in range(60):
            x = cx + rng.gauss(0, 0.04)
            y = cy + rng.gauss(0, 0.032)
            if _pt_in_poly(x, y, poly):
                return round(y, 5), round(x, 5)
        return round(cy, 5), round(cx, 5)
    return coords_for_district(district, seed)   # scattered (point-in-polygon)


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
