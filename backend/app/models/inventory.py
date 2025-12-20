from datetime import date
from typing import Optional, TYPE_CHECKING

from sqlmodel import Field, Relationship
from sqlalchemy import UniqueConstraint

from .common import TimestampedModel

if TYPE_CHECKING:  # pragma: no cover - avoid circular import at runtime
    from .sku import SKU
    from .merma import MermaEvent
    from .sku import SKUType


class StockMovementType(TimestampedModel, table=True):
    __tablename__ = "stock_movement_types"
    __table_args__ = (UniqueConstraint("code", name="uq_stock_movement_types_code"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(max_length=50, index=True)
    label: str = Field(max_length=255)
    is_active: bool = Field(default=True)

    movements: list["StockMovement"] = Relationship(back_populates="movement_type")


class Deposit(TimestampedModel, table=True):
    __tablename__ = "deposits"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=255, unique=True)
    location: str | None = Field(default=None, max_length=255)
    controls_lot: bool = Field(default=True)
    is_store: bool = Field(default=False, description="Marca si el depósito corresponde a un local")

    stock_levels: list["StockLevel"] = Relationship(back_populates="deposit")
    merma_events: list["MermaEvent"] = Relationship(back_populates="deposit")


class StockLevel(TimestampedModel, table=True):
    __tablename__ = "stock_levels"

    id: Optional[int] = Field(default=None, primary_key=True)
    sku_id: int = Field(foreign_key="skus.id")
    deposit_id: int = Field(foreign_key="deposits.id")
    quantity: float = Field(default=0)

    sku: "SKU" = Relationship(back_populates="stock_levels")
    deposit: Deposit = Relationship(back_populates="stock_levels")


class StockMovement(TimestampedModel, table=True):
    __tablename__ = "stock_movements"

    id: Optional[int] = Field(default=None, primary_key=True)
    sku_id: int = Field(foreign_key="skus.id")
    deposit_id: int = Field(foreign_key="deposits.id")
    movement_type_id: int = Field(foreign_key="stock_movement_types.id")
    quantity: float
    reference: str | None = Field(default=None, max_length=100)
    lot_code: str | None = Field(default=None, max_length=64)
    movement_date: date = Field(default_factory=date.today)

    sku: "SKU" = Relationship()
    deposit: Deposit = Relationship()
    merma_event: Optional["MermaEvent"] = Relationship(sa_relationship_kwargs={"uselist": False})
    movement_type: StockMovementType = Relationship(back_populates="movements")
