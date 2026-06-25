"""Build the full structure list for the demo catalog.

Sources:
  * REAL canal records from the official dataset (app/seed/data/canals_raw.json),
    re-anchored to real Zhambyl-region districts/rivers and given coordinates
    (the dataset has none) so the map is populated.
  * GENERATED objects of the other types (gidroposts, sluices, dams, ...) so the
    catalog, map and type-analytics cover the whole case, not only canals.
"""
import json
import random
from datetime import date, timedelta
from pathlib import Path

from ..enums import DISTRICT_NAMES, STRUCTURE_TYPES
from ..services import classification, geo
from ..services.risk_engine import compute_risk, next_inspection_date

DATA_FILE = Path(__file__).parent / "data" / "canals_raw.json"

RESERVOIRS = [
    "Тасөткельское вдхр.", "Терс-Ащибулакское вдхр.", "Ынталинское вдхр.",
    "Акколь", "Бектобе", "Куюк", "Каракунуз",
]


def _short_river(src: str | None) -> str:
    return (src or "р. Талас").replace("р. ", "")


def _inspection_date(condition: str, rng: random.Random) -> date:
    """Worse condition → older last inspection."""
    span = {
        "good": (60, 420), "monitoring": (300, 760),
        "requires_repair": (500, 1500), "emergency": (900, 2300),
    }.get(condition, (200, 900))
    return date.today() - timedelta(days=rng.randint(*span))


def _significance(length_km: float | None, type_code: str) -> str:
    if type_code in ("dam",) or (length_km and length_km >= 40):
        return "national" if (length_km and length_km >= 80) else "regional"
    if type_code in ("gidropost", "sluice", "pumping_station") and (length_km or 0) > 0:
        return "regional"
    if length_km and length_km >= 15:
        return "regional"
    return "local"


def _assemble(*, idx, name, type_code, district, year_built, length_km,
              tech_condition, wear_fraction, eff_design, eff_actual,
              water_source, locality, capacity, area_ha, length_earthen,
              length_lined, cadastral, state_act, structures_count, source,
              description):
    ru_name = STRUCTURE_TYPES[type_code][0]
    rng = random.Random(f"{type_code}:{idx}")
    lat, lng = geo.coords_for_district(district, idx)

    condition = classification.derive_condition(
        tech_condition, year_built, wear_fraction, eff_design, eff_actual
    )
    last_insp = _inspection_date(condition, rng)
    significance = _significance(length_km, type_code)
    risk = compute_risk(
        year_built=year_built, condition=condition, wear_fraction=wear_fraction,
        eff_design=eff_design, eff_actual=eff_actual, last_inspection=last_insp,
        significance=significance, type_code=type_code,
    )
    nxt = next_inspection_date(last_insp, risk["interval_days"], type_code)

    return {
        "name": name, "type": ru_name, "type_code": type_code, "district": district,
        "latitude": lat, "longitude": lng,
        "condition": condition, "risk_level": risk["risk_level"],
        "risk_score": risk["score"], "length_km": length_km,
        "year_built": year_built, "last_inspection": last_insp, "next_inspection": nxt,
        "description": description, "water_source": water_source, "locality": locality,
        "significance": significance,
        "length_earthen_km": length_earthen, "length_lined_km": length_lined,
        "capacity": capacity, "area_ha": area_ha,
        "efficiency_design": eff_design, "efficiency_actual": eff_actual,
        "wear_percent": round(wear_fraction * 100, 1) if wear_fraction is not None else None,
        "structures_count": structures_count,
        "cadastral_number": cadastral, "state_act": state_act,
        "source": source, "verification_status": "verified",
        "_recommendation": risk["recommendation"],
    }


def generate_canals() -> list[dict]:
    records = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    out = []
    for i, r in enumerate(records):
        district = DISTRICT_NAMES[(r.get("src_no") or i) % len(DISTRICT_NAMES)]
        river = geo.river_for_district(district)   # re-anchor placeholder "р. Иртыш"
        area = sum(v for v in (r.get("area_regular_ha"), r.get("area_liman_ha"),
                               r.get("area_flooded_ha")) if v) or None
        length = r.get("length_total_km")
        no = r.get("src_no") or i + 1
        out.append(_assemble(
            idx=f"c{i}", name=f"Канал №{no}",   # matches importer naming → re-import dedups
            type_code="canal", district=district, year_built=r.get("year_built"),
            length_km=length, tech_condition=r.get("tech_condition"),
            wear_fraction=r.get("wear_raw"), eff_design=r.get("eff_design"),
            eff_actual=r.get("eff_actual"), water_source=river,
            locality=r.get("rural_district"), capacity=r.get("capacity"),
            area_ha=area, length_earthen=r.get("length_earthen_km"),
            length_lined=r.get("length_lined_km"), cadastral=r.get("cadastral"),
            state_act=r.get("state_act"), structures_count=None, source="dataset",
            description=(
                f"Оросительный канал, водоисточник {river}. "
                f"Подвешенная площадь: {area or '—'} га. "
                f"Год ввода: {r.get('year_built') or '—'}."
            ),
        ))
    return out


