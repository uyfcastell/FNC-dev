from fastapi.routing import APIRoute

from app.main import app
from app.core.rbac_catalog import AUTH_ONLY, DOC_PATHS, PUBLIC_WHITELIST


def test_all_non_whitelisted_routes_have_permission_key() -> None:
    missing: list[str] = []
    for route in app.router.routes:
        if not isinstance(route, APIRoute):
            continue
        if not route.path:
            continue
        if route.path in DOC_PATHS:
            continue

        for method in route.methods or set():
            if method in {"HEAD", "OPTIONS"}:
                continue
            if (method, route.path) in PUBLIC_WHITELIST or (method, route.path) in AUTH_ONLY:
                continue
            if not hasattr(route.endpoint, "__permission_key__"):
                missing.append(f"{method} {route.path}")

    assert not missing, f"Endpoints sin permiso explícito: {missing}"
