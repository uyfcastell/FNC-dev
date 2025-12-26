from datetime import date
from typing import Optional, TYPE_CHECKING

from sqlmodel import Field, Relationship
from sqlalchemy import UniqueConstraint

from .common import TimestampedModel

if TYPE_CHECKING:  # pragma: no cover - avoid circular import at runtime
    from .sku import SKU, SKUType
    from .merma import MermaEvent, ProductionLine


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


class ProductionLot(TimestampedModel, table=True):
    __tablename__ = "production_lots"
    __table_args__ = (UniqueConstraint("lot_code", name="uq_production_lots_code"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    lot_code: str = Field(max_length=64, index=True)
    sku_id: int = Field(foreign_key="skus.id")
    deposit_id: int = Field(foreign_key="deposits.id")
    production_line_id: int | None = Field(default=None, foreign_key="production_lines.id")
    produced_quantity: float = Field(gt=0)
    remaining_quantity: float = Field(default=0)
    produced_at: date = Field(default_factory=date.today)
    is_blocked: bool = Field(default=False)
    notes: str | None = Field(default=None, max_length=255)

    sku: "SKU" = Relationship(back_populates="production_lots")
    deposit: Deposit = Relationship()
    production_line: Optional["ProductionLine"] = Relationship()
    movements: list["StockMovement"] = Relationship(back_populates="production_lot")


class StockMovement(TimestampedModel, table=True):
    __tablename__ = "stock_movements"

    id: Optional[int] = Field(default=None, primary_key=True)
    sku_id: int = Field(foreign_key="skus.id")
    deposit_id: int = Field(foreign_key="deposits.id")
    movement_type_id: int = Field(foreign_key="stock_movement_types.id")
    quantity: float
    reference_type: str | None = Field(default=None, max_length=50)
    reference_id: int | None = Field(default=None)
    reference_item_id: int | None = Field(default=None)
    reference: str | None = Field(default=None, max_length=100)
    lot_code: str | None = Field(default=None, max_length=64)
    production_lot_id: int | None = Field(default=None, foreign_key="production_lots.id")
    movement_date: date = Field(default_factory=date.today)

    sku: "SKU" = Relationship()
    deposit: Deposit = Relationship()
    merma_event: Optional["MermaEvent"] = Relationship(sa_relationship_kwargs={"uselist": False})
    production_lot: Optional["ProductionLot"] = Relationship(back_populates="movements")
    movement_type: StockMovementType = Relationship(back_populates="movements")
