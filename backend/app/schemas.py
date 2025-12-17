from datetime import date, datetime

from sqlmodel import SQLModel

from .models.common import MovementType, OrderStatus, SKUTag, UnitOfMeasure


class SKUBase(SQLModel):
    code: str
    name: str
    tag: SKUTag
    unit: UnitOfMeasure = UnitOfMeasure.UNIT
    notes: str | None = None


class SKUCreate(SKUBase):
    pass


class SKUUpdate(SQLModel):
    name: str | None = None
    tag: SKUTag | None = None
    unit: UnitOfMeasure | None = None
    notes: str | None = None


class SKURead(SKUBase):
    id: int


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


class RecipeItemRead(RecipeItemPayload):
    component_code: str
    component_name: str
    component_unit: UnitOfMeasure


class RecipeCreate(SQLModel):
    product_id: int
    name: str
    items: list[RecipeItemPayload]


class RecipeUpdate(RecipeCreate):
    pass


class RecipeRead(SQLModel):
    id: int
    product_id: int
    name: str
    items: list[RecipeItemRead]


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


class UserCreate(SQLModel):
    email: str
    full_name: str
    password: str
    role_id: int | None = None
    is_active: bool = True


class UserUpdate(SQLModel):
    email: str | None = None
    full_name: str | None = None
    password: str | None = None
    role_id: int | None = None
    is_active: bool | None = None


class UserRead(SQLModel):
    id: int
    email: str
    full_name: str
    role_id: int | None = None
    role_name: str | None = None
    is_active: bool


class OrderItemPayload(SQLModel):
    sku_id: int
    quantity: float
    current_stock: float | None = None


class OrderCreate(SQLModel):
    destination: str
    requested_for: date | None = None
    status: OrderStatus = OrderStatus.SUBMITTED
    notes: str | None = None
    items: list[OrderItemPayload]


class OrderUpdate(SQLModel):
    destination: str | None = None
    requested_for: date | None = None
    status: OrderStatus | None = None
    notes: str | None = None
    items: list[OrderItemPayload] | None = None


class OrderStatusUpdate(SQLModel):
    status: OrderStatus


class OrderItemRead(OrderItemPayload):
    id: int
    sku_code: str
    sku_name: str


class OrderRead(SQLModel):
    id: int
    destination: str
    requested_for: date | None = None
    status: OrderStatus
    notes: str | None = None
    created_at: datetime
    items: list[OrderItemRead]
