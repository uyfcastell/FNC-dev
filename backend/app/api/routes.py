import hashlib
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..db import get_session
from ..models import (
    Deposit,
    Recipe,
    RecipeItem,
    Role,
    Order,
    OrderItem,
    SKU,
    StockLevel,
    StockMovement,
    User,
)
from ..models.common import MovementType, OrderStatus, SKUTag, UnitOfMeasure
from ..schemas import (
    DepositCreate,
    DepositRead,
    DepositUpdate,
    RecipeCreate,
    RecipeRead,
    RecipeUpdate,
    SKUCreate,
    SKURead,
    SKUUpdate,
    StockLevelRead,
    StockMovementCreate,
    StockReportRead,
    StockSummaryRow,
    MovementSummary,
    UnitRead,
    UserCreate,
    UserRead,
    UserUpdate,
    OrderCreate,
    OrderRead,
    OrderUpdate,
    OrderStatusUpdate,
)

router = APIRouter()


def _hash_password(raw_password: str) -> str:
    return hashlib.sha256(raw_password.encode()).hexdigest()


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

    return OrderRead(
        id=order.id,
        destination=order.destination,
        requested_for=order.requested_for,
        status=order.status,
        notes=order.notes,
        created_at=order.created_at,
        items=items,
    )


@router.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok", "version": "0.1.0"}


@router.get("/roles", tags=["admin"])
def list_roles(session: Session = Depends(get_session)) -> list[Role]:
    return session.exec(select(Role)).all()


@router.get("/users", tags=["admin"], response_model=list[UserRead])
def list_users(session: Session = Depends(get_session)) -> list[UserRead]:
    users = session.exec(select(User)).all()
    return [_map_user(user, session) for user in users]


@router.post("/users", tags=["admin"], status_code=status.HTTP_201_CREATED, response_model=UserRead)
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
        hashed_password=_hash_password(payload.password),
        role_id=payload.role_id,
        is_active=payload.is_active,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return _map_user(user, session)


@router.put("/users/{user_id}", tags=["admin"], response_model=UserRead)
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

    update_data = payload.model_dump(exclude_unset=True)
    password = update_data.pop("password", None)
    for field, value in update_data.items():
        setattr(user, field, value)
    if password:
        user.hashed_password = _hash_password(password)
    user.updated_at = datetime.utcnow()
    session.add(user)
    session.commit()
    session.refresh(user)
    return _map_user(user, session)


@router.delete("/users/{user_id}", tags=["admin"], status_code=status.HTTP_204_NO_CONTENT)
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


@router.get("/skus", tags=["sku"], response_model=list[SKURead])
def list_skus(session: Session = Depends(get_session)) -> list[SKU]:
    """Listado simple para bootstrap de catálogo."""
    return session.exec(select(SKU).order_by(SKU.name, SKU.code)).all()


@router.get("/skus/{sku_id}", tags=["sku"], response_model=SKURead)
def get_sku(sku_id: int, session: Session = Depends(get_session)) -> SKU:
    sku = session.get(SKU, sku_id)
    if not sku:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SKU no encontrado")
    return sku


@router.post("/skus", tags=["sku"], status_code=status.HTTP_201_CREATED, response_model=SKURead)
def create_sku(payload: SKUCreate, session: Session = Depends(get_session)) -> SKU:
    existing = session.exec(select(SKU).where(SKU.code == payload.code)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El código ya existe",
        )

    sku = SKU(**payload.model_dump())
    session.add(sku)
    session.commit()
    session.refresh(sku)
    return sku


@router.put("/skus/{sku_id}", tags=["sku"], response_model=SKURead)
def update_sku(sku_id: int, payload: SKUUpdate, session: Session = Depends(get_session)) -> SKU:
    sku = session.get(SKU, sku_id)
    if not sku:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SKU no encontrado")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(sku, field, value)
    session.add(sku)
    session.commit()
    session.refresh(sku)
    return sku


@router.delete("/skus/{sku_id}", tags=["sku"], status_code=status.HTTP_204_NO_CONTENT)
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


def _map_recipe(recipe: Recipe, session: Session) -> RecipeRead:
    session.refresh(recipe, attribute_names=["items"])
    items = []
    for item in recipe.items:
        component = session.get(SKU, item.component_id)
        component_code = component.code if component else ""
        component_name = component.name if component else f"SKU {item.component_id}"
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

    if product.tag not in {SKUTag.PT, SKUTag.SEMI}:
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
    if product.tag not in {SKUTag.PT, SKUTag.SEMI}:
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


@router.get("/orders", tags=["orders"], response_model=list[OrderRead])
def list_orders(status_filter: OrderStatus | None = None, session: Session = Depends(get_session)) -> list[OrderRead]:
    statement = select(Order)
    if status_filter:
        statement = statement.where(Order.status == status_filter)
    orders = session.exec(statement.order_by(Order.created_at.desc())).all()
    return [_map_order(order, session) for order in orders]


@router.get("/orders/{order_id}", tags=["orders"], response_model=OrderRead)
def get_order(order_id: int, session: Session = Depends(get_session)) -> OrderRead:
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pedido no encontrado")
    return _map_order(order, session)


