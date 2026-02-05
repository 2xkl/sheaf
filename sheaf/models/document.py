import uuid
from datetime import datetime

from sqlalchemy import String, Integer, DateTime, ForeignKey, func, Text, JSON
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

    # OCR fields
    extracted_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    ocr_status: Mapped[str] = mapped_column(String(20), default="none")  # none/pending/processing/completed/failed
    ocr_error: Mapped[str | None] = mapped_column(String(500), nullable=True)
    text_extracted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Calibre fields
    calibre_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    calibre_metadata: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    owner_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    owner: Mapped["User"] = relationship(back_populates="documents")  # noqa: F821

    @property
    def has_text(self) -> bool:
        return bool(self.extracted_text)
