from pydantic_settings import BaseSettings
from pydantic import field_validator
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "FNC Backend"
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/FNC"
    api_prefix: str = "/api"
    load_seed: bool = False
    storage_root: str | None = None
    # FIX: Default para dev / CI
    jwt_secret: str = "20251212"
    jwt_algorithm: str = "HS256"
    jwt_expires_minutes: int = 720
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    cors_allow_credentials: bool = False
    email_enabled: bool = False
    email_smtp_host: str = "mail.linsse.com"
    email_smtp_port: int = 587
    email_use_tls: bool = True
    email_username: str = "fcastellano@linsse.com"
    email_password: str = ""
    email_from: str = "fcastellano@linsse.com"
    email_subject_prefix: str = "[FNC]"
    email_timeout_ms: int = 180000
    email_cc_always: list[str] = ["fcastellano@linsse.com"]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @field_validator("email_cc_always", mode="before")
    @classmethod
    def _parse_email_cc_always(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [email.strip() for email in value.split(",") if email.strip()]
        return value

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
