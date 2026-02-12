# RBAC Multiplex Audit Report

This report is generated automatically by `backend/scripts/audit_rbac_multiplex.py`.

## Scope & heuristics

- Route path contains one of: `/status`, `/state`, `/action`, `/transition`, `/event`.
- Handler references fields: `status`, `new_status`, `action`, `event`, `transition`, `operation`.
- Handler has `if/elif` branches using those fields.
- Internal actions inferred via regex comparisons and `in { ... }` sets.

## Candidate endpoints

| endpoint | handler | catalog_permission | detected_actions | risk_level | notes |
|---|---|---|---|---|---|
| `GET /api/audit/logs/export.xlsx` | `backend/app/api/routes.py:7084` (`export_audit_logs`) | `admin.audit.logs.export` | _none_ | **INFO** | Handler references action/status-like fields; Handler has conditional branches on action/status-like fields |
| `GET /api/audit/logs/meta` | `backend/app/api/routes.py:7048` (`audit_logs_meta`) | `admin.audit.logs.meta` | _none_ | **INFO** | Handler references action/status-like fields; Handler has conditional branches on action/status-like fields |
| `POST /api/auth/login-pin` | `backend/app/api/routes.py:1810` (`login_pin`) | _none_ | _none_ | **INFO** | Handler references action/status-like fields; Handler has conditional branches on action/status-like fields |
| `DELETE /api/deposits/{deposit_id}` | `backend/app/api/routes.py:3195` (`delete_deposit`) | `master.deposits.delete` | _none_ | **INFO** | Handler references action/status-like fields; Handler has conditional branches on action/status-like fields |
| `PATCH /api/deposits/{deposit_id}/status` | `backend/app/api/routes.py:3250` (`update_deposit_status`) | `master.deposits.update_status` | _none_ | **INFO** | Path matches multiplex hint keyword; Handler references action/status-like fields |
| `GET /api/inventory-counts` | `backend/app/api/routes.py:6679` (`list_inventory_counts`) | `ops.inventory_counts.list` | _none_ | **INFO** | Handler references action/status-like fields; Handler has conditional branches on action/status-like fields |
| `POST /api/mermas` | `backend/app/api/routes.py:7258` (`create_merma_event`) | `ops.mermas.create` | _none_ | **INFO** | Handler references action/status-like fields; Handler has conditional branches on action/status-like fields |
| `GET /api/mermas/{merma_id}` | `backend/app/api/routes.py:7494` (`get_merma_event`) | `ops.mermas.read` | _none_ | **INFO** | Handler references action/status-like fields; Handler has conditional branches on action/status-like fields |
| `GET /api/orders` | `backend/app/api/routes.py:3794` (`list_orders`) | `ops.orders.list` | _none_ | **INFO** | Handler references action/status-like fields; Handler has conditional branches on action/status-like fields |
| `POST /api/orders` | `backend/app/api/routes.py:3832` (`create_order`) | `ops.orders.create` | `OrderStatus.SUBMITTED` | **MEDIUM** | Handler references action/status-like fields; Handler has conditional branches on action/status-like fields |
| `PUT /api/orders/{order_id}` | `backend/app/api/routes.py:3920` (`update_order`) | `ops.orders.update_draft` | `OrderStatus.SUBMITTED` | **MEDIUM** | Handler references action/status-like fields; Handler has conditional branches on action/status-like fields |
| `POST /api/orders/{order_id}/status` | `backend/app/api/routes.py:4074` (`update_order_status`) | `orders.edit` | `OrderStatus.CANCELLED`, `OrderStatus.SUBMITTED` | **RISK: multiplexed** | Path matches multiplex hint keyword; Handler references action/status-like fields; Handler has conditional branches on action/status-like fields; Single static catalog permission with multiple internal actions |
| `PATCH /api/recipes/{recipe_id}/status` | `backend/app/api/routes.py:3757` (`update_recipe_status`) | `master.recipes.update_status` | _none_ | **INFO** | Path matches multiplex hint keyword; Handler references action/status-like fields |
| `GET /api/remitos` | `backend/app/api/routes.py:4869` (`list_remitos`) | `ops.remitos.list` | _none_ | **INFO** | Handler references action/status-like fields; Handler has conditional branches on action/status-like fields |
| `POST /api/remitos/{remito_id}/cancel` | `backend/app/api/routes.py:5117` (`cancel_remito`) | `ops.remitos.cancel` | _none_ | **INFO** | Handler references action/status-like fields; Handler has conditional branches on action/status-like fields |
| `POST /api/remitos/{remito_id}/dispatch` | `backend/app/api/routes.py:4936` (`dispatch_remito`) | `ops.remitos.dispatch` | _none_ | **INFO** | Handler references action/status-like fields; Handler has conditional branches on action/status-like fields |
| `POST /api/remitos/{remito_id}/receive` | `backend/app/api/routes.py:5040` (`receive_remito`) | `ops.remitos.receive` | _none_ | **INFO** | Handler references action/status-like fields; Handler has conditional branches on action/status-like fields |
| `GET /api/reports/stock-alerts` | `backend/app/api/routes.py:7548` (`stock_alerts_report`) | `report.stock.alerts.read` | _none_ | **INFO** | Handler references action/status-like fields; Handler has conditional branches on action/status-like fields |
| `GET /api/reports/stock-expirations` | `backend/app/api/routes.py:7611` (`stock_expirations_report`) | `report.stock.expirations.read` | _none_ | **INFO** | Handler references action/status-like fields; Handler has conditional branches on action/status-like fields |
| `GET /api/shipments` | `backend/app/api/routes.py:4244` (`list_shipments`) | `ops.shipments.list` | _none_ | **INFO** | Handler references action/status-like fields; Handler has conditional branches on action/status-like fields |
| `PUT /api/shipments/{shipment_id}` | `backend/app/api/routes.py:4306` (`update_shipment`) | `ops.shipments.update_draft` | `ShipmentStatus.DRAFT` | **MEDIUM** | Handler references action/status-like fields; Handler has conditional branches on action/status-like fields |
| `POST /api/shipments/{shipment_id}/add-orders` | `backend/app/api/routes.py:4370` (`add_orders_to_shipment`) | `ops.shipments.add_orders` | `OrderStatus.DRAFT`, `ShipmentStatus.DRAFT` | **RISK: multiplexed** | Handler references action/status-like fields; Handler has conditional branches on action/status-like fields; Single static catalog permission with multiple internal actions |
| `POST /api/shipments/{shipment_id}/cancel` | `backend/app/api/routes.py:4630` (`cancel_shipment`) | `ops.shipments.cancel` | `ShipmentStatus.DRAFT` | **MEDIUM** | Handler references action/status-like fields; Handler has conditional branches on action/status-like fields |
| `POST /api/shipments/{shipment_id}/confirm` | `backend/app/api/routes.py:4668` (`confirm_shipment`) | `ops.shipments.confirm` | `ShipmentStatus.DRAFT` | **MEDIUM** | Handler references action/status-like fields; Handler has conditional branches on action/status-like fields |
| `POST /api/shipments/{shipment_id}/dispatch` | `backend/app/api/routes.py:4830` (`dispatch_shipment`) | `ops.shipments.dispatch` | `ShipmentStatus.CONFIRMED` | **MEDIUM** | Handler references action/status-like fields; Handler has conditional branches on action/status-like fields |
| `POST /api/shipments/{shipment_id}/items` | `backend/app/api/routes.py:4461` (`update_shipment_items`) | `ops.shipments.set_items` | `ShipmentStatus.DRAFT` | **MEDIUM** | Handler references action/status-like fields; Handler has conditional branches on action/status-like fields |
| `POST /api/shipments/{shipment_id}/prep-items` | `backend/app/api/routes.py:4554` (`prep_shipment_items`) | `ops.shipments.prep_items` | `ShipmentStatus.DRAFT` | **MEDIUM** | Handler references action/status-like fields; Handler has conditional branches on action/status-like fields |
| `DELETE /api/skus/{sku_id}` | `backend/app/api/routes.py:3009` (`delete_sku`) | `master.skus.delete` | _none_ | **INFO** | Handler references action/status-like fields; Handler has conditional branches on action/status-like fields |
| `PATCH /api/skus/{sku_id}/status` | `backend/app/api/routes.py:3066` (`update_sku_status`) | `master.skus.update_status` | _none_ | **INFO** | Path matches multiplex hint keyword; Handler references action/status-like fields |

