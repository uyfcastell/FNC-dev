from app.models import ShipmentStatus
from sqlmodel import Session, select

from app.db import engine
from app.models import Shipment


def _create_order(client):
    destination = next(deposit for deposit in client.get("/api/deposits").json() if deposit.get("is_store"))
    sku = client.get("/api/skus").json()[0]
    res = client.post(
        "/api/orders",
        json={
            "destination_deposit_id": destination["id"],
            "requested_by": "Test",
            "status": "draft",
            "items": [{"sku_id": sku["id"], "quantity": 4, "current_stock": 2}],
        },
    )
    assert res.status_code == 201, res.text
    return res.json()


def _create_shipment_for_order(client, order):
    payload = {
        "destination_deposit_id": order["destination_deposit_id"],
        "estimated_delivery_date": "2030-01-01",
    }
    res = client.post("/api/shipments", json=payload)
    assert res.status_code == 201, res.text
    return res.json()


def test_order_status_submit_works_without_orders_edit_permission(client_with_perms):
    client = client_with_perms(["deposits.view", "skus.view", "orders.create", "orders.submit"])
    order = _create_order(client)

    submit_res = client.post(f"/api/orders/{order['id']}/status", json={"status": "submitted"})
    assert submit_res.status_code == 200, submit_res.text


def test_order_status_cancel_requires_cancel_permission(client_with_perms):
    client = client_with_perms(["deposits.view", "skus.view", "orders.create", "orders.submit"])
    order = _create_order(client)

    cancel_res = client.post(f"/api/orders/{order['id']}/status", json={"status": "cancelled"})
    assert cancel_res.status_code == 403


def test_shipment_add_orders_requires_functional_permission_and_draft_state(client_with_perms):
    setup_client = client_with_perms(
        [
            "deposits.view",
            "skus.view",
            "orders.create",
            "orders.submit",
            "shipments.create",
            "shipments.add_orders",
        ]
    )
    order = _create_order(setup_client)
    submit_res = setup_client.post(f"/api/orders/{order['id']}/status", json={"status": "submitted"})
    assert submit_res.status_code == 200, submit_res.text
    shipment = _create_shipment_for_order(setup_client, order)

    no_permission_client = client_with_perms(["deposits.view", "skus.view", "orders.view", "shipments.view"])
    forbidden_res = no_permission_client.post(
        f"/api/shipments/{shipment['id']}/add-orders",
        json={"order_ids": [order["id"]]},
    )
    assert forbidden_res.status_code == 403

    with Session(engine) as session:
        db_shipment = session.exec(select(Shipment).where(Shipment.id == shipment["id"])).first()
        assert db_shipment is not None
        db_shipment.status = ShipmentStatus.CONFIRMED
        session.add(db_shipment)
        session.commit()

    allowed_client = client_with_perms(["shipments.add_orders", "remitos.view", "orders.view"])
    invalid_state_res = allowed_client.post(
        f"/api/shipments/{shipment['id']}/add-orders",
        json={"order_ids": [order["id"]]},
    )
    assert invalid_state_res.status_code == 400
