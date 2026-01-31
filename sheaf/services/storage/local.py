import os
from pathlib import Path

import aiofiles

from sheaf.services.storage.base import StorageBackend


class LocalStorage(StorageBackend):
    def __init__(self, base_path: str) -> None:
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)

    async def save(self, filename: str, data: bytes) -> str:
        file_path = self.base_path / filename
        file_path.parent.mkdir(parents=True, exist_ok=True)
        async with aiofiles.open(file_path, "wb") as f:
            await f.write(data)
        return str(file_path)

    async def load(self, path: str) -> bytes:
        async with aiofiles.open(path, "rb") as f:
            return await f.read()

    async def delete(self, path: str) -> None:
        p = Path(path)
        if p.exists():
            os.remove(p)

    async def exists(self, path: str) -> bool:
        return Path(path).exists()
