from datetime import datetime

from pydantic import BaseModel


class DocumentRead(BaseModel):
    id: str
    filename: str
    original_name: str
    content_type: str
    size_bytes: int
    storage_backend: str
    is_public: bool
    download_count: int
    created_at: datetime
    owner_id: str

    model_config = {"from_attributes": True}


class DocumentList(BaseModel):
    items: list[DocumentRead]
    total: int
