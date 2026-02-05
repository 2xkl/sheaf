from datetime import datetime
from typing import Optional

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
    # OCR fields
    ocr_status: Optional[str] = "none"
    ocr_error: Optional[str] = None
    text_extracted_at: Optional[datetime] = None
    has_text: bool = False
    # Calibre fields
    calibre_id: Optional[str] = None
    calibre_metadata: Optional[dict] = None

    model_config = {"from_attributes": True}


class DocumentList(BaseModel):
    items: list[DocumentRead]
    total: int
