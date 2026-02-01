from datetime import datetime

from pydantic import BaseModel


class ReadingProgressUpdate(BaseModel):
    current_page: int
    total_pages: int


class ReadingProgressRead(BaseModel):
    document_id: str
    current_page: int
    total_pages: int
    last_read_at: datetime

    model_config = {"from_attributes": True}
