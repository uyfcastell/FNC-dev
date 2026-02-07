from types import SimpleNamespace
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.api.deps import get_current_user
from app.db import engine
from app.main import app
from app.models import (
    InventoryCount,
    InventoryCountStatus,
    Order,
    Permission,
    Role,
    RolePermission,
)


def _client_without_user_override() -> TestClient:
    original_override = app.dependency_overrides.pop(get_current_user, None)
    client = TestClient(app)
    app.state._original_get_current_user_override = original_override
    return client


def _restore_user_override() -> None:
    original_override = getattr(app.state, "_original_get_current_user_override", None)
    if original_override is not None:
        app.dependency_overrides[get_current_user] = original_override
        delattr(app.state, "_original_get_current_user_override")


def _ensure_permission(key: str) -> None:
    with Session(engine) as session:
        permission = session.exec(select(Permission).where(Permission.key == key)).first()
        if permission:
            return
        session.add(Permission(key=key, category="operations", action="test", label=key))
        session.commit()


def _ensure_role(name: str) -> Role:
    with Session(engine) as session:
        role = session.exec(select(Role).where(Role.name == name)).first()
        if role:
            return role
        role = Role(name=name, description=name)
        session.add(role)
        session.commit()
        session.refresh(role)
        return role


def _set_role_permissions(role_name: str, permission_keys: list[str]) -> None:
    role = _ensure_role(role_name)
    for key in permission_keys:
        _ensure_permission(key)

    with Session(engine) as session:
        role = session.exec(select(Role).where(Role.id == role.id)).first()
        assert role is not None
        existing_rel = session.exec(select(RolePermission).where(RolePermission.role_id == role.id)).all()
        for rel in existing_rel:
            session.delete(rel)
        session.flush()

        for key in permission_keys:
            permission = session.exec(select(Permission).where(Permission.key == key)).first()
            assert permission is not None
            session.add(RolePermission(role_id=role.id, permission_id=permission.id))
        session.commit()


def _set_user_override(user_id: int, role_name: str, email: str | None = None) -> None:
    role = _ensure_role(role_name)

    def _override_user():
        return SimpleNamespace(
            id=user_id,
            email=email or f"{user_id}@example.com",
            username=f"user-{user_id}",
            full_name=f"User {user_id}",
            is_active=True,
            role_id=role.id,
            role=role_name,
        )

    app.dependency_overrides[get_current_user] = _override_user


def _get_orderable_sku(client):
    res = client.get("/api/skus")
    assert res.status_code == 200
    for sku in res.json():
        if sku["sku_type_code"] not in {"MP", "SEMI"}:
            return sku
    raise AssertionError("No se encontró un SKU válido para pedidos")


def _create_store(client):
    name = f"PR2 Store {uuid4().hex[:6]}"
    res = client.post(
        "/api/deposits",
        json={"name": name, "location": "Test", "controls_lot": False, "is_store": True},
    )
    assert res.status_code == 201, res.text
    return res.json()


def _create_order(client, *, status: str = "draft"):
    store = _create_store(client)
    sku = _get_orderable_sku(client)
    res = client.post(
        "/api/orders",
        json={
            "destination_deposit_id": store["id"],
            "requested_by": "PR2",
            "status": status,
            "items": [{"sku_id": sku["id"], "quantity": 2, "current_stock": 1}],
        },
    )
    assert res.status_code == 201, res.text
    return res.json()


def _create_inventory_count(client):
    sku_id = client.get("/api/skus").json()[0]["id"]
    res = client.post(
        "/api/inventory-counts",
        json={
            "deposit_id": 1,
            "items": [{"sku_id": sku_id, "counted_quantity": 1}],
        },
    )
    assert res.status_code == 201, res.text
    return res.json()


def test_orders_update_delete_without_token_returns_401():
    client = _client_without_user_override()
    try:
        update_res = client.put("/api/orders/1", json={"requested_by": "X"})
        delete_res = client.delete("/api/orders/1")
    finally:
        _restore_user_override()

    assert update_res.status_code == 401
    assert delete_res.status_code == 401


def test_orders_update_delete_with_token_but_without_base_permission_returns_403(client):
    _set_role_permissions("PR2 NoPerm", [])
    _set_user_override(2001, "PR2 NoPerm")

    order = _create_order(client)

    update_res = client.put(f"/api/orders/{order['id']}", json={"requested_by": "X"})
    delete_res = client.delete(f"/api/orders/{order['id']}")

    assert update_res.status_code == 403
    assert delete_res.status_code == 403


