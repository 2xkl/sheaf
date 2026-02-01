from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from sheaf.database import get_db
from sheaf.dependencies import get_current_user
from sheaf.models.user import User
from sheaf.schemas.user import StorageSettingsRead, StorageSettingsUpdate

router = APIRouter(prefix="/api/settings", tags=["settings"])


def _build_connection_string(account_name: str, account_key: str) -> str:
    return (
        f"DefaultEndpointsProtocol=https;"
        f"AccountName={account_name};"
        f"AccountKey={account_key};"
        f"EndpointSuffix=core.windows.net"
    )


@router.get("/storage", response_model=StorageSettingsRead)
async def get_storage_settings(user: User = Depends(get_current_user)):
    return StorageSettingsRead(
        storage_backend=user.storage_backend,
        azure_connection_string_set=bool(user.azure_connection_string),
        azure_container_name=user.azure_container_name,
    )


@router.put("/storage", response_model=StorageSettingsRead)
async def update_storage_settings(
    body: StorageSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if body.storage_backend not in ("local", "azure"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="storage_backend must be 'local' or 'azure'",
        )

    new_conn_str = user.azure_connection_string
    if body.azure_account_name is not None and body.azure_account_key is not None:
        new_conn_str = _build_connection_string(body.azure_account_name, body.azure_account_key)
    elif body.azure_account_name == "" and body.azure_account_key == "":
        new_conn_str = None

    new_container = (
        body.azure_container_name
        if body.azure_container_name is not None
        else user.azure_container_name
    )

    if body.storage_backend == "azure":
        if not new_conn_str or not new_container:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Azure account name, access key, and container name are required",
            )
        try:
            await _test_azure_connection(new_conn_str, new_container)
        except ImportError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Azure SDK not installed on server (pip install sheaf[azure])",
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Azure connection failed: {exc}",
            )

    user.storage_backend = body.storage_backend
    user.azure_connection_string = new_conn_str
    user.azure_container_name = new_container
    await db.commit()
    await db.refresh(user)

    return StorageSettingsRead(
        storage_backend=user.storage_backend,
        azure_connection_string_set=bool(user.azure_connection_string),
        azure_container_name=user.azure_container_name,
    )


async def _test_azure_connection(connection_string: str, container_name: str) -> None:
    from sheaf.services.storage.azure_blob import AzureBlobStorage

    backend = AzureBlobStorage(
        connection_string=connection_string,
        container_name=container_name,
    )
    container = await backend._container()
    await container.get_container_properties()
