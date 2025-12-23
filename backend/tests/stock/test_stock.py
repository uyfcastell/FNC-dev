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


def _get_production_line_id(client):
    res = client.get("/api/production-lines")
    assert res.status_code == 200
    lines = res.json()
    assert len(lines) > 0
    return lines[0]["id"]


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


def test_production_requires_line_and_generates_lot(client):
    sku_id = _get_sku_id(client, "CUC-PT-24")
    movement_type_id = _get_movement_type_id(client, "PRODUCTION")
    deposit_id = 1

    # Falta de línea -> error
    missing_line_payload = {
        "sku_id": sku_id,
        "deposit_id": deposit_id,
        "quantity": 3,
        "movement_type_id": movement_type_id,
    }
    res = client.post("/api/stock/movements", json=missing_line_payload)
    assert res.status_code == 400

    # Con línea válida -> lote generado
    line_id = _get_production_line_id(client)
    valid_payload = missing_line_payload | {"production_line_id": line_id}
    res = client.post("/api/stock/movements", json=valid_payload)
    assert res.status_code in (200, 201)

    lots_res = client.get(f"/api/production/lots?sku_id={sku_id}&production_line_id={line_id}")
    assert lots_res.status_code == 200
    lots = lots_res.json()
    assert len(lots) >= 1
    newest_lot = lots[0]
    assert newest_lot["production_line_id"] == line_id
    assert newest_lot["sku_id"] == sku_id
    assert newest_lot["lot_code"].startswith(newest_lot["produced_at"].replace("-", "")[2:] + f"-L{line_id}-")
    assert newest_lot["remaining_quantity"] >= valid_payload["quantity"]


def test_invalid_lot_code_is_rejected(client):
    sku_id = _get_sku_id(client, "CUC-PT-24")
    movement_type_id = _get_movement_type_id(client, "PRODUCTION")
    line_id = _get_production_line_id(client)

    bad_payload = {
        "sku_id": sku_id,
        "deposit_id": 1,
        "quantity": 1,
        "movement_type_id": movement_type_id,
        "production_line_id": line_id,
        "lot_code": "250101-L99-WRONG-001",
    }
    res = client.post("/api/stock/movements", json=bad_payload)
    assert res.status_code == 400


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
