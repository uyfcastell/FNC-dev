from datetime import datetime
from enum import Enum
from typing import Optional

from sqlmodel import Field, SQLModel


class TimestampedModel(SQLModel):
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class UnitOfMeasure(str, Enum):
    UNIT = "unit"  # Unidad
    KG = "kg"
    G = "g"
    L = "l"
    ML = "ml"
    PACK = "pack"
    BOX = "box"
    M = "m"
    CM = "cm"


class SKUFamily(str, Enum):
    CONSUMIBLE = "consumible"
    PAPELERIA = "papeleria"
    LIMPIEZA = "limpieza"


class MermaStage(str, Enum):
    PRODUCTION = "production"
    EMPAQUE = "empaque"
    STOCK = "stock"
    TRANSITO_POST_REMITO = "transito_post_remito"
    ADMINISTRATIVA = "administrativa"


class MermaAction(str, Enum):
    DISCARDED = "discarded"
    REPROCESSED = "reprocessed"
    ADMIN_ADJUSTMENT = "admin_adjustment"
    NONE = "none"


class OrderStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    PREPARED = "prepared"
    CLOSED = "closed"


class RemitoStatus(str, Enum):
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    DISPATCHED = "dispatched"
    RECEIVED = "received"
    CANCELLED = "cancelled"


class BaseUUIDModel(SQLModel):
    id: Optional[int] = Field(default=None, primary_key=True)
