# sheaf

Open-source PDF hosting platform with in-browser reader, reading progress tracking, user accounts, and admin panel.

**Stack:** Python/FastAPI + React/TypeScript + PostgreSQL + Redis + Docker

---

## Quick Start

You need **Docker** and **Docker Compose** installed. Nothing else.

```bash
# 1. Clone the repo
git clone <repo-url> && cd pdfflow

# 2. Create .env from template
cp .env.example .env

# 3. Build and run
docker compose up -d
```

Open **http://localhost:3100** in your browser.

Default admin account: `admin` / `admin` (change `ADMIN_PASSWORD` in `.env` for production).

### Ports

| Service    | Port  | Description           |
|------------|-------|-----------------------|
| Frontend   | 3100  | Web UI (nginx)        |
| Backend    | 8000  | API (FastAPI/uvicorn) |
| PostgreSQL | 5432  | Database (internal)   |
| Redis      | 6379  | Cache (internal only) |

### Stopping

```bash
docker compose down
```

---

## Upgrading

sheaf stores all persistent data in Docker volumes:

| Volume       | Contents                           |
|--------------|------------------------------------|
| `pg_data`    | PostgreSQL database (users, docs metadata, reading progress) |
| `pdf_storage`| Uploaded PDF files (local storage) |

### Standard upgrade

```bash
# Pull latest code
git pull

# Rebuild and restart (data is preserved in volumes)
docker compose up -d --build
```

Database schema changes are applied automatically on startup — the app detects missing columns and adds them via `ALTER TABLE`. No manual migration steps needed.

### Backup before upgrading

```bash
# Backup PostgreSQL
docker compose exec postgres pg_dump -U sheaf sheaf > backup.sql

# Backup PDF files (if using local storage)
docker compose cp app:/app/storage ./storage-backup
```

### Restore from backup

```bash
# Restore PostgreSQL
docker compose exec -T postgres psql -U sheaf sheaf < backup.sql
```

### Volume safety

`docker compose down` preserves volumes. Only `docker compose down -v` deletes them — avoid `-v` unless you want a clean slate.

---

## Testing

Tests run inside Docker — no local Python environment needed.

```bash
docker compose run --rm test
```

This builds a throwaway container, installs dev dependencies (`pytest`, `pytest-asyncio`, `httpx`, `ruff`), and runs the full test suite. Tests use SQLite in-memory (not PostgreSQL) so they don't touch your production database.

The test service only runs on demand — it's excluded from `docker compose up` via Docker Compose profiles.

---

## What It Does

- **User accounts** — register, login (JWT auth), admin role
- **PDF upload** — drag-and-drop, public/private toggle
- **In-browser PDF reader** — zoom, page navigation, keyboard arrows, immersive/fullscreen mode
- **Reading progress** — saves which page you stopped on, per document per user
- **Continue reading** — dashboard shows recently read documents with progress bars
- **Admin panel** — user management (block/unblock), platform statistics
- **4 color themes** — light, dark, high-contrast, sepia
- **PDF caching** — Redis cache for fast repeated access
- **Public sharing** — public documents get a shareable download link
- **Storage backends** — local filesystem (default), Azure Blob Storage (configurable per user in Settings)
- **Mobile responsive** — hamburger menu, touch gestures, swipe navigation
- **Offline mode (PWA)** — save documents for offline reading, progress syncs when back online

---

## Offline Mode

Sheaf is a Progressive Web App (PWA) that works offline after initial load.

### How it works

1. **Save documents offline** — click the download icon next to any document to save it locally
2. **Read offline** — saved documents are available even without internet connection
3. **Progress tracking** — reading progress is saved locally and syncs when you're back online
4. **Install as app** — add Sheaf to your home screen for app-like experience

### Storage

- Documents are stored in IndexedDB (browser storage)
- Storage limit depends on browser/device (~50% of free disk space)
- Offline indicator shows connection status and pending syncs

### Technical details

- Service Worker caches static assets (JS, CSS, HTML)
- Dexie.js manages IndexedDB for document storage
- Background sync queues reading progress updates

---

## Project Structure

