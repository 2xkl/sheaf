from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from sheaf.config import settings
from sheaf.database import get_db
from sheaf.dependencies import get_current_user
from sheaf.models.user import User
from sheaf.schemas.calibre import (
    CalibreBookResponse,
    CalibreBooksResponse,
    CalibreStatusResponse,
    CalibreImportRequest,
    CalibreImportResponse,
)
from sheaf.services.calibre import get_calibre_service

router = APIRouter(prefix="/api/calibre", tags=["calibre"])


@router.get("/status", response_model=CalibreStatusResponse)
async def get_calibre_status(
    user: User = Depends(get_current_user),
):
    """Get Calibre connection status."""
    if not settings.calibre_enabled:
        return CalibreStatusResponse(
            local_enabled=False,
            local_connected=False,
            local_book_count=0,
            server_enabled=False,
            server_connected=False,
        )

    service = get_calibre_service()
    status = await service.get_status()
    return CalibreStatusResponse(**status)


@router.get("/books", response_model=CalibreBooksResponse)
async def list_calibre_books(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    source: str = Query("all", pattern="^(all|local|server)$"),
    user: User = Depends(get_current_user),
):
    """List books from Calibre library."""
    if not settings.calibre_enabled:
        raise HTTPException(status_code=400, detail="Calibre integration is disabled")

    service = get_calibre_service()

    if source == "local":
        books = await service.list_books_local(limit, offset)
    elif source == "server":
        books = await service.list_books_server(limit, offset)
    else:
        books = await service.list_books(limit, offset)

    return CalibreBooksResponse(
        items=[
            CalibreBookResponse(
                id=b.id,
                title=b.title,
                authors=b.authors,
                series=b.series,
                series_index=b.series_index,
                tags=b.tags,
                formats=b.formats,
                cover_url=b.cover_url,
                source=b.source,
            )
            for b in books
        ],
        total=len(books),
    )


@router.post("/import/{calibre_id}", response_model=CalibreImportResponse)
async def import_calibre_book(
    calibre_id: str,
    body: CalibreImportRequest = CalibreImportRequest(),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Import a book from Calibre into Sheaf."""
    if not settings.calibre_enabled:
        raise HTTPException(status_code=400, detail="Calibre integration is disabled")

    service = get_calibre_service()

    try:
        doc = await service.import_book(calibre_id, user.id, db, body.format)
        return CalibreImportResponse(
            document_id=doc.id,
            original_name=doc.original_name,
            message="Book imported successfully",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")
