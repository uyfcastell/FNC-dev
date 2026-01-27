from sqlmodel import Session, select

from ..models import (
    Deposit,
    MermaCause,
    MermaStage,
    MermaType,
    ProductionLine,
    Recipe,
    RecipeItem,
    Permission,
    Role,
    RolePermission,
    SKU,
    SKUType,
    StockMovementType,
)
from ..models.common import UnitOfMeasure

DEFAULT_ROLES = [
    {"name": "Administración", "description": "Control total del sistema"},
    {"name": "Encargado de Planta", "description": "Supervisión operativa de planta"},
    {"name": "Encargado de Depósito", "description": "Gestión de stock y depósitos"},
    {"name": "Operario de Producción", "description": "Operación de producción"},
    {"name": "Operario de Empaque", "description": "Operación de empaque"},
    {"name": "Encargado de Reparto", "description": "Gestión de remitos y entregas"},
    {"name": "Encargado de Locales", "description": "Pedidos y remitos de locales"},
    {"name": "Auditoría", "description": "Acceso de lectura y auditoría"},
]

DEFAULT_PERMISSIONS = [
    {"key": "dashboard.view", "label": "Ver tablero", "category": "Dashboard", "action": "Ver"},
    {"key": "users.view", "label": "Ver usuarios", "category": "Usuarios", "action": "Ver/listar"},
    {"key": "users.create", "label": "Crear usuarios", "category": "Usuarios", "action": "Crear"},
    {"key": "users.edit", "label": "Editar usuarios", "category": "Usuarios", "action": "Editar"},
    {"key": "users.deactivate", "label": "Desactivar usuarios", "category": "Usuarios", "action": "Desactivar"},
    {"key": "roles.view", "label": "Ver roles", "category": "Roles", "action": "Ver/listar"},
    {"key": "roles.create_edit", "label": "Crear/Editar roles", "category": "Roles", "action": "Crear/Editar"},
    {"key": "roles.delete", "label": "Eliminar roles", "category": "Roles", "action": "Eliminar"},
    {"key": "deposits.view", "label": "Ver depósitos", "category": "Depósitos", "action": "Ver/listar"},
    {"key": "deposits.create", "label": "Crear depósitos", "category": "Depósitos", "action": "Crear"},
    {"key": "deposits.edit", "label": "Editar depósitos", "category": "Depósitos", "action": "Editar"},
    {"key": "deposits.deactivate", "label": "Desactivar depósitos", "category": "Depósitos", "action": "Desactivar"},
    {"key": "skus.view", "label": "Ver SKUs", "category": "SKUs / Productos", "action": "Ver/listar"},
    {"key": "skus.create", "label": "Crear SKUs", "category": "SKUs / Productos", "action": "Crear"},
    {"key": "skus.edit", "label": "Editar SKUs", "category": "SKUs / Productos", "action": "Editar"},
    {"key": "skus.deactivate", "label": "Desactivar SKUs", "category": "SKUs / Productos", "action": "Desactivar"},
    {"key": "sku_types.view", "label": "Ver tipos de SKU", "category": "Tipos de SKU", "action": "Ver/listar"},
    {"key": "sku_types.create_edit", "label": "Crear/Editar tipos de SKU", "category": "Tipos de SKU", "action": "Crear/Editar"},
    {"key": "sku_types.delete", "label": "Eliminar tipos de SKU", "category": "Tipos de SKU", "action": "Eliminar"},
    {"key": "units.view", "label": "Ver unidades de medida", "category": "Unidades de medida", "action": "Ver/listar"},
    {"key": "units.create_edit", "label": "Crear/Editar unidades", "category": "Unidades de medida", "action": "Crear/Editar"},
    {"key": "units.delete", "label": "Eliminar unidades", "category": "Unidades de medida", "action": "Eliminar"},
    {"key": "movement_types.view", "label": "Ver tipos de movimiento", "category": "Tipos de movimiento", "action": "Ver/listar"},
    {"key": "movement_types.create_edit", "label": "Crear/Editar tipos de movimiento", "category": "Tipos de movimiento", "action": "Crear/Editar"},
    {"key": "movement_types.delete", "label": "Eliminar tipos de movimiento", "category": "Tipos de movimiento", "action": "Eliminar"},
    {"key": "production_lines.view", "label": "Ver líneas de producción", "category": "Líneas de producción", "action": "Ver/listar"},
    {"key": "production_lines.create_edit", "label": "Crear/Editar líneas de producción", "category": "Líneas de producción", "action": "Crear/Editar"},
    {"key": "production_lines.delete", "label": "Eliminar líneas de producción", "category": "Líneas de producción", "action": "Eliminar"},
    {"key": "recipes.view", "label": "Ver recetas", "category": "Recetas", "action": "Ver/listar"},
    {"key": "recipes.create", "label": "Crear recetas", "category": "Recetas", "action": "Crear"},
    {"key": "recipes.edit", "label": "Editar recetas", "category": "Recetas", "action": "Editar"},
    {"key": "recipes.deactivate", "label": "Desactivar recetas", "category": "Recetas", "action": "Desactivar"},
    {"key": "suppliers.view", "label": "Ver proveedores", "category": "Proveedores", "action": "Ver/listar"},
    {"key": "suppliers.create", "label": "Crear proveedores", "category": "Proveedores", "action": "Crear"},
    {"key": "suppliers.edit", "label": "Editar proveedores", "category": "Proveedores", "action": "Editar"},
    {"key": "suppliers.deactivate", "label": "Desactivar proveedores", "category": "Proveedores", "action": "Desactivar"},
    {"key": "purchases.view", "label": "Ver compras", "category": "Compras", "action": "Ver/listar"},
    {"key": "purchases.create", "label": "Crear compras", "category": "Compras", "action": "Crear"},
    {"key": "purchases.edit", "label": "Editar compras", "category": "Compras", "action": "Editar"},
    {"key": "purchases.cancel", "label": "Anular compras", "category": "Compras", "action": "Anular"},
    {"key": "stock.view", "label": "Ver stock/movimientos", "category": "Stock / Movimientos", "action": "Ver/listar"},
    {"key": "stock.register", "label": "Registrar movimientos", "category": "Stock / Movimientos", "action": "Registrar ingreso/egreso"},
    {"key": "stock.adjust", "label": "Ajustar stock", "category": "Stock / Movimientos", "action": "Ajuste"},
    {"key": "stock.transfer", "label": "Transferir stock", "category": "Stock / Movimientos", "action": "Transferencia"},
    {"key": "production.view", "label": "Ver producción", "category": "Producción", "action": "Ver/listar"},
    {"key": "production.create_lot", "label": "Crear lote", "category": "Producción", "action": "Crear lote"},
    {"key": "production.close_lot", "label": "Cerrar lote", "category": "Producción", "action": "Cerrar lote"},
    {"key": "inventory.view", "label": "Ver inventarios", "category": "Inventarios", "action": "Ver/listar"},
    {"key": "inventory.create", "label": "Crear conteo", "category": "Inventarios", "action": "Crear conteo"},
    {"key": "inventory.edit", "label": "Editar conteo", "category": "Inventarios", "action": "Editar conteo"},
    {"key": "inventory.close", "label": "Cerrar conteo", "category": "Inventarios", "action": "Cerrar conteo"},
    {"key": "remitos.view", "label": "Ver remitos", "category": "Remitos", "action": "Ver/listar"},
    {"key": "remitos.create", "label": "Crear remitos", "category": "Remitos", "action": "Crear"},
    {"key": "remitos.edit", "label": "Editar remitos", "category": "Remitos", "action": "Editar"},
    {"key": "remitos.cancel", "label": "Anular remitos", "category": "Remitos", "action": "Anular"},
    {"key": "orders.view", "label": "Ver pedidos", "category": "Ventas / Pedidos", "action": "Ver/listar"},
    {"key": "orders.create", "label": "Crear pedidos", "category": "Ventas / Pedidos", "action": "Crear"},
    {"key": "orders.edit", "label": "Editar pedidos", "category": "Ventas / Pedidos", "action": "Editar"},
    {"key": "orders.cancel", "label": "Anular pedidos", "category": "Ventas / Pedidos", "action": "Anular"},
    {"key": "mermas.view", "label": "Ver mermas", "category": "Mermas", "action": "Ver/listar"},
    {"key": "mermas.report", "label": "Reportar merma", "category": "Mermas", "action": "Reportar"},
    {"key": "mermas.close", "label": "Cerrar merma", "category": "Mermas", "action": "Cerrar"},
    {"key": "audit.view", "label": "Ver auditoría", "category": "Auditoría", "action": "Ver logs"},
    {"key": "reports.view", "label": "Ver reportes", "category": "Reportes", "action": "Ver/listar"},
    {"key": "reports.export", "label": "Exportar reportes", "category": "Reportes", "action": "Exportar"},
]

