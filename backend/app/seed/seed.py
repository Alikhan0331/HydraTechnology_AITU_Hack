"""Seed the database with the demo catalog.

Usage:
    python -m app.seed.seed            # seed if empty
    python -m app.seed.seed --reset    # wipe structures and reseed
"""
import random
import sys
from datetime import timedelta

from sqlalchemy import delete, func, select

from ..database import Base, SessionLocal, engine
from ..enums import CONDITIONS, STRUCTURE_TYPES
from ..models import (
    ConditionCategory,
    HydraulicStructure,
    Inspection,
    RiskAssessment,
    StructureType,
)
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


def _seed_catalogs(db):
    if not db.scalar(select(func.count()).select_from(StructureType)):
        for code, (ru, icon, color) in STRUCTURE_TYPES.items():
            db.add(StructureType(code=code, name_ru=ru, icon=icon, color=color))
    if not db.scalar(select(func.count()).select_from(ConditionCategory)):
        for cond, (ru, color, sev) in CONDITIONS.items():
            db.add(ConditionCategory(code=cond.value, name_ru=ru, color=color, severity=sev))
    db.commit()


def _reset(db):
    db.execute(delete(Inspection))
    db.execute(delete(RiskAssessment))
    db.execute(delete(HydraulicStructure))
    db.commit()
    print("• wiped structures / inspections / risk_assessments")


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

        # 1–2 historical inspections ending at last_inspection
        rng = random.Random(f"insp:{obj.id}")
        last = obj.last_inspection
        for k in range(rng.randint(1, 2)):
            d = last - timedelta(days=rng.randint(180, 900) * (k + 1))
            db.add(Inspection(
                structure_id=obj.id, date=d,
                inspector=rng.choice([
                    "Отдел эксплуатации", "Жамбылводхоз", "Райводхоз",
                    "Комиссия обследования",
                ]),
                condition_found=obj.condition,
                wear_found=obj.wear_percent,
                notes=rng.choice(_NOTES.get(obj.condition, ["Плановое обследование."])),
            ))
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
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        _seed_catalogs(db)
        if reset:
            _reset(db)
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