## Top priority

Endpoints containing `/status` (higher priority due to known mobile usage patterns):

- `PATCH /api/deposits/{deposit_id}/status` -> `update_deposit_status` (backend/app/api/routes.py:3250), permission: `master.deposits.update_status`, risk: **INFO**
- `POST /api/orders/{order_id}/status` -> `update_order_status` (backend/app/api/routes.py:4074), permission: `orders.edit`, risk: **RISK: multiplexed**
- `PATCH /api/recipes/{recipe_id}/status` -> `update_recipe_status` (backend/app/api/routes.py:3757), permission: `master.recipes.update_status`, risk: **INFO**
- `PATCH /api/skus/{sku_id}/status` -> `update_sku_status` (backend/app/api/routes.py:3066), permission: `master.skus.update_status`, risk: **INFO**

## Permission key consistency (catalog vs seed DEFAULT_PERMISSIONS)

- Catalog permission keys: **114**
- Seed DEFAULT_PERMISSIONS keys: **66**

### In catalog but missing in seed DEFAULT_PERMISSIONS

- `admin.audit.logs.export`
- `admin.audit.logs.meta`
- `admin.audit.logs.read`
- `admin.rbac.permissions.list`
- `admin.rbac.roles.list`
- `admin.rbac.roles.permissions.read`
- `admin.rbac.roles.permissions.update`
- `admin.users.create`
- `admin.users.delete`
- `admin.users.list`
- `admin.users.update`
- `admin.users.update_pin`
- `master.deposits.create`
- `master.deposits.delete`
- `master.deposits.update`
- `master.deposits.update_status`
- `master.mermas.causes.create`
- `master.mermas.causes.delete`
- `master.mermas.causes.update`
- `master.mermas.types.create`
- `master.mermas.types.delete`
- `master.mermas.types.update`
- `master.production_lines.create`
- `master.production_lines.piece_rates.set`
- `master.production_lines.update`
- `master.recipes.create`
- `master.recipes.delete`
- `master.recipes.list`
- `master.recipes.update`
- `master.recipes.update_status`
- `master.sku_types.create`
- `master.sku_types.delete`
- `master.sku_types.list`
- `master.sku_types.update`
- `master.skus.create`
- `master.skus.delete`
- `master.skus.update`
- `master.skus.update_status`
- `master.stock_movement_types.create`
- `master.stock_movement_types.delete`
- `master.stock_movement_types.update`
- `master.suppliers.create`
- `master.suppliers.update`
- `ops.inventory.lots.update_expiry`
- `ops.inventory_counts.approve`
- `ops.inventory_counts.cancel`
- `ops.inventory_counts.close`
- `ops.inventory_counts.create`
- `ops.inventory_counts.list`
- `ops.inventory_counts.read`
- `ops.inventory_counts.submit`
- `ops.inventory_counts.update_draft`
- `ops.lookups.deposits.list`
- `ops.lookups.merma_causes.list`
- `ops.lookups.merma_lots.list`
- `ops.lookups.merma_types.list`
- `ops.lookups.order_entry_skus.list`
- `ops.lookups.order_stores.list`
- `ops.lookups.production_lines.list`
- `ops.lookups.skus.list`
- `ops.lookups.stock_movement_types.list`
- `ops.lookups.suppliers.list`
- `ops.lookups.units.list`
- `ops.mermas.create`
- `ops.mermas.list`
- `ops.mermas.read`
- `ops.orders.create`
- `ops.orders.delete_draft`
- `ops.orders.list`
- `ops.orders.read`
- `ops.orders.update_draft`
- `ops.production.lots.list`
- `ops.production.lots.read`
- `ops.production.overheads_daily.allocations.read`
- `ops.production.overheads_daily.create`
- `ops.production.overheads_daily.items.create`
- `ops.production.overheads_daily.items.delete`
- `ops.production.overheads_daily.items.list`
- `ops.production.overheads_daily.items.update`
- `ops.production.overheads_daily.list`
- `ops.production.overheads_daily.read`
- `ops.production.overheads_daily.update`
- `ops.production.piece_rates.list`
- `ops.production.piecework.read_daily`
- `ops.purchases.receipts.create`
- `ops.purchases.receipts.list`
- `ops.purchases.receipts.read`
- `ops.remitos.cancel`
- `ops.remitos.create_from_order`
- `ops.remitos.dispatch`
- `ops.remitos.list`
- `ops.remitos.print`
- `ops.remitos.read`
- `ops.remitos.receive`
- `ops.shipments.add_orders`
- `ops.shipments.cancel`
- `ops.shipments.confirm`
- `ops.shipments.create`
- `ops.shipments.dispatch`
- `ops.shipments.list`
- `ops.shipments.pick_list.print`
- `ops.shipments.prep_items`
- `ops.shipments.read`
- `ops.shipments.set_items`
- `ops.shipments.update_draft`
- `ops.stock_levels.list`
- `ops.stock_movements.create`
- `ops.stock_movements.list`
- `report.master.skus.export`
- `report.stock.alerts.read`
- `report.stock.alerts.set_threshold`
- `report.stock.expirations.read`
- `report.stock.summary.read`

