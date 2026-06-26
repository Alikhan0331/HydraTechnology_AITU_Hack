"""Structure discovery & deduplication (TZ tasks 3 & 4).

Given a point + radius, find hydraulic structures and compare them with the
existing catalog. Two REAL sources are used (no fabricated data):

  1. `catalog` — objects already in our DB within the radius  → matched (has id)
  2. `osm`     — real objects from OpenStreetMap. Live via Overpass when the
                 venue has internet; otherwise a cached real snapshot of the
                 Zhambyl region bundled in the repo (app/seed/data/osm_zhambyl.json).

Every OSM object is compared to the nearest catalog object by Haversine distance
(and name similarity). If it matches an existing object → counted as matched and
not duplicated; if not → returned as a NEW candidate flagged needs_check.
"""
import json
import math
import re
from pathlib import Path

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models
from ..enums import STRUCTURE_TYPES
from .geo import haversine_m, in_zhambyl

OVERPASS_MIRRORS = [
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]
CACHE_FILE = Path(__file__).resolve().parent.parent / "seed" / "data" / "osm_zhambyl.json"

MATCH_DIST_M = 350          # same object if closer than this
NAME_MATCH_DIST_M = 1200    # ... or this close AND a similar name


def _clamp(x, lo, hi):
    return max(lo, min(hi, x))


# --- name normalization for fuzzy dedup -------------------------------------
_STOP = ("канал", "кан.", "кан ", "р.", "вдхр.", "бөгені", "плотина", "дамба",
         "насосная", "станция", "гидропост", "шлюз", "№", "no", "the")


def _norm_name(name: str | None) -> str:
    if not name:
        return ""
    s = name.lower()
    for w in _STOP:
        s = s.replace(w, " ")
    s = re.sub(r"[^a-zа-яё0-9 ]", " ", s)
    return " ".join(s.split())


def _name_similar(a: str | None, b: str | None) -> bool:
    """Strict name match: equal / containment / high token overlap that includes
    a meaningful (non-numeric) shared word. Avoids false matches on a shared
    river name ('Талас') or a shared number ('№77')."""
    na, nb = _norm_name(a), _norm_name(b)
    if not na or not nb:
        return False
    if na == nb:
        return True
    if na.isdigit() or nb.isdigit():
        return False  # numeric ids (e.g. "№15"): require an exact match only
    if (na in nb or nb in na) and abs(len(na) - len(nb)) <= 4:
        return True
    ta, tb = set(na.split()), set(nb.split())
    if not ta or not tb:
        return False
    inter = ta & tb
    jaccard = len(inter) / len(ta | tb)
    meaningful = any(not t.isdigit() and len(t) >= 4 for t in inter)
    return jaccard >= 0.6 and meaningful


# --- 1. Catalog objects within the radius -----------------------------------
def _db_in_radius(db: Session, lat, lon, radius_m, limit=30):
    dlat = radius_m / 111_000
    dlon = radius_m / (111_000 * max(math.cos(math.radians(lat)), 0.1))
    stmt = select(models.HydraulicStructure).where(
        models.HydraulicStructure.latitude.between(lat - dlat, lat + dlat),
        models.HydraulicStructure.longitude.between(lon - dlon, lon + dlon),
    )
    found = []
    for s in db.scalars(stmt):
        d = haversine_m(lat, lon, s.latitude, s.longitude)
        if d <= radius_m:
            found.append((d, s))
    found.sort(key=lambda t: t[0])
    return found[:limit]


def _nearest_db(db_objs, lat, lon):
    best, best_d = None, float("inf")
    for s in db_objs:
        d = haversine_m(lat, lon, s.latitude, s.longitude)
        if d < best_d:
            best, best_d = s, d
    return best, best_d


# --- 2. OSM source (live Overpass → cached real snapshot) -------------------
def _query_overpass_live(lat, lon, radius_m):
    q = f"""
    [out:json][timeout:12];
    (
      nwr(around:{int(radius_m)},{lat},{lon})["waterway"~"canal|ditch|dam|weir|lock_gate"];
      nwr(around:{int(radius_m)},{lat},{lon})["man_made"~"pumping_station|dyke|embankment"];
      nwr(around:{int(radius_m)},{lat},{lon})["water"="reservoir"];
    );
    out center 60;
    """
    headers = {"User-Agent": "HydraTechnology-Hackathon/1.0"}
    for url in OVERPASS_MIRRORS:
        try:
            r = httpx.post(url, data={"data": q}, headers=headers, timeout=12)
            if r.status_code == 200 and "elements" in r.text[:5000]:
                return _normalize_overpass(r.json().get("elements", [])), "live"
        except Exception:
            continue
    return None, None


