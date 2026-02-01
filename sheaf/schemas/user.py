from datetime import datetime

from pydantic import BaseModel


class UserCreate(BaseModel):
    username: str
    password: str


class UserRead(BaseModel):
    id: str
    username: str
    is_admin: bool
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class StorageSettingsRead(BaseModel):
    storage_backend: str
    azure_connection_string_set: bool
    azure_container_name: str | None

    model_config = {"from_attributes": True}


class StorageSettingsUpdate(BaseModel):
    storage_backend: str
    azure_account_name: str | None = None
    azure_account_key: str | None = None
    azure_container_name: str | None = None