```
pdfflow/
├── sheaf/                     # Backend (Python/FastAPI)
│   ├── main.py                # App entry, lifespan, router registration
│   ├── config.py              # Settings from env vars (pydantic-settings)
│   ├── database.py            # SQLAlchemy async engine, session, init_db, auto-migrations
│   ├── dependencies.py        # FastAPI deps: auth, per-user/per-document storage resolution
│   ├── models/
│   │   ├── user.py            # User: id, username, password, admin, storage config
│   │   ├── document.py        # Document: id, filename, size, owner, storage_backend
│   │   └── reading_progress.py # ReadingProgress: user + doc, current_page, total_pages
│   ├── schemas/
│   │   ├── user.py            # UserCreate, UserRead, Token, StorageSettings
│   │   ├── document.py        # DocumentRead, DocumentList
│   │   └── reading_progress.py # ReadingProgressUpdate, ReadingProgressRead
│   ├── routers/
│   │   ├── auth.py            # POST /api/auth/register, POST /api/auth/login
│   │   ├── documents.py       # CRUD + /upload, /download, /view
│   │   ├── reading_progress.py # GET/PUT /api/reading-progress/{doc_id}
│   │   ├── settings.py        # GET/PUT /api/settings/storage
│   │   ├── admin.py           # GET /api/admin/users, /stats, PATCH toggle-active
│   │   └── public.py          # Public document access (no auth)
│   └── services/
│       ├── auth.py            # bcrypt hashing, JWT create/decode
│       ├── cache.py           # Redis async: cache_get, cache_set, cache_delete
│       └── storage/
│           ├── base.py        # StorageBackend ABC: save, load, delete, exists
│           ├── local.py       # Local filesystem storage (aiofiles)
│           └── azure_blob.py  # Azure Blob Storage (optional)
│
├── frontend/                  # Frontend (React + TypeScript + Vite)
│   ├── src/
│   │   ├── App.tsx            # Routes
│   │   ├── index.css          # Tailwind v4 + 4 theme definitions
│   │   ├── lib/api.ts         # Axios client, auth interceptor, API methods + types
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx  # Stats, continue reading, recent documents
│   │   │   ├── Documents.tsx  # Document list (table + mobile cards)
│   │   │   ├── UploadPage.tsx # Drag-and-drop PDF upload
│   │   │   ├── ReaderPage.tsx # PDF reader (pdfjs-dist canvas), immersive mode
│   │   │   ├── SettingsPage.tsx # Storage backend configuration
│   │   │   ├── AdminUsers.tsx # User management
│   │   │   └── AdminStats.tsx # Platform statistics
│   │   ├── components/
│   │   │   ├── Layout.tsx     # Auth guard + sidebar + responsive shell
│   │   │   ├── Sidebar.tsx    # Navigation, admin section, theme switcher
│   │   │   └── ThemeSwitcher.tsx # 4 theme buttons
│   │   └── context/
│   │       ├── AuthContext.tsx # Auth state, login/register/logout
│   │       └── ThemeContext.tsx # Theme state
│   ├── Dockerfile             # Multi-stage: node build -> nginx serve
│   └── nginx.conf             # Proxy /api/ to backend, SPA fallback
│
├── docker-compose.yml         # 4 services + test runner: app, frontend, postgres, redis, test
├── Dockerfile                 # Backend container (python:3.12-slim)
├── pyproject.toml             # Python deps, build config
└── .env                       # Active config (not committed)
```

## API Endpoints

### Auth
| Method | Endpoint               | Description          |
|--------|------------------------|----------------------|
| POST   | /api/auth/register     | Create account       |
| POST   | /api/auth/login        | Login (returns JWT)  |

### Documents (requires auth)
| Method | Endpoint                         | Description                    |
|--------|----------------------------------|--------------------------------|
| GET    | /api/documents/                  | List user's documents          |
| POST   | /api/documents/upload            | Upload PDF                     |
| GET    | /api/documents/{id}              | Get document metadata          |
| GET    | /api/documents/{id}/download     | Download PDF (increments count)|
| GET    | /api/documents/{id}/view         | View PDF inline                |
| DELETE | /api/documents/{id}              | Delete document                |

