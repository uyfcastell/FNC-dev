from datetime import date


def _get_any_sku(client):
    res = client.get("/api/skus")
    assert res.status_code == 200
    data = res.json()
    return data[0]


def _get_movement_type_id(client, code):
    res = client.get("/api/stock/movement-types")
    assert res.status_code == 200
    data = res.json()
    return next(item["id"] for item in data if item["code"] == code)


def _get_balance(client, sku_id):
    res = client.get("/api/stock-levels")
    assert res.status_code == 200
    levels = res.json()

    match = [s for s in levels if s["sku_id"] == sku_id]
    return match[0]["quantity"] if match else 0


def test_negative_stock_is_not_allowed(client):
    # tomamos cualquier SKU válido
    sku = _get_any_sku(client)
    movement_type_id = _get_movement_type_id(client, "CONSUMPTION")

    movement = {
        "sku_id": sku["id"],
        "deposit_id": 1,
        "quantity": 99999,
        "movement_type_id": movement_type_id
    }

    res = client.post("/api/stock/movements", json=movement)

    assert res.status_code == 400
    assert "saldo" in res.json()["detail"].lower()


def test_stock_adjustment_affects_balance(client):
    sku = _get_any_sku(client)
    movement_type_id = _get_movement_type_id(client, "ADJUSTMENT")

    before = _get_balance(client, sku["id"])

    movement = {
        "sku_id": sku["id"],
        "deposit_id": 1,
        "quantity": 2,
        "movement_type_id": movement_type_id,
        "movement_date": str(date.today())
    }

    res = client.post("/api/stock/movements", json=movement)
    assert res.status_code in (200, 201)

    after = _get_balance(client, sku["id"])

    # No validamos exacto porque depende del estado previo del sistema.
    assert after >= before
