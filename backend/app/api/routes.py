from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..db import get_session
from ..models import (
    Deposit,
    Recipe,
    RecipeItem,
    Role,
    SKU,
    StockLevel,
    StockMovement,
)
from ..models.common import MovementType
from ..schemas import (
    DepositCreate,
    DepositRead,
    DepositUpdate,
    RecipeCreate,
    RecipeRead,
    SKUCreate,
    SKURead,
    SKUUpdate,
    StockLevelRead,
    StockMovementCreate,
)

router = APIRouter()


@router.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok", "version": "0.1.0"}


@router.get("/roles", tags=["admin"])
def list_roles(session: Session = Depends(get_session)) -> list[Role]:
    return session.exec(select(Role)).all()


@router.get("/skus", tags=["sku"], response_model=list[SKURead])
def list_skus(session: Session = Depends(get_session)) -> list[SKU]:
    """Listado simple para bootstrap de catálogo."""

    return session.exec(select(SKU).order_by(SKU.code)).all()


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


def _map_recipe(recipe: Recipe) -> RecipeRead:
    return RecipeRead(
        id=recipe.id,
        product_id=recipe.product_id,
        name=recipe.name,
        items=[
            {
                "component_id": item.component_id,
                "quantity": item.quantity,
            }
            for item in recipe.items
        ],
    )


@router.get("/recipes", tags=["recipes"], response_model=list[RecipeRead])
def list_recipes(session: Session = Depends(get_session)) -> list[RecipeRead]:
    recipes = session.exec(select(Recipe)).all()
    return [_map_recipe(recipe) for recipe in recipes]


@router.post("/recipes", tags=["recipes"], status_code=status.HTTP_201_CREATED, response_model=RecipeRead)
def create_recipe(payload: RecipeCreate, session: Session = Depends(get_session)) -> RecipeRead:
    product = session.get(SKU, payload.product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")

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
    return _map_recipe(recipe)


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

