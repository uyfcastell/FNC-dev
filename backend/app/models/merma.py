from datetime import datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, Relationship

from .common import MermaAction, MermaStage, TimestampedModel, UnitOfMeasure

if TYPE_CHECKING:  # pragma: no cover
    from .inventory import Deposit, StockMovement
    from .order import Order, Remito, RemitoItem
    from .sku import SKU
    from .user import User


class ProductionLine(TimestampedModel, table=True):
    __tablename__ = "production_lines"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=255, unique=True)
    is_active: bool = Field(default=True)

    merma_events: list["MermaEvent"] = Relationship(back_populates="production_line")


class MermaType(TimestampedModel, table=True):
    __tablename__ = "merma_types"
    __table_args__ = (UniqueConstraint("stage", "code", name="uq_merma_types_stage_code"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    stage: MermaStage
    code: str = Field(max_length=64)
    label: str = Field(max_length=255)
    is_active: bool = Field(default=True)

    merma_events: list["MermaEvent"] = Relationship(back_populates="type")


class MermaCause(TimestampedModel, table=True):
    __tablename__ = "merma_causes"
    __table_args__ = (UniqueConstraint("stage", "code", name="uq_merma_causes_stage_code"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    stage: MermaStage
    code: str = Field(max_length=64)
    label: str = Field(max_length=255)
    is_active: bool = Field(default=True)

    merma_events: list["MermaEvent"] = Relationship(back_populates="cause")


class MermaEvent(TimestampedModel, table=True):
    __tablename__ = "merma_events"

    id: Optional[int] = Field(default=None, primary_key=True)
    stage: MermaStage

    type_id: int = Field(foreign_key="merma_types.id")
    type_code: str = Field(max_length=64)
    type_label: str = Field(max_length=255)

    cause_id: int = Field(foreign_key="merma_causes.id")
    cause_code: str = Field(max_length=64)
    cause_label: str = Field(max_length=255)

    sku_id: int = Field(foreign_key="skus.id")
    quantity: float
    unit: UnitOfMeasure

    lot_code: str | None = Field(default=None, max_length=64)
    deposit_id: int | None = Field(default=None, foreign_key="deposits.id")
    remito_id: int | None = Field(default=None, foreign_key="remitos.id")
    remito_item_id: int | None = Field(default=None, foreign_key="remito_items.id")
    order_id: int | None = Field(default=None, foreign_key="orders.id")
    production_line_id: int | None = Field(default=None, foreign_key="production_lines.id")

    reported_by_user_id: int | None = Field(default=None, foreign_key="users.id")
    reported_by_role: str | None = Field(default=None, max_length=100)
    notes: str | None = Field(default=None, max_length=500)

    detected_at: datetime = Field(default_factory=datetime.utcnow)

    affects_stock: bool = Field(default=True)
    action: MermaAction = Field(default=MermaAction.NONE)
    stock_movement_id: int | None = Field(default=None, foreign_key="stock_movements.id")

    type: MermaType = Relationship(back_populates="merma_events")
    cause: MermaCause = Relationship(back_populates="merma_events")
    sku: "SKU" = Relationship(back_populates="merma_events")
    deposit: Optional["Deposit"] = Relationship(back_populates="merma_events")
    remito: Optional["Remito"] = Relationship(back_populates="merma_events")
    remito_item: Optional["RemitoItem"] = Relationship(back_populates="merma_events")
    order: Optional["Order"] = Relationship(back_populates="merma_events")
    production_line: Optional["ProductionLine"] = Relationship(back_populates="merma_events")
    stock_movement: Optional["StockMovement"] = Relationship(back_populates="merma_event")
    reported_by_user: Optional["User"] = Relationship(back_populates="reported_mermas")
