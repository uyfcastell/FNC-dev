from __future__ import annotations

from collections.abc import Iterable


# Canonical permissions are the functional keys exposed to role assignment.
# Legacy/catalog keys can still be requested by endpoints and are resolved here.
PERMISSION_ALIASES: dict[str, set[str]] = {
    "ops.orders.list": {"orders.view"},
    "ops.orders.read": {"orders.view"},
    "ops.orders.create": {"orders.create"},
    "ops.orders.update_draft": {"orders.edit"},
    "ops.orders.delete_draft": {"orders.cancel"},
    "ops.orders.submit": {"orders.submit"},
    "ops.orders.cancel": {"orders.cancel"},
    "ops.lookups.order_entry_skus.list": {"orders.create", "orders.edit"},
    "ops.lookups.order_stores.list": {"orders.view"},
    "ops.shipments.list": {"shipments.view", "remitos.view"},
    "ops.shipments.read": {"shipments.view", "remitos.view"},
    "ops.shipments.create": {"shipments.create", "remitos.create"},
    "ops.shipments.update_draft": {"shipments.edit", "remitos.edit"},
    "ops.shipments.add_orders": {"shipments.add_orders", "remitos.edit"},
    "ops.shipments.set_items": {"shipments.edit", "remitos.edit"},
    "ops.shipments.prep_items": {"shipments.edit", "remitos.edit"},
    "ops.shipments.confirm": {"shipments.edit", "remitos.edit"},
    "ops.shipments.dispatch": {"shipments.dispatch", "remitos.edit"},
    "ops.shipments.cancel": {"shipments.cancel", "remitos.cancel"},
    "admin.rbac.permissions.list": {"roles.view"},
    "admin.rbac.roles.list": {"roles.view"},
    "admin.rbac.roles.permissions.read": {"roles.view"},
    "admin.rbac.roles.permissions.update": {"roles.create_edit"},
    "admin.users.list": {"users.view"},
    "admin.users.create": {"users.create"},
    "admin.users.update": {"users.edit"},
    "admin.users.delete": {"users.deactivate"},
    "admin.users.update_pin": {"users.edit"},
}

_DOMAIN_TO_FUNCTIONAL = {
    "deposits": "deposits",
    "sku_types": "sku_types",
    "skus": "skus",
    "orders": "orders",
    "shipments": "shipments",
    "remitos": "remitos",
    "inventory_counts": "inventory",
    "inventory": "inventory",
    "mermas": "mermas",
    "production_lines": "production_lines",
    "suppliers": "suppliers",
    "recipes": "recipes",
    "stock_movement_types": "movement_types",
    "stock_movements": "stock",
    "stock_levels": "stock",
    "purchases": "purchases",
    "production": "production",
    "roles": "roles",
    "users": "users",
    "audit": "audit",
    "report": "reports",
    "reports": "reports",
}

_ACTION_TO_FUNCTIONAL = {
    "list": "view",
    "read": "view",
    "meta": "view",
    "create": "create",
    "update": "edit",
    "update_draft": "edit",
    "set": "edit",
    "set_items": "edit",
    "prep_items": "edit",
    "submit": "submit",
    "approve": "edit",
    "close": "close",
    "cancel": "cancel",
    "delete": "deactivate",
    "dispatch": "dispatch",
    "export": "export",
    "print": "view",
}


def _normalize(key: str) -> str:
    return key.strip().lower()


def _infer_aliases(permission_key: str) -> set[str]:
    normalized = _normalize(permission_key)
    parts = normalized.split(".")
    if len(parts) < 2:
        return set()

    domain = None
    action = None

    for candidate in parts:
        if candidate in _DOMAIN_TO_FUNCTIONAL:
            domain = _DOMAIN_TO_FUNCTIONAL[candidate]
    for candidate in reversed(parts):
        if candidate in _ACTION_TO_FUNCTIONAL:
            action = _ACTION_TO_FUNCTIONAL[candidate]
            break

    if domain is None:
        return set()

    if action:
        return {f"{domain}.{action}"}
    return {f"{domain}.view"}


def expand_permission_keys(permission_key: str) -> set[str]:
    normalized = _normalize(permission_key)
    aliases = {_normalize(item) for item in PERMISSION_ALIASES.get(normalized, set())}
    aliases.update(_infer_aliases(normalized))
    aliases.add(normalized)
    return aliases


def has_any_permission(assigned_keys: Iterable[str], required_key: str) -> bool:
    assigned = {_normalize(key) for key in assigned_keys}
    if "*" in assigned:
        return True
    return bool(assigned.intersection(expand_permission_keys(required_key)))
