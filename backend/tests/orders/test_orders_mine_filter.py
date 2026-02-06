from types import SimpleNamespace

from app.api.deps import get_current_user
from app.main import app


def _set_user_override(user_id: int, role_id: int, role_name: str = "Administración", email: str | None = None) -> None:
    def _override_user():
        return SimpleNamespace(
            id=user_id,
            email=email or f"user{user_id}@example.com",
            username=f"user-{user_id}",
            full_name=f"User {user_id}",
            is_active=True,
            role_id=role_id,
            role=role_name,
        )

    app.dependency_overrides[get_current_user] = _override_user


def _create_order_for_current_user(client, destination_id: int, sku_id: int):
    response = client.post(
        "/api/orders",
        json={
            "destination_deposit_id": destination_id,
            "requested_by": "Tester",
            "status": "draft",
            "items": [{"sku_id": sku_id, "quantity": 2, "current_stock": 1}],
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_orders_mine_filters_by_created_by_user_id(client):
    me = client.get("/api/me")
    assert me.status_code == 200, me.text
    current_user = me.json()
    role_id = current_user["role_id"]

    deposits = client.get("/api/deposits")
    assert deposits.status_code == 200, deposits.text
    destination_id = next(deposit["id"] for deposit in deposits.json() if deposit.get("is_store"))

    skus = client.get("/api/orders/catalog")
    assert skus.status_code == 200, skus.text
    sku_id = skus.json()[0]["id"]

    _set_user_override(user_id=5001, role_id=role_id)
    own_order = _create_order_for_current_user(client, destination_id, sku_id)

    _set_user_override(user_id=5002, role_id=role_id)
    _create_order_for_current_user(client, destination_id, sku_id)

    _set_user_override(user_id=5001, role_id=role_id)
    mine_response = client.get("/api/orders?mine=true")
    assert mine_response.status_code == 200, mine_response.text
    mine_ids = {order["id"] for order in mine_response.json()}

    assert own_order["id"] in mine_ids
    assert len(mine_ids) >= 1
    assert all(order["created_by_user_id"] == 5001 for order in mine_response.json())
