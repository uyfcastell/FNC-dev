import re
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.encoders import jsonable_encoder
from sqlalchemy import func
from sqlmodel import Session, select

from ..core.config import get_settings
from ..db import get_session
from ..core.security import create_access_token, hash_password, is_legacy_hash, needs_rehash, verify_password
from .deps import get_current_user, require_active_user, require_roles
from ..models import (
    AuditLog,
    AuditAction,
    Deposit,
    InventoryCount,
    InventoryCountItem,
    InventoryCountStatus,
    Recipe,
    RecipeItem,
    Role,
    Order,
    OrderItem,
    Remito,
    RemitoItem,
    MermaCause,
    MermaEvent,
    MermaStage,
    MermaType,
    ProductionLine,
    ProductionLot,
    SKU,
    SKUType,
    SemiConversionRule,
    StockLevel,
    StockMovement,
    StockMovementType,
    User,
)
from ..models.common import OrderStatus, RemitoStatus, UnitOfMeasure
from ..schemas import (
    DepositCreate,
    DepositRead,
    DepositUpdate,
    SKUTypeCreate,
    SKUTypeRead,
    SKUTypeUpdate,
    RecipeCreate,
    RecipeRead,
    RecipeUpdate,
    SKUCreate,
    SKURead,
    SKUUpdate,
    StockMovementCreate,
    StockMovementList,
    StockMovementRead,
    StockMovementTypeCreate,
    StockMovementTypeRead,
    StockMovementTypeUpdate,
    StockLevelRead,
    StockAlertRead,
    StockAlertReport,
    StockReportRead,
    StockSummaryRow,
    MovementSummary,
    UnitRead,
    ProductionLotRead,
    LoginRequest,
    TokenResponse,
    UserCreate,
    UserRead,
    UserUpdate,
    OrderCreate,
    OrderRead,
    OrderUpdate,
    OrderStatusUpdate,
    RemitoRead,
    RemitoItemRead,
    RemitoFromOrderRequest,
    RemitoDispatchRequest,
    RemitoReceiveRequest,
    MermaCauseCreate,
    MermaCauseRead,
    MermaCauseUpdate,
    MermaEventCreate,
    MermaEventRead,
    MermaTypeCreate,
    MermaTypeRead,
    MermaTypeUpdate,
    ProductionLineCreate,
    ProductionLineRead,
    ProductionLineUpdate,
    InventoryCountCreate,
    InventoryCountRead,
    InventoryCountUpdate,
    InventoryCountItemRead,
    AuditLogRead,
)

public_router = APIRouter()
router = APIRouter(dependencies=[Depends(require_active_user)])
api_router = APIRouter()

SKU_PRODUCTION_TYPES = {"PT", "SEMI"}
SKU_CONSUMABLE_CODE = "CON"
SKU_SEMI_CODE = "SEMI"
OUTGOING_MOVEMENTS = {"CONSUMPTION", "MERMA", "REMITO"}
INCOMING_MOVEMENTS = {"PRODUCTION", "PURCHASE", "ADJUSTMENT", "TRANSFER"}
LOT_CODE_SEQUENCE_LENGTH = 3

settings = get_settings()


def _encode_changes(payload: dict | list | None) -> dict | None:
    if payload is None:
        return None
    encoded = jsonable_encoder(payload, exclude_none=True)
    return encoded if isinstance(encoded, dict) else {"items": encoded}


def _log_audit(
    session: Session,
    entity_type: str,
    entity_id: int | None,
    action: AuditAction,
    user_id: int | None = None,
    changes: dict | list | None = None,
) -> None:
    session.add(
        AuditLog(
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            user_id=user_id,
            changes=_encode_changes(changes),
        )
    )


def _map_user(user: User, session: Session) -> UserRead:
    role_name = None
    if user.role_id:
        role = session.get(Role, user.role_id)
        role_name = role.name if role else None
    return UserRead(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role_id=user.role_id,
        role_name=role_name,
        is_active=user.is_active,
    )


def _get_sku_type_or_404(session: Session, sku_type_id: int) -> SKUType:
    sku_type = session.get(SKUType, sku_type_id)
    if not sku_type:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tipo de SKU no encontrado")
    return sku_type


def _get_semi_units_per_kg(session: Session, sku_id: int) -> float:
    rule = session.exec(select(SemiConversionRule).where(SemiConversionRule.sku_id == sku_id)).first()
    return float(rule.units_per_kg) if rule else 1.0


def _get_production_line_or_404(session: Session, production_line_id: int) -> ProductionLine:
    production_line = session.get(ProductionLine, production_line_id)
    if not production_line:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Línea de producción no encontrada")
    if not production_line.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La línea de producción está inactiva")
    return production_line


def _format_production_date(value: date) -> str:
    return value.strftime("%y%m%d")


def _line_code(line: ProductionLine) -> str:
    return f"L{line.id}"


def _parse_lot_code(lot_code: str) -> tuple[str, str, str, str]:
    parts = lot_code.split("-")
    if len(parts) < 4:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Formato de lote inválido")
    date_part = parts[0]
    line_part = parts[1]
    seq_part = parts[-1]
    sku_part = "-".join(parts[2:-1])
    return date_part, line_part, sku_part, seq_part


def _validate_lot_code(
    session: Session,
    lot_code: str,
    sku: SKU,
    deposit: Deposit,
    production_line: ProductionLine,
    produced_at: date,
    allow_existing_id: int | None = None,
) -> None:
    date_part, line_part, sku_part, seq_part = _parse_lot_code(lot_code)
    expected_date = _format_production_date(produced_at)
    expected_line = _line_code(production_line)

    if not re.fullmatch(r"\d{6}", date_part):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El lote debe iniciar con YYMMDD")
    if date_part != expected_date:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La fecha del lote no coincide con la producción")
    if line_part != expected_line:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El lote no corresponde a la línea indicada")
    if sku_part != sku.code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El lote no corresponde al SKU producido")
    if not re.fullmatch(rf"\d{{{LOT_CODE_SEQUENCE_LENGTH}}}", seq_part):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La secuencia del lote debe tener 3 dígitos")

    existing = session.exec(select(ProductionLot).where(ProductionLot.lot_code == lot_code)).first()
    if existing and existing.id != allow_existing_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El lote ya existe para otro registro")
    if existing:
        if existing.sku_id != sku.id or existing.deposit_id != deposit.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El lote pertenece a otro SKU o depósito")
        if existing.production_line_id and existing.production_line_id != production_line.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El lote pertenece a otra línea")


def _extract_sequence(lot_code: str) -> int:
    try:
        _, _, _, seq_part = _parse_lot_code(lot_code)
        return int(seq_part)
    except Exception:
        return 0


def _generate_lot_code(session: Session, sku: SKU, production_line: ProductionLine, produced_at: date) -> str:
    prefix = f"{_format_production_date(produced_at)}-{_line_code(production_line)}-{sku.code}"
    existing_codes = session.exec(
        select(ProductionLot.lot_code).where(
            ProductionLot.sku_id == sku.id,
            ProductionLot.production_line_id == production_line.id,
            ProductionLot.produced_at == produced_at,
        )
    ).all()
    max_seq = max((_extract_sequence(code) for code in existing_codes), default=0)
    return f"{prefix}-{max_seq + 1:0{LOT_CODE_SEQUENCE_LENGTH}d}"


def _upsert_semi_conversion_rule(session: Session, sku_id: int, units_per_kg: float) -> None:
    if units_per_kg <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La conversión de SEMI debe ser mayor a cero")
    rule = session.exec(select(SemiConversionRule).where(SemiConversionRule.sku_id == sku_id)).first()
    if rule:
        rule.units_per_kg = units_per_kg
        rule.updated_at = datetime.utcnow()
    else:
        rule = SemiConversionRule(sku_id=sku_id, units_per_kg=units_per_kg)
    session.add(rule)


def _delete_semi_conversion_rule(session: Session, sku_id: int) -> None:
    existing = session.exec(select(SemiConversionRule).where(SemiConversionRule.sku_id == sku_id)).first()
    if existing:
        session.delete(existing)


def _convert_to_base_quantity(sku: SKU, quantity: float, unit: UnitOfMeasure | None, session: Session) -> float:
    session.refresh(sku, attribute_names=["sku_type"])
    if sku.sku_type and sku.sku_type.code == SKU_SEMI_CODE:
        units_per_kg = _get_semi_units_per_kg(session, sku.id)
        if unit in (None, UnitOfMeasure.KG):
            return quantity
        if unit == UnitOfMeasure.UNIT:
            return quantity / units_per_kg
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unidad no soportada para SEMI")
    return quantity


def _get_recipe_for_product(session: Session, product_id: int) -> Recipe | None:
    return session.exec(select(Recipe).where(Recipe.product_id == product_id)).first()


def _calculate_consumption_by_lot(
    session: Session, component_id: int, deposit_id: int, required_quantity: float, strict: bool = False
) -> list[tuple[ProductionLot | None, float]]:
    lots = session.exec(
        select(ProductionLot)
        .where(
            ProductionLot.sku_id == component_id,
            ProductionLot.deposit_id == deposit_id,
            ProductionLot.is_blocked.is_(False),
        )
        .order_by(ProductionLot.produced_at, ProductionLot.id)
    ).all()

    remaining = required_quantity
    consumptions: list[tuple[ProductionLot | None, float]] = []

    for lot in lots:
        if remaining <= 0:
            break
        available = float(lot.remaining_quantity)
        if available <= 0:
            continue
        take = min(remaining, available)
        consumptions.append((lot, take))
        remaining -= take

    if remaining > 0:
        if strict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Stock insuficiente para cubrir la cantidad requerida",
            )
        if lots:
            target_lot = consumptions[-1][0] if consumptions else lots[-1]
            if consumptions and consumptions[-1][0] == target_lot:
                consumptions[-1] = (target_lot, consumptions[-1][1] + remaining)
            else:
                consumptions.append((target_lot, remaining))
            remaining = 0
        else:
            consumptions.append((None, remaining))

    return consumptions


def _consume_recipe_components(
    session: Session,
    product: SKU,
    deposit: Deposit,
    production_lot: ProductionLot | None,
    produced_quantity: float,
    reference: str | None,
    movement_date: date,
    created_by_user_id: int | None,
) -> None:
    if produced_quantity <= 0:
        return

    recipe = _get_recipe_for_product(session, product.id)
    if not recipe:
        return
    session.refresh(recipe, attribute_names=["items"])
    if not recipe.items:
        return

    consumption_type = _get_movement_type_by_code(session, "CONSUMPTION")
    reference_value = reference or (production_lot.lot_code if production_lot else f"PROD-{product.code}")

    for item in recipe.items:
        component = session.get(SKU, item.component_id)
        if not component:
            continue

        required_quantity = produced_quantity * item.quantity
        consumptions = _calculate_consumption_by_lot(session, component.id, deposit.id, required_quantity)

        for lot, quantity in consumptions:
            movement_payload = StockMovementCreate(
                sku_id=component.id,
                deposit_id=deposit.id,
                movement_type_id=consumption_type.id,
                quantity=quantity,
                reference=reference_value,
                lot_code=lot.lot_code if lot else None,
                production_lot_id=lot.id if lot else None,
                movement_date=movement_date,
                created_by_user_id=created_by_user_id,
            )
            _apply_stock_movement(session, movement_payload, allow_negative_balance=True)


def _map_sku(sku: SKU, session: Session) -> SKURead:
    session.refresh(sku, attribute_names=["sku_type"])
    type_code = sku.sku_type.code if sku.sku_type else ""
    type_label = sku.sku_type.label if sku.sku_type else ""
    secondary_unit = UnitOfMeasure.UNIT if type_code == SKU_SEMI_CODE else None
    units_per_kg = _get_semi_units_per_kg(session, sku.id) if type_code == SKU_SEMI_CODE else None
    return SKURead(
        id=sku.id,
        code=sku.code,
        name=sku.name,
        sku_type_id=sku.sku_type_id,
        sku_type_code=type_code,
        sku_type_label=type_label,
        unit=sku.unit,
        secondary_unit=secondary_unit,
        units_per_kg=units_per_kg,
        notes=sku.notes,
        is_active=sku.is_active,
        alert_green_min=sku.alert_green_min,
        alert_yellow_min=sku.alert_yellow_min,
        alert_red_max=sku.alert_red_max,
    )