DEFAULT_ROLE_PERMISSIONS = {
    "Administración": [permission["key"] for permission in DEFAULT_PERMISSIONS],
    "Encargado de Planta": [
        "dashboard.view",
        "deposits.view",
        "deposits.create",
        "deposits.edit",
        "deposits.deactivate",
        "skus.view",
        "skus.create",
        "skus.edit",
        "skus.deactivate",
        "sku_types.view",
        "sku_types.create_edit",
        "sku_types.delete",
        "units.view",
        "units.create_edit",
        "units.delete",
        "movement_types.view",
        "movement_types.create_edit",
        "movement_types.delete",
        "production_lines.view",
        "production_lines.create_edit",
        "production_lines.delete",
        "recipes.view",
        "recipes.create",
        "recipes.edit",
        "recipes.deactivate",
        "suppliers.view",
        "suppliers.create",
        "suppliers.edit",
        "suppliers.deactivate",
        "purchases.view",
        "purchases.create",
        "purchases.edit",
        "purchases.cancel",
        "stock.view",
        "stock.register",
        "stock.adjust",
        "stock.transfer",
        "production.view",
        "production.create_lot",
        "production.close_lot",
        "inventory.view",
        "inventory.create",
        "inventory.edit",
        "inventory.close",
        "remitos.view",
        "remitos.create",
        "remitos.edit",
        "remitos.cancel",
        "orders.view",
        "orders.create",
        "orders.edit",
        "orders.cancel",
        "mermas.view",
        "mermas.report",
        "mermas.close",
        "reports.view",
        "reports.export",
    ],
    "Encargado de Depósito": [
        "dashboard.view",
        "deposits.view",
        "deposits.create",
        "deposits.edit",
        "deposits.deactivate",
        "skus.view",
        "skus.create",
        "skus.edit",
        "skus.deactivate",
        "sku_types.view",
        "sku_types.create_edit",
        "sku_types.delete",
        "units.view",
        "units.create_edit",
        "units.delete",
        "movement_types.view",
        "movement_types.create_edit",
        "movement_types.delete",
        "production_lines.view",
        "recipes.view",
        "suppliers.view",
        "suppliers.create",
        "suppliers.edit",
        "suppliers.deactivate",
        "purchases.view",
        "purchases.create",
        "purchases.edit",
        "purchases.cancel",
        "stock.view",
        "stock.register",
        "stock.adjust",
        "stock.transfer",
        "production.view",
        "inventory.view",
        "inventory.create",
        "inventory.edit",
        "inventory.close",
        "remitos.view",
        "remitos.create",
        "remitos.edit",
        "remitos.cancel",
        "orders.view",
        "orders.create",
        "orders.edit",
        "orders.cancel",
        "mermas.view",
        "mermas.report",
        "mermas.close",
        "reports.view",
        "reports.export",
    ],
    "Operario de Producción": [
        "dashboard.view",
        "deposits.view",
        "skus.view",
        "sku_types.view",
        "units.view",
        "movement_types.view",
        "production_lines.view",
        "production_lines.create_edit",
        "production_lines.delete",
        "recipes.view",
        "recipes.create",
        "recipes.edit",
        "recipes.deactivate",
        "stock.view",
        "stock.register",
        "production.view",
        "production.create_lot",
        "production.close_lot",
        "inventory.view",
        "inventory.create",
        "inventory.edit",
        "inventory.close",
        "mermas.view",
        "mermas.report",
        "mermas.close",
        "reports.view",
        "reports.export",
    ],
    "Operario de Empaque": [
        "dashboard.view",
        "deposits.view",
        "skus.view",
        "sku_types.view",
        "units.view",
        "movement_types.view",
        "production_lines.view",
        "recipes.view",
        "stock.view",
        "stock.register",
        "production.view",
        "production.create_lot",
        "production.close_lot",
        "inventory.view",
        "inventory.create",
        "inventory.edit",
        "inventory.close",
        "mermas.view",
        "mermas.report",
        "mermas.close",
        "reports.view",
        "reports.export",
    ],
    "Encargado de Reparto": [
        "dashboard.view",
        "deposits.view",
        "skus.view",
        "sku_types.view",
        "units.view",
        "movement_types.view",
        "production_lines.view",
        "recipes.view",
        "suppliers.view",
        "suppliers.create",
        "suppliers.edit",
        "suppliers.deactivate",
        "purchases.view",
        "purchases.create",
        "purchases.edit",
        "purchases.cancel",
        "stock.view",
        "stock.transfer",
        "production.view",
        "inventory.view",
        "remitos.view",
        "remitos.create",
        "remitos.edit",
        "remitos.cancel",
        "orders.view",
        "orders.create",
        "orders.edit",
        "orders.cancel",
        "mermas.view",
        "mermas.report",
        "reports.view",
        "reports.export",
    ],
    "Encargado de Locales": [
        "dashboard.view",
        "deposits.view",
        "skus.view",
        "sku_types.view",
        "units.view",
        "movement_types.view",
        "production_lines.view",
        "recipes.view",
        "suppliers.view",
        "purchases.view",
        "stock.view",
        "production.view",
        "inventory.view",
        "remitos.view",
        "remitos.create",
        "remitos.edit",
        "orders.view",
        "orders.create",
        "orders.edit",
        "mermas.view",
        "mermas.report",
        "reports.view",
        "reports.export",
    ],
    "Auditoría": [
        "dashboard.view",
        "deposits.view",
        "skus.view",
        "sku_types.view",
        "units.view",
        "movement_types.view",
        "production_lines.view",
        "recipes.view",
        "suppliers.view",
        "purchases.view",
        "stock.view",
        "production.view",
        "inventory.view",
        "remitos.view",
        "orders.view",
        "mermas.view",
        "audit.view",
        "reports.view",
        "reports.export",
    ],
}

