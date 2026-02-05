from dataclasses import dataclass

from sqlalchemy import text, select
from sqlalchemy.ext.asyncio import AsyncSession

from sheaf.config import settings
from sheaf.models.document import Document


@dataclass
class SearchResult:
    id: str
    original_name: str
    snippet: str
    rank: float


class SearchService:
    async def search_documents(
        self,
        query: str,
        user_id: str,
        db: AsyncSession,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[SearchResult], int]:
        """Full-text search in document extracted_text."""
        if "postgresql" in settings.database_url:
            return await self._search_postgresql(query, user_id, db, limit, offset)
        else:
            return await self._search_sqlite(query, user_id, db, limit, offset)

    async def _search_postgresql(
        self,
        query: str,
        user_id: str,
        db: AsyncSession,
        limit: int,
        offset: int,
    ) -> tuple[list[SearchResult], int]:
        """PostgreSQL full-text search using tsvector."""
        count_sql = text("""
            SELECT COUNT(*)
            FROM documents
            WHERE owner_id = :user_id
              AND extracted_text IS NOT NULL
              AND to_tsvector('english', extracted_text) @@ plainto_tsquery('english', :query)
        """)

        search_sql = text("""
            SELECT
                id,
                original_name,
                ts_headline('english', extracted_text, plainto_tsquery('english', :query),
                    'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=20') as snippet,
                ts_rank(to_tsvector('english', extracted_text), plainto_tsquery('english', :query)) as rank
            FROM documents
            WHERE owner_id = :user_id
              AND extracted_text IS NOT NULL
              AND to_tsvector('english', extracted_text) @@ plainto_tsquery('english', :query)
            ORDER BY rank DESC
            LIMIT :limit OFFSET :offset
        """)

        params = {"user_id": user_id, "query": query, "limit": limit, "offset": offset}

        count_result = await db.execute(count_sql, params)
        total = count_result.scalar() or 0

        result = await db.execute(search_sql, params)
        rows = result.fetchall()

        results = [
            SearchResult(id=row[0], original_name=row[1], snippet=row[2], rank=row[3])
            for row in rows
        ]

        return results, total

    async def _search_sqlite(
        self,
        query: str,
        user_id: str,
        db: AsyncSession,
        limit: int,
        offset: int,
    ) -> tuple[list[SearchResult], int]:
        """Simple LIKE-based search for SQLite fallback."""
        search_pattern = f"%{query}%"

        count_sql = text("""
            SELECT COUNT(*)
            FROM documents
            WHERE owner_id = :user_id
              AND extracted_text IS NOT NULL
              AND extracted_text LIKE :pattern
        """)

        search_sql = text("""
            SELECT id, original_name, SUBSTR(extracted_text, 1, 200) as snippet
            FROM documents
            WHERE owner_id = :user_id
              AND extracted_text IS NOT NULL
              AND extracted_text LIKE :pattern
            LIMIT :limit OFFSET :offset
        """)

        params = {"user_id": user_id, "pattern": search_pattern, "limit": limit, "offset": offset}

        count_result = await db.execute(count_sql, params)
        total = count_result.scalar() or 0

        result = await db.execute(search_sql, params)
        rows = result.fetchall()

        results = [
            SearchResult(id=row[0], original_name=row[1], snippet=row[2], rank=1.0)
            for row in rows
        ]

        return results, total


search_service = SearchService()
