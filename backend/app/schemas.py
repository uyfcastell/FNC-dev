from datetime import date, datetime
from enum import Enum

from sqlmodel import Field, SQLModel

from .models.common import (
    AuditAction,
    InventoryCountStatus,
    MermaAction,
    MermaStage,
    OrderStatus,
    RemitoStatus,
    ShipmentStatus,
    UnitOfMeasure,
)

class SKUTypeBase(SQLModel):
    code: str
    label: str
    is_active: bool = True


class SKUTypeCreate(SKUTypeBase):
    pass


class SKUTypeUpdate(SQLModel):
    label: str | None = None
    is_active: bool | None = None


class SKUTypeRead(SKUTypeBase):
    id: int


class SKUBase(SQLModel):
    code: str
    name: str
    sku_type_id: int
    unit: UnitOfMeasure = UnitOfMeasure.UNIT
    notes: str | None = None
    is_active: bool = True
    units_per_kg: float | None = None  # Solo aplica a SEMI; base kg
    alert_green_min: float | None = None
    alert_yellow_min: float | None = None


class SKUCreate(SKUBase):
    pass


class SKUUpdate(SQLModel):
    name: str | None = None
    sku_type_id: int | None = None
    unit: UnitOfMeasure | None = None
    notes: str | None = None
    is_active: bool | None = None
    units_per_kg: float | None = None
    alert_green_min: float | None = None
    alert_yellow_min: float | None = None


class SKURead(SKUBase):
    id: int
    sku_type_code: str
    sku_type_label: str
    secondary_unit: UnitOfMeasure | None = None


class DepositCreate(SQLModel):
    name: str
    location: str | None = None
    controls_lot: bool = True
    is_store: bool = False
    is_active: bool = True

class DepositUpdate(SQLModel):
    name: str | None = None
    location: str | None = None
    controls_lot: bool | None = None
    is_store: bool | None = None
    is_active: bool | None = None

class DepositRead(SQLModel):
    id: int
    name: str
    location: str | None = None
    controls_lot: bool
    is_store: bool
    is_active: bool


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
    is_active: bool = True

class RecipeUpdate(SQLModel):
    product_id: int | None = None
    name: str | None = None
    items: list[RecipeItemPayload] | None = None
    is_active: bool | None = None

class RecipeRead(SQLModel):
    id: int
    product_id: int
    name: str
    items: list[RecipeItemRead]
    is_active: bool


class StatusUpdate(SQLModel):
    is_active: bool


class StockMovementCreate(SQLModel):
    sku_id: int
    deposit_id: int
    movement_type_id: int
    quantity: float
    is_outgoing: bool | None = None
    reference_type: str | None = None
    reference_id: int | None = None
    reference_item_id: int | None = None
    unit: UnitOfMeasure | None = None
    reference: str | None = None
    lot_code: str | None = None
    production_lot_id: int | None = None
    production_line_id: int | None = None
    expiry_date: date | None = None
    movement_date: date | None = None
    created_by_user_id: int | None = None


class ProductionLotBase(SQLModel):
    sku_id: int
    deposit_id: int
    production_line_id: int | None = None
    produced_quantity: float
    remaining_quantity: float
    lot_code: str
    produced_at: date
    expiry_date: date | None = None
    is_blocked: bool
    notes: str | None = None


class ProductionLotRead(ProductionLotBase):
    id: int
    sku_code: str
    sku_name: str
    deposit_name: str
    production_line_name: str | None = None


class StockLevelRead(SQLModel):
    deposit_id: int
    deposit_name: str
    sku_id: int
    sku_code: str
    sku_name: str
    quantity: float
    alert_status: str | None = None
    alert_green_min: float | None = None
    alert_yellow_min: float | None = None


class StockAlertRead(SQLModel):
    deposit_id: int
    deposit_name: str
    sku_id: int
    sku_code: str
    sku_name: str
    sku_type_id: int
    sku_type_code: str
    sku_type_label: str
    unit: UnitOfMeasure
    quantity: float
    alert_status: str
    alert_green_min: float | None = None
    alert_yellow_min: float | None = None