DEFAULT_DEPOSITS = [
    {"name": "Depósito Principal", "location": "Fábrica", "controls_lot": True},
    {"name": "Depósito MP", "location": "Fábrica", "controls_lot": True},
]

DEFAULT_SKU_TYPES = [
    {"code": "MP", "label": "Materia Prima"},
    {"code": "SEMI", "label": "Semielaborado"},
    {"code": "PT", "label": "Producto Terminado"},
    {"code": "CON", "label": "Consumible"},
    {"code": "PAP", "label": "Papelería"},
    {"code": "LIM", "label": "Limpieza"},
    {"code": "PACK", "label": "Pack / Packaging"},
    {"code": "OTRO", "label": "Otro"},
]

DEFAULT_SKUS = [
    {"code": "CUC-PT-24", "name": "Cucuruchos x24", "sku_type_code": "PT", "unit": UnitOfMeasure.BOX},
    {"code": "CUC-GRANEL", "name": "Cucurucho granel", "sku_type_code": "SEMI", "unit": UnitOfMeasure.UNIT},
    {"code": "MP-HARINA", "name": "Harina 0000", "sku_type_code": "MP", "unit": UnitOfMeasure.KG},
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

DEFAULT_STOCK_MOVEMENT_TYPES = [
    {"code": "PRODUCTION", "label": "Producción"},
    {"code": "CONSUMPTION", "label": "Consumo / Receta"},
    {"code": "ADJUSTMENT", "label": "Ajuste"},
    {"code": "TRANSFER", "label": "Transferencia"},
    {"code": "REMITO", "label": "Remito"},
    {"code": "MERMA", "label": "Merma"},
    {"code": "PURCHASE", "label": "Ingreso desde Proveedor"},
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

    existing_permissions = _get_existing_map(session, Permission, "key")
    for payload in DEFAULT_PERMISSIONS:
        if payload["key"] not in existing_permissions:
            session.add(Permission(**payload))

    existing_deposits = _get_existing_map(session, Deposit, "name")
    for payload in DEFAULT_DEPOSITS:
        if payload["name"] not in existing_deposits:
            session.add(Deposit(**payload))

    existing_sku_types = _get_existing_map(session, SKUType, "code")
    for payload in DEFAULT_SKU_TYPES:
        code = payload["code"]
        if code not in existing_sku_types:
            session.add(SKUType(**payload))

    existing_movement_types = _get_existing_map(session, StockMovementType, "code")
    for payload in DEFAULT_STOCK_MOVEMENT_TYPES:
        code = payload["code"]
        if code not in existing_movement_types:
            session.add(StockMovementType(**payload))

    session.commit()

    role_map = _get_existing_map(session, Role, "name")
    permission_map = _get_existing_map(session, Permission, "key")
    existing_role_permissions = {(item.role_id, item.permission_id) for item in session.exec(select(RolePermission)).all()}
    for role_name, permission_keys in DEFAULT_ROLE_PERMISSIONS.items():
        role = role_map.get(role_name)
        if not role:
            continue
        for key in permission_keys:
            permission = permission_map.get(key)
            if not permission:
                continue
            pair = (role.id, permission.id)
            if pair in existing_role_permissions:
                continue
            session.add(RolePermission(role_id=role.id, permission_id=permission.id))
            existing_role_permissions.add(pair)

    sku_type_map = _get_existing_map(session, SKUType, "code")
    existing_skus = _get_existing_map(session, SKU, "code")
    for payload in DEFAULT_SKUS:
        if payload["code"] in existing_skus:
            continue
        sku_type = sku_type_map.get(payload["sku_type_code"])
        if not sku_type:
            continue
        session.add(
            SKU(
                code=payload["code"],
                name=payload["name"],
                sku_type_id=sku_type.id,
                unit=payload["unit"],
            )
        )

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
