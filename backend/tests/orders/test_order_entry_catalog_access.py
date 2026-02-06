from types import SimpleNamespace
from uuid import uuid4

from app.api.deps import get_current_user
from app.db import engine
from app.main import app
from app.models import Permission, Role, RolePermission
from sqlmodel import Session, select


def _set_user_override(role_name: str, email: str = "tester@example.com") -> None:
    with Session(engine) as session:
        role = session.exec(select(Role).where(Role.name == role_name)).first()
        assert role is not None

    def _override_user():
        return SimpleNamespace(
            id=998,
            email=email,
            username="orders-catalog-tester",
            full_name="Orders Catalog Tester",
            is_active=True,
            role_id=role.id,
            role=role_name,
        )

    app.dependency_overrides[get_current_user] = _override_user


def _ensure_role_permission(role_name: str, permission_key: str, enabled: bool) -> None:
    with Session(engine) as session:
        role = session.exec(select(Role).where(Role.name == role_name)).first()
        permission = session.exec(select(Permission).where(Permission.key == permission_key)).first()
        assert role and permission
        rel = session.get(RolePermission, (role.id, permission.id))
        if enabled and not rel:
            session.add(RolePermission(role_id=role.id, permission_id=permission.id))
            session.commit()
        if not enabled and rel:
            session.delete(rel)
            session.commit()


def test_order_catalog_uses_orders_create_permission(client):
    _ensure_role_permission("Encargado de Locales", "orders.create", True)
    _ensure_role_permission("Encargado de Locales", "skus.view", False)

    _set_user_override("Encargado de Locales", email="local@tester")
    response = client.get("/api/orders/catalog")

    assert response.status_code == 200, response.text
    assert isinstance(response.json(), list)


def test_order_stores_lists_only_stores_and_active_by_default(client):
    _set_user_override("Administración", email="admin@tester")
    active_store_name = f"Local activo {uuid4().hex[:6]}"
    inactive_store_name = f"Local inactivo {uuid4().hex[:6]}"
    warehouse_name = f"Deposito no local {uuid4().hex[:6]}"

    active_store = client.post(
        "/api/deposits",
        json={"name": active_store_name, "location": "Zona A", "controls_lot": False, "is_store": True},
    )
    assert active_store.status_code == 201, active_store.text

    inactive_store = client.post(
        "/api/deposits",
        json={"name": inactive_store_name, "location": "Zona B", "controls_lot": False, "is_store": True},
    )
    assert inactive_store.status_code == 201, inactive_store.text
    inactive_id = inactive_store.json()["id"]
    deactivate = client.patch(f"/api/deposits/{inactive_id}/status", json={"is_active": False})
    assert deactivate.status_code == 200, deactivate.text

    non_store = client.post(
        "/api/deposits",
        json={"name": warehouse_name, "location": "Zona C", "controls_lot": False, "is_store": False},
    )
    assert non_store.status_code == 201, non_store.text

    _set_user_override("Encargado de Locales", email="local@tester")

    default_response = client.get("/api/orders/stores")
    assert default_response.status_code == 200, default_response.text
    default_names = [item["name"] for item in default_response.json()]
    assert active_store_name in default_names
    assert inactive_store_name not in default_names
    assert warehouse_name not in default_names

    all_response = client.get("/api/orders/stores?include_inactive=true")
    assert all_response.status_code == 200, all_response.text
    all_names = [item["name"] for item in all_response.json()]
    assert active_store_name in all_names
    assert inactive_store_name in all_names
    assert warehouse_name not in all_names
