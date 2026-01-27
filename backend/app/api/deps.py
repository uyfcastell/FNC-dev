from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session, select

from ..core.config import get_settings
from ..core.security import decode_access_token
from ..db import get_session
from ..models import Permission, Role, RolePermission, User

SUPERADMIN_EMAIL = "admin@local"


def _is_superadmin(user: User) -> bool:
    return user.email.strip().lower() == SUPERADMIN_EMAIL


def _normalize_role_name(name: str) -> str:
    return (
        name.strip()
        .upper()
        .replace("Á", "A")
        .replace("É", "E")
        .replace("Í", "I")
        .replace("Ó", "O")
        .replace("Ú", "U")
        .replace("Ü", "U")
        .replace("Ñ", "N")
    )

settings = get_settings()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.api_prefix}/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)) -> User:
    payload = decode_access_token(token)
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
    try:
        user_id = int(sub)
    except (TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido") from None

    user = session.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado o inactivo")
    return user


def require_roles(*roles: str):
    normalized = {role.upper() for role in roles}
    legacy_aliases = {
        "DEPOSITO": "WAREHOUSE",
        "PRODUCCION": "PRODUCTION",
    }

    def _checker(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)) -> User:
        if _is_superadmin(current_user):
            return current_user
        if not normalized:
            return current_user
        if current_user.role_id is None:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Rol no asignado")
        role = session.exec(select(Role).where(Role.id == current_user.role_id)).first()
        role_name = _normalize_role_name(role.name) if role else ""
        if role_name in {"ADMIN", "ADMINISTRACION"}:
            return current_user
        mapped_role = legacy_aliases.get(role_name, role_name)
        if mapped_role not in normalized:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Rol insuficiente")
        return current_user

    return _checker


def require_permissions(*permissions: str):
    normalized = {permission.strip().lower() for permission in permissions}

    def _checker(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)) -> User:
        if _is_superadmin(current_user):
            return current_user
        if not normalized:
            return current_user
        if current_user.role_id is None:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Rol no asignado")
        result = session.exec(
            select(Permission.key)
            .join(RolePermission, RolePermission.permission_id == Permission.id)
            .where(RolePermission.role_id == current_user.role_id)
        ).all()
        assigned = {key.lower() for key in result}
        if not normalized.intersection(assigned):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permiso insuficiente")
        return current_user

    return _checker


def require_active_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuario inactivo")
    return current_user
