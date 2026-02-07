from __future__ import annotations

from collections.abc import Callable

from fastapi import Depends, HTTPException, Request, status
from fastapi.routing import APIRoute
from sqlalchemy import select
from sqlmodel import Session
from starlette.middleware.base import BaseHTTPMiddleware

from ..api.deps import SUPERADMIN_EMAIL, get_current_user
from ..db import engine, get_session
from ..models import Permission, RolePermission, User
from .rbac_catalog import AUTH_ONLY, DOC_PATHS, PUBLIC_WHITELIST, ROUTE_PERMISSION_MAP


def permission_required(key: str) -> Callable:
    def _decorator(handler: Callable) -> Callable:
        setattr(handler, "__permission_key__", key)
        return handler

    return _decorator


def get_user_permission_keys(user_id: int, session: Session, request: Request | None = None) -> set[str]:
    cache = getattr(request.state, "permission_keys_by_user", None) if request else None
    if cache is None and request is not None:
        cache = {}
        request.state.permission_keys_by_user = cache

    if cache is not None and user_id in cache:
        return cache[user_id]

    user = session.get(User, user_id)
    if not user:
        return set()
    if user.email.strip().lower() == SUPERADMIN_EMAIL:
        permissions = {"*"}
    elif user.role_id is None:
        permissions = set()
    else:
        rows = session.exec(
            select(Permission.key)
            .join(RolePermission, RolePermission.permission_id == Permission.id)
            .where(RolePermission.role_id == user.role_id)
        ).all()
        permissions = {row.strip().lower() for row in rows}

    if cache is not None:
        cache[user_id] = permissions
    return permissions


def require_perm(permission_key: str):
    normalized = permission_key.strip().lower()

    def _checker(
        request: Request,
        current_user: User = Depends(get_current_user),
        session: Session = Depends(get_session),
    ) -> User:
        keys = get_user_permission_keys(current_user.id, session, request)
        if "*" in keys or normalized in keys:
            return current_user
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")

    return _checker


def annotate_routes_with_permissions(routes: list) -> None:
    for route in routes:
        if not isinstance(route, APIRoute):
            continue
        for method in (route.methods or set()):
            if method in {"HEAD", "OPTIONS"}:
                continue
            permission_key = ROUTE_PERMISSION_MAP.get((method, route.path))
            if permission_key:
                setattr(route.endpoint, "__permission_key__", permission_key)


def _resolve_route(request: Request) -> APIRoute | None:
    for route in request.app.router.routes:
        if isinstance(route, APIRoute):
            match, _ = route.matches(request.scope)
            if match.value == 2:
                return route
    return None


def _extract_bearer_token(request: Request) -> str:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return auth_header.split(" ", 1)[1].strip()


def _get_user_from_request(request: Request, session: Session) -> User:
    from ..core.security import decode_access_token

    token = _extract_bearer_token(request)
    payload = decode_access_token(token)
    sub = payload.get("sub")
    try:
        user_id = int(sub)
    except (TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido") from None
    user = session.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado o inactivo")
    return user


class RBACMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method in {"OPTIONS", "HEAD"}:
            return await call_next(request)
        route = _resolve_route(request)
        if route is None:
            return await call_next(request)
        path = route.path
        method = request.method.upper()

        if path in DOC_PATHS or (method, path) in PUBLIC_WHITELIST:
            return await call_next(request)

        with Session(engine) as session:
            _get_user_from_request(request, session) if (method, path) in AUTH_ONLY else None
            if (method, path) in AUTH_ONLY:
                return await call_next(request)
            permission_key = getattr(route.endpoint, "__permission_key__", None)
            if not permission_key:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")
            user = _get_user_from_request(request, session)
            permissions = get_user_permission_keys(user.id, session, request)
            if "*" not in permissions and permission_key.strip().lower() not in permissions:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")

        return await call_next(request)
