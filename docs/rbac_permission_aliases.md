# RBAC permission aliases (catálogo técnico ↔ permisos funcionales)

Para mantener el contrato simple para cliente (roles con permisos funcionales) y compatibilidad interna con catálogo histórico (`ops.*`, `master.*`, `admin.*`), la autorización usa aliases centralizados en:

- `backend/app/core/permission_aliases.py`

Regla: cuando un endpoint pide `X`, se autoriza si el rol tiene `X` **o** cualquiera de sus aliases funcionales.

Ejemplos activos:

- `ops.orders.create` → `orders.create`
- `ops.orders.update_draft` → `orders.edit`
- `ops.orders.list` / `ops.orders.read` → `orders.view`
- `ops.shipments.add_orders` → `shipments.add_orders` o `remitos.edit`
- `admin.users.update` → `users.edit`

Esto evita drift entre catálogo técnico por ruta y permisos funcionales de seed/roles, sin refactor masivo.
