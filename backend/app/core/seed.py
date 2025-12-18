from sqlmodel import Session, select

from ..models import Deposit, MermaCause, MermaStage, MermaType, ProductionLine, Recipe, RecipeItem, Role, SKU
from ..models.common import SKUTag, UnitOfMeasure

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
    {"code": "CUC-PT-24", "name": "Cucuruchos x24", "tag": SKUTag.PT, "unit": UnitOfMeasure.BOX},
    {"code": "CUC-GRANEL", "name": "Cucurucho granel", "tag": SKUTag.SEMI, "unit": UnitOfMeasure.UNIT},
    {"code": "MP-HARINA", "name": "Harina 0000", "tag": SKUTag.MP, "unit": UnitOfMeasure.KG},
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

DEFAULT_PRODUCTION_LINES = [
    {"name": "Línea 1"},
    {"name": "Línea 2"},
    {"name": "Línea 3"},
]

DEFAULT_MERMA_TYPES = [
    {"stage": MermaStage.PRODUCTION, "code": "roturas", "label": "Roturas en producción"},
    {"stage": MermaStage.PRODUCTION, "code": "defectos", "label": "Defectos de forma/calidad"},
    {"stage": MermaStage.PRODUCTION, "code": "masa_descartada", "label": "Masa descartada"},
    {"stage": MermaStage.EMPAQUE, "code": "roturas_manipulacion", "label": "Roturas en manipulación"},
    {"stage": MermaStage.EMPAQUE, "code": "faltante_conteo", "label": "Faltante al contar/armar"},
    {"stage": MermaStage.STOCK, "code": "deterioro", "label": "Deterioro en depósito"},
    {"stage": MermaStage.STOCK, "code": "roturas", "label": "Roturas en depósito"},
    {"stage": MermaStage.STOCK, "code": "vencimiento", "label": "Producto vencido"},
    {"stage": MermaStage.STOCK, "code": "ajuste_conteo", "label": "Ajuste por diferencia de conteo"},
    {"stage": MermaStage.TRANSITO_POST_REMITO, "code": "rotura_entrega", "label": "Rotura en entrega"},
    {"stage": MermaStage.TRANSITO_POST_REMITO, "code": "faltante_entrega", "label": "Faltante al entregar"},
    {"stage": MermaStage.ADMINISTRATIVA, "code": "ajuste_carga", "label": "Ajuste por error de carga"},
    {"stage": MermaStage.ADMINISTRATIVA, "code": "ajuste_remito", "label": "Ajuste por remito"},
    {"stage": MermaStage.ADMINISTRATIVA, "code": "ajuste_inventario", "label": "Ajuste por inventario"},
    {"stage": MermaStage.ADMINISTRATIVA, "code": "correccion_contable", "label": "Corrección contable"},
]

DEFAULT_MERMA_CAUSES = [
    {"stage": MermaStage.PRODUCTION, "code": "temperatura_incorrecta", "label": "Temperatura incorrecta de máquina"},
    {"stage": MermaStage.PRODUCTION, "code": "maquina_desajustada", "label": "Máquina desajustada / mantenimiento"},
    {"stage": MermaStage.PRODUCTION, "code": "masa_defectuosa", "label": "Masa defectuosa"},
    {"stage": MermaStage.PRODUCTION, "code": "error_manipulacion", "label": "Error de manipulación"},
    {"stage": MermaStage.PRODUCTION, "code": "golpe_extraccion", "label": "Golpe en extracción"},
    {"stage": MermaStage.EMPAQUE, "code": "rotura_manipulacion", "label": "Rotura por manipulación"},
    {"stage": MermaStage.EMPAQUE, "code": "error_pack", "label": "Error al armar packs"},
    {"stage": MermaStage.EMPAQUE, "code": "caja_danada", "label": "Caja dañada"},
    {"stage": MermaStage.EMPAQUE, "code": "defecto_prev_no_detectado", "label": "Defecto previo no detectado"},
    {"stage": MermaStage.EMPAQUE, "code": "error_conteo", "label": "Error al contar unidades"},
    {"stage": MermaStage.STOCK, "code": "humedad", "label": "Humedad / ambiente"},
    {"stage": MermaStage.STOCK, "code": "vencido", "label": "Producto vencido"},
    {"stage": MermaStage.STOCK, "code": "apilado", "label": "Cajón mal apilado"},
    {"stage": MermaStage.STOCK, "code": "golpe_interno", "label": "Golpe en traslado interno"},
    {"stage": MermaStage.STOCK, "code": "diferencia_conteo", "label": "Diferencia por conteo físico"},
    {"stage": MermaStage.STOCK, "code": "remito_faltante", "label": "Remito no cargado en sistema"},
    {"stage": MermaStage.TRANSITO_POST_REMITO, "code": "golpe_transito", "label": "Golpe durante el traslado"},
    {"stage": MermaStage.TRANSITO_POST_REMITO, "code": "apilado_transito", "label": "Aplastamiento por mal apilado"},
    {"stage": MermaStage.TRANSITO_POST_REMITO, "code": "caja_rota_destino", "label": "Caja rota al descargar"},
    {"stage": MermaStage.TRANSITO_POST_REMITO, "code": "error_carga_camioneta", "label": "Error al cargar la camioneta"},
    {"stage": MermaStage.TRANSITO_POST_REMITO, "code": "manipulacion_local", "label": "Manipulación en local al recibir"},
    {"stage": MermaStage.ADMINISTRATIVA, "code": "produccion_mal_cargada", "label": "Producción mal cargada"},
    {"stage": MermaStage.ADMINISTRATIVA, "code": "empaque_mal_registrado", "label": "Empaque mal registrado"},
    {"stage": MermaStage.ADMINISTRATIVA, "code": "remito_duplicado", "label": "Remito duplicado"},
    {"stage": MermaStage.ADMINISTRATIVA, "code": "remito_corregido", "label": "Remito corregido"},
    {"stage": MermaStage.ADMINISTRATIVA, "code": "carga_deposito_equivocada", "label": "Carga en depósito equivocado"},
    {"stage": MermaStage.ADMINISTRATIVA, "code": "ajuste_inventario", "label": "Ajuste inventario semanal/mensual"},
    {"stage": MermaStage.ADMINISTRATIVA, "code": "error_pedido_local", "label": "Error de pedido local"},
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

    existing_lines = _get_existing_map(session, ProductionLine, "name")
    for payload in DEFAULT_PRODUCTION_LINES:
        if payload["name"] not in existing_lines:
            session.add(ProductionLine(**payload))

    existing_types = {(item.stage, item.code): item for item in session.exec(select(MermaType)).all()}
    for payload in DEFAULT_MERMA_TYPES:
        key = (payload["stage"], payload["code"])
        if key not in existing_types:
            session.add(MermaType(**payload))

    existing_causes = {(item.stage, item.code): item for item in session.exec(select(MermaCause)).all()}
    for payload in DEFAULT_MERMA_CAUSES:
        key = (payload["stage"], payload["code"])
        if key not in existing_causes:
            session.add(MermaCause(**payload))

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
