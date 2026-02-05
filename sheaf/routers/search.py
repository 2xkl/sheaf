from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from sheaf.database import get_db
from sheaf.dependencies import get_current_user
from sheaf.models.user import User
from sheaf.schemas.search import SearchResponse, SearchResultItem
from sheaf.services.search import search_service

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("", response_model=SearchResponse)
async def search_documents(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Full-text search in document contents."""
    results, total = await search_service.search_documents(
        query=q,
        user_id=user.id,
        db=db,
        limit=limit,
        offset=offset,
    )

    return SearchResponse(
        query=q,
        total=total,
        items=[
            SearchResultItem(
                id=r.id,
                original_name=r.original_name,
                snippet=r.snippet,
                rank=r.rank,
            )
            for r in results
        ],
    )