def _classify(tags: dict) -> str:
    w, m = tags.get("waterway"), tags.get("man_made")
    if w in ("canal", "ditch"):
        return "canal"
    if w == "dam" or tags.get("water") == "reservoir":
        return "dam"
    if w in ("weir", "lock_gate") or tags.get("lock") == "yes":
        return "sluice"
    if m == "pumping_station":
        return "pumping_station"
    if m in ("dyke", "embankment"):
        return "dike"
    return "other"


def _normalize_overpass(elements):
    out = []
    for el in elements:
        lat, lon = el.get("lat"), el.get("lon")
        if lat is None and "center" in el:
            lat, lon = el["center"].get("lat"), el["center"].get("lon")
        if lat is None:
            continue
        t = el.get("tags", {})
        out.append({"lat": lat, "lon": lon, "type_code": _classify(t),
                    "name": t.get("name") or t.get("name:ru")})
    return out


def _load_cached_osm(lat, lon, radius_m):
    if not CACHE_FILE.exists():
        return []
    data = json.loads(CACHE_FILE.read_text(encoding="utf-8"))
    return [o for o in data if haversine_m(lat, lon, o["lat"], o["lon"]) <= radius_m]


# --- Orchestration ----------------------------------------------------------
def search(db: Session, lat: float, lon: float, radius_km: float) -> dict:
    radius_m = max(1.0, radius_km) * 1000
    results: list[dict] = []

    # 1. catalog objects in radius (real, from our DB)
    db_hits = _db_in_radius(db, lat, lon, radius_m)
    db_objs = [s for _d, s in db_hits]
    for d, s in db_hits:
        conf = round(_clamp(0.98 - (d / radius_m) * 0.2, 0.75, 0.98), 2)
        results.append({"id": s.id, "name": s.name, "type": s.type,
                        "lat": s.latitude, "lon": s.longitude, "confidence": conf,
                        "source": "catalog", "condition": s.condition,
                        "verification_status": "verified"})

    # 2. OSM objects (live Overpass, else cached real snapshot)
    osm, osm_mode = _query_overpass_live(lat, lon, radius_m)
    if osm is None:
        osm, osm_mode = _load_cached_osm(lat, lon, radius_m), "cached"

    matched = new = 0
    for o in osm:
        if not in_zhambyl(o["lat"], o["lon"]):
            continue   # keep detection inside Zhambyl (no cross-border objects)
        near, nd = _nearest_db(db_objs, o["lat"], o["lon"])
        is_match = near is not None and (
            nd <= MATCH_DIST_M
            or (nd <= NAME_MATCH_DIST_M and _name_similar(o.get("name"), near.name))
        )
        if is_match:
            matched += 1
            continue
        new += 1
        named = bool(o.get("name"))
        results.append({
            "id": None,
            "name": o.get("name") or f"{STRUCTURE_TYPES[o['type_code']][0]} (OSM, не в базе)",
            "type": STRUCTURE_TYPES[o["type_code"]][0],
            "lat": round(o["lat"], 6), "lon": round(o["lon"], 6),
            "confidence": round(0.7 + (0.15 if named else 0.0), 2),
            "source": "osm", "condition": None,
            "verification_status": "needs_check",
        })

    results.sort(key=lambda r: r["confidence"], reverse=True)
    return {
        "center": {"lat": lat, "lon": lon},
        "radius_km": radius_km,
        "osm_source": osm_mode or "none",   # live | cached | none
        "summary": {
            "total": len(results),
            "in_catalog": sum(1 for r in results if r["id"] is not None),
            "new_or_unverified": sum(1 for r in results if r["id"] is None),
            "osm_checked": len(osm),
            "osm_matched_existing": matched,
            "osm_new": new,
        },
        "structures": results,
    }