def _has_alert_thresholds(sku: SKU) -> bool:
    return any(value is not None for value in (sku.alert_green_min, sku.alert_yellow_min, sku.alert_red_max))


def _get_stock_alert_status(quantity: float, sku: SKU) -> str:
    if sku.alert_green_min is not None and quantity >= sku.alert_green_min:
        return "green"
    if sku.alert_yellow_min is not None and quantity >= sku.alert_yellow_min:
        return "yellow"
    if sku.alert_red_max is not None and quantity <= sku.alert_red_max:
        return "red"
    return "none"


def _map_stock_level(level: StockLevel, session: Session) -> StockLevelRead:
    session.refresh(level, attribute_names=["sku", "deposit"])
    return StockLevelRead(
        deposit_id=level.deposit_id,
        deposit_name=level.deposit.name,
        sku_id=level.sku_id,
        sku_code=level.sku.code,
        sku_name=level.sku.name,
        quantity=level.quantity,
        alert_status=_get_stock_alert_status(level.quantity, level.sku),
        alert_green_min=level.sku.alert_green_min,
        alert_yellow_min=level.sku.alert_yellow_min,
        alert_red_max=level.sku.alert_red_max,
    )


def _map_production_lot(lot: ProductionLot, session: Session) -> ProductionLotRead:
    session.refresh(lot, attribute_names=["sku", "deposit", "production_line"])
    return ProductionLotRead(
        id=lot.id,
        lot_code=lot.lot_code,
        sku_id=lot.sku_id,
        sku_code=lot.sku.code if lot.sku else "",
        sku_name=lot.sku.name if lot.sku else "",
        deposit_id=lot.deposit_id,
        deposit_name=lot.deposit.name if lot.deposit else "",
        production_line_id=lot.production_line_id,
        production_line_name=lot.production_line.name if lot.production_line else None,
        produced_quantity=float(lot.produced_quantity),
        remaining_quantity=float(lot.remaining_quantity),
        produced_at=lot.produced_at,
        is_blocked=lot.is_blocked,
        notes=lot.notes,
    )


def _get_movement_type_or_404(session: Session, movement_type_id: int) -> StockMovementType:
    movement_type = session.get(StockMovementType, movement_type_id)
    if not movement_type:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tipo de movimiento no encontrado")
    return movement_type


def _get_movement_type_by_code(session: Session, code: str) -> StockMovementType:
    movement_type = session.exec(
        select(StockMovementType).where(StockMovementType.code == code.strip().upper())
    ).first()
    if not movement_type:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tipo de movimiento no configurado")
    return movement_type


def _ensure_store_destination(session: Session, destination_id: int) -> Deposit:
    deposit = session.get(Deposit, destination_id)
    if not deposit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Destino no encontrado")
    if not deposit.is_store:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El destino debe ser un local definido")
    return deposit


def _validate_order_items(session: Session, items: list[dict]) -> None:
    sku_ids = {item["sku_id"] for item in items}
    skus = session.exec(select(SKU).where(SKU.id.in_(sku_ids))).all()
    if len(skus) != len(sku_ids):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Algún SKU no existe")

    sku_map = {sku.id: sku for sku in skus}
    for item in items:
        sku = sku_map.get(item["sku_id"])
        if not sku:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="SKU no encontrado")
        session.refresh(sku, attribute_names=["sku_type"])
        type_code = sku.sku_type.code if sku.sku_type else ""
        if not (sku.sku_type and sku.sku_type.is_active):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Algún tipo de SKU está inactivo")
        if type_code in {"MP", "SEMI"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se permiten MP o SEMI en pedidos",
            )
        if not sku.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Algún SKU está inactivo")


def _map_order(order: Order, session: Session) -> OrderRead:
    session.refresh(order, attribute_names=["items"])
    items = []
    for item in order.items:
        sku = session.get(SKU, item.sku_id)
        sku_code = sku.code if sku else str(item.sku_id)
        sku_name = sku.name if sku else f"SKU {item.sku_id}"
        items.append(
            {
                "id": item.id,
                "sku_id": item.sku_id,
                "sku_code": sku_code,
                "sku_name": sku_name,
                "quantity": item.quantity,
                "current_stock": item.current_stock,
            }
        )

    created_by_name = None
    updated_by_name = None
    if order.created_by_user_id:
        user = session.get(User, order.created_by_user_id)
        created_by_name = user.full_name if user else None
    if order.updated_by_user_id:
        user = session.get(User, order.updated_by_user_id)
        updated_by_name = user.full_name if user else None

    return OrderRead(
        id=order.id,
        destination=order.destination,
        destination_deposit_id=order.destination_deposit_id,
        requested_for=order.requested_for,
        requested_by=order.requested_by,
        status=order.status,
        notes=order.notes,
        created_at=order.created_at,
        cancelled_at=order.cancelled_at,
        cancelled_by_user_id=order.cancelled_by_user_id,
        cancelled_by_name=order.cancelled_by_name,
        created_by_user_id=order.created_by_user_id,
        created_by_name=created_by_name,
        updated_by_user_id=order.updated_by_user_id,
        updated_by_name=updated_by_name,
        items=items,
    )


def _get_deposit_or_404(session: Session, deposit_id: int) -> Deposit:
    deposit = session.get(Deposit, deposit_id)
    if not deposit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Depósito no encontrado")
    return deposit


def _default_source_deposit(session: Session) -> Deposit:
    deposit = session.exec(select(Deposit).where(Deposit.is_store.is_(False))).first()
    if not deposit:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No hay depósitos configurados como origen")
    return deposit


def _get_remito_or_404(session: Session, remito_id: int) -> Remito:
    remito = session.get(Remito, remito_id)
    if not remito:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Remito no encontrado")
    return remito


def _map_remito(remito: Remito, session: Session) -> RemitoRead:
    session.refresh(remito, attribute_names=["items", "source_deposit", "destination_deposit"])
    items: list[RemitoItemRead] = []
    for item in remito.items:
        sku = session.get(SKU, item.sku_id)
        items.append(
            RemitoItemRead(
                id=item.id,
                remito_id=item.remito_id,
                sku_id=item.sku_id,
                sku_code=sku.code if sku else str(item.sku_id),
                sku_name=sku.name if sku else f"SKU {item.sku_id}",
                quantity=item.quantity,
                lot_code=item.lot_code,
            )
        )
    created_by_name = None
    updated_by_name = None
    if remito.created_by_user_id:
        user = session.get(User, remito.created_by_user_id)
        created_by_name = user.full_name if user else None
    if remito.updated_by_user_id:
        user = session.get(User, remito.updated_by_user_id)
        updated_by_name = user.full_name if user else None

    return RemitoRead(
        id=remito.id,
        order_id=remito.order_id,
        status=remito.status,
        destination=remito.destination,
        source_deposit_id=remito.source_deposit_id,
        destination_deposit_id=remito.destination_deposit_id,
        source_deposit_name=remito.source_deposit.name if remito.source_deposit else None,
        destination_deposit_name=remito.destination_deposit.name if remito.destination_deposit else None,
        issue_date=remito.issue_date,
        dispatched_at=remito.dispatched_at,
        received_at=remito.received_at,
        cancelled_at=remito.cancelled_at,
        created_at=remito.created_at,
        created_by_user_id=remito.created_by_user_id,
        created_by_name=created_by_name,
        updated_by_user_id=remito.updated_by_user_id,
        updated_by_name=updated_by_name,
        items=items,
    )


@public_router.post("/auth/login", tags=["auth"], response_model=TokenResponse)
def login(payload: LoginRequest, session: Session = Depends(get_session)) -> TokenResponse:
    user = session.exec(select(User).where(User.email == payload.username)).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales inválidas")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario inactivo")

    if is_legacy_hash(user.hashed_password) or needs_rehash(user.hashed_password):
        user.hashed_password = hash_password(payload.password)
        user.updated_at = datetime.utcnow()
        session.add(user)
        session.commit()
        session.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token, token_type="bearer", expires_in=settings.jwt_expires_minutes * 60)


@router.get("/auth/me", tags=["auth"], response_model=UserRead)
def auth_me(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)) -> UserRead:
    return _map_user(current_user, session)


@public_router.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok", "version": "0.1.0"}


@router.get(
    "/roles",
    tags=["admin"],
    dependencies=[Depends(require_roles("ADMIN"))],
)
def list_roles(session: Session = Depends(get_session)) -> list[Role]:
    return session.exec(select(Role)).all()


@router.get(
    "/users",
    tags=["admin"],
    response_model=list[UserRead],
    dependencies=[Depends(require_roles("ADMIN"))],
)
def list_users(session: Session = Depends(get_session)) -> list[UserRead]:
    users = session.exec(select(User)).all()
    return [_map_user(user, session) for user in users]


@router.post(
    "/users",
    tags=["admin"],
    status_code=status.HTTP_201_CREATED,
    response_model=UserRead,
    dependencies=[Depends(require_roles("ADMIN"))],
)
def create_user(payload: UserCreate, session: Session = Depends(get_session)) -> UserRead:
    existing = session.exec(select(User).where(User.email == payload.email)).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El email ya está registrado")

    if payload.role_id:
        role = session.get(Role, payload.role_id)
        if not role:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rol inexistente")

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role_id=payload.role_id,
        is_active=payload.is_active,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return _map_user(user, session)


@router.put(
    "/users/{user_id}",
    tags=["admin"],
    response_model=UserRead,
    dependencies=[Depends(require_roles("ADMIN"))],
)
def update_user(user_id: int, payload: UserUpdate, session: Session = Depends(get_session)) -> UserRead:
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    if payload.email and payload.email != user.email:
        duplicate = session.exec(select(User).where(User.email == payload.email)).first()
        if duplicate:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El email ya está registrado")

    if payload.role_id:
        role = session.get(Role, payload.role_id)
        if not role:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rol inexistente")

    audit_changes = payload.model_dump(exclude_unset=True)
    update_data = payload.model_dump(exclude_unset=True)
    password = update_data.pop("password", None)
    for field, value in update_data.items():
        setattr(user, field, value)
    if password:
        user.hashed_password = hash_password(password)
    user.updated_at = datetime.utcnow()
    session.add(user)
    session.commit()
    session.refresh(user)
    return _map_user(user, session)


@router.delete(
    "/users/{user_id}",
    tags=["admin"],
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_roles("ADMIN"))],
)
def delete_user(user_id: int, session: Session = Depends(get_session)) -> None:
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    session.delete(user)
    session.commit()


@router.get("/units", tags=["catalogs"], response_model=list[UnitRead])
def list_units() -> list[UnitRead]:
    """Catálogo controlado de unidades de medida."""

    unit_labels = {
        UnitOfMeasure.UNIT: "Unidad",
        UnitOfMeasure.KG: "Kilogramo",
        UnitOfMeasure.G: "Gramo",
        UnitOfMeasure.L: "Litro",
        UnitOfMeasure.ML: "Mililitro",
        UnitOfMeasure.PACK: "Pack",
        UnitOfMeasure.BOX: "Caja",
        UnitOfMeasure.M: "Metro",
        UnitOfMeasure.CM: "Centímetro",
    }
    return [{"code": code, "label": unit_labels.get(code, code)} for code in UnitOfMeasure]


@router.get("/sku-types", tags=["catalogs"], response_model=list[SKUTypeRead])
def list_sku_types(include_inactive: bool = False, session: Session = Depends(get_session)) -> list[SKUTypeRead]:
    statement = select(SKUType)
    if not include_inactive:
        statement = statement.where(SKUType.is_active.is_(True))
    types = session.exec(statement.order_by(SKUType.code)).all()
    return [SKUTypeRead.model_validate(item) for item in types]


@router.post(
    "/sku-types",
    tags=["catalogs"],
    status_code=status.HTTP_201_CREATED,
    response_model=SKUTypeRead,
    dependencies=[Depends(require_roles("ADMIN"))],
)
def create_sku_type(payload: SKUTypeCreate, session: Session = Depends(get_session)) -> SKUTypeRead:
    code = payload.code.strip().upper()
    duplicate = session.exec(select(SKUType).where(SKUType.code == code)).first()
    if duplicate:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ya existe un tipo de SKU con ese código")
    record = SKUType(code=code, label=payload.label, is_active=payload.is_active)
    session.add(record)
    session.commit()
    session.refresh(record)
    return SKUTypeRead.model_validate(record)


