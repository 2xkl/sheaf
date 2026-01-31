from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    # App
    app_name: str = "sheaf"
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    secret_key: str = "change-me-to-a-random-secret"
    debug: bool = False

    # Database
    database_url: str = "sqlite+aiosqlite:///./sheaf.db"

    # Storage
    storage_backend: str = "local"  # "local" | "azure"
    local_storage_path: str = "./storage"

    # Azure Blob Storage
    azure_storage_connection_string: str = ""
    azure_storage_container: str = "sheaf-pdfs"

    # Redis
    redis_url: str = "redis://localhost:6379/0"
    cache_ttl_seconds: int = 3600

    # Auth
    access_token_expire_minutes: int = 60
    admin_username: str = "admin"
    admin_password: str = "admin"


settings = Settings()
