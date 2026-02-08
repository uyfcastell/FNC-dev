from datetime import date
from uuid import uuid4


def _create_store_deposit(admin_client, name: str):
    res = admin_client.post(
        "/api/deposits",
        json={
            "name": name,
            "location": "Test",
            "controls_lot": False,
            "is_store": True,
        },
    )
    assert res.status_code == 201
    return res.json()


def _get_orderable_sku(admin_client):
    res = admin_client.get("/api/skus")
    assert res.status_code == 200
    for sku in res.json():
        if sku["sku_type_code"] not in {"MP", "SEMI"}:
            return sku
    raise AssertionError("No se encontró un SKU válido para pedidos")


def _create_order(admin_client, deposit_id: int, sku_id: int, status: str):
    res = admin_client.post(
        "/api/orders",
        json={
            "destination_deposit_id": deposit_id,
            "requested_by": "Tester",
            "status": status,
            "items": [
                {
                    "sku_id": sku_id,
                    "quantity": 2,
                    "current_stock": 10,
                }
            ],
        },
    )
    assert res.status_code == 201
    return res.json()


def _create_shipment(admin_client, deposit_id: int):
    res = admin_client.post(
        "/api/shipments",
        json={
            "deposit_id": deposit_id,
            "estimated_delivery_date": date.today().isoformat(),
        },
    )
    assert res.status_code == 201
    return res.json()


def test_order_status_endpoints_block_logistics_statuses(admin_client):
    deposit = _create_store_deposit(admin_client, f"Local Test {uuid4().hex[:6]}")
    sku = _get_orderable_sku(admin_client)
    order = _create_order(admin_client, deposit["id"], sku["id"], "draft")

    res = admin_client.post(f"/api/orders/{order['id']}/status", json={"status": "prepared"})
    assert res.status_code == 400
    assert res.json()["detail"] == "El estado de despacho solo se actualiza desde envíos"

    res = admin_client.put(f"/api/orders/{order['id']}", json={"status": "prepared"})
    assert res.status_code == 400
    assert res.json()["detail"] == "El estado de despacho solo se actualiza desde envíos"


def test_order_cannot_cancel_when_assigned_to_shipment(admin_client):
    deposit = _create_store_deposit(admin_client, f"Local Test {uuid4().hex[:6]}")
    sku = _get_orderable_sku(admin_client)
    order = _create_order(admin_client, deposit["id"], sku["id"], "submitted")
    shipment = _create_shipment(admin_client, deposit["id"])

    res = admin_client.post(f"/api/shipments/{shipment['id']}/add-orders", json={"order_ids": [order["id"]]})
    assert res.status_code == 200

    res = admin_client.post(f"/api/orders/{order['id']}/status", json={"status": "cancelled"})
    assert res.status_code == 400
    assert res.json()["detail"] == "No se puede cancelar: el pedido ya está incluido en un envío."


def test_order_can_cancel_without_shipments(admin_client):
    deposit = _create_store_deposit(admin_client, f"Local Test {uuid4().hex[:6]}")
    sku = _get_orderable_sku(admin_client)
    order = _create_order(admin_client, deposit["id"], sku["id"], "submitted")

    res = admin_client.post(f"/api/orders/{order['id']}/status", json={"status": "cancelled"})
    assert res.status_code == 200
    assert res.json()["status"] == "cancelled"