@router.put(
    "/sku-types/{sku_type_id}",
    tags=["catalogs"],
    response_model=SKUTypeRead,
    dependencies=[Depends(require_roles("ADMIN"))],
)
def update_sku_type(sku_type_id: int, payload: SKUTypeUpdate, session: Session = Depends(get_session)) -> SKUTypeRead:
    sku_type = session.get(SKUType, sku_type_id)
    if not sku_type:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tipo de SKU no encontrado")
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(sku_type, field, value)
    sku_type.updated_at = datetime.utcnow()
    session.add(sku_type)
    session.commit()
    session.refresh(sku_type)
    return SKUTypeRead.model_validate(sku_type)


@router.delete(
    "/sku-types/{sku_type_id}",
    tags=["catalogs"],
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_roles("ADMIN"))],
)
def delete_sku_type(sku_type_id: int, session: Session = Depends(get_session)) -> None:
    sku_type = session.get(SKUType, sku_type_id)
    if not sku_type:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tipo de SKU no encontrado")
    in_use = session.exec(select(SKU.id).where(SKU.sku_type_id == sku_type_id)).first()
    if in_use:
        sku_type.is_active = False
        sku_type.updated_at = datetime.utcnow()
        session.add(sku_type)
    else:
        session.delete(sku_type)
    session.commit()


@router.get("/mermas/types", tags=["mermas"], response_model=list[MermaTypeRead])
def list_merma_types(
    stage: MermaStage | None = None,
    include_inactive: bool = False,
    session: Session = Depends(get_session),
) -> list[MermaTypeRead]:
    statement = select(MermaType)
    if stage:
        statement = statement.where(MermaType.stage == stage)
    if not include_inactive:
        statement = statement.where(MermaType.is_active.is_(True))
    types = session.exec(statement.order_by(MermaType.stage, MermaType.label)).all()
    return [MermaTypeRead.model_validate(type_) for type_ in types]


@router.post("/mermas/types", tags=["mermas"], status_code=status.HTTP_201_CREATED, response_model=MermaTypeRead)
def create_merma_type(payload: MermaTypeCreate, session: Session = Depends(get_session)) -> MermaTypeRead:
    duplicate = session.exec(
        select(MermaType).where(MermaType.stage == payload.stage, MermaType.code == payload.code)
    ).first()
    if duplicate:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ya existe un tipo con ese código en la etapa")
    record = MermaType(**payload.model_dump())
    session.add(record)
    session.commit()
    session.refresh(record)
    return MermaTypeRead.model_validate(record)


