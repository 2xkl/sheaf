import uuid
from datetime import datetime

from sqlalchemy import String, Boolean, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from sheaf.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    username: Mapped[str] = mapped_column(String(150), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    # Per-user storage configuration
    storage_backend: Mapped[str] = mapped_column(String(20), default="local")
    azure_connection_string: Mapped[str | None] = mapped_column(String(500), nullable=True)
    azure_container_name: Mapped[str | None] = mapped_column(String(200), nullable=True)

    documents: Mapped[list["Document"]] = relationship(back_populates="owner")  # noqa: F821
