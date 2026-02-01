import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from fastapi.responses import Response
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from sheaf.config import settings
from sheaf.database import get_db
from sheaf.dependencies import get_current_user, get_storage
from sheaf.models.document import Document
from sheaf.models.user import User
from sheaf.schemas.document import DocumentList, DocumentRead
from sheaf.services.cache import cache_delete, cache_get, cache_set
from sheaf.services.storage.base import StorageBackend

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.post("/upload", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
async def upload_pdf(
    file: UploadFile,
    is_public: bool = False,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    storage: StorageBackend = Depends(get_storage),
):
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are allowed",
        )

    data = await file.read()
    stored_name = f"{uuid.uuid4().hex}.pdf"
    storage_path = await storage.save(stored_name, data)

    doc = Document(
        filename=stored_name,
        original_name=file.filename or "untitled.pdf",
        content_type=file.content_type,
        size_bytes=len(data),
        storage_backend=settings.storage_backend,
        storage_path=storage_path,
        is_public=is_public,
        owner_id=user.id,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


@router.get("/", response_model=DocumentList)
async def list_documents(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    where = Document.owner_id == user.id
    total_q = await db.execute(select(func.count(Document.id)).where(where))
    total = total_q.scalar() or 0
    result = await db.execute(
        select(Document).where(where).offset(skip).limit(limit).order_by(Document.created_at.desc())
    )
    items = list(result.scalars().all())
    return DocumentList(items=items, total=total)


@router.get("/{doc_id}", response_model=DocumentRead)
async def get_document(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    doc = await _get_doc_or_404(db, doc_id, user)
    return doc


@router.get("/{doc_id}/download")
async def download_document(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    storage: StorageBackend = Depends(get_storage),
):
    doc = await _get_doc_or_404(db, doc_id, user)

    cache_key = f"pdf:{doc.id}"
    cached = await cache_get(cache_key)
    if cached is not None:
        data = cached
    else:
        data = await storage.load(doc.storage_path)
        await cache_set(cache_key, data)

    doc.download_count += 1
    await db.commit()

    return Response(
        content=data,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{doc.original_name}"'},
    )


@router.get("/{doc_id}/view")
async def view_document(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    storage: StorageBackend = Depends(get_storage),
):
    doc = await _get_doc_or_404(db, doc_id, user)

    cache_key = f"pdf:{doc.id}"
    cached = await cache_get(cache_key)
    if cached is not None:
        data = cached
    else:
        data = await storage.load(doc.storage_path)
        await cache_set(cache_key, data)

    return Response(
        content=data,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{doc.original_name}"'},
    )


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    storage: StorageBackend = Depends(get_storage),
):
    doc = await _get_doc_or_404(db, doc_id, user)
    await storage.delete(doc.storage_path)
    await cache_delete(f"pdf:{doc.id}")
    await db.delete(doc)
    await db.commit()


async def _get_doc_or_404(db: AsyncSession, doc_id: str, user: User) -> Document:
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    if doc.owner_id != user.id and not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return doc
