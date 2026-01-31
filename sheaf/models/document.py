import uuid
from datetime import datetime

from sqlalchemy import String, Integer, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from sheaf.database import Base


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    filename: Mapped[str] = mapped_column(String(255))
    original_name: Mapped[str] = mapped_column(String(255))
    content_type: Mapped[str] = mapped_column(String(100), default="application/pdf")
    size_bytes: Mapped[int] = mapped_column(Integer)
    storage_backend: Mapped[str] = mapped_column(String(20))  # "local" | "azure"
    storage_path: Mapped[str] = mapped_column(String(500))
    is_public: Mapped[bool] = mapped_column(default=False)
    download_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    owner_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    owner: Mapped["User"] = relationship(back_populates="documents")  # noqa: F821
