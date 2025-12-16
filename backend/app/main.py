from fastapi import FastAPI

from .api.routes import router as api_router
from .core.config import get_settings
from .db import init_db

settings = get_settings()


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name)
    init_db()
    app.include_router(api_router, prefix=settings.api_prefix)
    return app


app = create_app()
