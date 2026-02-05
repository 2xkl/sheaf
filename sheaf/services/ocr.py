import asyncio
from datetime import datetime
from tempfile import TemporaryDirectory

from pdf2image import convert_from_bytes
import pytesseract
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from sheaf.models.document import Document
from sheaf.dependencies import get_document_storage


class OCRService:
    def __init__(self, language: str = "eng"):
        self.language = language

    async def extract_text_from_pdf(self, pdf_bytes: bytes) -> str:
        """Extract text from PDF using OCR."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._extract_sync, pdf_bytes)

    def _extract_sync(self, pdf_bytes: bytes) -> str:
        """Synchronous OCR extraction (runs in thread pool)."""
        with TemporaryDirectory() as tmpdir:
            images = convert_from_bytes(
                pdf_bytes,
                dpi=300,
                output_folder=tmpdir,
                fmt="png",
                thread_count=2,
            )

            texts = []
            for img in images:
                text = pytesseract.image_to_string(img, lang=self.language)
                texts.append(text)
                img.close()

            return "\n\n--- Page Break ---\n\n".join(texts)

    async def process_document(
        self,
        doc_id: str,
        db: AsyncSession,
        user_id: str,
    ) -> Document:
        """Run OCR on a document and save extracted text."""
        result = await db.execute(
            select(Document).where(Document.id == doc_id, Document.owner_id == user_id)
        )
        doc = result.scalar_one_or_none()
        if not doc:
            raise ValueError("Document not found")

        doc.ocr_status = "processing"
        doc.ocr_error = None
        await db.commit()

        try:
            storage = await get_document_storage(doc, db)
            pdf_bytes = await storage.load(doc.storage_path)

            extracted_text = await self.extract_text_from_pdf(pdf_bytes)

            doc.extracted_text = extracted_text
            doc.ocr_status = "completed"
            doc.text_extracted_at = datetime.utcnow()
            await db.commit()
            await db.refresh(doc)

            return doc

        except Exception as e:
            doc.ocr_status = "failed"
            doc.ocr_error = str(e)[:500]
            await db.commit()
            raise


ocr_service = OCRService()
