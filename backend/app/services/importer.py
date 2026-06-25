"""Bulk import of structures from CSV / Excel (TZ task 2: integrate data from
multiple sources).

Flexible column mapping (RU/EN headers), automatic classification + risk via
crud.create_structure, district-center fallback when coordinates are missing,
and on-ingest deduplication against the existing catalog (TZ task 4).
"""
import csv
import io

from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import crud, models, schemas
from ..enums import CONDITIONS, ConditionCode
from .discovery import _name_similar
from .geo import coords_for_district, haversine_m

# canonical field -> accepted header variants (lowercased)
_SYNONYMS = {
    "name": ["name", "наименование", "название", "имя", "объект", "object"],
    "type": ["type", "тип"],
    "district": ["district", "район", "area", "регион"],
    "latitude": ["latitude", "lat", "широта"],
    "longitude": ["longitude", "lon", "lng", "долгота"],
    "year_built": ["year_built", "year", "год", "год постройки", "год ввода",
                   "год ввода в эксплуатацию"],
    "length_km": ["length_km", "length", "длина", "длина, км", "протяженность",
                  "протяжённость"],
    "condition": ["condition", "состояние", "техническое состояние"],
    "wear_percent": ["wear", "wear_percent", "износ", "процент износа", "износ, %"],
    "water_source": ["water_source", "водоисточник", "река", "источник"],
    "capacity": ["capacity", "пропускная способность", "расход"],
}
_HEADER_TO_FIELD = {alias: field for field, al in _SYNONYMS.items() for alias in al}

# condition label/code -> code
_COND_IN = {c.value: c.value for c in ConditionCode}
_COND_IN.update({CONDITIONS[c][0].lower(): c.value for c in ConditionCode})
_COND_IN.update({"исправно": "good", "норма": "good", "удовлетворительное": "monitoring",
                 "неудовлетворительное": "requires_repair", "критическое": "emergency"})

DUP_DISTANCE_M = 500


def _num(v):
    if v is None:
        return None
    s = str(v).strip().replace(",", ".").replace("%", "")
    if not s:
        return None
    try:
        return float(s)
    except ValueError:
        return None


def _int(v):
    f = _num(v)
    return int(f) if f is not None else None


# --- parsing ----------------------------------------------------------------
def parse_csv(content: bytes) -> list[dict]:
    text = content.decode("utf-8-sig", errors="replace")
    sample = text[:2048]
    delim = ";" if sample.count(";") >= sample.count(",") else ","
    reader = csv.DictReader(io.StringIO(text), delimiter=delim)
    return [dict(row) for row in reader]


def parse_xlsx(content: bytes) -> list[dict]:
    from openpyxl import load_workbook

    wb = load_workbook(io.BytesIO(content), read_only=True, data_only=True)
    ws = wb.active
    rows = ws.iter_rows(values_only=True)
    headers = [str(h).strip() if h is not None else "" for h in next(rows, [])]
    out = []
    for r in rows:
        if all(c is None for c in r):
            continue
        out.append({headers[i]: r[i] for i in range(min(len(headers), len(r)))})
    return out


def parse_file(filename: str, content: bytes) -> list[dict]:
    name = (filename or "").lower()
    if name.endswith((".xlsx", ".xlsm")):
        return parse_xlsx(content)
    return parse_csv(content)


# --- normalization ----------------------------------------------------------
def normalize_row(raw: dict) -> dict:
    out: dict = {}
    for key, value in raw.items():
        field = _HEADER_TO_FIELD.get(str(key).strip().lower())
        if field and value not in (None, ""):
            out[field] = value
    norm = {
        "name": str(out["name"]).strip() if out.get("name") else None,
        "type": str(out["type"]).strip() if out.get("type") else None,
        "district": str(out["district"]).strip() if out.get("district") else None,
        "latitude": _num(out.get("latitude")),
        "longitude": _num(out.get("longitude")),
        "year_built": _int(out.get("year_built")),
        "length_km": _num(out.get("length_km")),
        "wear_percent": _num(out.get("wear_percent")),
        "capacity": _num(out.get("capacity")),
        "water_source": str(out["water_source"]).strip() if out.get("water_source") else None,
        "condition": _COND_IN.get(str(out["condition"]).strip().lower()) if out.get("condition") else None,
    }
    return norm


# --- dedup against the catalog (TZ task 4 on ingest) ------------------------
def _find_duplicate(db: Session, name: str, lat: float, lon: float):
    dlat, dlon = 0.01, 0.013
    stmt = select(models.HydraulicStructure).where(
        models.HydraulicStructure.latitude.between(lat - dlat, lat + dlat),
        models.HydraulicStructure.longitude.between(lon - dlon, lon + dlon),
    )
    for s in db.scalars(stmt):
        d = haversine_m(lat, lon, s.latitude, s.longitude)
        if d <= DUP_DISTANCE_M and (_name_similar(name, s.name) or d <= 120):
            return s
    return None


# --- orchestration ----------------------------------------------------------
def import_rows(db: Session, rows: list[dict]) -> dict:
    created, duplicates, errors = [], [], []
    for i, raw in enumerate(rows, start=1):
        try:
            r = normalize_row(raw)
            if not r["name"]:
                errors.append({"row": i, "reason": "нет названия (name)"})
                continue

            lat, lon = r["latitude"], r["longitude"]
            geocoded = False
            if lat is None or lon is None:
                if r["district"]:
                    lat, lon = coords_for_district(r["district"], i)
                    geocoded = True
                else:
                    errors.append({"row": i, "reason": "нет координат и района"})
                    continue

            dup = _find_duplicate(db, r["name"], lat, lon)
            if dup:
                duplicates.append({"row": i, "name": r["name"],
                                   "matched_id": dup.id, "matched_name": dup.name})
                continue

            payload = schemas.StructureCreate(
                name=r["name"], type=r["type"] or "Другое",
                district=r["district"] or "Тараз (город)",
                latitude=lat, longitude=lon, condition=r["condition"],
                length_km=r["length_km"], year_built=r["year_built"],
                wear_percent=r["wear_percent"], capacity=r["capacity"],
                water_source=r["water_source"],
            )
            obj = crud.create_structure(db, payload, source="imported",
                                        verification_status="needs_check")
            created.append({"row": i, "id": obj.id, "name": obj.name,
                            "condition": obj.condition, "risk_level": obj.risk_level,
                            "geocoded": geocoded})
        except Exception as exc:  # one bad row must not abort the whole import
            errors.append({"row": i, "reason": str(exc)[:140]})

    return {
        "total_rows": len(rows),
        "created": len(created),
        "duplicates": len(duplicates),
        "errors": len(errors),
        "created_items": created[:50],
        "duplicate_items": duplicates[:50],
        "error_items": errors[:50],
    }


TEMPLATE_CSV = (
    "name;type;district;latitude;longitude;year_built;length_km;condition;wear_percent;water_source\n"
    "Канал Демонстрационный;Канал;Жамбылский;42.90;71.40;1985;12.5;good;25;р. Талас\n"
    "Плотина Пример;Плотина;Меркенский;42.87;73.18;1979;;requires_repair;65;р. Мерке\n"
)