### In seed DEFAULT_PERMISSIONS but not used by catalog

- `audit.view`
- `dashboard.view`
- `deposits.create`
- `deposits.deactivate`
- `deposits.edit`
- `deposits.view`
- `inventory.close`
- `inventory.create`
- `inventory.edit`
- `inventory.view`
- `mermas.close`
- `mermas.report`
- `mermas.view`
- `movement_types.create_edit`
- `movement_types.delete`
- `movement_types.view`
- `orders.cancel`
- `orders.create`
- `orders.submit`
- `orders.view`
- `production.close_lot`
- `production.create_lot`
- `production.view`
- `production_lines.create_edit`
- `production_lines.delete`
- `production_lines.view`
- `purchases.cancel`
- `purchases.create`
- `purchases.edit`
- `purchases.view`
- `recipes.create`
- `recipes.deactivate`
- `recipes.edit`
- `recipes.view`
- `remitos.cancel`
- `remitos.create`
- `remitos.edit`
- `remitos.view`
- `reports.export`
- `reports.view`
- `roles.create_edit`
- `roles.delete`
- `roles.view`
- `sku_types.create_edit`
- `sku_types.delete`
- `sku_types.view`
- `skus.create`
- `skus.deactivate`
- `skus.edit`
- `skus.view`
- `stock.adjust`
- `stock.register`
- `stock.transfer`
- `stock.view`
- `suppliers.create`
- `suppliers.deactivate`
- `suppliers.edit`
- `suppliers.view`
- `units.create_edit`
- `units.delete`
- `units.view`
- `users.create`
- `users.deactivate`
- `users.edit`
- `users.view`

## Summary

- Candidate endpoints analyzed: **29**
- `RISK: multiplexed`: **2**
- `MEDIUM`: **8**
- `INFO`: **19**
