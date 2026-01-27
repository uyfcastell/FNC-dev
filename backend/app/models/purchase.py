from datetime import date
from typing import Optional, TYPE_CHECKING

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, Relationship

from .common import TimestampedModel, UnitOfMeasure

if TYPE_CHECKING:  # pragma: no cover
    from .inventory import Deposit, StockMovement
    from .sku import SKU
    from .user import User


class Supplier(TimestampedModel, table=True):
    __tablename__ = "suppliers"
    __table_args__ = (UniqueConstraint("name", name="uq_suppliers_name"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=255)
    tax_id: str | None = Field(default=None, max_length=32)
    email: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=50)
    is_active: bool = Field(default=True)

    receipts: list["PurchaseReceipt"] = Relationship(back_populates="supplier")


class PurchaseReceipt(TimestampedModel, table=True):
    __tablename__ = "purchase_receipts"

    id: Optional[int] = Field(default=None, primary_key=True)
    supplier_id: int = Field(foreign_key="suppliers.id")
    deposit_id: int = Field(foreign_key="deposits.id")
    received_at: date = Field(default_factory=date.today)
    document_number: str | None = Field(default=None, max_length=100)
    notes: str | None = Field(default=None, max_length=500)
    created_by_user_id: int | None = Field(default=None, foreign_key="users.id")
    updated_by_user_id: int | None = Field(default=None, foreign_key="users.id")

    supplier: "Supplier" = Relationship(back_populates="receipts")
    deposit: "Deposit" = Relationship()
    items: list["PurchaseReceiptItem"] = Relationship(back_populates="receipt")
    created_by_user: Optional["User"] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[PurchaseReceipt.created_by_user_id]"}
    )
    updated_by_user: Optional["User"] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[PurchaseReceipt.updated_by_user_id]"}
    )


class PurchaseReceiptItem(TimestampedModel, table=True):
    __tablename__ = "purchase_receipt_items"

    id: Optional[int] = Field(default=None, primary_key=True)
    receipt_id: int = Field(foreign_key="purchase_receipts.id")
    sku_id: int = Field(foreign_key="skus.id")
    quantity: float = Field(gt=0)
    unit: UnitOfMeasure
    lot_code: str | None = Field(default=None, max_length=64)
    expiry_date: date | None = None
    unit_cost: float | None = None
    stock_movement_id: int | None = Field(default=None, foreign_key="stock_movements.id")

    receipt: PurchaseReceipt = Relationship(back_populates="items")
    sku: "SKU" = Relationship()
    stock_movement: Optional["StockMovement"] = Relationship()
