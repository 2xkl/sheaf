import uuid
from datetime import datetime

from sqlalchemy import String, Integer, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from sheaf.database import Base


class ReadingProgress(Base):
    __tablename__ = "reading_progress"
    __table_args__ = (
        UniqueConstraint("user_id", "document_id", name="uq_user_document"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    document_id: Mapped[str] = mapped_column(String(36), ForeignKey("documents.id"))
    current_page: Mapped[int] = mapped_column(Integer, default=1)
    total_pages: Mapped[int] = mapped_column(Integer, default=0)
    last_read_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship()  # noqa: F821
    document: Mapped["Document"] = relationship()  # noqa: F821
