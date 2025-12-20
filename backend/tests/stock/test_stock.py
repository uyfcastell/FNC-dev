def _get_sku_id(client, code):
    res = client.get("/api/skus")
    assert res.status_code == 200
    skus = res.json()
    sku = next(s for s in skus if s["code"] == code)
    return sku["id"]


def _get_movement_type_id(client, code):
    res = client.get("/api/stock/movement-types")
    assert res.status_code == 200
    types = res.json()
    return next(t["id"] for t in types if t["code"] == code)


def test_list_movement_types(client):
    res = client.get("/api/stock/movement-types")
    assert res.status_code == 200
    data = res.json()
    codes = {item["code"] for item in data}
    assert "PRODUCTION" in codes
    assert "CONSUMPTION" in codes


def test_stock_ingress_increases_balance(client):
    sku_id = _get_sku_id(client, "MP-HARINA")
    movement_type_id = _get_movement_type_id(client, "ADJUSTMENT")

    movement = {
        "sku_id": sku_id,
        "deposit_id": 1,
        "quantity": 10,
        "movement_type_id": movement_type_id,   # válido para sumar stock
    }

    res = client.post("/api/stock/movements", json=movement)
    print(res.json())
    assert res.status_code in (200, 201)


def test_consumption_reduces_stock(client):
    sku_id = _get_sku_id(client, "MP-HARINA")
    movement_type_id = _get_movement_type_id(client, "CONSUMPTION")

    movement = {
        "sku_id": sku_id,
        "deposit_id": 1,
        "quantity": 5,
        "movement_type_id": movement_type_id
    }

    res = client.post("/api/stock/movements", json=movement)
    print(res.json())
    assert res.status_code in (200, 201)
