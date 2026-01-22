from pydantic_settings import BaseSettings
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

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
