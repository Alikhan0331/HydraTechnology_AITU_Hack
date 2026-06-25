"""/api/reports — CSV / Excel / PDF export of the catalog (TZ: отчётность).

All endpoints accept the same filter params as GET /api/structures, so the
export matches the current filtered view.
"""
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from .. import crud
from ..database import get_db
from ..enums import CONDITIONS, ConditionCode
from ..reports import builder

router = APIRouter(prefix="/api/reports", tags=["reports"])

_SEVERITY = {c.value: CONDITIONS[c][2] for c in ConditionCode}


def _filtered(db, sort, **filters):
    return crud.list_structures(db, sort=sort, limit=100000, **filters)


def _summary_from(structures) -> dict:
    total = len(structures)
    by_condition = {c.value: 0 for c in ConditionCode}
    for s in structures:
        by_condition[s.condition] = by_condition.get(s.condition, 0) + 1
    total_length = round(sum(s.length_km or 0 for s in structures), 1)
    years = [s.year_built for s in structures if s.year_built]
    avg_age = round(2026 - sum(years) / len(years), 1) if years else 0.0
    weighted = sum(_SEVERITY.get(c, 0) * n for c, n in by_condition.items())
    index = round(100 * (1 - weighted / (3 * total))) if total else 0
    return {
        "total": total, "by_condition": by_condition,
        "overall_condition_index": index, "total_length_km": total_length,
        "avg_age_years": avg_age,
    }


def _attach(content: bytes, media: str, filename: str) -> Response:
    return Response(
        content=content, media_type=media,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# Shared filter params
def _params(
    type: str | None = None,
    condition: str | None = None,
    district: str | None = None,
    risk_level: str | None = None,
    significance: str | None = None,
    q: str | None = None,
    year_min: int | None = None,
    year_max: int | None = None,
):
    return dict(type=type, condition=condition, district=district,
                risk_level=risk_level, significance=significance, q=q,
                year_min=year_min, year_max=year_max)


@router.get("/structures.csv")
def export_csv(p: dict = Depends(_params), db: Session = Depends(get_db)):
    rows = _filtered(db, "id", **p)
    return _attach(builder.build_csv(rows), "text/csv; charset=utf-8", "structures.csv")


@router.get("/structures.xlsx")
def export_xlsx(p: dict = Depends(_params), db: Session = Depends(get_db)):
    rows = _filtered(db, "id", **p)
    content = builder.build_xlsx(rows, summary=_summary_from(rows))
    return _attach(
        content,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "structures.xlsx",
    )


@router.get("/structures.pdf")
def export_pdf(
    p: dict = Depends(_params),
    title: str = Query("Отчёт по гидротехническим сооружениям"),
    db: Session = Depends(get_db),
):
    rows = _filtered(db, "risk", **p)  # problem objects first
    content = builder.build_pdf(rows, summary=_summary_from(rows), title=title)
    return _attach(content, "application/pdf", "report.pdf")
