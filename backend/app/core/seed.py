from sqlmodel import Session, select

from ..models import Deposit, Recipe, RecipeItem, Role, SKU
from ..models.common import SKUTag

DEFAULT_ROLES = [
    {"name": "admin", "description": "Administrador"},
    {"name": "deposito", "description": "Operador de depósito"},
    {"name": "produccion", "description": "Operador de producción"},
]

DEFAULT_DEPOSITS = [
    {"name": "Depósito Principal", "location": "Fábrica", "controls_lot": True},
    {"name": "Depósito MP", "location": "Fábrica", "controls_lot": True},
]

DEFAULT_SKUS = [
    {"code": "CUC-PT-24", "name": "Cucuruchos x24", "tag": SKUTag.PT, "unit": "caja"},
    {"code": "CUC-GRANEL", "name": "Cucurucho granel", "tag": SKUTag.SEMI, "unit": "unidad"},
    {"code": "MP-HARINA", "name": "Harina 0000", "tag": SKUTag.MP, "unit": "kg"},
]

DEFAULT_RECIPES = [
    {
        "product_code": "CUC-PT-24",
        "name": "Receta cucuruchos x24",
        "items": [
            {"component_code": "CUC-GRANEL", "quantity": 24},
            {"component_code": "MP-HARINA", "quantity": 0.5},
        ],
    }
]


def _get_existing_map(session: Session, model, field: str):
    records = session.exec(select(model)).all()
    return {getattr(item, field): item for item in records}


def seed_initial_data(session: Session) -> None:
    """Carga datos mínimos sin duplicar registros."""

    existing_roles = _get_existing_map(session, Role, "name")
    for payload in DEFAULT_ROLES:
        if payload["name"] not in existing_roles:
            session.add(Role(**payload))

    existing_deposits = _get_existing_map(session, Deposit, "name")
    for payload in DEFAULT_DEPOSITS:
        if payload["name"] not in existing_deposits:
            session.add(Deposit(**payload))

    existing_skus = _get_existing_map(session, SKU, "code")
    for payload in DEFAULT_SKUS:
        if payload["code"] not in existing_skus:
            session.add(SKU(**payload))

    session.commit()

    # Recipes reference SKUs, so we seed them after committing SKUs
    sku_map = _get_existing_map(session, SKU, "code")
    for recipe in DEFAULT_RECIPES:
        product = sku_map.get(recipe["product_code"])
        if not product:
            continue
        existing_recipe = session.exec(select(Recipe).where(Recipe.product_id == product.id)).first()
        if existing_recipe:
            continue

        new_recipe = Recipe(product_id=product.id, name=recipe["name"])
        session.add(new_recipe)
        session.flush()

        for item in recipe["items"]:
            component = sku_map.get(item["component_code"])
            if not component:
                continue
            session.add(
                RecipeItem(
                    recipe_id=new_recipe.id,
                    component_id=component.id,
                    quantity=item["quantity"],
                )
            )

    session.commit()


if __name__ == "__main__":  # Manual seeding helper
    from ..db import engine

    with Session(engine) as session:
        seed_initial_data(session)

