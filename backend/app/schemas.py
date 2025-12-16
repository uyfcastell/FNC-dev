from sqlmodel import SQLModel

from .models.common import SKUTag


class SKUCreate(SQLModel):
    code: str
    name: str
    tag: SKUTag
    unit: str = "unit"
    notes: str | None = None


class DepositCreate(SQLModel):
    name: str
    location: str | None = None
    controls_lot: bool = True
