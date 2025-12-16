from datetime import date
from typing import Optional, TYPE_CHECKING

from sqlmodel import Field, Relationship

from .common import MovementType, TimestampedModel

if TYPE_CHECKING:  # pragma: no cover - avoid circular import at runtime
    from .sku import SKU


class Deposit(TimestampedModel, table=True):
    __tablename__ = "deposits"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=255, unique=True)
    location: str | None = Field(default=None, max_length=255)
    controls_lot: bool = Field(default=True)

    stock_levels: list["StockLevel"] = Relationship(back_populates="deposit")


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
    movement_type: MovementType
    quantity: float
    reference: str | None = Field(default=None, max_length=100)
    lot_code: str | None = Field(default=None, max_length=64)
    movement_date: date = Field(default_factory=date.today)

    sku: "SKU" = Relationship()
    deposit: Deposit = Relationship()