### Reading Progress (requires auth)
| Method | Endpoint                          | Description                    |
|--------|-----------------------------------|--------------------------------|
| GET    | /api/reading-progress/            | List recent reads              |
| GET    | /api/reading-progress/{doc_id}    | Get progress for document      |
| PUT    | /api/reading-progress/{doc_id}    | Save/update progress           |

### Settings (requires auth)
| Method | Endpoint                  | Description                          |
|--------|---------------------------|--------------------------------------|
| GET    | /api/settings/storage     | Get user's storage configuration     |
| PUT    | /api/settings/storage     | Update storage backend + credentials |

### Admin (requires admin role)
| Method | Endpoint                              | Description          |
|--------|---------------------------------------|----------------------|
| GET    | /api/admin/users                      | List all users       |
| PATCH  | /api/admin/users/{id}/toggle-active   | Block/unblock user   |
| GET    | /api/admin/stats                      | Platform statistics  |

### Public
| Method | Endpoint                       | Description                    |
|--------|--------------------------------|--------------------------------|
| GET    | /api/public/{id}               | Get public document metadata   |
| GET    | /api/public/{id}/download      | Download public document       |

## Configuration (.env)

| Variable                         | Default                                              | Description                    |
|----------------------------------|------------------------------------------------------|--------------------------------|
| SECRET_KEY                       | change-me-to-a-random-secret                         | JWT signing key                |
| DATABASE_URL                     | postgresql+asyncpg://sheaf:sheaf@postgres:5432/sheaf | Database connection string     |
| STORAGE_BACKEND                  | local                                                | Global default: `local` or `azure` |
| LOCAL_STORAGE_PATH               | ./storage                                            | Path for local file storage    |
| REDIS_URL                        | redis://redis:6379/0                                 | Redis connection               |
| CACHE_TTL_SECONDS                | 3600                                                 | PDF cache TTL                  |
| ACCESS_TOKEN_EXPIRE_MINUTES      | 60                                                   | JWT token lifetime             |
| ADMIN_USERNAME                   | admin                                                | Default admin username         |
| ADMIN_PASSWORD                   | admin                                                | Default admin password         |
| AZURE_STORAGE_CONNECTION_STRING  |                                                      | Global Azure fallback          |
| AZURE_STORAGE_CONTAINER          | sheaf-pdfs                                           | Global Azure container name    |

Users can configure their own Azure Blob Storage credentials in **Settings > Storage** — this overrides the global `STORAGE_BACKEND` for that user. Each document remembers which backend it was uploaded to.

## Key Design Decisions

- **UUID string PKs** — all models use `String(36)` with `uuid4()`, portable across SQLite/Postgres
- **Per-user storage** — each user can configure their own Azure Blob Storage; documents track their storage backend individually
- **Auto-migration** — new columns are added automatically on startup (no manual migration steps)
- **Storage abstraction** — `StorageBackend` ABC allows swapping local/Azure without changing business logic
- **PDF caching** — Redis stores PDF bytes (`pdf:{doc_id}` keys) to avoid repeated disk/blob reads
- **Auth** — JWT tokens via `python-jose`, passwords hashed with `bcrypt`
- **Frontend PDF viewer** — `pdfjs-dist` canvas rendering with HiDPI support, immersive/fullscreen mode
- **Theme system** — Tailwind CSS v4 `@theme` block with CSS custom properties, 4 variants
- **Docker networking** — frontend nginx proxies `/api/` to backend, Postgres and Redis only accessible internally

---

## Roadmap

### OCR Integration (planned)

Text extraction from scanned PDFs and images:

- **Tesseract OCR** — open-source OCR engine
- **Full-text search** — search within scanned documents
- **Text layer overlay** — select and copy text from scanned pages
- **Language support** — configurable OCR languages

### Calibre Integration (planned)

E-book library management integration:

- **Import from Calibre** — sync books from Calibre library
- **Metadata sync** — author, title, series, tags from Calibre
- **Format conversion** — convert EPUB, MOBI to PDF via Calibre
- **Calibre Content Server** — connect to remote Calibre instance
