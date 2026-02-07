from __future__ import annotations

from fastapi import HTTPException, status
from sqlmodel import Session

from ..core.rbac import get_user_permission_keys
from ..models import InventoryCount, InventoryCountStatus, Order, OrderStatus, User


ORDER_ALLOWED_TRANSITIONS: dict[OrderStatus, set[OrderStatus]] = {
    OrderStatus.DRAFT: {OrderStatus.SUBMITTED, OrderStatus.CANCELLED},
    OrderStatus.SUBMITTED: {OrderStatus.CANCELLED},
    OrderStatus.CANCELLED: set(),
    OrderStatus.PREPARED: set(),
    OrderStatus.PARTIALLY_PREPARED: set(),
    OrderStatus.PARTIALLY_DISPATCHED: set(),
    OrderStatus.DISPATCHED: set(),
}

INVENTORY_ACTION_ALLOWED_STATUSES: dict[str, set[InventoryCountStatus]] = {
    "update": {InventoryCountStatus.DRAFT},
    "submit": {InventoryCountStatus.DRAFT},
    "approve": {InventoryCountStatus.SUBMITTED},
    "close": {InventoryCountStatus.APPROVED},
    "cancel": {InventoryCountStatus.DRAFT, InventoryCountStatus.SUBMITTED},
}


def has_permission(session: Session, user: User, permission_key: str) -> bool:
    normalized = permission_key.strip().lower()
    keys = get_user_permission_keys(user.id, session)
    return "*" in keys or normalized in keys


def assert_order_owner_draft_or_override(
    order: Order,
    user: User,
    override_perm_key: str,
    session: Session,
) -> None:
    if order.status != OrderStatus.DRAFT:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El pedido no está en borrador")

    if order.created_by_user_id == user.id:
        return

    if has_permission(session, user, override_perm_key):
        return

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")


def assert_inventory_count_transition_allowed(count: InventoryCount, target_action: str) -> None:
    allowed_statuses = INVENTORY_ACTION_ALLOWED_STATUSES[target_action]
    if count.status not in allowed_statuses:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Transición de estado inválida")


def assert_order_status_transition_allowed(order: Order, new_status: OrderStatus) -> None:
    allowed = ORDER_ALLOWED_TRANSITIONS.get(order.status, set())
    if new_status not in allowed:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Transición de estado inválida")
