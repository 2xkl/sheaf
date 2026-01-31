from contextlib import asynccontextmanager

from fastapi import FastAPI

from sheaf.config import settings
from sheaf.database import init_db
from sheaf.models.user import User
from sheaf.services.auth import hash_password
from sheaf.services.cache import close_redis
from sheaf.database import async_session


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await _ensure_admin()
    yield
    await close_redis()


async def _ensure_admin() -> None:
    """Create default admin user if it doesn't exist."""
    from sqlalchemy import select

    async with async_session() as db:
        result = await db.execute(select(User).where(User.username == settings.admin_username))
        if result.scalar_one_or_none() is None:
            admin = User(
                username=settings.admin_username,
                hashed_password=hash_password(settings.admin_password),
                is_admin=True,
            )
            db.add(admin)
            await db.commit()


app = FastAPI(
    title="sheaf",
    description="Open source PDF hosting platform",
    version="0.1.0",
    lifespan=lifespan,
)

from sheaf.routers import auth, documents, admin, public  # noqa: E402

app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(admin.router)
app.include_router(public.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