def test_orders_update_delete_with_base_permission_but_not_owner_returns_403(client):
    _set_role_permissions("PR2 BaseOnly", ["orders.edit", "orders.cancel"])

    _set_user_override(3001, "PR2 BaseOnly")
    order = _create_order(client)

    _set_user_override(3002, "PR2 BaseOnly")
    update_res = client.put(f"/api/orders/{order['id']}", json={"requested_by": "X"})
    delete_res = client.delete(f"/api/orders/{order['id']}")

    assert update_res.status_code == 403
    assert delete_res.status_code == 403


def test_orders_update_delete_owner_but_not_draft_returns_409(client):
    _set_role_permissions("PR2 OwnerBase", ["orders.edit", "orders.cancel"])
    _set_user_override(4001, "PR2 OwnerBase")

    order = _create_order(client, status="submitted")

    update_res = client.put(f"/api/orders/{order['id']}", json={"requested_by": "X"})
    delete_res = client.delete(f"/api/orders/{order['id']}")

    assert update_res.status_code == 409
    assert delete_res.status_code == 409


def test_orders_update_delete_override_permission_allows_non_owner(client):
    _set_role_permissions(
        "PR2 Override",
        [
            "orders.edit",
            "orders.cancel",
            "ops.orders.update_any_draft",
            "ops.orders.delete_any_draft",
        ],
    )

    _set_user_override(5001, "PR2 Override")
    order = _create_order(client)

    _set_user_override(5002, "PR2 Override")
    update_res = client.put(f"/api/orders/{order['id']}", json={"requested_by": "Con override"})
    delete_res = client.delete(f"/api/orders/{order['id']}")

    assert update_res.status_code == 200, update_res.text
    assert delete_res.status_code == 204, delete_res.text


def test_inventory_count_invalid_state_transitions_return_409(client):
    _set_role_permissions("PR2 Inventory", ["inventory.edit", "inventory.close"])
    _set_user_override(6001, "PR2 Inventory")

    count = _create_inventory_count(client)

    with Session(engine) as session:
        db_count = session.get(InventoryCount, count["id"])
        assert db_count is not None
        db_count.status = InventoryCountStatus.SUBMITTED
        session.add(db_count)
        session.commit()

    assert client.put(f"/api/inventory-counts/{count['id']}", json={"notes": "x"}).status_code == 409
    assert client.post(f"/api/inventory-counts/{count['id']}/submit").status_code == 409

    with Session(engine) as session:
        db_count = session.get(InventoryCount, count["id"])
        assert db_count is not None
        db_count.status = InventoryCountStatus.DRAFT
        session.add(db_count)
        session.commit()

    assert client.post(f"/api/inventory-counts/{count['id']}/approve").status_code == 409
    assert client.post(f"/api/inventory-counts/{count['id']}/close").status_code == 409

    with Session(engine) as session:
        db_count = session.get(InventoryCount, count["id"])
        assert db_count is not None
        db_count.status = InventoryCountStatus.APPROVED
        session.add(db_count)
        session.commit()

    assert client.post(f"/api/inventory-counts/{count['id']}/cancel").status_code == 409


def test_order_status_transition_permissions_and_invalid_transition(client):
    _set_role_permissions("PR2 Status", ["orders.submit"])

    _set_user_override(7001, "PR2 Status")
    order = _create_order(client, status="draft")

    ok_res = client.post(f"/api/orders/{order['id']}/status", json={"status": "submitted"})
    assert ok_res.status_code == 403

    _set_role_permissions("PR2 Status", ["orders.submit", "ops.orders.submit"])
    _set_user_override(7001, "PR2 Status")

    with Session(engine) as session:
        db_order = session.get(Order, order["id"])
        assert db_order is not None
        db_order.status = "draft"
        session.add(db_order)
        session.commit()

    ok_res = client.post(f"/api/orders/{order['id']}/status", json={"status": "submitted"})
    assert ok_res.status_code == 200, ok_res.text

    invalid_res = client.post(f"/api/orders/{order['id']}/status", json={"status": "submitted"})
    assert invalid_res.status_code == 409
