from datetime import date
from typing import Optional, TYPE_CHECKING

from sqlmodel import Field, Relationship

from .common import OrderStatus, RemitoStatus, TimestampedModel

if TYPE_CHECKING:  # pragma: no cover
    from .inventory import Deposit
    from .merma import MermaEvent


class Order(TimestampedModel, table=True):
    __tablename__ = "orders"

    id: Optional[int] = Field(default=None, primary_key=True)
    destination: str = Field(max_length=255)
    destination_deposit_id: int | None = Field(default=None, foreign_key="deposits.id")
    status: OrderStatus = Field(default=OrderStatus.DRAFT)
    requested_for: date | None = None
    notes: str | None = Field(default=None, max_length=255)

    items: list["OrderItem"] = Relationship(back_populates="order")
    remitos: list["Remito"] = Relationship(back_populates="order")
    destination_deposit: Optional["Deposit"] = Relationship()
    merma_events: list["MermaEvent"] = Relationship(back_populates="order")


class OrderItem(TimestampedModel, table=True):
    __tablename__ = "order_items"

    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key="orders.id")
    sku_id: int = Field(foreign_key="skus.id")
    quantity: float = Field(gt=0)
    current_stock: float | None = Field(default=None)

    order: Order = Relationship(back_populates="items")


class Remito(TimestampedModel, table=True):
    __tablename__ = "remitos"

    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key="orders.id")
    status: RemitoStatus = Field(default=RemitoStatus.PENDING)
    destination: str = Field(max_length=255)
    issue_date: date = Field(default_factory=date.today)

    order: Order = Relationship(back_populates="remitos")
    items: list["RemitoItem"] = Relationship(back_populates="remito")
    merma_events: list["MermaEvent"] = Relationship(back_populates="remito")


class RemitoItem(TimestampedModel, table=True):
    __tablename__ = "remito_items"

    id: Optional[int] = Field(default=None, primary_key=True)
    remito_id: int = Field(foreign_key="remitos.id")
    sku_id: int = Field(foreign_key="skus.id")
    quantity: float = Field(gt=0)
    lot_code: str | None = Field(default=None, max_length=64)

    remito: Remito = Relationship(back_populates="items")
    merma_events: list["MermaEvent"] = Relationship(back_populates="remito_item")
