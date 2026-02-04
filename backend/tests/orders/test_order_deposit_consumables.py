from datetime import date
from uuid import uuid4


def _create_store_deposit(client, name: str):
    res = client.post(
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


def _get_sku_type_id(client, code: str) -> int:
    res = client.get("/api/sku-types")
    assert res.status_code == 200
    data = res.json()
    return next(item["id"] for item in data if item["code"] == code)


def _create_sku(client, sku_type_code: str, name: str) -> dict:
    sku_type_id = _get_sku_type_id(client, sku_type_code)
    res = client.post(
        "/api/skus",
        json={
            "code": f"TEST-{sku_type_code}-{uuid4().hex[:6]}",
            "name": name,
            "sku_type_id": sku_type_id,
            "unit": "unit",
            "is_active": True,
        },
    )
    assert res.status_code in (200, 201)
    return res.json()


def _create_order(client, deposit_id: int, sku_id: int):
    res = client.post(
        "/api/orders",
        json={
            "destination_deposit_id": deposit_id,
            "requested_by": "Tester",
            "status": "submitted",
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


def _create_shipment(client, deposit_id: int):
    res = client.post(
        "/api/shipments",
        json={
            "deposit_id": deposit_id,
            "estimated_delivery_date": date.today().isoformat(),
        },
    )
    assert res.status_code == 201
    return res.json()


def test_order_with_dep_consumable_can_generate_remito(client):
    deposit = _create_store_deposit(client, f"Local Test {uuid4().hex[:6]}")
    sku = _create_sku(client, "DEP", "Consumible depósito")
    order = _create_order(client, deposit["id"], sku["id"])
    shipment = _create_shipment(client, deposit["id"])

    res = client.post(f"/api/shipments/{shipment['id']}/add-orders", json={"order_ids": [order["id"]]})
    assert res.status_code == 200

    res = client.post(f"/api/shipments/{shipment['id']}/confirm")
    assert res.status_code == 200
    assert res.json()["status"] == "confirmed"
