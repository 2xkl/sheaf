"""Azure Blob Storage backend — phase 2.

Requires the `azure` extra: pip install sheaf[azure]
"""

from sheaf.services.storage.base import StorageBackend


class AzureBlobStorage(StorageBackend):
    def __init__(self, connection_string: str, container_name: str) -> None:
        try:
            from azure.storage.blob.aio import BlobServiceClient
        except ImportError as exc:
            raise ImportError(
                "Install the azure extra: pip install sheaf[azure]"
            ) from exc

        self.client = BlobServiceClient.from_connection_string(connection_string)
        self.container_name = container_name

    async def _container(self):
        return self.client.get_container_client(self.container_name)

    async def save(self, filename: str, data: bytes) -> str:
        container = await self._container()
        blob = container.get_blob_client(filename)
        await blob.upload_blob(data, overwrite=True)
        return filename

    async def load(self, path: str) -> bytes:
        container = await self._container()
        blob = container.get_blob_client(path)
        stream = await blob.download_blob()
        return await stream.readall()

    async def delete(self, path: str) -> None:
        container = await self._container()
        blob = container.get_blob_client(path)
        await blob.delete_blob()

    async def exists(self, path: str) -> bool:
        container = await self._container()
        blob = container.get_blob_client(path)
        try:
            await blob.get_blob_properties()
            return True
        except Exception:
            return False
