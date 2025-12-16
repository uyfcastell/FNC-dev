from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from ..db import get_session
from ..models import Role

router = APIRouter()


@router.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/roles", tags=["admin"])
def list_roles(session: Session = Depends(get_session)) -> list[Role]:
    roles = session.exec(select(Role)).all()
    return roles

