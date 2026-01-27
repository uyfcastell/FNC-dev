# Matriz de permisos (borrador)

## Roles canónicos

Roles base solicitados para el sistema:

- Operario de Producción
- Operario de Empaque
- Encargado de Planta
- Encargado de Depósito
- Encargado de Reparto
- Encargado de Locales
- Auditoría
- Administración

## Convenciones

- **Páginas**: agrupadas por módulos visibles en el UI.
- **Acciones**: ver/listar, crear, editar, eliminar, aprobar/cerrar, exportar.
- **Back-end**: se puede mapear cada acción a un endpoint protegido con `require_roles`.

## Matriz base (para completar)

> Marcá con ✅ los roles que deben tener acceso a cada acción.

| Módulo / Página | Acción | Administración | Encargado de Planta | Encargado de Depósito | Operario de Producción | Operario de Empaque | Encargado de Reparto | Encargado de Locales | Auditoría | Observaciones |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dashboard | Ver tablero | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |  |
| Usuarios (Maestros -> Usuarios) | Ver/listar | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |  |
| Usuarios (Maestros -> Usuarios) | Crear | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |  |
| Usuarios (Maestros -> Usuarios) | Editar | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |  |
| Usuarios (Maestros -> Usuarios) | Desactivar | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |  |
| Roles (Maestros -> Roles) | Ver/listar | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |  |
| Roles (Maestros -> Roles) | Crear/Editar | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |  |
| Roles (Maestros -> Roles) | Eliminar | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |  |
| Depósitos | Ver/listar | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |  |
| Depósitos | Crear | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |  |
| Depósitos | Editar | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |  |
| Depósitos | Desactivar | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |  |
| SKUs / Productos | Ver/listar | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |  |
| SKUs / Productos | Crear | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |  |
| SKUs / Productos | Editar | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |  |
| SKUs / Productos | Desactivar | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |  |
| Tipos de SKU | Ver/listar | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |  |
| Tipos de SKU | Crear/Editar | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |  |
| Tipos de SKU | Eliminar | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |  |
| Unidades de medida | Ver/listar | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |  |
| Unidades de medida | Crear/Editar | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |  |
| Unidades de medida | Eliminar | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |  |
| Tipos de movimiento | Ver/listar | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |  |
| Tipos de movimiento | Crear/Editar | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |  |
| Tipos de movimiento | Eliminar | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |  |
| Líneas de producción | Ver/listar | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |  |
| Líneas de producción | Crear/Editar | ✅ | ✅ | ⬜ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |  |
| Líneas de producción | Eliminar | ✅ | ✅ | ⬜ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |  |
| Recetas | Ver/listar | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |  |
| Recetas | Crear | ✅ | ✅ | ⬜ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |  |
| Recetas | Editar | ✅ | ✅ | ⬜ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |  |
| Recetas | Desactivar | ✅ | ✅ | ⬜ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |  |
| Proveedores | Ver/listar | ✅ | ✅ | ✅ | ⬜ | ⬜ | ✅ | ✅ | ✅ |  |
| Proveedores | Crear | ✅ | ✅ | ✅ | ⬜ | ⬜ | ✅ | ⬜ | ⬜ |  |
| Proveedores | Editar | ✅ | ✅ | ✅ | ⬜ | ⬜ | ✅ | ⬜ | ⬜ |  |
| Proveedores | Desactivar | ✅ | ✅ | ✅ | ⬜ | ⬜ | ✅ | ⬜ | ⬜ |  |
| Compras | Ver/listar | ✅ | ✅ | ✅ | ⬜ | ⬜ | ✅ | ✅ | ✅ |  |
| Compras | Crear | ✅ | ✅ | ✅ | ⬜ | ⬜ | ✅ | ⬜ | ⬜ |  |
| Compras | Editar | ✅ | ✅ | ✅ | ⬜ | ⬜ | ✅ | ⬜ | ⬜ |  |
| Compras | Anular | ✅ | ✅ | ✅ | ⬜ | ⬜ | ✅ | ⬜ | ⬜ |  |
| Stock / Movimientos | Ver/listar | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |  |
| Stock / Movimientos | Registrar ingreso/egreso | ✅ | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ |  |
| Stock / Movimientos | Ajuste | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |  |
| Stock / Movimientos | Transferencia | ✅ | ✅ | ✅ | ⬜ | ⬜ | ✅ | ⬜ | ⬜ |  |
| Producción | Ver/listar | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |  |
| Producción | Crear lote | ✅ | ✅ | ⬜ | ✅ | ✅ | ⬜ | ⬜ | ⬜ |  |
| Producción | Cerrar lote | ✅ | ✅ | ⬜ | ✅ | ✅ | ⬜ | ⬜ | ⬜ |  |
| Inventarios | Ver/listar | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |  |
| Inventarios | Crear conteo | ✅ | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ |  |
| Inventarios | Editar conteo | ✅ | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ |  |
| Inventarios | Cerrar conteo | ✅ | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ |  |
| Remitos | Ver/listar | ✅ | ✅ | ✅ | ⬜ | ⬜ | ✅ | ✅ | ✅ |  |
| Remitos | Crear | ✅ | ✅ | ✅ | ⬜ | ⬜ | ✅ | ✅ | ⬜ |  |
| Remitos | Editar | ✅ | ✅ | ✅ | ⬜ | ⬜ | ✅ | ✅ | ⬜ |  |
| Remitos | Anular | ✅ | ✅ | ✅ | ⬜ | ⬜ | ✅ | ⬜ | ⬜ |  |
| Ventas / Pedidos | Ver/listar | ✅ | ✅ | ✅ | ⬜ | ⬜ | ✅ | ✅ | ✅ |  |
| Ventas / Pedidos | Crear | ✅ | ✅ | ✅ | ⬜ | ⬜ | ✅ | ✅ | ⬜ |  |
| Ventas / Pedidos | Editar | ✅ | ✅ | ✅ | ⬜ | ⬜ | ✅ | ✅ | ⬜ |  |
| Ventas / Pedidos | Anular | ✅ | ✅ | ✅ | ⬜ | ⬜ | ✅ | ⬜ | ⬜ |  |
| Mermas | Ver/listar | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |  |
| Mermas | Reportar | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⬜ |  |
| Mermas | Cerrar | ✅ | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ |  |
| Auditoría | Ver logs | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ✅ |  |
| Reportes | Ver/listar | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |  |
| Reportes | Exportar | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |  |

## Notas para definición rápida

- Administración: control total, sin restricciones.
- Encargado de Planta: supervisión de producción, stock y administración operativa.
- Encargado de Depósito: stock, movimientos, inventarios y depósitos.
- Operario de Producción: producción y movimientos relacionados.
- Operario de Empaque: producción (empaque) y movimientos relacionados.
- Encargado de Reparto: remitos, entregas, transferencias y pedidos.
- Encargado de Locales: pedidos y remitos del canal local.
- Auditoría: acceso de lectura y logs.

Cuando completes la matriz, puedo traducirla a reglas concretas en el back-end y/o front-end.
