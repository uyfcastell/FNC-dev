from types import SimpleNamespace

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
            id=999,
            email=email,
            username="rbac-tester",
            full_name="RBAC Tester",
            is_active=True,
            role_id=role.id,
            role=role_name,
        )

    app.dependency_overrides[get_current_user] = _override_user


def _create_order(client):
    deposits = client.get("/api/deposits").json()
    destination = next(deposit for deposit in deposits if deposit.get("is_store"))
    sku = client.get("/api/skus").json()[0]
    res = client.post(
        "/api/orders",
        json={
            "destination_deposit_id": destination["id"],
            "requested_by": "Test",
            "status": "draft",
            "items": [{"sku_id": sku["id"], "quantity": 3, "current_stock": 1}],
        },
    )
    assert res.status_code == 201, res.text
    return res.json()


def test_local_without_orders_submit_gets_403_on_submit(client):
    _set_user_override("Administración", email="admin@local")
    order = _create_order(client)

    with Session(engine) as session:
        role = session.exec(select(Role).where(Role.name == "Encargado de Locales")).first()
        permission = session.exec(select(Permission).where(Permission.key == "orders.submit")).first()
        assert role and permission
        rel = session.get(RolePermission, (role.id, permission.id))
        if rel:
            session.delete(rel)
            session.commit()

    _set_user_override("Encargado de Locales")
    submit_res = client.post(f"/api/orders/{order['id']}/status", json={"status": "submitted"})
    assert submit_res.status_code == 403


def test_local_with_orders_submit_can_submit_draft_order(client):
    _set_user_override("Administración", email="admin@local")
    order = _create_order(client)

    with Session(engine) as session:
        role = session.exec(select(Role).where(Role.name == "Encargado de Locales")).first()
        permission = session.exec(select(Permission).where(Permission.key == "orders.submit")).first()
        assert role and permission
        rel = session.get(RolePermission, (role.id, permission.id))
        if not rel:
            session.add(RolePermission(role_id=role.id, permission_id=permission.id))
            session.commit()

    _set_user_override("Encargado de Locales")
    submit_res = client.post(f"/api/orders/{order['id']}/status", json={"status": "submitted"})
    assert submit_res.status_code == 200, submit_res.text


def test_local_cannot_edit_or_cancel_submitted_order(client):
    _set_user_override("Administración", email="admin@local")
    order = _create_order(client)
    submit_res = client.post(f"/api/orders/{order['id']}/status", json={"status": "submitted"})
    assert submit_res.status_code == 200

    _set_user_override("Encargado de Locales")
    edit_res = client.put(
        f"/api/orders/{order['id']}",
        json={"requested_by": "Otro", "items": [{"sku_id": order['items'][0]['sku_id'], "quantity": 3, "current_stock": 1}]},
    )
    assert edit_res.status_code == 403

    cancel_res = client.delete(f"/api/orders/{order['id']}")
    assert cancel_res.status_code == 403
