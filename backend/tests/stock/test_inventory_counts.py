from datetime import date


def _get_sku_id(client, code):
    res = client.get("/api/skus")
    assert res.status_code == 200
    sku = next(s for s in res.json() if s["code"] == code)
    return sku["id"]


def _get_movement_type_id(client, code):
    res = client.get("/api/stock/movement-types")
    assert res.status_code == 200
    types = res.json()
    return next(t["id"] for t in types if t["code"] == code)


def _get_production_line_id(client):
    res = client.get("/api/production-lines")
    assert res.status_code == 200
    return res.json()[0]["id"]


def test_inventory_count_flow(client):
    sku_id = _get_sku_id(client, "CUC-PT-24")
    movement_type_id = _get_movement_type_id(client, "PRODUCTION")
    line_id = _get_production_line_id(client)

    production_payload = {
        "sku_id": sku_id,
        "deposit_id": 1,
        "quantity": 5,
        "movement_type_id": movement_type_id,
        "production_line_id": line_id,
    }
    res = client.post("/api/stock/movements", json=production_payload)
    assert res.status_code in (200, 201)

    lots_res = client.get(f"/api/production/lots?sku_id={sku_id}&deposit_id=1&available_only=true")
    assert lots_res.status_code == 200
    lot_id = lots_res.json()[0]["id"]

    count_payload = {
        "deposit_id": 1,
        "count_date": date.today().isoformat(),
        "items": [
            {
                "sku_id": sku_id,
                "counted_quantity": 3,
                "production_lot_id": lot_id,
            }
        ],
    }
    create_res = client.post("/api/inventory-counts", json=count_payload)
    assert create_res.status_code == 201
    count = create_res.json()
    assert count["status"] == "draft"

    submit_res = client.post(f"/api/inventory-counts/{count['id']}/submit")
    assert submit_res.status_code == 200
    assert submit_res.json()["status"] == "submitted"

    approve_res = client.post(f"/api/inventory-counts/{count['id']}/approve")
    assert approve_res.status_code == 200
    approved = approve_res.json()
    assert approved["status"] == "approved"
    assert approved["items"][0]["stock_movement_id"]
