from abc import ABC, abstractmethod


class StorageBackend(ABC):
    @abstractmethod
    async def save(self, filename: str, data: bytes) -> str:
        """Save file and return storage path."""

    @abstractmethod
    async def load(self, path: str) -> bytes:
        """Load file bytes by storage path."""

    @abstractmethod
    async def delete(self, path: str) -> None:
        """Delete file by storage path."""

    @abstractmethod
    async def exists(self, path: str) -> bool:
        """Check if file exists at storage path."""
