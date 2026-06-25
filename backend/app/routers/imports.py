"""/api/import — bulk import of structures from CSV / Excel (TZ task 2)."""
from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile
from sqlalchemy.orm import Session

from ..database import get_db
from ..services import importer

router = APIRouter(prefix="/api/import", tags=["import"])


@router.post("/structures")
async def import_structures(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Upload a CSV or Excel file of structures. Returns an import report with
    created / duplicate / error counts. New objects are auto-classified, risk-
    scored and deduplicated against the catalog."""
    name = (file.filename or "").lower()
    if not name.endswith((".csv", ".xlsx", ".xlsm")):
        raise HTTPException(400, "Поддерживаются только файлы .csv / .xlsx")
    content = await file.read()
    if not content:
        raise HTTPException(400, "Пустой файл")
    try:
        rows = importer.parse_file(file.filename, content)
    except Exception as exc:
        raise HTTPException(400, f"Не удалось разобрать файл: {str(exc)[:120]}")
    if not rows:
        raise HTTPException(400, "В файле нет строк данных")
    return importer.import_rows(db, rows)


@router.get("/template.csv")
def template():
    """Download a ready-to-fill CSV template with the expected columns."""
    return Response(
        content="﻿" + importer.TEMPLATE_CSV,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="import_template.csv"'},
    )