@router.post("/orders", tags=["orders"], status_code=status.HTTP_201_CREATED, response_model=OrderRead)
def create_order(payload: OrderCreate, session: Session = Depends(get_session)) -> OrderRead:
    if not payload.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El pedido debe tener al menos un ítem")

    sku_ids = {item.sku_id for item in payload.items}
    existing_skus = session.exec(select(SKU.id).where(SKU.id.in_(sku_ids))).all()
    if len(existing_skus) != len(sku_ids):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Algún SKU no existe")

    order = Order(
        destination=payload.destination,
        requested_for=payload.requested_for,
        status=payload.status or OrderStatus.SUBMITTED,
        notes=payload.notes,
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

    session.commit()
    session.refresh(order)
    return _map_order(order, session)


@router.put("/orders/{order_id}", tags=["orders"], response_model=OrderRead)
def update_order(order_id: int, payload: OrderUpdate, session: Session = Depends(get_session)) -> OrderRead:
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pedido no encontrado")

    if payload.items is not None and not payload.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El pedido debe tener al menos un ítem")

    if payload.items is not None:
        sku_ids = {item.sku_id for item in payload.items}
        existing_skus = session.exec(select(SKU.id).where(SKU.id.in_(sku_ids))).all()
        if len(existing_skus) != len(sku_ids):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Algún SKU no existe")

    update_data = payload.model_dump(exclude_unset=True)
    items = update_data.pop("items", None)
    for field, value in update_data.items():
        setattr(order, field, value)
    order.updated_at = datetime.utcnow()
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
                    sku_id=item.sku_id,
                    quantity=item.quantity,
                    current_stock=item.current_stock,
                )
            )

    session.commit()
    session.refresh(order)
    return _map_order(order, session)


@router.post("/orders/{order_id}/status", tags=["orders"], response_model=OrderRead)
def update_order_status(order_id: int, payload: OrderStatusUpdate, session: Session = Depends(get_session)) -> OrderRead:
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pedido no encontrado")
    order.status = payload.status
    order.updated_at = datetime.utcnow()
    session.add(order)
    session.commit()
    session.refresh(order)
    return _map_order(order, session)


@router.delete("/orders/{order_id}", tags=["orders"], status_code=status.HTTP_204_NO_CONTENT)
def delete_order(order_id: int, session: Session = Depends(get_session)) -> None:
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pedido no encontrado")
    items = session.exec(select(OrderItem).where(OrderItem.order_id == order.id)).all()
    for item in items:
        session.delete(item)
    session.delete(order)
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


@router.get("/stock-levels", tags=["stock"], response_model=list[StockLevelRead])
def list_stock_levels(session: Session = Depends(get_session)) -> list[StockLevelRead]:
    stock_levels = session.exec(select(StockLevel)).all()
    result: list[StockLevelRead] = []
    for level in stock_levels:
        session.refresh(level, attribute_names=["sku", "deposit"])
        result.append(
            StockLevelRead(
                deposit_id=level.deposit_id,
                deposit_name=level.deposit.name,
                sku_id=level.sku_id,
                sku_code=level.sku.code,
                sku_name=level.sku.name,
                quantity=level.quantity,
            )
        )
    return result


@router.post(
    "/stock/movements",
    tags=["stock"],
    status_code=status.HTTP_201_CREATED,
    response_model=StockLevelRead,
)
def register_stock_movement(payload: StockMovementCreate, session: Session = Depends(get_session)) -> StockLevelRead:
    if payload.quantity <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La cantidad debe ser mayor a cero")

    sku = session.get(SKU, payload.sku_id)
    deposit = session.get(Deposit, payload.deposit_id)
    if not sku or not deposit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SKU o depósito no encontrado")

    delta = payload.quantity
    if payload.movement_type in {MovementType.CONSUMPTION, MovementType.MERMA, MovementType.REMITO}:
        delta = -payload.quantity

    stock_level = _ensure_stock_level(session, payload.deposit_id, payload.sku_id)
    new_quantity = stock_level.quantity + delta
    if new_quantity < 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Saldo insuficiente")

    stock_level.quantity = new_quantity
    movement = StockMovement(
        sku_id=payload.sku_id,
        deposit_id=payload.deposit_id,
        movement_type=payload.movement_type,
        quantity=delta,
        reference=payload.reference,
        lot_code=payload.lot_code,
        movement_date=payload.movement_date or date.today(),
    )
    session.add(stock_level)
    session.add(movement)
    session.commit()
    session.refresh(stock_level, attribute_names=["sku", "deposit"])

    return StockLevelRead(
        deposit_id=stock_level.deposit_id,
        deposit_name=stock_level.deposit.name,
        sku_id=stock_level.sku_id,
        sku_code=stock_level.sku.code,
        sku_name=stock_level.sku.name,
        quantity=stock_level.quantity,
    )


@router.get("/reports/stock-summary", tags=["reports"], response_model=StockReportRead)
def stock_summary(session: Session = Depends(get_session)) -> StockReportRead:
    stock_levels = session.exec(select(StockLevel)).all()
    totals_by_tag: dict[str, float] = {}
    totals_by_deposit: dict[str, float] = {}

    for level in stock_levels:
        session.refresh(level, attribute_names=["sku", "deposit"])
        totals_by_tag[level.sku.tag] = totals_by_tag.get(level.sku.tag, 0) + level.quantity
        totals_by_deposit[level.deposit.name] = totals_by_deposit.get(level.deposit.name, 0) + level.quantity

    movements_cutoff = date.today() - timedelta(days=7)
    movements = session.exec(select(StockMovement).where(StockMovement.movement_date >= movements_cutoff)).all()
    movement_totals: dict[MovementType, float] = {}
    for mov in movements:
        movement_totals[mov.movement_type] = movement_totals.get(mov.movement_type, 0) + mov.quantity

    return StockReportRead(
        totals_by_tag=[StockSummaryRow(group="tag", label=tag, quantity=qty) for tag, qty in totals_by_tag.items()],
        totals_by_deposit=[
          StockSummaryRow(group="deposit", label=deposit, quantity=qty) for deposit, qty in totals_by_deposit.items()
        ],
        movement_totals=[MovementSummary(movement_type=m_type, quantity=qty) for m_type, qty in movement_totals.items()],
    )
