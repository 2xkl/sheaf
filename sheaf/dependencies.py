from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from sheaf.database import get_db
from sheaf.models.user import User
from sheaf.services.auth import decode_token
from sheaf.services.storage import StorageBackend, LocalStorage
from sheaf.services.storage.azure_blob import AzureBlobStorage
from sheaf.config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = decode_token(token)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user_id: str | None = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


async def require_admin(user: User = Depends(get_current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin required")
    return user


def get_user_storage(user: User) -> StorageBackend:
    """Return storage backend based on the user's preference (for uploads)."""
    if user.storage_backend == "azure" and user.azure_connection_string:
        return AzureBlobStorage(
            connection_string=user.azure_connection_string,
            container_name=user.azure_container_name or settings.azure_storage_container,
        )
    return LocalStorage(base_path=settings.local_storage_path)


async def get_document_storage(doc, db: AsyncSession) -> StorageBackend:
    """Return storage backend for an existing document (for download/view/delete).

    Resolves Azure credentials from the document owner when needed.
    Falls back to global env credentials for pre-migration documents.
    """
    from sheaf.models.document import Document

    if doc.storage_backend == "local":
        return LocalStorage(base_path=settings.local_storage_path)

    if doc.storage_backend == "azure":
        result = await db.execute(select(User).where(User.id == doc.owner_id))
        owner = result.scalar_one_or_none()

        if owner and owner.azure_connection_string:
            return AzureBlobStorage(
                connection_string=owner.azure_connection_string,
                container_name=owner.azure_container_name or settings.azure_storage_container,
            )

        if settings.azure_storage_connection_string:
            return AzureBlobStorage(
                connection_string=settings.azure_storage_connection_string,
                container_name=settings.azure_storage_container,
            )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Azure storage credentials not available for this document",
        )

    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=f"Unknown storage backend: {doc.storage_backend}",
    )
