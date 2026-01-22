from datetime import date
from typing import Optional, TYPE_CHECKING

from sqlmodel import Field, Relationship

from .common import ShipmentStatus, TimestampedModel, enum_column

if TYPE_CHECKING:  # pragma: no cover
    from .inventory import Deposit
    from .order import Order, OrderItem
    from .order import Remito


class Shipment(TimestampedModel, table=True):
    __tablename__ = "shipments"

    id: Optional[int] = Field(default=None, primary_key=True)
    deposit_id: int = Field(foreign_key="deposits.id")
    estimated_delivery_date: date = Field(nullable=False)
    status: ShipmentStatus = Field(default=ShipmentStatus.DRAFT, sa_column=enum_column(ShipmentStatus, "shipmentstatus"))

    deposit: Optional["Deposit"] = Relationship()
    items: list["ShipmentItem"] = Relationship(back_populates="shipment")
    remitos: list["Remito"] = Relationship(back_populates="shipment")


class ShipmentItem(TimestampedModel, table=True):
    __tablename__ = "shipment_items"

    id: Optional[int] = Field(default=None, primary_key=True)
    shipment_id: int = Field(foreign_key="shipments.id")
    order_id: int = Field(foreign_key="orders.id")
    order_item_id: int = Field(foreign_key="order_items.id")
    quantity: int = Field(gt=0)

    shipment: Shipment = Relationship(back_populates="items")
    order: Optional["Order"] = Relationship()
    order_item: Optional["OrderItem"] = Relationship()