class StockAlertReport(SQLModel):
    total: int
    items: list[StockAlertRead]


class StockMovementRead(SQLModel):
    id: int
    sku_id: int
    sku_code: str
    sku_name: str
    deposit_id: int
    deposit_name: str
    movement_type_id: int
    movement_type_code: str
    movement_type_label: str
    quantity: float
    reference_type: str | None = None
    reference_id: int | None = None
    reference_item_id: int | None = None
    reference: str | None = None
    lot_code: str | None = None
    production_lot_id: int | None = None
    production_line_id: int | None = None
    production_line_name: str | None = None
    expiry_date: date | None = None
    movement_date: date
    created_at: datetime
    current_balance: float | None = None
    created_by_user_id: int | None = None
    created_by_name: str | None = None


class StockMovementList(SQLModel):
    total: int
    items: list[StockMovementRead]


class UnitRead(SQLModel):
    code: UnitOfMeasure
    label: str


class StockMovementTypeBase(SQLModel):
    code: str
    label: str
    is_active: bool = True


class StockMovementTypeCreate(StockMovementTypeBase):
    pass


class StockMovementTypeUpdate(SQLModel):
    label: str | None = None
    is_active: bool | None = None


class StockMovementTypeRead(StockMovementTypeBase):
    id: int


class StockSummaryRow(SQLModel):
    group: str
    label: str
    quantity: float


class MovementSummary(SQLModel):
    movement_type_code: str
    movement_type_label: str
    quantity: float


class StockReportRead(SQLModel):
    totals_by_tag: list[StockSummaryRow]
    totals_by_deposit: list[StockSummaryRow]
    movement_totals: list[MovementSummary]


class SupplierBase(SQLModel):
    name: str
    tax_id: str | None = None
    email: str | None = None
    phone: str | None = None
    is_active: bool = True


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(SQLModel):
    name: str | None = None
    tax_id: str | None = None
    email: str | None = None
    phone: str | None = None
    is_active: bool | None = None


class SupplierRead(SupplierBase):
    id: int


class PurchaseReceiptItemPayload(SQLModel):
    sku_id: int
    quantity: float
    unit: UnitOfMeasure
    lot_code: str | None = None
    expiry_date: date | None = None
    unit_cost: float | None = None


class PurchaseReceiptCreate(SQLModel):
    supplier_id: int
    deposit_id: int
    received_at: date | None = None
    document_number: str | None = None
    notes: str | None = None
    items: list[PurchaseReceiptItemPayload]


class PurchaseReceiptItemRead(PurchaseReceiptItemPayload):
    id: int
    sku_code: str
    sku_name: str
    stock_movement_id: int | None = None


class PurchaseReceiptRead(SQLModel):
    id: int
    supplier_id: int
    supplier_name: str | None = None
    deposit_id: int
    deposit_name: str | None = None
    received_at: date
    document_number: str | None = None
    notes: str | None = None
    created_at: datetime
    created_by_user_id: int | None = None
    created_by_name: str | None = None
    items: list[PurchaseReceiptItemRead]


class ExpiryReportStatus(str, Enum):
    GREEN = "green"
    YELLOW = "yellow"
    RED = "red"
    NONE = "none"


class ExpiryReportRow(SQLModel):
    lot_id: int | None = None
    lot_code: str | None = None
    sku_id: int
    sku_code: str
    sku_name: str
    deposit_id: int
    deposit_name: str
    remaining_quantity: float
    unit: UnitOfMeasure
    produced_at: date
    expiry_date: date | None = None
    days_to_expiry: int | None = None
    status: ExpiryReportStatus


class ExpiryReport(SQLModel):
    total: int
    items: list[ExpiryReportRow]


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


class PermissionRead(SQLModel):
    id: int
    key: str
    label: str
    category: str
    action: str


class RolePermissionsUpdate(SQLModel):
    permissions: list[str]


class LoginRequest(SQLModel):
    username: str
    password: str


