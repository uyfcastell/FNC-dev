from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..db import get_session
from ..models import Deposit, Role, SKU
from ..schemas import DepositCreate, SKUCreate

router = APIRouter()


@router.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/roles", tags=["admin"])
def list_roles(session: Session = Depends(get_session)) -> list[Role]:
    roles = session.exec(select(Role)).all()
    return roles


@router.get("/skus", tags=["sku"])
def list_skus(session: Session = Depends(get_session)) -> list[SKU]:
    """Listado simple para bootstrap de catálogo."""

    return session.exec(select(SKU).order_by(SKU.code)).all()


@router.post("/skus", tags=["sku"], status_code=status.HTTP_201_CREATED)
def create_sku(payload: SKUCreate, session: Session = Depends(get_session)) -> SKU:
    existing = session.exec(select(SKU).where(SKU.code == payload.code)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El código ya existe",
        )

    sku = SKU(**payload.model_dump())
    session.add(sku)
    session.commit()
    session.refresh(sku)
    return sku


@router.get("/deposits", tags=["deposits"])
def list_deposits(session: Session = Depends(get_session)) -> list[Deposit]:
    return session.exec(select(Deposit).order_by(Deposit.name)).all()


@router.post("/deposits", tags=["deposits"], status_code=status.HTTP_201_CREATED)
def create_deposit(payload: DepositCreate, session: Session = Depends(get_session)) -> Deposit:
    existing = session.exec(select(Deposit).where(Deposit.name == payload.name)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El depósito ya existe",
        )

    deposit = Deposit(**payload.model_dump())
    session.add(deposit)
    session.commit()
    session.refresh(deposit)
    return deposit

