import hashlib
from datetime import datetime, timedelta
from typing import Any, Optional

from fastapi import HTTPException, status
from jose import JWTError, jwt
from passlib.context import CryptContext

from .config import get_settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(raw_password: str) -> str:
    return pwd_context.hash(raw_password)


def _is_legacy_hash(hashed_password: str) -> bool:
    return len(hashed_password) == 64 and all(c in "0123456789abcdef" for c in hashed_password.lower())


def verify_password(raw_password: str, hashed_password: str) -> bool:
    try:
        if pwd_context.identify(hashed_password):
            return pwd_context.verify(raw_password, hashed_password)
    except Exception:
        # Fall back to legacy validation below
        pass

    if _is_legacy_hash(hashed_password):
        return hashlib.sha256(raw_password.encode()).hexdigest() == hashed_password
    return False


def needs_rehash(hashed_password: str) -> bool:
    try:
        return pwd_context.needs_update(hashed_password)
    except Exception:
        return False


def is_legacy_hash(hashed_password: str) -> bool:
    return _is_legacy_hash(hashed_password)


def create_access_token(data: dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    settings = get_settings()
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.jwt_expires_minutes))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido") from exc
