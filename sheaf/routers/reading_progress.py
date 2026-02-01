from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from sheaf.database import get_db
from sheaf.dependencies import get_current_user
from sheaf.models.reading_progress import ReadingProgress
from sheaf.models.user import User
from sheaf.schemas.reading_progress import ReadingProgressRead, ReadingProgressUpdate

router = APIRouter(prefix="/api/reading-progress", tags=["reading-progress"])


@router.get("/", response_model=list[ReadingProgressRead])
async def list_progress(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ReadingProgress)
        .where(ReadingProgress.user_id == user.id)
        .order_by(ReadingProgress.last_read_at.desc())
        .limit(5)
    )
    return list(result.scalars().all())


@router.get("/{doc_id}", response_model=ReadingProgressRead | None)
async def get_progress(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ReadingProgress).where(
            ReadingProgress.user_id == user.id,
            ReadingProgress.document_id == doc_id,
        )
    )
    return result.scalar_one_or_none()


@router.put("/{doc_id}", response_model=ReadingProgressRead)
async def save_progress(
    doc_id: str,
    body: ReadingProgressUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ReadingProgress).where(
            ReadingProgress.user_id == user.id,
            ReadingProgress.document_id == doc_id,
        )
    )
    progress = result.scalar_one_or_none()
    if progress is None:
        progress = ReadingProgress(
            user_id=user.id,
            document_id=doc_id,
            current_page=body.current_page,
            total_pages=body.total_pages,
        )
        db.add(progress)
    else:
        progress.current_page = body.current_page
        progress.total_pages = body.total_pages
    await db.commit()
    await db.refresh(progress)
    return progress
