import aiosqlite
import httpx
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from sheaf.config import settings
from sheaf.models.document import Document
from sheaf.models.user import User
from sheaf.dependencies import get_user_storage


@dataclass
class CalibreBook:
    id: str
    title: str
    authors: list[str] = field(default_factory=list)
    series: Optional[str] = None
    series_index: Optional[float] = None
    tags: list[str] = field(default_factory=list)
    formats: list[str] = field(default_factory=list)
    path: Optional[str] = None
    cover_url: Optional[str] = None
    source: str = "local"  # "local" or "server"


class CalibreService:
    def __init__(
        self,
        library_path: str = "",
        server_url: str = "",
        server_username: str = "",
        server_password: str = "",
    ):
        self.library_path = library_path
        self.server_url = server_url.rstrip("/") if server_url else ""
        self.server_username = server_username
        self.server_password = server_password

    def _get_http_auth(self) -> Optional[httpx.BasicAuth]:
        if self.server_username and self.server_password:
            return httpx.BasicAuth(self.server_username, self.server_password)
        return None

    async def get_status(self) -> dict:
        """Check connection status for both local and server."""
        status = {
            "local_enabled": bool(self.library_path),
            "local_connected": False,
            "local_book_count": 0,
            "server_enabled": bool(self.server_url),
            "server_connected": False,
        }

        if self.library_path:
            db_path = Path(self.library_path) / "metadata.db"
            if db_path.exists():
                try:
                    async with aiosqlite.connect(str(db_path)) as db:
                        cursor = await db.execute("SELECT COUNT(*) FROM books")
                        row = await cursor.fetchone()
                        status["local_connected"] = True
                        status["local_book_count"] = row[0] if row else 0
                except Exception:
                    pass

        if self.server_url:
            try:
                async with httpx.AsyncClient(timeout=5.0) as client:
                    resp = await client.get(
                        f"{self.server_url}/ajax/library-info",
                        auth=self._get_http_auth(),
                    )
                    if resp.status_code == 200:
                        status["server_connected"] = True
            except Exception:
                pass

        return status

    async def list_books_local(self, limit: int = 100, offset: int = 0) -> list[CalibreBook]:
        """List books from local Calibre library."""
        if not self.library_path:
            return []

        db_path = Path(self.library_path) / "metadata.db"
        if not db_path.exists():
            return []

        books = []
        async with aiosqlite.connect(str(db_path)) as db:
            db.row_factory = aiosqlite.Row

            cursor = await db.execute(
                """
                SELECT b.id, b.title, b.path, b.series_index,
                       s.name as series_name
                FROM books b
                LEFT JOIN books_series_link bsl ON b.id = bsl.book
                LEFT JOIN series s ON bsl.series = s.id
                ORDER BY b.timestamp DESC
                LIMIT ? OFFSET ?
                """,
                (limit, offset),
            )
            rows = await cursor.fetchall()

            for row in rows:
                book_id = row["id"]

                authors_cursor = await db.execute(
                    """
                    SELECT a.name FROM authors a
                    JOIN books_authors_link bal ON a.id = bal.author
                    WHERE bal.book = ?
                    """,
                    (book_id,),
                )
                authors = [a[0] for a in await authors_cursor.fetchall()]

                tags_cursor = await db.execute(
                    """
                    SELECT t.name FROM tags t
                    JOIN books_tags_link btl ON t.id = btl.tag
                    WHERE btl.book = ?
                    """,
                    (book_id,),
                )
                tags = [t[0] for t in await tags_cursor.fetchall()]

                formats_cursor = await db.execute(
                    "SELECT format FROM data WHERE book = ?",
                    (book_id,),
                )
                formats = [f[0] for f in await formats_cursor.fetchall()]

                books.append(
                    CalibreBook(
                        id=f"local:{book_id}",
                        title=row["title"],
                        authors=authors,
                        series=row["series_name"],
                        series_index=row["series_index"],
                        tags=tags,
                        formats=formats,
                        path=row["path"],
                        source="local",
                    )
                )

        return books

    async def list_books_server(self, limit: int = 100, offset: int = 0) -> list[CalibreBook]:
        """List books from Calibre Content Server."""
        if not self.server_url:
            return []

        books = []
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.get(
                    f"{self.server_url}/ajax/books",
                    params={"num": limit, "offset": offset, "sort": "timestamp", "sort_order": "desc"},
                    auth=self._get_http_auth(),
                )
                if resp.status_code != 200:
                    return []

                data = resp.json()
                book_ids = data.get("book_ids", [])

                if book_ids:
                    ids_param = ",".join(str(i) for i in book_ids[:limit])
                    meta_resp = await client.get(
                        f"{self.server_url}/ajax/books",
                        params={"ids": ids_param},
                        auth=self._get_http_auth(),
                    )
                    if meta_resp.status_code == 200:
                        meta_data = meta_resp.json()
                        for book_id, book_info in meta_data.items():
                            formats = list(book_info.get("formats", {}).keys())
                            books.append(
                                CalibreBook(
                                    id=f"server:{book_id}",
                                    title=book_info.get("title", "Unknown"),
                                    authors=book_info.get("authors", []),
                                    series=book_info.get("series"),
                                    series_index=book_info.get("series_index"),
                                    tags=book_info.get("tags", []),
                                    formats=formats,
                                    cover_url=f"{self.server_url}/get/cover/{book_id}",
                                    source="server",
                                )
                            )
        except Exception:
            pass

        return books

    async def list_books(self, limit: int = 100, offset: int = 0) -> list[CalibreBook]:
        """List books from both local library and server."""
        local_books = await self.list_books_local(limit, offset)
        server_books = await self.list_books_server(limit, offset)
        return local_books + server_books

    async def get_book_file_local(self, book_id: int, format: str = "PDF") -> Optional[bytes]:
        """Get book file from local Calibre library."""
        if not self.library_path:
            return None

        db_path = Path(self.library_path) / "metadata.db"
        if not db_path.exists():
            return None

        async with aiosqlite.connect(str(db_path)) as db:
            cursor = await db.execute(
                """
                SELECT b.path, d.name, d.format
                FROM books b
                JOIN data d ON b.id = d.book
                WHERE b.id = ? AND UPPER(d.format) = UPPER(?)
                """,
                (book_id, format),
            )
            row = await cursor.fetchone()
            if not row:
                return None

            book_path, filename, fmt = row
            file_path = Path(self.library_path) / book_path / f"{filename}.{fmt.lower()}"
            if file_path.exists():
                return file_path.read_bytes()

        return None

    async def get_book_file_server(self, book_id: int, format: str = "PDF") -> Optional[bytes]:
        """Download book file from Calibre Content Server."""
        if not self.server_url:
            return None

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.get(
                    f"{self.server_url}/get/{format.upper()}/{book_id}",
                    auth=self._get_http_auth(),
                    follow_redirects=True,
                )
                if resp.status_code == 200:
                    return resp.content
        except Exception:
            pass

        return None

    async def import_book(
        self,
        calibre_id: str,
        user_id: str,
        db: AsyncSession,
        format: str = "PDF",
    ) -> Document:
        """Import a book from Calibre into Sheaf as a document."""
        source, book_id_str = calibre_id.split(":", 1)
        book_id = int(book_id_str)

        if source == "local":
            books = await self.list_books_local(limit=1000)
            file_bytes = await self.get_book_file_local(book_id, format)
        else:
            books = await self.list_books_server(limit=1000)
            file_bytes = await self.get_book_file_server(book_id, format)

        if not file_bytes:
            raise ValueError(f"Could not download book in {format} format")

        book = next((b for b in books if b.id == calibre_id), None)
        if not book:
            raise ValueError("Book metadata not found")

        # Get user for storage backend
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise ValueError("User not found")

        storage = get_user_storage(user)
        doc_id = str(uuid.uuid4())
        filename = f"{doc_id}.pdf"
        original_name = f"{book.title}.pdf"

        storage_path = await storage.save(filename, file_bytes)

        doc = Document(
            id=doc_id,
            filename=filename,
            original_name=original_name,
            content_type="application/pdf",
            size_bytes=len(file_bytes),
            storage_backend=storage.__class__.__name__.lower().replace("storage", ""),
            storage_path=storage_path,
            owner_id=user_id,
            calibre_id=calibre_id,
            calibre_metadata={
                "title": book.title,
                "authors": book.authors,
                "series": book.series,
                "series_index": book.series_index,
                "tags": book.tags,
            },
        )

        db.add(doc)
        await db.commit()
        await db.refresh(doc)

        return doc


def get_calibre_service() -> CalibreService:
    return CalibreService(
        library_path=settings.calibre_library_path,
        server_url=settings.calibre_server_url,
        server_username=settings.calibre_server_username,
        server_password=settings.calibre_server_password,
    )
