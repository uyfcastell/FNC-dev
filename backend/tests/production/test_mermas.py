def _get_sku_id(client, code):
    res = client.get("/api/skus")
    assert res.status_code == 200
    skus = res.json()
    sku = next(s for s in skus if s["code"] == code)
    return sku["id"]


def _get_type_id(client):
    res = client.get("/api/mermas/types")
    assert res.status_code == 200
    return res.json()[0]["id"]


def _get_cause_id(client):
    res = client.get("/api/mermas/causes")
    assert res.status_code == 200
    return res.json()[0]["id"]

def _get_production_line_id(client):
    res = client.get("/api/production-lines")
    assert res.status_code == 200
    lines = res.json()
    assert len(lines) > 0
    return lines[0]["id"]

def test_register_production_merma_affects_stock(client):
    sku_id = _get_sku_id(client, "CUC-PT-24")
    type_id = _get_type_id(client)
    cause_id = _get_cause_id(client)
    line_id = _get_production_line_id(client)

    payload = {
        "stage": "PRODUCTION",
        "sku_id": sku_id,
        "deposit_id": 1,
        "production_line_id": line_id,
        "quantity": 2,
        "type_id": type_id,
        "cause_id": cause_id,
        "affects_stock": True
    }

    res = client.post("/api/mermas", json=payload)
    print(res.json())
    assert res.status_code in (200, 201)
    data = res.json()

    assert data["affects_stock"] is True
    assert data["stock_movement_id"] is not None


def test_merma_without_stock_not_affecting_balance(client):
    sku_id = _get_sku_id(client, "CUC-PT-24")
    type_id = _get_type_id(client)
    cause_id = _get_cause_id(client)
    line_id = _get_production_line_id(client)

    payload = {
        "stage": "PRODUCTION",
        "sku_id": sku_id,
        "production_line_id": line_id,
        "deposit_id": 1,      # 👉 obligatorio según reglas de negocio
        "quantity": 1,
        "type_id": type_id,
        "cause_id": cause_id,
        "affects_stock": False
    }

    res = client.post("/api/mermas", json=payload)
    print(res.json())
    assert res.status_code in (200, 201)
    data = res.json()

    assert data["stock_movement_id"] is None

