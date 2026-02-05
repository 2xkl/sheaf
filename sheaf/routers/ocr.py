from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from sheaf.config import settings
from sheaf.database import get_db
from sheaf.dependencies import get_current_user
from sheaf.models.document import Document
from sheaf.models.user import User
from sheaf.schemas.ocr import OCRStatusResponse, OCRTextResponse, OCRStartResponse
from sheaf.services.ocr import OCRService

router = APIRouter(prefix="/api/ocr", tags=["ocr"])


async def run_ocr_background(doc_id: str, user_id: str, language: str):
    """Background task for OCR processing."""
    from sheaf.database import async_session

    async with async_session() as db:
        service = OCRService(language=language)
        try:
            await service.process_document(doc_id, db, user_id)
        except Exception as e:
            result = await db.execute(
                select(Document).where(Document.id == doc_id)
            )
            doc = result.scalar_one_or_none()
            if doc:
                doc.ocr_status = "failed"
                doc.ocr_error = str(e)[:500]
                await db.commit()


@router.post("/{doc_id}/start", response_model=OCRStartResponse)
async def start_ocr(
    doc_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Start OCR processing for a document."""
    if not settings.ocr_enabled:
        raise HTTPException(status_code=400, detail="OCR is disabled")

    result = await db.execute(
        select(Document).where(Document.id == doc_id, Document.owner_id == user.id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc.ocr_status == "processing":
        raise HTTPException(status_code=400, detail="OCR already in progress")

    doc.ocr_status = "pending"
    await db.commit()

    background_tasks.add_task(run_ocr_background, doc_id, user.id, settings.ocr_language)

    return OCRStartResponse(
        doc_id=doc_id,
        message="OCR processing started",
        ocr_status="pending",
    )


@router.get("/{doc_id}/status", response_model=OCRStatusResponse)
async def get_ocr_status(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get OCR status for a document."""
    result = await db.execute(
        select(Document).where(Document.id == doc_id, Document.owner_id == user.id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    return OCRStatusResponse(
        doc_id=doc_id,
        ocr_status=doc.ocr_status or "none",
        ocr_error=doc.ocr_error,
        text_extracted_at=doc.text_extracted_at,
        has_text=bool(doc.extracted_text),
    )


@router.get("/{doc_id}/text", response_model=OCRTextResponse)
async def get_ocr_text(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get extracted text for a document."""
    result = await db.execute(
        select(Document).where(Document.id == doc_id, Document.owner_id == user.id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    return OCRTextResponse(
        doc_id=doc_id,
        extracted_text=doc.extracted_text,
        text_length=len(doc.extracted_text) if doc.extracted_text else 0,
    )
