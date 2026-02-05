from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class OCRStatusResponse(BaseModel):
    doc_id: str
    ocr_status: str
    ocr_error: Optional[str] = None
    text_extracted_at: Optional[datetime] = None
    has_text: bool


class OCRTextResponse(BaseModel):
    doc_id: str
    extracted_text: Optional[str] = None
    text_length: int


class OCRStartResponse(BaseModel):
    doc_id: str
    message: str
    ocr_status: str