# count of generated objects per additional type
_OTHER_COUNTS = {
    "gidropost": 36, "sluice": 40, "water_intake": 28,
    "pumping_station": 30, "dam": 22, "dike": 18, "other": 12,
}


def generate_other() -> list[dict]:
    out = []
    for type_code, count in _OTHER_COUNTS.items():
        for n in range(1, count + 1):
            rng = random.Random(f"{type_code}-{n}")
            district = DISTRICT_NAMES[rng.randrange(len(DISTRICT_NAMES))]
            river = geo.river_for_district(district)
            year = rng.randint(1955, 2018)
            # synthetic quality so conditions spread realistically
            tech = "unsatisfactory" if rng.random() < 0.28 else "satisfactory"
            wear = round(rng.uniform(0.1, 0.9), 2)

            if type_code == "gidropost":
                name = f"Гидропост «{_short_river(river)} — {district}»"
                length = None; cap = round(rng.uniform(2, 60), 1)
                desc = f"Гидрологический пост на {river}. Контроль уровня и расхода воды."
            elif type_code == "sluice":
                name = f"Шлюз-регулятор №{n} ({district})"
                length = None; cap = round(rng.uniform(1, 25), 1)
                desc = f"Шлюз-регулятор на оросительной системе, {district} район."
            elif type_code == "water_intake":
                name = f"Водозабор «{district}»"
                length = None; cap = round(rng.uniform(3, 40), 1)
                desc = f"Головной водозабор из {river}, {district} район."
            elif type_code == "pumping_station":
                name = f"Насосная станция №{n} ({district})"
                length = None; cap = round(rng.uniform(0.5, 12), 1)
                desc = f"Насосная станция машинного орошения, {district} район."
            elif type_code == "dam":
                name = f"Плотина {RESERVOIRS[(n - 1) % len(RESERVOIRS)]}"
                length = round(rng.uniform(0.3, 4.5), 1); cap = None
                desc = f"Водоподпорная плотина, {district} район."
            elif type_code == "dike":
                name = f"Дамба «{_short_river(river)}» №{n}"
                length = round(rng.uniform(0.5, 8), 1); cap = None
                desc = f"Защитная дамба вдоль {river}, {district} район."
            else:
                name = f"Объект ГТС №{n} ({district})"
                length = None; cap = None
                desc = f"Гидротехническое сооружение, {district} район."

            out.append(_assemble(
                idx=f"{type_code}{n}", name=name, type_code=type_code,
                district=district, year_built=year, length_km=length,
                tech_condition=tech, wear_fraction=wear, eff_design=None,
                eff_actual=None, water_source=river, locality=None, capacity=cap,
                area_ha=None, length_earthen=None, length_lined=None,
                cadastral=None, state_act=None,
                structures_count=rng.randint(0, 6) or None,
                source="generated", description=desc,
            ))
    return out


OSM_FILE = DATA_FILE.parent / "osm_zhambyl.json"


def generate_osm_real() -> list[dict]:
    """Add real, named objects from the OpenStreetMap snapshot to the catalog,
    with their REAL coordinates. This anchors part of the catalog to real
    geometry and lets the discovery/dedup compare and MATCH against the base."""
    if not OSM_FILE.exists():
        return []
    data = json.loads(OSM_FILE.read_text(encoding="utf-8"))
    seen: set[str] = set()
    out = []
    for i, o in enumerate(data):
        name = o.get("name")
        if not name or name in seen:
            continue
        seen.add(name)
        rng = random.Random(f"osm:{o['osm_id']}")
        district = geo.nearest_district(o["lat"], o["lon"])
        river = geo.river_for_district(district)
        tc = o["type_code"]
        rec = _assemble(
            idx=f"osm{i}", name=name, type_code=tc, district=district,
            year_built=rng.randint(1950, 2015),
            length_km=(round(rng.uniform(3, 45), 1) if tc in ("canal", "dike") else None),
            tech_condition=("unsatisfactory" if rng.random() < 0.3 else "satisfactory"),
            wear_fraction=round(rng.uniform(0.15, 0.85), 2),
            eff_design=None, eff_actual=None, water_source=river, locality=None,
            capacity=(round(rng.uniform(1, 30), 1)
                      if tc in ("pumping_station", "sluice", "water_intake") else None),
            area_ha=None, length_earthen=None, length_lined=None, cadastral=None,
            state_act=None, structures_count=None, source="osm",
            description=f"Реальный объект из OpenStreetMap, {district} район.",
        )
        rec["latitude"], rec["longitude"] = round(o["lat"], 6), round(o["lon"], 6)
        out.append(rec)
    return out


def build_all() -> list[dict]:
    return generate_canals() + generate_other() + generate_osm_real()
