from datetime import date, datetime
from typing import Optional, TYPE_CHECKING

from sqlmodel import Field, Relationship
from sqlalchemy import UniqueConstraint

from .common import InventoryCountStatus, TimestampedModel, UnitOfMeasure, enum_column

if TYPE_CHECKING:  # pragma: no cover - avoid circular import at runtime
    from .sku import SKU, SKUType
    from .merma import MermaEvent, ProductionLine
    from .user import User


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
    is_active: bool = Field(default=True)

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
    expiry_date: date | None = None
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
    created_by_user_id: int | None = Field(default=None, foreign_key="users.id")

    sku: "SKU" = Relationship()
    deposit: Deposit = Relationship()
    merma_event: Optional["MermaEvent"] = Relationship(sa_relationship_kwargs={"uselist": False})
    production_lot: Optional["ProductionLot"] = Relationship(back_populates="movements")
    movement_type: StockMovementType = Relationship(back_populates="movements")
    created_by_user: Optional["User"] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[StockMovement.created_by_user_id]"}
    )


class InventoryCount(TimestampedModel, table=True):
    __tablename__ = "inventory_counts"

    id: Optional[int] = Field(default=None, primary_key=True)
    deposit_id: int = Field(foreign_key="deposits.id")
    status: InventoryCountStatus = Field(
        default=InventoryCountStatus.DRAFT, sa_column=enum_column(InventoryCountStatus, "inventorycountstatus")
    )
    count_date: date = Field(default_factory=date.today)
    notes: str | None = Field(default=None, max_length=500)
    submitted_at: datetime | None = None
    approved_at: datetime | None = None
    closed_at: datetime | None = None
    cancelled_at: datetime | None = None
    created_by_user_id: int | None = Field(default=None, foreign_key="users.id")
    updated_by_user_id: int | None = Field(default=None, foreign_key="users.id")
    approved_by_user_id: int | None = Field(default=None, foreign_key="users.id")

    deposit: Deposit = Relationship()
    created_by_user: Optional["User"] = Relationship(sa_relationship_kwargs={"foreign_keys": "[InventoryCount.created_by_user_id]"})
    updated_by_user: Optional["User"] = Relationship(sa_relationship_kwargs={"foreign_keys": "[InventoryCount.updated_by_user_id]"})
    approved_by_user: Optional["User"] = Relationship(sa_relationship_kwargs={"foreign_keys": "[InventoryCount.approved_by_user_id]"})
    items: list["InventoryCountItem"] = Relationship(back_populates="inventory_count")


class InventoryCountItem(TimestampedModel, table=True):
    __tablename__ = "inventory_count_items"

    id: Optional[int] = Field(default=None, primary_key=True)
    inventory_count_id: int = Field(foreign_key="inventory_counts.id")
    sku_id: int = Field(foreign_key="skus.id")
    production_lot_id: int | None = Field(default=None, foreign_key="production_lots.id")
    lot_code: str | None = Field(default=None, max_length=64)
    counted_quantity: float
    system_quantity: float
    difference: float
    unit: UnitOfMeasure = UnitOfMeasure.UNIT
    stock_movement_id: int | None = Field(default=None, foreign_key="stock_movements.id")

    inventory_count: InventoryCount = Relationship(back_populates="items")
    sku: "SKU" = Relationship()
    production_lot: Optional["ProductionLot"] = Relationship()
    stock_movement: Optional["StockMovement"] = Relationship()
