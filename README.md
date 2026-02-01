# sheaf

Open-source PDF hosting platform with in-browser reader, reading progress tracking, user accounts, and admin panel.

**Stack:** Python/FastAPI + React/TypeScript + SQLite + Redis + Docker

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

| Service  | Port  | Description           |
|----------|-------|-----------------------|
| Frontend | 3100  | Web UI (nginx)        |
| Backend  | 8000  | API (FastAPI/uvicorn) |
| Redis    | 6379  | Cache (internal only) |

### Stopping

```bash
docker compose down
```

---

## What It Does

- **User accounts** — register, login (JWT auth), admin role
- **PDF upload** — drag-and-drop, public/private toggle
- **In-browser PDF reader** — zoom, page navigation, keyboard arrows
- **Reading progress** — saves which page you stopped on, per document per user
- **Continue reading** — dashboard shows recently read documents with progress bars
- **Admin panel** — user management (block/unblock), platform statistics
- **4 color themes** — light, dark, high-contrast, sepia
- **PDF caching** — Redis cache for fast repeated access
- **Public sharing** — public documents get a shareable download link
- **Storage backends** — local filesystem (default), Azure Blob Storage (optional)

---

## Project Structure

```
pdfflow/
├── sheaf/                     # Backend (Python/FastAPI)
│   ├── main.py                # App entry, lifespan, router registration
│   ├── config.py              # Settings from env vars (pydantic-settings)
│   ├── database.py            # SQLAlchemy async engine, session, Base, init_db()
│   ├── dependencies.py        # FastAPI deps: get_current_user, require_admin, get_storage
│   ├── models/
│   │   ├── user.py            # User: id, username, hashed_password, is_admin, is_active
│   │   ├── document.py        # Document: id, filename, original_name, size, owner, is_public
│   │   └── reading_progress.py # ReadingProgress: user_id + document_id, current_page, total_pages
│   ├── schemas/
│   │   ├── user.py            # UserCreate, UserRead, Token
│   │   ├── document.py        # DocumentRead, DocumentList
│   │   └── reading_progress.py # ReadingProgressUpdate, ReadingProgressRead
│   ├── routers/
│   │   ├── auth.py            # POST /api/auth/register, POST /api/auth/login
│   │   ├── documents.py       # CRUD + /upload, /download, /view (inline PDF)
│   │   ├── reading_progress.py # GET/PUT /api/reading-progress/{doc_id}
│   │   ├── admin.py           # GET /api/admin/users, /stats, PATCH toggle-active
│   │   └── public.py          # Public document access (no auth)
│   └── services/
│       ├── auth.py            # bcrypt hashing, JWT create/decode, authenticate
│       ├── cache.py           # Redis async: cache_get, cache_set, cache_delete
│       └── storage/
│           ├── base.py        # StorageBackend ABC: save, load, delete, exists
│           ├── local.py       # Local filesystem storage (aiofiles)
│           └── azure_blob.py  # Azure Blob Storage (optional)
│
├── frontend/                  # Frontend (React + TypeScript + Vite)
│   ├── src/
│   │   ├── App.tsx            # Routes: /login, /register, /read/:docId, layout-wrapped pages
│   │   ├── index.css          # Tailwind v4 + 4 theme definitions (CSS custom properties)
│   │   ├── lib/
│   │   │   └── api.ts         # Axios client, auth interceptor, all API methods + types
│   │   ├── pages/
│   │   │   ├── Login.tsx      # Login form
│   │   │   ├── Register.tsx   # Registration form
│   │   │   ├── Dashboard.tsx  # Stats cards, continue reading, recent documents
│   │   │   ├── Documents.tsx  # Document table with progress bars, read/download/delete
│   │   │   ├── UploadPage.tsx # Drag-and-drop PDF upload
│   │   │   ├── ReaderPage.tsx # Full-screen PDF reader (react-pdf), debounced progress save
│   │   │   ├── AdminUsers.tsx # User management table
│   │   │   └── AdminStats.tsx # Platform-wide statistics
│   │   ├── components/
│   │   │   ├── Layout.tsx     # Auth guard + sidebar + outlet
│   │   │   ├── Sidebar.tsx    # Navigation, admin section, theme switcher, logout
│   │   │   └── ThemeSwitcher.tsx # 4 theme buttons (light/dark/high-contrast/sepia)
│   │   └── context/
│   │       ├── AuthContext.tsx # Auth state, login/register/logout, localStorage
│   │       └── ThemeContext.tsx # Theme state, applies class to <html>
│   ├── Dockerfile             # Multi-stage: node build -> nginx serve
│   └── nginx.conf             # Proxy /api/ to backend, SPA fallback
│
├── tests/                     # pytest test suite
│   ├── conftest.py            # Test fixtures
│   ├── test_health.py
│   ├── test_auth.py
│   └── test_documents.py
│
├── alembic/                   # Database migrations (alembic)
├── storage/                   # Local PDF file storage (Docker volume in production)
├── docker-compose.yml         # 3 services: app, frontend, redis
├── Dockerfile                 # Backend container (python:3.12-slim)
├── pyproject.toml             # Python deps, build config, tool config
├── .env.example               # Environment variable template
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
| GET    | /api/documents/{id}/view         | View PDF inline (no count)     |
| DELETE | /api/documents/{id}              | Delete document                |

### Reading Progress (requires auth)
| Method | Endpoint                          | Description                    |
|--------|-----------------------------------|--------------------------------|
| GET    | /api/reading-progress/            | List recent reads (top 5)      |
| GET    | /api/reading-progress/{doc_id}    | Get progress for document      |
| PUT    | /api/reading-progress/{doc_id}    | Save/update progress           |

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

| Variable                         | Default                          | Description                    |
|----------------------------------|----------------------------------|--------------------------------|
| SECRET_KEY                       | change-me-to-a-random-secret     | JWT signing key                |
| DATABASE_URL                     | sqlite+aiosqlite:///./sheaf.db   | Database connection string     |
| STORAGE_BACKEND                  | local                            | `local` or `azure`             |
| LOCAL_STORAGE_PATH               | ./storage                        | Path for local file storage    |
| REDIS_URL                        | redis://redis:6379/0             | Redis connection (use `redis` host in Docker) |
| CACHE_TTL_SECONDS                | 3600                             | PDF cache TTL                  |
| ACCESS_TOKEN_EXPIRE_MINUTES      | 60                               | JWT token lifetime             |
| ADMIN_USERNAME                   | admin                            | Default admin username         |
| ADMIN_PASSWORD                   | admin                            | Default admin password         |
| AZURE_STORAGE_CONNECTION_STRING  |                                  | Azure Blob connection string   |
| AZURE_STORAGE_CONTAINER          | sheaf-pdfs                       | Azure Blob container name      |

## Key Design Decisions

- **UUID string PKs** — all models use `String(36)` with `uuid4()`, portable across SQLite/Postgres
- **Storage abstraction** — `StorageBackend` ABC allows swapping local/Azure without changing business logic
- **PDF caching** — Redis stores PDF bytes (`pdf:{doc_id}` keys) to avoid repeated disk/blob reads
- **Reading progress** — `UniqueConstraint(user_id, document_id)` ensures one record per user per document, upsert pattern on PUT
- **Auth** — JWT tokens via `python-jose`, passwords hashed with `bcrypt` directly (not passlib, due to bcrypt 5.x incompatibility)
- **Frontend PDF viewer** — `react-pdf` (wraps pdf.js), fetches PDF as blob via authenticated axios, passes blob URL to `<Document>`
- **Theme system** — Tailwind CSS v4 `@theme` block with CSS custom properties, 4 variants applied via class on `<html>`
- **Docker networking** — frontend nginx proxies `/api/` to backend, Redis only accessible internally
