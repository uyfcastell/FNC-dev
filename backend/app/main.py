from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import api_router
from .core.config import get_settings
from .core.rbac import RBACMiddleware, annotate_routes_with_permissions
from .db import init_db

settings = get_settings()


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=settings.cors_allow_credentials,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    init_db()
    app.include_router(api_router, prefix=settings.api_prefix)
    annotate_routes_with_permissions(app.router.routes)
    app.add_middleware(RBACMiddleware)
    return app

app = create_app()