class TokenResponse(SQLModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int | None = None
    user: UserRead | None = None


class OrderItemPayload(SQLModel):
    sku_id: int
    quantity: float
    current_stock: float | None = None


class OrderCreate(SQLModel):
    destination_deposit_id: int
    requested_for: date | None = None
    required_delivery_date: date | None = None
    requested_by: str | None = None
    status: OrderStatus = OrderStatus.SUBMITTED
    notes: str | None = None
    plant_internal_note: str | None = None
    items: list[OrderItemPayload]


class OrderUpdate(SQLModel):
    destination_deposit_id: int | None = None
    requested_for: date | None = None
    required_delivery_date: date | None = None
    requested_by: str | None = None
    status: OrderStatus | None = None
    notes: str | None = None
    plant_internal_note: str | None = None
    items: list[OrderItemPayload] | None = None


class OrderStatusUpdate(SQLModel):
    status: OrderStatus


class OrderItemRead(OrderItemPayload):
    id: int
    sku_code: str
    sku_name: str
    prepared_quantity: float | None = None
    dispatched_quantity: float | None = None
    pending_quantity: float | None = None
    has_legacy_decimal: bool | None = None
    quantity_raw: float | None = None


class OrderRead(SQLModel):
    id: int
    destination: str
    destination_deposit_id: int | None = None
    requested_for: date | None = None
    required_delivery_date: date | None = None
    requested_by: str | None = None
    estimated_delivery_date: date | None = None
    status: OrderStatus
    notes: str | None = None
    plant_internal_note: str | None = None
    created_at: datetime
    cancelled_at: datetime | None = None
    cancelled_by_user_id: int | None = None
    cancelled_by_name: str | None = None
    created_by_user_id: int | None = None
    created_by_name: str | None = None
    updated_by_user_id: int | None = None
    updated_by_name: str | None = None
    items: list[OrderItemRead]


class OrderSummaryRead(SQLModel):
    id: int
    status: OrderStatus
    destination: str
    requested_for: date | None = None
    required_delivery_date: date | None = None


class RemitoItemRead(SQLModel):
    id: int
    remito_id: int
    sku_id: int
    sku_code: str
    sku_name: str
    quantity: float
    lot_code: str | None = None


class RemitoRead(SQLModel):
    id: int
    order_id: int | None = None
    shipment_id: int | None = None
    status: RemitoStatus
    destination: str
    source_deposit_id: int | None = None
    destination_deposit_id: int | None = None
    source_deposit_name: str | None = None
    destination_deposit_name: str | None = None
    issue_date: date
    dispatched_at: datetime | None = None
    received_at: datetime | None = None
    cancelled_at: datetime | None = None
    created_at: datetime
    pdf_path: str | None = None
    created_by_user_id: int | None = None
    created_by_name: str | None = None
    updated_by_user_id: int | None = None
    updated_by_name: str | None = None
    origin_orders: list[OrderSummaryRead] = Field(default_factory=list)
    items: list[RemitoItemRead]


class RemitoDispatchRequest(SQLModel):
    movement_date: date | None = None


class RemitoReceiveRequest(SQLModel):
    movement_date: date | None = None


class ShipmentCreate(SQLModel):
    deposit_id: int
    estimated_delivery_date: date


class ShipmentUpdate(SQLModel):
    deposit_id: int | None = None
    estimated_delivery_date: date | None = None


class ShipmentAddOrders(SQLModel):
    order_ids: list[int]


class ShipmentItemUpdate(SQLModel):
    order_item_id: int
    quantity: int


class ShipmentItemRead(SQLModel):
    id: int
    shipment_id: int
    order_id: int
    order_item_id: int
    sku_id: int
    sku_code: str
    sku_name: str
    quantity: int
    ordered_quantity: float
    dispatched_quantity: float
    remaining_quantity: float


class ShipmentRead(SQLModel):
    id: int
    deposit_id: int
    deposit_name: str | None = None
    estimated_delivery_date: date
    status: ShipmentStatus
    created_at: datetime
    updated_at: datetime


class ShipmentDetail(ShipmentRead):
    orders: list[OrderSummaryRead] = Field(default_factory=list)
    items: list[ShipmentItemRead]


class ProductionLineBase(SQLModel):
    name: str
    is_active: bool = True


class ProductionLineCreate(ProductionLineBase):
    pass


class ProductionLineUpdate(SQLModel):
    name: str | None = None
    is_active: bool | None = None


class ProductionLineRead(ProductionLineBase):
    id: int


class MermaTypeBase(SQLModel):
    stage: MermaStage
    code: str
    label: str
    is_active: bool = True


class MermaTypeCreate(MermaTypeBase):
    pass


class MermaTypeUpdate(SQLModel):
    stage: MermaStage | None = None
    label: str | None = None
    is_active: bool | None = None


class MermaTypeRead(MermaTypeBase):
    id: int


class MermaCauseBase(SQLModel):
    stage: MermaStage
    code: str
    label: str
    is_active: bool = True


class MermaCauseCreate(MermaCauseBase):
    pass


class MermaCauseUpdate(SQLModel):
    stage: MermaStage | None = None
    label: str | None = None
    is_active: bool | None = None


class MermaCauseRead(MermaCauseBase):
    id: int


class MermaEventCreate(SQLModel):
    stage: MermaStage
    type_id: int
    cause_id: int
    sku_id: int
    quantity: float
    unit: UnitOfMeasure | None = None
    lot_code: str | None = None
    deposit_id: int | None = None
    remito_id: int | None = None
    order_id: int | None = None
    production_line_id: int | None = None
    reported_by_user_id: int | None = None
    reported_by_role: str | None = None
    notes: str | None = None
    detected_at: datetime | None = None
    affects_stock: bool = True
    action: MermaAction = MermaAction.NONE


class MermaEventRead(SQLModel):
    id: int
    stage: MermaStage
    type_id: int
    type_code: str
    type_label: str
    cause_id: int
    cause_code: str
    cause_label: str
    sku_id: int
    sku_code: str
    sku_name: str
    quantity: float
    unit: UnitOfMeasure
    lot_code: str | None = None
    deposit_id: int | None = None
    deposit_name: str | None = None
    remito_id: int | None = None
    order_id: int | None = None
    production_line_id: int | None = None
    production_line_name: str | None = None
    reported_by_user_id: int | None = None
    reported_by_role: str | None = None
    notes: str | None = None
    detected_at: datetime
    created_at: datetime
    updated_at: datetime
    affects_stock: bool
    action: MermaAction
    stock_movement_id: int | None = None


class InventoryCountItemCreate(SQLModel):
    sku_id: int
    counted_quantity: float
    production_lot_id: int | None = None


class InventoryCountCreate(SQLModel):
    deposit_id: int
    count_date: date | None = None
    notes: str | None = None
    items: list[InventoryCountItemCreate]


class InventoryCountUpdate(SQLModel):
    count_date: date | None = None
    notes: str | None = None
    items: list[InventoryCountItemCreate] | None = None


class InventoryCountItemRead(SQLModel):
    id: int
    sku_id: int
    sku_code: str
    sku_name: str
    production_lot_id: int | None = None
    lot_code: str | None = None
    counted_quantity: float
    system_quantity: float
    difference: float
    unit: UnitOfMeasure
    stock_movement_id: int | None = None


class InventoryCountRead(SQLModel):
    id: int
    deposit_id: int
    deposit_name: str
    status: InventoryCountStatus
    count_date: date
    notes: str | None = None
    submitted_at: datetime | None = None
    approved_at: datetime | None = None
    closed_at: datetime | None = None
    cancelled_at: datetime | None = None
    created_at: datetime
    created_by_user_id: int | None = None
    created_by_name: str | None = None
    updated_by_user_id: int | None = None
    updated_by_name: str | None = None
    approved_by_user_id: int | None = None
    approved_by_name: str | None = None
    items: list[InventoryCountItemRead]


class AuditLogRead(SQLModel):
    id: int
    entity_type: str
    entity_id: int | None = None
    action: AuditAction
    changes: dict | None = None
    user_id: int | None = None
    user_name: str | None = None
    ip_address: str | None = None
    created_at: datetime
