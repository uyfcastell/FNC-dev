from datetime import date

from sqlmodel import SQLModel

from .models.common import MovementType, SKUTag, UnitOfMeasure


class SKUCreate(SQLModel):
    code: str
    name: str
    tag: SKUTag
    unit: UnitOfMeasure = UnitOfMeasure.UNIT
    notes: str | None = None


class SKUUpdate(SQLModel):
    name: str | None = None
    tag: SKUTag | None = None
    unit: UnitOfMeasure | None = None
    notes: str | None = None


class SKURead(SQLModel):
    id: int
    code: str
    name: str
    tag: SKUTag
    unit: UnitOfMeasure
    notes: str | None = None


class DepositCreate(SQLModel):
    name: str
    location: str | None = None
    controls_lot: bool = True


class DepositUpdate(SQLModel):
    name: str | None = None
    location: str | None = None
    controls_lot: bool | None = None


class DepositRead(SQLModel):
    id: int
    name: str
    location: str | None = None
    controls_lot: bool


class RecipeItemPayload(SQLModel):
    component_id: int
    quantity: float


class RecipeCreate(SQLModel):
    product_id: int
    name: str
    items: list[RecipeItemPayload]


class RecipeRead(SQLModel):
    id: int
    product_id: int
    name: str
    items: list[RecipeItemPayload]


class StockMovementCreate(SQLModel):
    sku_id: int
    deposit_id: int
    movement_type: MovementType
    quantity: float
    reference: str | None = None
    lot_code: str | None = None
    movement_date: date | None = None


class StockLevelRead(SQLModel):
    deposit_id: int
    deposit_name: str
    sku_id: int
    sku_code: str
    sku_name: str
    quantity: float


class UnitRead(SQLModel):
    code: UnitOfMeasure
    label: str


class StockSummaryRow(SQLModel):
    group: str
    label: str
    quantity: float


class MovementSummary(SQLModel):
    movement_type: MovementType
    quantity: float


class StockReportRead(SQLModel):
    totals_by_tag: list[StockSummaryRow]
    totals_by_deposit: list[StockSummaryRow]
    movement_totals: list[MovementSummary]
