import uuid


def _get_sku_type_id(client, code: str) -> int:
    res = client.get("/api/sku-types")
    assert res.status_code == 200
    data = res.json()
    return next(item["id"] for item in data if item["code"] == code)


def test_list_skus(client):
    res = client.get("/api/skus")
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_list_sku_types(client):
    res = client.get("/api/sku-types")
    assert res.status_code == 200
    data = res.json()
    codes = {item["code"] for item in data}
    assert "MP" in codes
    assert "PT" in codes


def test_create_valid_sku(client):
    # Código único para evitar duplicados
    code = f"TEST-{uuid.uuid4().hex[:6]}"
    sku_type_id = _get_sku_type_id(client, "PT")

    payload = {
        "code": code,
        "name": "SKU Test",
        "sku_type_id": sku_type_id,
        "unit": "unit",
        "is_active": True,
    }

    res = client.post("/api/skus", json=payload)
    print(res.json())
    assert res.status_code in (200, 201)

    data = res.json()
    assert data["code"] == code


def test_delete_sku_in_use_returns_conflict(client):
    res = client.get("/api/skus")
    assert res.status_code == 200
    sku = next(item for item in res.json() if item["code"] == "CUC-GRANEL")
    delete_res = client.delete(f"/api/skus/{sku['id']}")
    assert delete_res.status_code == 409


def test_inactivate_sku_filters_by_default(client):
    code = f"TEST-INACTIVE-{uuid.uuid4().hex[:6]}"
    sku_type_id = _get_sku_type_id(client, "PT")

    payload = {
        "code": code,
        "name": "SKU Inactivo",
        "sku_type_id": sku_type_id,
        "unit": "unit",
        "is_active": True,
    }

    res = client.post("/api/skus", json=payload)
    assert res.status_code in (200, 201)
    sku_id = res.json()["id"]

    res = client.patch(f"/api/skus/{sku_id}/status", json={"is_active": False})
    assert res.status_code == 200

    res = client.get("/api/skus")
    assert res.status_code == 200
    assert all(item["id"] != sku_id for item in res.json())

    res = client.get("/api/skus?include_inactive=true")
    assert res.status_code == 200
    assert any(item["id"] == sku_id for item in res.json())
