FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-pol \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

COPY . .

RUN pip install --no-cache-dir . && mkdir -p /app/storage

EXPOSE 8000

CMD ["uvicorn", "sheaf.main:app", "--host", "0.0.0.0", "--port", "8000"]
