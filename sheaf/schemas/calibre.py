from typing import Optional

from pydantic import BaseModel


class CalibreBookResponse(BaseModel):
    id: str
    title: str
    authors: list[str]
    series: Optional[str] = None
    series_index: Optional[float] = None
    tags: list[str]
    formats: list[str]
    cover_url: Optional[str] = None
    source: str


class CalibreBooksResponse(BaseModel):
    items: list[CalibreBookResponse]
    total: int


class CalibreStatusResponse(BaseModel):
    local_enabled: bool
    local_connected: bool
    local_book_count: int
    server_enabled: bool
    server_connected: bool


class CalibreImportRequest(BaseModel):
    format: str = "PDF"


class CalibreImportResponse(BaseModel):
    document_id: str
    original_name: str
    message: str
