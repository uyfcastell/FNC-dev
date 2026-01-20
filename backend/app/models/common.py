from datetime import datetime
from enum import Enum
from typing import Optional, Type

from sqlalchemy import Column
from sqlalchemy import Enum as SAEnum
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

class MermaStage(str, Enum):
    PRODUCTION = "PRODUCTION"
    EMPAQUE = "EMPAQUE"
    STOCK = "STOCK"
    TRANSITO_POST_REMITO = "TRANSITO_POST_REMITO"
    ADMINISTRATIVA = "ADMINISTRATIVA"

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
    CANCELLED = "cancelled"


class RemitoStatus(str, Enum):
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    DISPATCHED = "dispatched"
    RECEIVED = "received"
    CANCELLED = "cancelled"


class BaseUUIDModel(SQLModel):
    id: Optional[int] = Field(default=None, primary_key=True)


def enum_column(enum_cls: Type[Enum], name: str) -> Column:
    return Column(
        SAEnum(
            enum_cls,
            name=name,
            values_callable=lambda values: [entry.value for entry in values],
            native_enum=True,
        )
    )
