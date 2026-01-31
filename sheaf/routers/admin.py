from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from sheaf.database import get_db
from sheaf.dependencies import require_admin
from sheaf.models.document import Document
from sheaf.models.user import User
from sheaf.schemas.user import UserRead

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_admin)])


@router.get("/users", response_model=list[UserRead])
async def list_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return list(result.scalars().all())


@router.patch("/users/{user_id}/toggle-active", response_model=UserRead)
async def toggle_user_active(user_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.is_active = not user.is_active
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/stats")
async def stats(db: AsyncSession = Depends(get_db)):
    user_count = (await db.execute(select(func.count(User.id)))).scalar() or 0
    doc_count = (await db.execute(select(func.count(Document.id)))).scalar() or 0
    total_size = (await db.execute(select(func.sum(Document.size_bytes)))).scalar() or 0
    total_downloads = (await db.execute(select(func.sum(Document.download_count)))).scalar() or 0
    return {
        "users": user_count,
        "documents": doc_count,
        "total_size_bytes": total_size,
        "total_downloads": total_downloads,
    }
