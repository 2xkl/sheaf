from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from sheaf.database import get_db
from sheaf.dependencies import get_document_storage
from sheaf.models.document import Document
from sheaf.schemas.document import DocumentRead
from sheaf.services.cache import cache_get, cache_set

router = APIRouter(prefix="/api/public", tags=["public"])


@router.get("/{doc_id}", response_model=DocumentRead)
async def get_public_document(doc_id: str, db: AsyncSession = Depends(get_db)):
    doc = await _get_public_or_404(db, doc_id)
    return doc


@router.get("/{doc_id}/download")
async def download_public_document(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
):
    doc = await _get_public_or_404(db, doc_id)

    cache_key = f"pdf:{doc.id}"
    cached = await cache_get(cache_key)
    if cached is not None:
        data = cached
    else:
        storage = await get_document_storage(doc, db)
        data = await storage.load(doc.storage_path)
        await cache_set(cache_key, data)

    doc.download_count += 1
    await db.commit()

    return Response(
        content=data,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{doc.original_name}"'},
    )


async def _get_public_or_404(db: AsyncSession, doc_id: str) -> Document:
    result = await db.execute(select(Document).where(Document.id == doc_id, Document.is_public))
    doc = result.scalar_one_or_none()
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return doc
