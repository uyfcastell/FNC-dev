import uuid


def _get_sku_type_id(client, code: str) -> int:
    res = client.get("/api/sku-types")
    assert res.status_code == 200
    data = res.json()
    return next(item["id"] for item in data if item["code"] == code)


def _create_sku(client, sku_type_code: str, name: str) -> dict:
    sku_type_id = _get_sku_type_id(client, sku_type_code)
    payload = {
        "code": f"TEST-{sku_type_code}-{uuid.uuid4().hex[:6]}",
        "name": name,
        "sku_type_id": sku_type_id,
        "unit": "unit",
        "is_active": True,
    }
    res = client.post("/api/skus", json=payload)
    assert res.status_code in (200, 201)
    return res.json()


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


def test_production_allows_ma_pi_types_and_rejects_invalid(client):
    movement_type_id = _get_movement_type_id(client, "PRODUCTION")
    line_id = _get_production_line_id(client)
    deposit_id = 1

    for sku_type in ("MA", "PI"):
        sku = _create_sku(client, sku_type, f"Producto {sku_type}")
        payload = {
            "sku_id": sku["id"],
            "deposit_id": deposit_id,
            "quantity": 2,
            "movement_type_id": movement_type_id,
            "production_line_id": line_id,
        }
        res = client.post("/api/stock/movements", json=payload)
        assert res.status_code in (200, 201)

    invalid_sku = _create_sku(client, "LIM", "Producto LIM")
    invalid_payload = {
        "sku_id": invalid_sku["id"],
        "deposit_id": deposit_id,
        "quantity": 1,
        "movement_type_id": movement_type_id,
        "production_line_id": line_id,
    }
    res = client.post("/api/stock/movements", json=invalid_payload)
    assert res.status_code == 400
    detail = res.json().get("detail", "")
    assert "permitido" in detail
    assert "MA" in detail
    assert "PI" in detail
    assert "PT" in detail
    assert "PACK" in detail


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


def test_list_stock_movements_with_filters(client):
    sku_id = _get_sku_id(client, "MP-HARINA")
    movement_type_id = _get_movement_type_id(client, "ADJUSTMENT")
    movement = {
        "sku_id": sku_id,
        "deposit_id": 1,
        "quantity": 1,
        "movement_type_id": movement_type_id,
        "reference": "test-listing",
    }
    res = client.post("/api/stock/movements", json=movement)
    assert res.status_code in (200, 201)

    list_res = client.get(
        f"/api/stock/movements?sku_id={sku_id}&movement_type_id={movement_type_id}&limit=5&offset=0"
    )
    assert list_res.status_code == 200
    data = list_res.json()
    assert data["total"] >= 1
    assert any(item["sku_id"] == sku_id for item in data["items"])
