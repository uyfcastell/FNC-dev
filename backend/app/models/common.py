from datetime import datetime
from enum import Enum
from typing import Optional

from sqlmodel import Field, SQLModel


class TimestampedModel(SQLModel):
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class SKUTag(str, Enum):
    PT = "PT"  # Producto Terminado
    SEMI = "SEMI"  # Semielaborado
    MP = "MP"  # Materia Prima
    CON = "CON"  # Consumible / Material para locales


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


class MovementType(str, Enum):
    PRODUCTION = "production"
    CONSUMPTION = "consumption"
    ADJUSTMENT = "adjustment"
    TRANSFER = "transfer"
    REMITO = "remito"
    MERMA = "merma"


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


class BaseUUIDModel(SQLModel):
    id: Optional[int] = Field(default=None, primary_key=True)