@router.put("/mermas/types/{type_id}", tags=["mermas"], response_model=MermaTypeRead)
def update_merma_type(type_id: int, payload: MermaTypeUpdate, session: Session = Depends(get_session)) -> MermaTypeRead:
    record = session.get(MermaType, type_id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tipo de merma no encontrado")

    new_stage = payload.stage or record.stage
    duplicate = session.exec(
        select(MermaType).where(MermaType.stage == new_stage, MermaType.code == record.code, MermaType.id != type_id)
    ).first()
    if duplicate:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ya existe un tipo con ese código en la etapa")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(record, field, value)
    record.updated_at = datetime.utcnow()
    session.add(record)
    session.commit()
    session.refresh(record)
    return MermaTypeRead.model_validate(record)


@router.delete("/mermas/types/{type_id}", tags=["mermas"], status_code=status.HTTP_204_NO_CONTENT)
def delete_merma_type(type_id: int, session: Session = Depends(get_session)) -> None:
    record = session.get(MermaType, type_id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tipo de merma no encontrado")
    record.is_active = False
    record.updated_at = datetime.utcnow()
    session.add(record)
    session.commit()
    session.refresh(record)


@router.get("/mermas/causes", tags=["mermas"], response_model=list[MermaCauseRead])
def list_merma_causes(
    stage: MermaStage | None = None,
    include_inactive: bool = False,
    session: Session = Depends(get_session),
) -> list[MermaCauseRead]:
    statement = select(MermaCause)
    if stage:
        statement = statement.where(MermaCause.stage == stage)
    if not include_inactive:
        statement = statement.where(MermaCause.is_active.is_(True))
    causes = session.exec(statement.order_by(MermaCause.stage, MermaCause.label)).all()
    return [MermaCauseRead.model_validate(cause) for cause in causes]


@router.post("/mermas/causes", tags=["mermas"], status_code=status.HTTP_201_CREATED, response_model=MermaCauseRead)
def create_merma_cause(payload: MermaCauseCreate, session: Session = Depends(get_session)) -> MermaCauseRead:
    duplicate = session.exec(
        select(MermaCause).where(MermaCause.stage == payload.stage, MermaCause.code == payload.code)
    ).first()
    if duplicate:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ya existe una causa con ese código en la etapa")
    record = MermaCause(**payload.model_dump())
    session.add(record)
    session.commit()
    session.refresh(record)
    return MermaCauseRead.model_validate(record)


@router.put("/mermas/causes/{cause_id}", tags=["mermas"], response_model=MermaCauseRead)
def update_merma_cause(cause_id: int, payload: MermaCauseUpdate, session: Session = Depends(get_session)) -> MermaCauseRead:
    record = session.get(MermaCause, cause_id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Causa de merma no encontrada")

    new_stage = payload.stage or record.stage
    duplicate = session.exec(
        select(MermaCause).where(MermaCause.stage == new_stage, MermaCause.code == record.code, MermaCause.id != cause_id)
    ).first()
    if duplicate:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ya existe una causa con ese código en la etapa")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(record, field, value)
    record.updated_at = datetime.utcnow()
    session.add(record)
    session.commit()
    session.refresh(record)
    return MermaCauseRead.model_validate(record)


@router.delete("/mermas/causes/{cause_id}", tags=["mermas"], status_code=status.HTTP_204_NO_CONTENT)
def delete_merma_cause(cause_id: int, session: Session = Depends(get_session)) -> None:
    record = session.get(MermaCause, cause_id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Causa de merma no encontrada")
    record.is_active = False
    record.updated_at = datetime.utcnow()
    session.add(record)
    session.commit()
    session.refresh(record)


@router.get("/skus", tags=["sku"], response_model=list[SKURead])
def list_skus(
    sku_type_ids: list[int] | None = Query(None),
    tags: list[str] | None = Query(None, description="Alias para sku_type_code"),
    include_inactive: bool = False,
    search: str | None = None,
    session: Session = Depends(get_session),
) -> list[SKURead]:
    """Listado simple para bootstrap de catálogo."""
    statement = select(SKU).join(SKUType)
    if sku_type_ids:
        statement = statement.where(SKU.sku_type_id.in_(sku_type_ids))
    if tags:
        normalized_tags = [tag.upper() for tag in tags]
        statement = statement.where(SKUType.code.in_(normalized_tags))
    if not include_inactive:
        statement = statement.where(SKU.is_active.is_(True), SKUType.is_active.is_(True))
    if search:
        like = f"%{search.lower()}%"
        statement = statement.where((SKU.name.ilike(like)) | (SKU.code.ilike(like)))
    statement = statement.order_by(SKU.name, SKU.code)
    skus = session.exec(statement).all()
    return [_map_sku(item, session) for item in skus]


@router.post(
    "/skus",
    tags=["sku"],
    status_code=status.HTTP_201_CREATED,
    response_model=SKURead,
    dependencies=[Depends(require_roles("ADMIN"))],
)
def create_sku(payload: SKUCreate, session: Session = Depends(get_session)) -> SKURead:
    existing = session.exec(select(SKU).where(SKU.code == payload.code)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El código ya existe",
        )

    sku_type = _get_sku_type_or_404(session, payload.sku_type_id)
    if not sku_type.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El tipo de SKU está inactivo")

    units_per_kg = payload.units_per_kg or 1
    unit = payload.unit
    if sku_type.code == SKU_SEMI_CODE:
        unit = UnitOfMeasure.KG
    if sku_type.code != SKU_SEMI_CODE:
        units_per_kg = None

    sku = SKU(
        code=payload.code,
        name=payload.name,
        sku_type_id=payload.sku_type_id,
        unit=unit,
        notes=payload.notes,
        is_active=payload.is_active,
        alert_green_min=payload.alert_green_min,
        alert_yellow_min=payload.alert_yellow_min,
        alert_red_max=payload.alert_red_max,
    )
    session.add(sku)
    session.commit()
    session.refresh(sku)
    if sku_type.code == SKU_SEMI_CODE:
        _upsert_semi_conversion_rule(session, sku.id, units_per_kg)
        session.commit()
    return _map_sku(sku, session)


@router.put(
    "/skus/{sku_id}",
    tags=["sku"],
    response_model=SKURead,
    dependencies=[Depends(require_roles("ADMIN"))],
)
def update_sku(sku_id: int, payload: SKUUpdate, session: Session = Depends(get_session)) -> SKURead:
    sku = session.get(SKU, sku_id)
    if not sku:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SKU no encontrado")

    update_data = payload.model_dump(exclude_unset=True)
    sku_type_id = update_data.get("sku_type_id", sku.sku_type_id)
    sku_type = _get_sku_type_or_404(session, sku_type_id)
    if not sku_type.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El tipo de SKU está inactivo")

    units_per_kg = update_data.pop("units_per_kg", None)
    if sku_type.code == SKU_SEMI_CODE:
        update_data["unit"] = UnitOfMeasure.KG
    if units_per_kg is None and sku_type.code == SKU_SEMI_CODE:
        units_per_kg = _get_semi_units_per_kg(session, sku_id)

    for field, value in update_data.items():
        setattr(sku, field, value)
    sku.updated_at = datetime.utcnow()
    session.add(sku)
    session.commit()

    if sku_type.code == SKU_SEMI_CODE:
        _upsert_semi_conversion_rule(session, sku.id, units_per_kg or 1)
    else:
        _delete_semi_conversion_rule(session, sku.id)
    session.commit()
    session.refresh(sku)
    return _map_sku(sku, session)


@router.delete(
    "/skus/{sku_id}",
    tags=["sku"],
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_roles("ADMIN"))],
)
def delete_sku(sku_id: int, session: Session = Depends(get_session)) -> None:
    sku = session.get(SKU, sku_id)
    if not sku:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SKU no encontrado")
    session.delete(sku)
    session.commit()


@router.get("/deposits", tags=["deposits"], response_model=list[DepositRead])
def list_deposits(session: Session = Depends(get_session)) -> list[Deposit]:
    return session.exec(select(Deposit).order_by(Deposit.name)).all()


@router.post("/deposits", tags=["deposits"], status_code=status.HTTP_201_CREATED, response_model=DepositRead)
def create_deposit(payload: DepositCreate, session: Session = Depends(get_session)) -> Deposit:
    existing = session.exec(select(Deposit).where(Deposit.name == payload.name)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El depósito ya existe",
        )

    deposit = Deposit(**payload.model_dump())
    session.add(deposit)
    session.commit()
    session.refresh(deposit)
    return deposit


@router.put("/deposits/{deposit_id}", tags=["deposits"], response_model=DepositRead)
def update_deposit(deposit_id: int, payload: DepositUpdate, session: Session = Depends(get_session)) -> Deposit:
    deposit = session.get(Deposit, deposit_id)
    if not deposit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Depósito no encontrado")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(deposit, field, value)
    session.add(deposit)
    session.commit()
    session.refresh(deposit)
    return deposit


@router.delete("/deposits/{deposit_id}", tags=["deposits"], status_code=status.HTTP_204_NO_CONTENT)
def delete_deposit(deposit_id: int, session: Session = Depends(get_session)) -> None:
    deposit = session.get(Deposit, deposit_id)
    if not deposit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Depósito no encontrado")
    session.delete(deposit)
    session.commit()


@router.get("/production-lines", tags=["mermas"], response_model=list[ProductionLineRead])
def list_production_lines(session: Session = Depends(get_session)) -> list[ProductionLineRead]:
    lines = session.exec(select(ProductionLine).order_by(ProductionLine.name)).all()
    return [ProductionLineRead(id=line.id, name=line.name, is_active=line.is_active) for line in lines]


@router.post("/production-lines", tags=["mermas"], status_code=status.HTTP_201_CREATED, response_model=ProductionLineRead)
def create_production_line(payload: ProductionLineCreate, session: Session = Depends(get_session)) -> ProductionLineRead:
    existing = session.exec(select(ProductionLine).where(ProductionLine.name == payload.name)).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ya existe una línea con ese nombre")
    line = ProductionLine(name=payload.name, is_active=payload.is_active)
    session.add(line)
    session.commit()
    session.refresh(line)
    return ProductionLineRead(id=line.id, name=line.name, is_active=line.is_active)


@router.put("/production-lines/{line_id}", tags=["mermas"], response_model=ProductionLineRead)
def update_production_line(line_id: int, payload: ProductionLineUpdate, session: Session = Depends(get_session)) -> ProductionLineRead:
    line = session.get(ProductionLine, line_id)
    if not line:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Línea no encontrada")
    if payload.name and payload.name != line.name:
        duplicate = session.exec(select(ProductionLine).where(ProductionLine.name == payload.name)).first()
        if duplicate:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ya existe una línea con ese nombre")
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(line, field, value)
    line.updated_at = datetime.utcnow()
    session.add(line)
    session.commit()
    session.refresh(line)
    return ProductionLineRead(id=line.id, name=line.name, is_active=line.is_active)



def _map_recipe(recipe: Recipe, session: Session) -> RecipeRead:
    session.refresh(recipe, attribute_names=["items"])
    items = []
    for item in recipe.items:
        component = session.get(SKU, item.component_id)
        component_code = component.code if component else ""
        component_name = component.name if component else f"SKU {item.component_id}"
        session.refresh(component, attribute_names=["sku_type"]) if component else None
        if component and component.sku_type and component.sku_type.code == SKU_SEMI_CODE:
            component_unit = UnitOfMeasure.UNIT
        else:
            component_unit = component.unit if component else UnitOfMeasure.UNIT
        items.append(
            {
                "component_id": item.component_id,
                "quantity": item.quantity,
                "component_code": component_code,
                "component_name": component_name,
                "component_unit": component_unit,
            }
        )

    return RecipeRead(
        id=recipe.id,
        product_id=recipe.product_id,
        name=recipe.name,
        items=items,
    )


@router.get("/recipes", tags=["recipes"], response_model=list[RecipeRead])
def list_recipes(session: Session = Depends(get_session)) -> list[RecipeRead]:
    recipes = session.exec(select(Recipe)).all()
    return [_map_recipe(recipe, session) for recipe in recipes]


@router.post("/recipes", tags=["recipes"], status_code=status.HTTP_201_CREATED, response_model=RecipeRead)
def create_recipe(payload: RecipeCreate, session: Session = Depends(get_session)) -> RecipeRead:
    product = session.get(SKU, payload.product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")

    session.refresh(product, attribute_names=["sku_type"])
    product_type = product.sku_type.code if product.sku_type else ""
    if product_type not in SKU_PRODUCTION_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo se pueden crear recetas para productos PT o SEMI",
        )

    if not payload.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La receta debe tener al menos un componente")

    # Validate components exist
    component_ids = {item.component_id for item in payload.items}
    existing_components = session.exec(select(SKU.id).where(SKU.id.in_(component_ids))).all()
    if len(existing_components) != len(component_ids):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Algún componente no existe")

    recipe = Recipe(product_id=payload.product_id, name=payload.name)
    session.add(recipe)
    session.flush()  # assign id for FK

    for item in payload.items:
        session.add(
            RecipeItem(
                recipe_id=recipe.id,
                component_id=item.component_id,
                quantity=item.quantity,
            )
        )

    session.commit()
    session.refresh(recipe)
    return _map_recipe(recipe, session)


@router.put("/recipes/{recipe_id}", tags=["recipes"], response_model=RecipeRead)
def update_recipe(recipe_id: int, payload: RecipeUpdate, session: Session = Depends(get_session)) -> RecipeRead:
    recipe = session.get(Recipe, recipe_id)
    if not recipe:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receta no encontrada")

    product = session.get(SKU, payload.product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")
    session.refresh(product, attribute_names=["sku_type"])
    product_type = product.sku_type.code if product.sku_type else ""
    if product_type not in SKU_PRODUCTION_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Solo se permiten PT o SEMI")

    if not payload.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La receta debe tener al menos un componente")

    component_ids = {item.component_id for item in payload.items}
    existing_components = session.exec(select(SKU.id).where(SKU.id.in_(component_ids))).all()
    if len(existing_components) != len(component_ids):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Algún componente no existe")

    recipe.product_id = payload.product_id
    recipe.name = payload.name

    # Replace items
    current_items = session.exec(select(RecipeItem).where(RecipeItem.recipe_id == recipe.id)).all()
    for item in current_items:
        session.delete(item)
    session.flush()

    for item in payload.items:
        session.add(RecipeItem(recipe_id=recipe.id, component_id=item.component_id, quantity=item.quantity))

    session.commit()
    session.refresh(recipe)
    return _map_recipe(recipe, session)


@router.delete("/recipes/{recipe_id}", tags=["recipes"], status_code=status.HTTP_204_NO_CONTENT)
def delete_recipe(recipe_id: int, session: Session = Depends(get_session)) -> None:
    recipe = session.get(Recipe, recipe_id)
    if not recipe:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receta no encontrada")
    items = session.exec(select(RecipeItem).where(RecipeItem.recipe_id == recipe.id)).all()
    for item in items:
        session.delete(item)
    session.delete(recipe)
    session.commit()


@router.get(
    "/orders",
    tags=["orders"],
    response_model=list[OrderRead],
    dependencies=[Depends(require_roles("ADMIN", "SALES", "WAREHOUSE"))],
)
def list_orders(status_filter: OrderStatus | None = None, session: Session = Depends(get_session)) -> list[OrderRead]:
    statement = select(Order)
    if status_filter:
        statement = statement.where(Order.status == status_filter)
    orders = session.exec(statement.order_by(Order.created_at.desc())).all()
    return [_map_order(order, session) for order in orders]


@router.get(
    "/orders/{order_id}",
    tags=["orders"],
    response_model=OrderRead,
    dependencies=[Depends(require_roles("ADMIN", "SALES", "WAREHOUSE"))],
)
def get_order(order_id: int, session: Session = Depends(get_session)) -> OrderRead:
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pedido no encontrado")
    return _map_order(order, session)


@router.post(
    "/orders",
    tags=["orders"],
    status_code=status.HTTP_201_CREATED,
    response_model=OrderRead,
    dependencies=[Depends(require_roles("ADMIN", "SALES", "WAREHOUSE"))],
)
def create_order(
    payload: OrderCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> OrderRead:
    if not payload.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El pedido debe tener al menos un ítem")
    if not payload.requested_by or not payload.requested_by.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Indica quién ingresa el pedido")
    destination = _ensure_store_destination(session, payload.destination_deposit_id)

    items_payload = [item.model_dump() for item in payload.items]
    _validate_order_items(session, items_payload)

    order = Order(
        destination=destination.name,
        destination_deposit_id=destination.id,
        requested_for=payload.requested_for,
        requested_by=payload.requested_by.strip() if payload.requested_by else None,
        status=OrderStatus.SUBMITTED,
        notes=payload.notes,
        created_by_user_id=current_user.id,
        updated_by_user_id=current_user.id,
    )
    session.add(order)
    session.flush()

    for item in payload.items:
        session.add(
            OrderItem(
                order_id=order.id,
                sku_id=item.sku_id,
                quantity=item.quantity,
                current_stock=item.current_stock,
            )
        )

    _log_audit(session, "orders", order.id, AuditAction.CREATE, current_user.id, payload.model_dump())
    session.commit()
    session.refresh(order)
    return _map_order(order, session)


@router.put(
    "/orders/{order_id}",
    tags=["orders"],
    response_model=OrderRead,
    dependencies=[Depends(require_roles("ADMIN", "SALES", "WAREHOUSE"))],
)
def update_order(
    order_id: int,
    payload: OrderUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> OrderRead:
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pedido no encontrado")

    if payload.items is not None and not payload.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El pedido debe tener al menos un ítem")
    if payload.requested_by is not None and not payload.requested_by.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Indica quién ingresa el pedido")

    destination = None
    if payload.destination_deposit_id is not None:
        destination = _ensure_store_destination(session, payload.destination_deposit_id)

    if payload.items is not None:
        items_payload = [item.model_dump() for item in payload.items]
        _validate_order_items(session, items_payload)

    update_data = payload.model_dump(exclude_unset=True)
    items = update_data.pop("items", None)
    update_data.pop("destination_deposit_id", None)
    if "requested_by" in update_data and isinstance(update_data["requested_by"], str):
        update_data["requested_by"] = update_data["requested_by"].strip()
    for field, value in update_data.items():
        setattr(order, field, value)
    if update_data.get("status") == OrderStatus.CANCELLED:
        order.cancelled_at = datetime.utcnow()
        order.cancelled_by_user_id = current_user.id
        order.cancelled_by_name = current_user.full_name
    if destination:
        order.destination = destination.name
        order.destination_deposit_id = destination.id
    order.updated_at = datetime.utcnow()
    order.updated_by_user_id = current_user.id
    session.add(order)
    session.flush()

    if items is not None:
        existing_items = session.exec(select(OrderItem).where(OrderItem.order_id == order.id)).all()
        for item in existing_items:
            session.delete(item)
        session.flush()
        for item in items:
            session.add(
                OrderItem(
                    order_id=order.id,
                    sku_id=item["sku_id"],
                    quantity=item["quantity"],
                    current_stock=item.get("current_stock"),
                )
            )

    _log_audit(session, "orders", order.id, AuditAction.UPDATE, current_user.id, audit_changes)
    session.commit()
    session.refresh(order)
    return _map_order(order, session)


@router.post(
    "/orders/{order_id}/status",
    tags=["orders"],
    response_model=OrderRead,
    dependencies=[Depends(require_roles("ADMIN", "SALES", "WAREHOUSE"))],
)
def update_order_status(
    order_id: int,
    payload: OrderStatusUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> OrderRead:
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pedido no encontrado")
    order.status = payload.status
    if payload.status == OrderStatus.CANCELLED:
        order.cancelled_at = datetime.utcnow()
        order.cancelled_by_user_id = current_user.id
        order.cancelled_by_name = current_user.full_name
    order.updated_at = datetime.utcnow()
    order.updated_by_user_id = current_user.id
    session.add(order)
    _log_audit(session, "orders", order.id, AuditAction.STATUS, current_user.id, {"status": payload.status})
    session.commit()
    session.refresh(order)
    return _map_order(order, session)


@router.delete(
    "/orders/{order_id}",
    tags=["orders"],
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_roles("ADMIN", "SALES", "WAREHOUSE"))],
)
def delete_order(
    order_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> None:
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pedido no encontrado")
    items = session.exec(select(OrderItem).where(OrderItem.order_id == order.id)).all()
    for item in items:
        session.delete(item)
    session.delete(order)
    _log_audit(session, "orders", order_id, AuditAction.DELETE, current_user.id, {"deleted": True})
    session.commit()


@router.get(
    "/remitos",
    tags=["remitos"],
    response_model=list[RemitoRead],
    dependencies=[Depends(require_roles("ADMIN", "WAREHOUSE", "SALES"))],
)
def list_remitos(
    status_filter: RemitoStatus | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    session: Session = Depends(get_session),
) -> list[RemitoRead]:
    statement = select(Remito)
    if status_filter:
        statement = statement.where(Remito.status == status_filter)
    if date_from:
        statement = statement.where(Remito.issue_date >= date_from)
    if date_to:
        statement = statement.where(Remito.issue_date <= date_to)
    remitos = session.exec(statement.order_by(Remito.created_at.desc())).all()
    return [_map_remito(remito, session) for remito in remitos]


@router.get(
    "/remitos/{remito_id}",
    tags=["remitos"],
    response_model=RemitoRead,
    dependencies=[Depends(require_roles("ADMIN", "WAREHOUSE", "SALES"))],
)
def get_remito(remito_id: int, session: Session = Depends(get_session)) -> RemitoRead:
    remito = _get_remito_or_404(session, remito_id)
    return _map_remito(remito, session)


@router.post(
    "/remitos/from-order/{order_id}",
    tags=["remitos"],
    response_model=RemitoRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("ADMIN", "WAREHOUSE", "SALES"))],
)
def create_remito_from_order(
    order_id: int,
    payload: RemitoFromOrderRequest | None = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> RemitoRead:
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pedido no encontrado")
    session.refresh(order, attribute_names=["items", "destination_deposit"])
    if not order.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El pedido no tiene ítems")

    destination_deposit_id = (payload.destination_deposit_id if payload else None) or order.destination_deposit_id
    if not destination_deposit_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El pedido no tiene destino definido")
    destination_deposit = _get_deposit_or_404(session, destination_deposit_id)
    source_deposit = (
        _get_deposit_or_404(session, payload.source_deposit_id)
        if payload and payload.source_deposit_id
        else _default_source_deposit(session)
    )

    remito = Remito(
        order_id=order.id,
        status=RemitoStatus.PENDING,
        destination=destination_deposit.name,
        issue_date=date.today(),
        source_deposit_id=source_deposit.id,
        destination_deposit_id=destination_deposit.id,
        created_by_user_id=current_user.id,
        updated_by_user_id=current_user.id,
    )
    session.add(remito)
    session.flush()

    for item in order.items:
        session.add(RemitoItem(remito_id=remito.id, sku_id=item.sku_id, quantity=item.quantity))

    _log_audit(session, "remitos", remito.id, AuditAction.CREATE, current_user.id, {"order_id": order.id})
    session.commit()
    session.refresh(remito)
    return _map_remito(remito, session)


@router.post(
    "/remitos/{remito_id}/dispatch",
    tags=["remitos"],
    response_model=RemitoRead,
    dependencies=[Depends(require_roles("ADMIN", "WAREHOUSE", "SALES"))],
)
def dispatch_remito(
    remito_id: int,
    payload: RemitoDispatchRequest | None = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> RemitoRead:
    remito = _get_remito_or_404(session, remito_id)
    session.refresh(remito, attribute_names=["items"])
    if remito.status in {RemitoStatus.DISPATCHED, RemitoStatus.RECEIVED, RemitoStatus.CANCELLED, RemitoStatus.DELIVERED}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El remito ya fue procesado")
    if not remito.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El remito no tiene ítems cargados")

    source_deposit = _get_deposit_or_404(session, remito.source_deposit_id) if remito.source_deposit_id else _default_source_deposit(session)
    movement_type = _get_movement_type_by_code(session, "REMITO")
    reference = f"REMITO-{remito.id}"
    movement_date = payload.movement_date if payload else None

    for item in remito.items:
        sku = session.get(SKU, item.sku_id)
        if not sku:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"SKU {item.sku_id} no encontrado")
        if source_deposit.controls_lot:
            consumptions = _calculate_consumption_by_lot(
                session, item.sku_id, source_deposit.id, item.quantity, strict=True
            )
            for lot, quantity in consumptions:
                movement_payload = StockMovementCreate(
                    sku_id=item.sku_id,
                    deposit_id=source_deposit.id,
                    movement_type_id=movement_type.id,
                    quantity=quantity,
                    is_outgoing=True,
                    reference_type="REMITO",
                    reference_id=remito.id,
                    reference_item_id=item.id,
                    reference=reference,
                    lot_code=lot.lot_code if lot else None,
                    production_lot_id=lot.id if lot else None,
                    movement_date=movement_date,
                    created_by_user_id=current_user.id,
                )
                _apply_stock_movement(session, movement_payload, allow_negative_balance=False)
        else:
            movement_payload = StockMovementCreate(
                sku_id=item.sku_id,
                deposit_id=source_deposit.id,
                movement_type_id=movement_type.id,
                quantity=item.quantity,
                is_outgoing=True,
                reference_type="REMITO",
                reference_id=remito.id,
                reference_item_id=item.id,
                reference=reference,
                movement_date=movement_date,
                created_by_user_id=current_user.id,
            )
            _apply_stock_movement(session, movement_payload, allow_negative_balance=False)

    remito.status = RemitoStatus.DISPATCHED
    remito.dispatched_at = datetime.utcnow()
    remito.source_deposit_id = source_deposit.id
    remito.updated_at = datetime.utcnow()
    remito.updated_by_user_id = current_user.id
    session.add(remito)
    _log_audit(session, "remitos", remito.id, AuditAction.STATUS, current_user.id, {"status": RemitoStatus.DISPATCHED})
    session.commit()
    session.refresh(remito)
    return _map_remito(remito, session)


@router.post(
    "/remitos/{remito_id}/receive",
    tags=["remitos"],
    response_model=RemitoRead,
    dependencies=[Depends(require_roles("ADMIN", "WAREHOUSE", "SALES"))],
)
def receive_remito(
    remito_id: int,
    payload: RemitoReceiveRequest | None = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> RemitoRead:
    remito = _get_remito_or_404(session, remito_id)
    session.refresh(remito, attribute_names=["items"])
    if remito.status not in {RemitoStatus.DISPATCHED, RemitoStatus.SENT}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Solo se pueden recibir remitos despachados")
    if not remito.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El remito no tiene ítems cargados")

    destination_deposit = (
        _get_deposit_or_404(session, remito.destination_deposit_id)
        if remito.destination_deposit_id
        else _default_source_deposit(session)
    )
    movement_type = _get_movement_type_by_code(session, "REMITO")
    reference = f"REMITO-{remito.id}"
    movement_date = payload.movement_date if payload else None

    for item in remito.items:
        movement_payload = StockMovementCreate(
            sku_id=item.sku_id,
            deposit_id=destination_deposit.id,
            movement_type_id=movement_type.id,
            quantity=item.quantity,
            is_outgoing=False,
            reference_type="REMITO",
            reference_id=remito.id,
            reference_item_id=item.id,
            reference=f"{reference}-RECIBIDO",
            movement_date=movement_date,
            created_by_user_id=current_user.id,
        )
        _apply_stock_movement(session, movement_payload, allow_negative_balance=True)

    remito.status = RemitoStatus.RECEIVED
    remito.received_at = datetime.utcnow()
    remito.destination_deposit_id = destination_deposit.id
    remito.updated_at = datetime.utcnow()
    remito.updated_by_user_id = current_user.id
    session.add(remito)
    _log_audit(session, "remitos", remito.id, AuditAction.STATUS, current_user.id, {"status": RemitoStatus.RECEIVED})
    session.commit()
    session.refresh(remito)
    return _map_remito(remito, session)


@router.post(
    "/remitos/{remito_id}/cancel",
    tags=["remitos"],
    response_model=RemitoRead,
    dependencies=[Depends(require_roles("ADMIN", "WAREHOUSE", "SALES"))],
)
def cancel_remito(
    remito_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> RemitoRead:
    remito = _get_remito_or_404(session, remito_id)
    if remito.status in {RemitoStatus.DISPATCHED, RemitoStatus.RECEIVED, RemitoStatus.CANCELLED, RemitoStatus.DELIVERED}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No se puede cancelar un remito procesado")
    remito.status = RemitoStatus.CANCELLED
    remito.cancelled_at = datetime.utcnow()
    remito.updated_at = datetime.utcnow()
    remito.updated_by_user_id = current_user.id
    session.add(remito)
    _log_audit(session, "remitos", remito.id, AuditAction.CANCEL, current_user.id, {"status": RemitoStatus.CANCELLED})
    session.commit()
    session.refresh(remito)
    return _map_remito(remito, session)


@router.get("/stock/movement-types", tags=["stock"], response_model=list[StockMovementTypeRead])
def list_stock_movement_types(
    include_inactive: bool = False, session: Session = Depends(get_session)
) -> list[StockMovementTypeRead]:
    statement = select(StockMovementType)
    if not include_inactive:
        statement = statement.where(StockMovementType.is_active.is_(True))
    types = session.exec(statement.order_by(StockMovementType.code)).all()
    return [StockMovementTypeRead.model_validate(item) for item in types]


@router.post(
    "/stock/movement-types",
    tags=["stock"],
    status_code=status.HTTP_201_CREATED,
    response_model=StockMovementTypeRead,
    dependencies=[Depends(require_roles("ADMIN"))],
)
def create_stock_movement_type(
    payload: StockMovementTypeCreate,
    session: Session = Depends(get_session),
) -> StockMovementTypeRead:
    code = payload.code.strip().upper()
    duplicate = session.exec(select(StockMovementType).where(StockMovementType.code == code)).first()
    if duplicate:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ya existe un tipo de movimiento con ese código")
    record = StockMovementType(code=code, label=payload.label, is_active=payload.is_active)
    session.add(record)
    session.commit()
    session.refresh(record)
    return StockMovementTypeRead.model_validate(record)


@router.put(
    "/stock/movement-types/{movement_type_id}",
    tags=["stock"],
    response_model=StockMovementTypeRead,
    dependencies=[Depends(require_roles("ADMIN"))],
)
def update_stock_movement_type(
    movement_type_id: int,
    payload: StockMovementTypeUpdate,
    session: Session = Depends(get_session),
) -> StockMovementTypeRead:
    record = session.get(StockMovementType, movement_type_id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tipo de movimiento no encontrado")
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(record, field, value)
    record.updated_at = datetime.utcnow()
    session.add(record)
    session.commit()
    session.refresh(record)
    return StockMovementTypeRead.model_validate(record)


@router.delete(
    "/stock/movement-types/{movement_type_id}",
    tags=["stock"],
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_roles("ADMIN"))],
)
def delete_stock_movement_type(movement_type_id: int, session: Session = Depends(get_session)) -> None:
    record = session.get(StockMovementType, movement_type_id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tipo de movimiento no encontrado")
    in_use = session.exec(select(StockMovement.id).where(StockMovement.movement_type_id == movement_type_id)).first()
    if in_use:
        record.is_active = False
        record.updated_at = datetime.utcnow()
        session.add(record)
    else:
        session.delete(record)
    session.commit()


def _ensure_stock_level(session: Session, deposit_id: int, sku_id: int) -> StockLevel:
    stock_level = session.exec(
        select(StockLevel).where(StockLevel.deposit_id == deposit_id, StockLevel.sku_id == sku_id)
    ).first()
    if stock_level:
        return stock_level

    stock_level = StockLevel(deposit_id=deposit_id, sku_id=sku_id, quantity=0)
    session.add(stock_level)
    session.flush()
    return stock_level


def _apply_stock_movement(
    session: Session,
    payload: StockMovementCreate,
    allow_negative_balance: bool = True,
) -> tuple[StockLevel, StockMovement]:
    if payload.quantity <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La cantidad debe ser mayor a cero")

    movement_type = _get_movement_type_or_404(session, payload.movement_type_id)
    if not movement_type.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El tipo de movimiento está inactivo")

    sku = session.get(SKU, payload.sku_id)
    deposit = session.get(Deposit, payload.deposit_id)
    if not sku or not deposit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SKU o depósito no encontrado")
    session.refresh(sku, attribute_names=["sku_type"])
    if not (sku.sku_type and sku.sku_type.is_active):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El tipo del SKU está inactivo")
    production_line = None
    if payload.production_line_id:
        production_line = _get_production_line_or_404(session, payload.production_line_id)

    input_unit = payload.unit or sku.unit
    base_quantity = _convert_to_base_quantity(sku, payload.quantity, input_unit, session)
    movement_code = movement_type.code.upper()
    is_outgoing = payload.is_outgoing
    if is_outgoing is None:
        if movement_code in OUTGOING_MOVEMENTS:
            is_outgoing = True
        elif movement_code in INCOMING_MOVEMENTS:
            is_outgoing = False
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tipo de movimiento no soportado")
    delta = -base_quantity if is_outgoing else base_quantity

    produced_at = payload.movement_date or date.today()
    if movement_code == "PRODUCTION" and not production_line:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La línea de producción es obligatoria")

    lot_code = payload.lot_code
    production_lot: ProductionLot | None = None
    created_lot = False
    if payload.production_lot_id:
        production_lot = session.get(ProductionLot, payload.production_lot_id)
        if not production_lot:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lote de producción no encontrado")
        if production_lot.sku_id != sku.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El lote no corresponde al SKU indicado")
        if production_lot.deposit_id != deposit.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El lote pertenece a otro depósito")
        if production_lot.is_blocked:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El lote está bloqueado para movimientos")
        if payload.production_line_id and production_lot.production_line_id not in (None, payload.production_line_id):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El lote está asociado a otra línea")
        if movement_code == "PRODUCTION":
            if produced_at != production_lot.produced_at:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La fecha de producción no coincide con el lote")
            if not production_lot.production_line_id and production_line:
                production_lot.production_line_id = production_line.id
        lot_code = production_lot.lot_code
    elif lot_code:
        production_lot = session.exec(select(ProductionLot).where(ProductionLot.lot_code == lot_code)).first()
        if production_lot:
            if production_lot.sku_id != sku.id or production_lot.deposit_id != deposit.id:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El lote pertenece a otro SKU o depósito")
            if production_lot.is_blocked:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El lote está bloqueado para movimientos")
            if payload.production_line_id and production_lot.production_line_id not in (None, payload.production_line_id):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El lote está asociado a otra línea")
            validation_line = production_line or (
                production_lot.production_line_id and _get_production_line_or_404(session, production_lot.production_line_id)
            )
            if not validation_line:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El lote no tiene línea asociada")
            _validate_lot_code(
                session,
                lot_code,
                sku,
                deposit,
                validation_line,
                production_lot.produced_at,
                allow_existing_id=production_lot.id,
            )
        elif movement_code != "PRODUCTION":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El lote indicado no existe")

    if movement_code == "PRODUCTION" and not production_lot:
        if not production_line:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La línea de producción es obligatoria")
        lot_code = lot_code or _generate_lot_code(session, sku, production_line, produced_at)
        _validate_lot_code(session, lot_code, sku, deposit, production_line, produced_at)
        production_lot = ProductionLot(
            lot_code=lot_code,
            sku_id=sku.id,
            deposit_id=deposit.id,
            production_line_id=payload.production_line_id,
            produced_quantity=base_quantity,
            remaining_quantity=base_quantity,
            produced_at=produced_at,
        )
        session.add(production_lot)
        session.flush()
        created_lot = True
    elif movement_code == "PRODUCTION" and production_lot:
        if produced_at != production_lot.produced_at:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La fecha de producción no coincide con el lote")
        validation_line = production_line or (
            production_lot.production_line_id and _get_production_line_or_404(session, production_lot.production_line_id)
        )
        if not validation_line:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El lote no tiene línea asociada")
        _validate_lot_code(
            session,
            production_lot.lot_code,
            sku,
            deposit,
            validation_line,
            production_lot.produced_at,
            allow_existing_id=production_lot.id,
        )
        if not production_lot.production_line_id and production_line:
            production_lot.production_line_id = production_line.id

    stock_level = _ensure_stock_level(session, payload.deposit_id, payload.sku_id)
    new_quantity = stock_level.quantity + delta
    if not allow_negative_balance and new_quantity < 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Stock insuficiente en el depósito")

    if production_lot:
        if movement_code == "PRODUCTION" and not created_lot:
            production_lot.produced_quantity += base_quantity
            production_lot.remaining_quantity += base_quantity
        else:
            new_remaining = production_lot.remaining_quantity + delta
            if not allow_negative_balance and new_remaining < 0:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El lote no tiene stock suficiente")
            production_lot.remaining_quantity = new_remaining
        production_lot.updated_at = datetime.utcnow()
        session.add(production_lot)

    stock_level.quantity = new_quantity
    movement = StockMovement(
        sku_id=payload.sku_id,
        deposit_id=payload.deposit_id,
        movement_type_id=movement_type.id,
        quantity=delta,
        reference_type=payload.reference_type,
        reference_id=payload.reference_id,
        reference_item_id=payload.reference_item_id,
        reference=payload.reference,
        lot_code=lot_code,
        production_lot_id=production_lot.id if production_lot else None,
        movement_date=payload.movement_date or date.today(),
        created_by_user_id=payload.created_by_user_id,
    )
    session.add(stock_level)
    session.add(movement)
    session.flush()
    session.refresh(stock_level, attribute_names=["sku", "deposit"])
    session.refresh(movement, attribute_names=["sku", "deposit", "movement_type", "production_lot"])

    if movement_code == "PRODUCTION" and sku.sku_type and sku.sku_type.code in SKU_PRODUCTION_TYPES:
        _consume_recipe_components(
            session,
            sku,
            deposit,
            production_lot,
            base_quantity,
            payload.reference,
            movement.movement_date,
            payload.created_by_user_id,
        )
    return stock_level, movement


def _map_stock_movement(movement: StockMovement, session: Session) -> StockMovementRead:
    session.refresh(movement, attribute_names=["sku", "deposit", "movement_type", "production_lot"])
    production_line_id = None
    production_line_name = None
    if movement.production_lot:
        session.refresh(movement.production_lot, attribute_names=["production_line"])
        production_line_id = movement.production_lot.production_line_id
        production_line_name = (
            movement.production_lot.production_line.name if movement.production_lot.production_line else None
        )
    stock_level = session.exec(
        select(StockLevel).where(StockLevel.deposit_id == movement.deposit_id, StockLevel.sku_id == movement.sku_id)
    ).first()
    current_balance = stock_level.quantity if stock_level else 0
    created_by_name = None
    if movement.created_by_user_id:
        user = session.get(User, movement.created_by_user_id)
        created_by_name = user.full_name if user else None

    return StockMovementRead(
        id=movement.id,
        sku_id=movement.sku_id,
        sku_code=movement.sku.code if movement.sku else str(movement.sku_id),
        sku_name=movement.sku.name if movement.sku else f"SKU {movement.sku_id}",
        deposit_id=movement.deposit_id,
        deposit_name=movement.deposit.name if movement.deposit else "",
        movement_type_id=movement.movement_type_id,
        movement_type_code=movement.movement_type.code if movement.movement_type else "",
        movement_type_label=movement.movement_type.label if movement.movement_type else "",
        quantity=movement.quantity,
        reference_type=movement.reference_type,
        reference_id=movement.reference_id,
        reference_item_id=movement.reference_item_id,
        reference=movement.reference,
        lot_code=movement.lot_code,
        production_lot_id=movement.production_lot_id,
        production_line_id=production_line_id,
        production_line_name=production_line_name,
        movement_date=movement.movement_date,
        created_at=movement.created_at,
        current_balance=current_balance,
        created_by_user_id=movement.created_by_user_id,
        created_by_name=created_by_name,
    )


def _map_inventory_count_item(item: InventoryCountItem, session: Session) -> InventoryCountItemRead:
    sku = session.get(SKU, item.sku_id)
    lot_code = item.lot_code
    if item.production_lot_id:
        lot = session.get(ProductionLot, item.production_lot_id)
        lot_code = lot.lot_code if lot else lot_code
    return InventoryCountItemRead(
        id=item.id,
        sku_id=item.sku_id,
        sku_code=sku.code if sku else str(item.sku_id),
        sku_name=sku.name if sku else f"SKU {item.sku_id}",
        production_lot_id=item.production_lot_id,
        lot_code=lot_code,
        counted_quantity=item.counted_quantity,
        system_quantity=item.system_quantity,
        difference=item.difference,
        unit=item.unit,
        stock_movement_id=item.stock_movement_id,
    )


def _map_inventory_count(count: InventoryCount, session: Session) -> InventoryCountRead:
    session.refresh(count, attribute_names=["items", "deposit"])
    created_by_name = None
    updated_by_name = None
    approved_by_name = None
    if count.created_by_user_id:
        user = session.get(User, count.created_by_user_id)
        created_by_name = user.full_name if user else None
    if count.updated_by_user_id:
        user = session.get(User, count.updated_by_user_id)
        updated_by_name = user.full_name if user else None
    if count.approved_by_user_id:
        user = session.get(User, count.approved_by_user_id)
        approved_by_name = user.full_name if user else None

    return InventoryCountRead(
        id=count.id,
        deposit_id=count.deposit_id,
        deposit_name=count.deposit.name if count.deposit else "",
        status=count.status,
        count_date=count.count_date,
        notes=count.notes,
        submitted_at=count.submitted_at,
        approved_at=count.approved_at,
        closed_at=count.closed_at,
        cancelled_at=count.cancelled_at,
        created_at=count.created_at,
        created_by_user_id=count.created_by_user_id,
        created_by_name=created_by_name,
        updated_by_user_id=count.updated_by_user_id,
        updated_by_name=updated_by_name,
        approved_by_user_id=count.approved_by_user_id,
        approved_by_name=approved_by_name,
        items=[_map_inventory_count_item(item, session) for item in count.items],
    )


def _map_audit_log(record: AuditLog, session: Session) -> AuditLogRead:
    user_name = None
    if record.user_id:
        user = session.get(User, record.user_id)
        user_name = user.full_name if user else None
    return AuditLogRead(
        id=record.id,
        entity_type=record.entity_type,
        entity_id=record.entity_id,
        action=record.action,
        changes=record.changes,
        user_id=record.user_id,
        user_name=user_name,
        ip_address=record.ip_address,
        created_at=record.created_at,
    )


def _map_merma_event(event: MermaEvent, session: Session) -> MermaEventRead:
    session.refresh(
        event,
        attribute_names=[
            "sku",
            "deposit",
            "production_line",
            "type",
            "cause",
            "remito",
            "order",
            "stock_movement",
            "reported_by_user",
        ],
    )
    return MermaEventRead(
        id=event.id,
        stage=event.stage,
        type_id=event.type_id,
        type_code=event.type_code,
        type_label=event.type_label,
        cause_id=event.cause_id,
        cause_code=event.cause_code,
        cause_label=event.cause_label,
        sku_id=event.sku_id,
        sku_code=event.sku.code if event.sku else str(event.sku_id),
        sku_name=event.sku.name if event.sku else f"SKU {event.sku_id}",
        quantity=event.quantity,
        unit=event.unit,
        lot_code=event.lot_code,
        deposit_id=event.deposit_id,
        deposit_name=event.deposit.name if event.deposit else None,
        remito_id=event.remito_id,
        order_id=event.order_id,
        production_line_id=event.production_line_id,
        production_line_name=event.production_line.name if event.production_line else None,
        reported_by_user_id=event.reported_by_user_id,
        reported_by_role=event.reported_by_role,
        notes=event.notes,
        detected_at=event.detected_at,
        created_at=event.created_at,
        updated_at=event.updated_at,
        affects_stock=event.affects_stock,
        action=event.action,
        stock_movement_id=event.stock_movement_id,
    )


@router.get("/stock-levels", tags=["stock"], response_model=list[StockLevelRead])
def list_stock_levels(session: Session = Depends(get_session)) -> list[StockLevelRead]:
    stock_levels = session.exec(select(StockLevel)).all()
    return [_map_stock_level(level, session) for level in stock_levels]


@router.post(
    "/stock/movements",
    tags=["stock"],
    status_code=status.HTTP_201_CREATED,
    response_model=StockLevelRead,
    dependencies=[Depends(require_roles("ADMIN", "WAREHOUSE", "PRODUCTION"))],
)
def register_stock_movement(
    payload: StockMovementCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> StockLevelRead:
    payload.created_by_user_id = payload.created_by_user_id or current_user.id
    stock_level, movement = _apply_stock_movement(session, payload)
    _log_audit(session, "stock_movements", movement.id, AuditAction.CREATE, payload.created_by_user_id, payload.model_dump())
    session.commit()
    session.refresh(stock_level, attribute_names=["sku", "deposit"])
    return _map_stock_level(stock_level, session)


@router.get("/stock/movements", tags=["stock"], response_model=StockMovementList)
def list_stock_movements(
    sku_id: int | None = None,
    deposit_id: int | None = None,
    movement_type_id: int | None = None,
    movement_type_code: str | None = None,
    production_line_id: int | None = None,
    lot_code: str | None = None,
    reference_type: str | None = None,
    reference_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    limit: int = 50,
    offset: int = 0,
    session: Session = Depends(get_session),
) -> StockMovementList:
    statement = select(StockMovement)
    if sku_id:
        statement = statement.where(StockMovement.sku_id == sku_id)
    if deposit_id:
        statement = statement.where(StockMovement.deposit_id == deposit_id)
    if movement_type_id:
        statement = statement.where(StockMovement.movement_type_id == movement_type_id)
    if movement_type_code:
        statement = statement.join(StockMovementType).where(
            StockMovementType.code == movement_type_code.strip().upper()
        )
    if production_line_id:
        statement = statement.join(ProductionLot).where(ProductionLot.production_line_id == production_line_id)
    if lot_code:
        statement = statement.where(StockMovement.lot_code == lot_code)
    if reference_type:
        statement = statement.where(StockMovement.reference_type == reference_type)
    if reference_id:
        statement = statement.where(StockMovement.reference_id == reference_id)
    if date_from:
        statement = statement.where(StockMovement.movement_date >= date_from)
    if date_to:
        statement = statement.where(StockMovement.movement_date <= date_to)

    safe_limit = max(1, min(limit, 200))
    safe_offset = max(offset, 0)
    result = session.exec(
        select(func.count()).select_from(statement.subquery())
    )
    total = result.first()
    if isinstance(total, tuple):
        total = total[0]

    records = session.exec(
        statement.order_by(StockMovement.movement_date.desc(), StockMovement.id.desc())
        .offset(safe_offset)
        .limit(safe_limit)
    ).all()
    return StockMovementList(total=total or 0, items=[_map_stock_movement(item, session) for item in records])


def _resolve_system_quantity(
    session: Session,
    deposit: Deposit,
    sku: SKU,
    production_lot_id: int | None,
) -> tuple[float, ProductionLot | None]:
    if deposit.controls_lot:
        if not production_lot_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El depósito requiere lote")
        lot = session.get(ProductionLot, production_lot_id)
        if not lot:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lote no encontrado")
        if lot.deposit_id != deposit.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El lote pertenece a otro depósito")
        if lot.sku_id != sku.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El lote no corresponde al SKU indicado")
        return float(lot.remaining_quantity), lot

    stock_level = session.exec(
        select(StockLevel).where(StockLevel.deposit_id == deposit.id, StockLevel.sku_id == sku.id)
    ).first()
    return float(stock_level.quantity) if stock_level else 0.0, None


def _replace_inventory_count_items(
    session: Session,
    count: InventoryCount,
    items: list[dict],
    deposit: Deposit,
) -> None:
    existing_items = session.exec(select(InventoryCountItem).where(InventoryCountItem.inventory_count_id == count.id)).all()
    for item in existing_items:
        session.delete(item)
    session.flush()

    for payload in items:
        sku = session.get(SKU, payload["sku_id"])
        if not sku:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SKU no encontrado")
        system_quantity, lot = _resolve_system_quantity(session, deposit, sku, payload.get("production_lot_id"))
        counted = float(payload["counted_quantity"])
        difference = counted - system_quantity
        session.add(
            InventoryCountItem(
                inventory_count_id=count.id,
                sku_id=sku.id,
                production_lot_id=payload.get("production_lot_id"),
                lot_code=lot.lot_code if lot else None,
                counted_quantity=counted,
                system_quantity=system_quantity,
                difference=difference,
                unit=sku.unit,
            )
        )


@router.get(
    "/inventory-counts",
    tags=["inventory"],
    response_model=list[InventoryCountRead],
    dependencies=[Depends(require_roles("ADMIN", "WAREHOUSE", "AUDIT"))],
)
def list_inventory_counts(
    status_filter: InventoryCountStatus | None = None,
    deposit_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    session: Session = Depends(get_session),
) -> list[InventoryCountRead]:
    statement = select(InventoryCount)
    if status_filter:
        statement = statement.where(InventoryCount.status == status_filter)
    if deposit_id:
        statement = statement.where(InventoryCount.deposit_id == deposit_id)
    if date_from:
        statement = statement.where(InventoryCount.count_date >= date_from)
    if date_to:
        statement = statement.where(InventoryCount.count_date <= date_to)
    counts = session.exec(statement.order_by(InventoryCount.count_date.desc(), InventoryCount.id.desc())).all()
    return [_map_inventory_count(count, session) for count in counts]


@router.get(
    "/inventory-counts/{count_id}",
    tags=["inventory"],
    response_model=InventoryCountRead,
    dependencies=[Depends(require_roles("ADMIN", "WAREHOUSE", "AUDIT"))],
)
def get_inventory_count(count_id: int, session: Session = Depends(get_session)) -> InventoryCountRead:
    count = session.get(InventoryCount, count_id)
    if not count:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conteo no encontrado")
    return _map_inventory_count(count, session)


@router.post(
    "/inventory-counts",
    tags=["inventory"],
    status_code=status.HTTP_201_CREATED,
    response_model=InventoryCountRead,
    dependencies=[Depends(require_roles("ADMIN", "WAREHOUSE"))],
)
def create_inventory_count(
    payload: InventoryCountCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> InventoryCountRead:
    if not payload.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Debes cargar al menos un ítem")
    deposit = _get_deposit_or_404(session, payload.deposit_id)

    count = InventoryCount(
        deposit_id=deposit.id,
        status=InventoryCountStatus.DRAFT,
        count_date=payload.count_date or date.today(),
        notes=payload.notes,
        created_by_user_id=current_user.id,
        updated_by_user_id=current_user.id,
    )
    session.add(count)
    session.flush()

    items_payload = [item.model_dump() for item in payload.items]
    _replace_inventory_count_items(session, count, items_payload, deposit)
    _log_audit(session, "inventory_counts", count.id, AuditAction.CREATE, current_user.id, payload.model_dump())
    session.commit()
    session.refresh(count)
    return _map_inventory_count(count, session)


@router.put(
    "/inventory-counts/{count_id}",
    tags=["inventory"],
    response_model=InventoryCountRead,
    dependencies=[Depends(require_roles("ADMIN", "WAREHOUSE"))],
)
def update_inventory_count(
    count_id: int,
    payload: InventoryCountUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> InventoryCountRead:
    count = session.get(InventoryCount, count_id)
    if not count:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conteo no encontrado")
    if count.status != InventoryCountStatus.DRAFT:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Solo se pueden editar conteos en borrador")

    update_data = payload.model_dump(exclude_unset=True)
    items = update_data.pop("items", None)
    for field, value in update_data.items():
        setattr(count, field, value)
    count.updated_at = datetime.utcnow()
    count.updated_by_user_id = current_user.id
    session.add(count)
    session.flush()

    if items is not None:
        deposit = _get_deposit_or_404(session, count.deposit_id)
        items_payload = [item.model_dump() for item in items]
        _replace_inventory_count_items(session, count, items_payload, deposit)

    _log_audit(session, "inventory_counts", count.id, AuditAction.UPDATE, current_user.id, update_data)
    session.commit()
    session.refresh(count)
    return _map_inventory_count(count, session)


@router.post(
    "/inventory-counts/{count_id}/submit",
    tags=["inventory"],
    response_model=InventoryCountRead,
    dependencies=[Depends(require_roles("ADMIN", "WAREHOUSE"))],
)
def submit_inventory_count(
    count_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> InventoryCountRead:
    count = session.get(InventoryCount, count_id)
    if not count:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conteo no encontrado")
    if count.status != InventoryCountStatus.DRAFT:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El conteo ya fue enviado")

    count.status = InventoryCountStatus.SUBMITTED
    count.submitted_at = datetime.utcnow()
    count.updated_at = datetime.utcnow()
    count.updated_by_user_id = current_user.id
    session.add(count)
    _log_audit(session, "inventory_counts", count.id, AuditAction.STATUS, current_user.id, {"status": count.status})
    session.commit()
    session.refresh(count)
    return _map_inventory_count(count, session)


@router.post(
    "/inventory-counts/{count_id}/approve",
    tags=["inventory"],
    response_model=InventoryCountRead,
    dependencies=[Depends(require_roles("ADMIN", "WAREHOUSE"))],
)
def approve_inventory_count(
    count_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> InventoryCountRead:
    count = session.get(InventoryCount, count_id)
    if not count:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conteo no encontrado")
    if count.status != InventoryCountStatus.SUBMITTED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El conteo debe estar enviado para aprobarse")

    session.refresh(count, attribute_names=["items"])
    deposit = _get_deposit_or_404(session, count.deposit_id)
    movement_type = _get_movement_type_by_code(session, "ADJUSTMENT")
    reference = f"INVENTARIO-{count.id}"

    for item in count.items:
        if item.difference == 0:
            continue
        if deposit.controls_lot and not item.production_lot_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Falta lote en depósito con control de lotes")

        lot_code = item.lot_code
        if item.production_lot_id:
            lot = session.get(ProductionLot, item.production_lot_id)
            lot_code = lot.lot_code if lot else lot_code

        movement_payload = StockMovementCreate(
            sku_id=item.sku_id,
            deposit_id=deposit.id,
            movement_type_id=movement_type.id,
            quantity=abs(item.difference),
            is_outgoing=item.difference < 0,
            reference_type="INVENTORY_COUNT",
            reference_id=count.id,
            reference_item_id=item.id,
            reference=reference,
            lot_code=lot_code,
            production_lot_id=item.production_lot_id,
            movement_date=date.today(),
            created_by_user_id=current_user.id,
        )
        _, movement = _apply_stock_movement(session, movement_payload, allow_negative_balance=False)
        item.stock_movement_id = movement.id
        item.updated_at = datetime.utcnow()
        session.add(item)

    count.status = InventoryCountStatus.APPROVED
    count.approved_at = datetime.utcnow()
    count.approved_by_user_id = current_user.id
    count.updated_at = datetime.utcnow()
    count.updated_by_user_id = current_user.id
    session.add(count)
    _log_audit(session, "inventory_counts", count.id, AuditAction.APPROVE, current_user.id, {"status": count.status})
    session.commit()
    session.refresh(count)
    return _map_inventory_count(count, session)


@router.post(
    "/inventory-counts/{count_id}/close",
    tags=["inventory"],
    response_model=InventoryCountRead,
    dependencies=[Depends(require_roles("ADMIN", "WAREHOUSE"))],
)
def close_inventory_count(
    count_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> InventoryCountRead:
    count = session.get(InventoryCount, count_id)
    if not count:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conteo no encontrado")
    if count.status != InventoryCountStatus.APPROVED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Solo se pueden cerrar conteos aprobados")

    count.status = InventoryCountStatus.CLOSED
    count.closed_at = datetime.utcnow()
    count.updated_at = datetime.utcnow()
    count.updated_by_user_id = current_user.id
    session.add(count)
    _log_audit(session, "inventory_counts", count.id, AuditAction.STATUS, current_user.id, {"status": count.status})
    session.commit()
    session.refresh(count)
    return _map_inventory_count(count, session)


@router.post(
    "/inventory-counts/{count_id}/cancel",
    tags=["inventory"],
    response_model=InventoryCountRead,
    dependencies=[Depends(require_roles("ADMIN", "WAREHOUSE"))],
)
def cancel_inventory_count(
    count_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> InventoryCountRead:
    count = session.get(InventoryCount, count_id)
    if not count:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conteo no encontrado")
    if count.status not in {InventoryCountStatus.DRAFT, InventoryCountStatus.SUBMITTED}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No se puede cancelar el conteo")

    count.status = InventoryCountStatus.CANCELLED
    count.cancelled_at = datetime.utcnow()
    count.updated_at = datetime.utcnow()
    count.updated_by_user_id = current_user.id
    session.add(count)
    _log_audit(session, "inventory_counts", count.id, AuditAction.CANCEL, current_user.id, {"status": count.status})
    session.commit()
    session.refresh(count)
    return _map_inventory_count(count, session)


@router.get(
    "/audit/logs",
    tags=["audit"],
    response_model=list[AuditLogRead],
    dependencies=[Depends(require_roles("ADMIN", "AUDIT"))],
)
def list_audit_logs(
    entity_type: str | None = None,
    entity_id: int | None = None,
    user_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    limit: int = 200,
    session: Session = Depends(get_session),
) -> list[AuditLogRead]:
    statement = select(AuditLog)
    if entity_type:
        statement = statement.where(AuditLog.entity_type == entity_type)
    if entity_id is not None:
        statement = statement.where(AuditLog.entity_id == entity_id)
    if user_id:
        statement = statement.where(AuditLog.user_id == user_id)
    if date_from:
        statement = statement.where(AuditLog.created_at >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        statement = statement.where(AuditLog.created_at <= datetime.combine(date_to, datetime.max.time()))
    safe_limit = max(1, min(limit, 500))
    records = session.exec(statement.order_by(AuditLog.created_at.desc(), AuditLog.id.desc()).limit(safe_limit)).all()
    return [_map_audit_log(record, session) for record in records]


@router.get("/production/lots", tags=["production"], response_model=list[ProductionLotRead])
def list_production_lots(
    deposit_id: int | None = None,
    sku_id: int | None = None,
    production_line_id: int | None = None,
    lot_code: str | None = None,
    available_only: bool = False,
    include_blocked: bool = False,
    session: Session = Depends(get_session),
) -> list[ProductionLotRead]:
    statement = select(ProductionLot)
    if deposit_id:
        statement = statement.where(ProductionLot.deposit_id == deposit_id)
    if sku_id:
        statement = statement.where(ProductionLot.sku_id == sku_id)
    if production_line_id:
        statement = statement.where(ProductionLot.production_line_id == production_line_id)
    if lot_code:
        statement = statement.where(ProductionLot.lot_code == lot_code)
    if available_only:
        statement = statement.where(ProductionLot.remaining_quantity > 0)
    if not include_blocked:
        statement = statement.where(ProductionLot.is_blocked.is_(False))
    lots = session.exec(statement.order_by(ProductionLot.produced_at.desc(), ProductionLot.id.desc())).all()
    return [_map_production_lot(lot, session) for lot in lots]


@router.get("/production/lots/{lot_id}", tags=["production"], response_model=ProductionLotRead)
def get_production_lot(lot_id: int, session: Session = Depends(get_session)) -> ProductionLotRead:
    lot = session.get(ProductionLot, lot_id)
    if not lot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lote de producción no encontrado")
    return _map_production_lot(lot, session)


@router.post("/mermas", tags=["mermas"], status_code=status.HTTP_201_CREATED, response_model=MermaEventRead)
def create_merma_event(
    payload: MermaEventCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> MermaEventRead:
    merma_type = session.get(MermaType, payload.type_id)
    cause = session.get(MermaCause, payload.cause_id)
    sku = session.get(SKU, payload.sku_id)

    if not merma_type or merma_type.stage != payload.stage:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tipo de merma inválido para la etapa")
    if not cause or cause.stage != payload.stage:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Causa inválida para la etapa")
    if not sku:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SKU no encontrado")
    if not merma_type.is_active or not cause.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El tipo o la causa están inactivos")
    if payload.quantity <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La cantidad debe ser mayor a cero")

    production_line = None
    deposit = None
    remito = None
    order = None

    detected_at = payload.detected_at or datetime.utcnow()
    unit = payload.unit or sku.unit

    if payload.stage == MermaStage.PRODUCTION:
        if not payload.production_line_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La línea de producción es obligatoria")
        production_line = session.get(ProductionLine, payload.production_line_id)
        if not production_line or not production_line.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Línea de producción inválida")
        if not payload.deposit_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El depósito es obligatorio")
        deposit = session.get(Deposit, payload.deposit_id)
    elif payload.stage in {MermaStage.EMPAQUE, MermaStage.STOCK}:
        if not payload.deposit_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El depósito es obligatorio")
        deposit = session.get(Deposit, payload.deposit_id)
    elif payload.stage == MermaStage.TRANSITO_POST_REMITO:
        if not payload.remito_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El remito es obligatorio")
        remito = session.get(Remito, payload.remito_id)
        if not remito:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Remito no encontrado")
        order = session.get(Order, remito.order_id) if remito.order_id else None
        if not order or not order.destination_deposit_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El remito no tiene destino asociado")
        deposit = session.get(Deposit, order.destination_deposit_id)
        payload.order_id = order.id if order else payload.order_id
        payload.deposit_id = deposit.id if deposit else payload.deposit_id
    elif payload.stage == MermaStage.ADMINISTRATIVA:
        if not payload.notes or not payload.notes.strip():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Notas obligatorias en ajustes administrativos")
        if payload.affects_stock and not payload.deposit_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selecciona el depósito a ajustar")
        if payload.deposit_id:
            deposit = session.get(Deposit, payload.deposit_id)
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Etapa no soportada")

    if payload.deposit_id and not deposit and payload.stage != MermaStage.TRANSITO_POST_REMITO:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Depósito no encontrado")
    if payload.affects_stock and not deposit:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No se puede ajustar stock sin depósito")
    reported_by_user_id = payload.reported_by_user_id or current_user.id
    reported_by_role = payload.reported_by_role
    if not reported_by_role and current_user.role_id:
        role = session.get(Role, current_user.role_id)
        reported_by_role = role.name if role else None

    if reported_by_user_id:
        user = session.get(User, reported_by_user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario informante no encontrado")

    stock_movement_id = None
    if payload.affects_stock and deposit:
        merma_movement_type = _get_movement_type_by_code(session, "MERMA")
        movement_payload = StockMovementCreate(
            sku_id=payload.sku_id,
            deposit_id=deposit.id,
            movement_type_id=merma_movement_type.id,
            quantity=payload.quantity,
            unit=unit,
            reference=f"MERMA-{merma_type.code}",
            lot_code=payload.lot_code,
            movement_date=detected_at.date(),
            created_by_user_id=reported_by_user_id,
        )
        _, movement = _apply_stock_movement(session, movement_payload, allow_negative_balance=True)
        stock_movement_id = movement.id

    event = MermaEvent(
        stage=payload.stage,
        type_id=merma_type.id,
        type_code=merma_type.code,
        type_label=merma_type.label,
        cause_id=cause.id,
        cause_code=cause.code,
        cause_label=cause.label,
        sku_id=payload.sku_id,
        quantity=payload.quantity,
        unit=unit,
        lot_code=payload.lot_code,
        deposit_id=payload.deposit_id,
        remito_id=payload.remito_id,
        order_id=payload.order_id,
        production_line_id=payload.production_line_id,
        reported_by_user_id=reported_by_user_id,
        reported_by_role=reported_by_role,
        notes=payload.notes,
        detected_at=detected_at,
        affects_stock=payload.affects_stock,
        action=payload.action,
        stock_movement_id=stock_movement_id,
    )

    session.add(event)
    session.flush()
    _log_audit(session, "mermas", event.id, AuditAction.CREATE, reported_by_user_id, payload.model_dump())
    session.commit()
    session.refresh(event)
    return _map_merma_event(event, session)


@router.get("/mermas", tags=["mermas"], response_model=list[MermaEventRead])
def list_merma_events(
    date_from: date | None = None,
    date_to: date | None = None,
    stage: MermaStage | None = None,
    deposit_id: int | None = None,
    production_line_id: int | None = None,
    sku_id: int | None = None,
    type_id: int | None = None,
    cause_id: int | None = None,
    affects_stock: bool | None = None,
    session: Session = Depends(get_session),
) -> list[MermaEventRead]:
    statement = select(MermaEvent)
    if date_from:
        statement = statement.where(MermaEvent.detected_at >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        statement = statement.where(MermaEvent.detected_at <= datetime.combine(date_to, datetime.max.time()))
    if stage:
        statement = statement.where(MermaEvent.stage == stage)
    if deposit_id:
        statement = statement.where(MermaEvent.deposit_id == deposit_id)
    if production_line_id:
        statement = statement.where(MermaEvent.production_line_id == production_line_id)
    if sku_id:
        statement = statement.where(MermaEvent.sku_id == sku_id)
    if type_id:
        statement = statement.where(MermaEvent.type_id == type_id)
    if cause_id:
        statement = statement.where(MermaEvent.cause_id == cause_id)
    if affects_stock is not None:
        statement = statement.where(MermaEvent.affects_stock.is_(affects_stock))

    events = session.exec(statement.order_by(MermaEvent.detected_at.desc(), MermaEvent.id.desc())).all()
    return [_map_merma_event(event, session) for event in events]


@router.get("/mermas/{merma_id}", tags=["mermas"], response_model=MermaEventRead)
def get_merma_event(merma_id: int, session: Session = Depends(get_session)) -> MermaEventRead:
    event = session.get(MermaEvent, merma_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Merma no encontrada")
    return _map_merma_event(event, session)


@router.get("/reports/stock-summary", tags=["reports"], response_model=StockReportRead)
def stock_summary(session: Session = Depends(get_session)) -> StockReportRead:
    stock_levels = session.exec(select(StockLevel)).all()
    totals_by_tag: dict[str, float] = {}
    totals_by_deposit: dict[str, float] = {}

    for level in stock_levels:
        session.refresh(level, attribute_names=["sku", "deposit"])
        session.refresh(level.sku, attribute_names=["sku_type"])
        type_code = level.sku.sku_type.code if level.sku and level.sku.sku_type else "SIN_TIPO"
        totals_by_tag[type_code] = totals_by_tag.get(type_code, 0) + level.quantity
        totals_by_deposit[level.deposit.name] = totals_by_deposit.get(level.deposit.name, 0) + level.quantity

    movements_cutoff = date.today() - timedelta(days=7)
    movements = session.exec(select(StockMovement).where(StockMovement.movement_date >= movements_cutoff)).all()
    movement_totals: dict[str, dict[str, float | str]] = {}
    for mov in movements:
        session.refresh(mov, attribute_names=["movement_type"])
        code = mov.movement_type.code if mov.movement_type else "UNKNOWN"
        label = mov.movement_type.label if mov.movement_type else code
        if code not in movement_totals:
            movement_totals[code] = {"quantity": 0.0, "label": label}
        movement_totals[code]["quantity"] = float(movement_totals[code]["quantity"]) + mov.quantity

    return StockReportRead(
        totals_by_tag=[StockSummaryRow(group="tag", label=tag, quantity=qty) for tag, qty in totals_by_tag.items()],
        totals_by_deposit=[
          StockSummaryRow(group="deposit", label=deposit, quantity=qty) for deposit, qty in totals_by_deposit.items()
        ],
        movement_totals=[
            MovementSummary(movement_type_code=code, movement_type_label=data["label"], quantity=data["quantity"])
            for code, data in movement_totals.items()
        ],
    )


@router.get("/reports/stock-alerts", tags=["reports"], response_model=StockAlertReport)
def stock_alerts_report(
    sku_type_ids: list[int] | None = Query(None),
    deposit_ids: list[int] | None = Query(None),
    alert_status: list[str] | None = Query(None),
    search: str | None = None,
    min_quantity: float | None = None,
    max_quantity: float | None = None,
    only_configured: bool = False,
    include_inactive: bool = False,
    session: Session = Depends(get_session),
) -> StockAlertReport:
    statement = select(StockLevel).join(SKU).join(SKUType).join(Deposit)
    if sku_type_ids:
        statement = statement.where(SKU.sku_type_id.in_(sku_type_ids))
    if deposit_ids:
        statement = statement.where(StockLevel.deposit_id.in_(deposit_ids))
    if not include_inactive:
        statement = statement.where(SKU.is_active.is_(True), SKUType.is_active.is_(True))
    if search:
        like = f"%{search.lower()}%"
        statement = statement.where((SKU.name.ilike(like)) | (SKU.code.ilike(like)))
    if min_quantity is not None:
        statement = statement.where(StockLevel.quantity >= min_quantity)
    if max_quantity is not None:
        statement = statement.where(StockLevel.quantity <= max_quantity)

    levels = session.exec(statement.order_by(StockLevel.quantity.asc(), StockLevel.id.asc())).all()
    items: list[StockAlertRead] = []
    for level in levels:
        session.refresh(level, attribute_names=["sku", "deposit"])
        session.refresh(level.sku, attribute_names=["sku_type"])
        status = _get_stock_alert_status(level.quantity, level.sku)
        if only_configured and not _has_alert_thresholds(level.sku):
            continue
        if alert_status and status not in alert_status:
            continue
        items.append(
            StockAlertRead(
                deposit_id=level.deposit_id,
                deposit_name=level.deposit.name,
                sku_id=level.sku_id,
                sku_code=level.sku.code,
                sku_name=level.sku.name,
                sku_type_id=level.sku.sku_type_id,
                sku_type_code=level.sku.sku_type.code if level.sku.sku_type else "",
                sku_type_label=level.sku.sku_type.label if level.sku.sku_type else "",
                unit=level.sku.unit,
                quantity=level.quantity,
                alert_status=status,
                alert_green_min=level.sku.alert_green_min,
                alert_yellow_min=level.sku.alert_yellow_min,
                alert_red_max=level.sku.alert_red_max,
            )
        )

    return StockAlertReport(total=len(items), items=items)


api_router.include_router(public_router)
api_router.include_router(router)
