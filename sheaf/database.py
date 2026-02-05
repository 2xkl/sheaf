from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from sheaf.config import settings

engine = create_async_engine(settings.database_url, echo=settings.debug)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:  # type: ignore[misc]
    async with async_session() as session:
        yield session


async def _column_exists(conn, table: str, column: str) -> bool:
    """Check whether a column exists (works with PostgreSQL and SQLite)."""
    if "postgresql" in settings.database_url:
        row = await conn.execute(
            text(
                "SELECT 1 FROM information_schema.columns "
                "WHERE table_name = :table AND column_name = :col"
            ),
            {"table": table, "col": column},
        )
        return row.scalar() is not None
    else:
        result = await conn.execute(text(f"PRAGMA table_info({table})"))
        cols = [r[1] for r in result]
        return column in cols


async def _migrate_columns(conn) -> None:
    """Add columns that may be missing from older databases."""
    migrations = [
        ("users", "storage_backend", "VARCHAR(20) DEFAULT 'local'"),
        ("users", "azure_connection_string", "VARCHAR(500)"),
        ("users", "azure_container_name", "VARCHAR(200)"),
        # OCR fields
        ("documents", "extracted_text", "TEXT"),
        ("documents", "ocr_status", "VARCHAR(20) DEFAULT 'none'"),
        ("documents", "ocr_error", "VARCHAR(500)"),
        ("documents", "text_extracted_at", "TIMESTAMP"),
        # Calibre fields
        ("documents", "calibre_id", "VARCHAR(100)"),
        ("documents", "calibre_metadata", "JSON"),
    ]
    for table, column, col_type in migrations:
        if not await _column_exists(conn, table, column):
            await conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}"))


async def _create_fts_index(conn) -> None:
    """Create PostgreSQL full-text search index on documents.extracted_text."""
    if "postgresql" not in settings.database_url:
        return
    await conn.execute(
        text(
            "CREATE INDEX IF NOT EXISTS idx_documents_fts "
            "ON documents USING GIN (to_tsvector('english', COALESCE(extracted_text, '')))"
        )
    )


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await _migrate_columns(conn)
        await _create_fts_index(conn)
