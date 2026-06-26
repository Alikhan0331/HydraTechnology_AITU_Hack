"""Seed the database with the demo catalog.

Usage:
    python -m app.seed.seed            # seed if empty
    python -m app.seed.seed --reset    # wipe structures and reseed
"""
import random
import sys
from datetime import date, timedelta

from sqlalchemy import func, select

from ..database import Base, SessionLocal, engine
from ..enums import CONDITIONS, STRUCTURE_TYPES
from ..models import (
    ConditionCategory,
    HydraulicStructure,
    Inspection,
    Repair,
    RiskAssessment,
    StructureType,
)
from ..services import risk_score as rs
from .generate import build_all

# Inspection note templates per condition (shown on the object card).
_NOTES = {
    "good": [
        "Плановый осмотр. Нарушений не выявлено.",
        "Состояние удовлетворительное, замечаний нет.",
    ],
    "monitoring": [
        "Мелкие трещины в облицовке. Рекомендован периодический контроль.",
        "Локальный износ элементов, требуется наблюдение.",
    ],
    "requires_repair": [
        "Повреждения облицовки, снижена пропускная способность. Требуется ремонт.",
        "Износ несущих элементов сооружения. Рекомендован ремонт.",
    ],
    "emergency": [
        "Критические дефекты конструкции. Требуется внеплановый ремонт.",
        "Аварийное состояние тела сооружения/затвора. Ограничить эксплуатацию.",
    ],
}

# Inspection type pool per condition (worse condition → more unscheduled/emergency)
_INSP_TYPES = {
    "good": ["Плановый", "Плановый", "Плановый"],
    "monitoring": ["Плановый", "Плановый", "Внеочередной"],
    "requires_repair": ["Плановый", "Внеочередной", "Внеочередной"],
    "emergency": ["Плановый", "Внеочередной", "Аварийный"],
}
# How many repairs + which types per condition
_REPAIR_COUNT = {"good": (0, 1), "monitoring": (0, 1), "requires_repair": (1, 2), "emergency": (2, 3)}
_REPAIR_TYPES = {
    "good": ["Текущий ремонт"],
    "monitoring": ["Текущий ремонт"],
    "requires_repair": ["Текущий ремонт", "Капитальный ремонт"],
    "emergency": ["Капитальный ремонт", "Аварийный ремонт"],
}
_REPAIR_NOTES = {
    "Текущий ремонт": ["Очистка русла и текущий ремонт облицовки.",
                       "Текущий ремонт затворов и креплений откосов."],
    "Капитальный ремонт": ["Капитальный ремонт тела сооружения.",
                           "Реконструкция водопропускных элементов."],
    "Аварийный ремонт": ["Аварийный ремонт после весеннего паводка.",
                         "Срочное устранение аварийных дефектов конструкции."],
}


def _seed_catalogs(db):
    if not db.scalar(select(func.count()).select_from(StructureType)):
        for code, (ru, icon, color) in STRUCTURE_TYPES.items():
            db.add(StructureType(code=code, name_ru=ru, icon=icon, color=color))
    if not db.scalar(select(func.count()).select_from(ConditionCategory)):
        for cond, (ru, color, sev) in CONDITIONS.items():
            db.add(ConditionCategory(code=cond.value, name_ru=ru, color=color, severity=sev))
    db.commit()


def _seed_structures(db):
    rows = build_all()
    for r in rows:
        recommendation = r.pop("_recommendation", None)
        obj = HydraulicStructure(**r)
        db.add(obj)
        db.flush()  # assign id

        db.add(RiskAssessment(
            structure_id=obj.id, risk_level=obj.risk_level,
            score=obj.risk_score or 0.0,
            recommendation=recommendation,
            factors={"seeded": True},
        ))

        accidents = 0

        # --- inspection history (2–4 records, varied per object) ---
        rng = random.Random(f"insp:{obj.id}")
        last = obj.last_inspection
        insp_types = _INSP_TYPES.get(obj.condition, ["Плановый"])
        d = last
        for k in range(rng.randint(2, 4)):
            # most recent reflects current condition; first one is "Плановый"
            itype = insp_types[0] if k == 0 else rng.choice(insp_types)
            if itype == "Аварийный":
                accidents += 1
            db.add(Inspection(
                structure_id=obj.id, date=d, inspection_type=itype,
                inspector=rng.choice(["Отдел эксплуатации", "Жамбылводхоз",
                                      "Райводхоз", "Комиссия обследования"]),
                condition_found=obj.condition if k == 0 else "good",
                wear_found=obj.wear_percent,
                notes=rng.choice(_NOTES.get(obj.condition, ["Плановое обследование."])),
            ))
            d = d - timedelta(days=rng.randint(180, 540))

        # --- repair history (count + types depend on condition) ---
        rrng = random.Random(f"repair:{obj.id}")
        lo, hi = _REPAIR_COUNT.get(obj.condition, (0, 1))
        rtypes = _REPAIR_TYPES.get(obj.condition, ["Текущий ремонт"])
        rd = date.today() - timedelta(days=rrng.randint(200, 800))
        for _ in range(rrng.randint(lo, hi)):
            rtype = rrng.choice(rtypes)
            if rtype == "Аварийный ремонт":
                accidents += 1
            db.add(Repair(
                structure_id=obj.id, repair_date=rd, repair_type=rtype,
                notes=rrng.choice(_REPAIR_NOTES[rtype]),
            ))
            rd = rd - timedelta(days=rrng.randint(400, 1500))

        # recompute stored risk now that accident history exists → stored == live
        if accidents:
            sf = rs.storage_fields(condition=obj.condition, year_built=obj.year_built,
                                   last_inspection=obj.last_inspection,
                                   accident_count=accidents, type_code=obj.type_code)
            obj.risk_score = sf["risk_score"]
            obj.risk_level = sf["risk_level"]
            obj.next_inspection = sf["next_inspection"]
    db.commit()
    return len(rows)


def ensure_seeded():
    """Seed catalogs + structures if the DB is empty. Called on app startup so
    teammates only need to run `uvicorn` — data appears automatically."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        _seed_catalogs(db)
        if not db.scalar(select(func.count()).select_from(HydraulicStructure)):
            n = _seed_structures(db)
            print(f"[startup] seeded empty DB with {n} structures")
    finally:
        db.close()


def main():
    reset = "--reset" in sys.argv
    if reset:
        # recreate the schema so model changes (new columns/tables) take effect
        Base.metadata.drop_all(bind=engine)
        print("• dropped all tables (schema rebuild)")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        _seed_catalogs(db)
        existing = db.scalar(select(func.count()).select_from(HydraulicStructure))
        if existing:
            print(f"• structures already present ({existing}); use --reset to rebuild.")
            return
        n = _seed_structures(db)

        total = db.scalar(select(func.count()).select_from(HydraulicStructure))
        by_cond = db.execute(
            select(HydraulicStructure.condition, func.count())
            .group_by(HydraulicStructure.condition)
        ).all()
        by_type = db.execute(
            select(HydraulicStructure.type, func.count())
            .group_by(HydraulicStructure.type)
        ).all()
        print(f"✓ seeded {n} structures (total now {total})")
        print("  by condition:", {k: v for k, v in by_cond})
        print("  by type:     ", {k: v for k, v in by_type})
    finally:
        db.close()


if __name__ == "__main__":
    main()
