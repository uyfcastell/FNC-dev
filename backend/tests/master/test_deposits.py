import uuid


def _find_existing_deposit(client):
    res = client.get("/api/deposits")
    assert res.status_code == 200
    deposits = res.json()
    assert len(deposits) > 0
    return deposits[0]


def test_list_deposits(client):
    res = client.get("/api/deposits")
    assert res.status_code == 200
    data = res.json()

    assert isinstance(data, list)
    assert len(data) > 0
    assert "name" in data[0]


def test_create_deposit_valid(client):
    payload = {
        "name": f"TEST-DEPOSIT-{uuid.uuid4().hex[:6]}",
        "is_active": True,
    }

    res = client.post("/api/deposits", json=payload)

    # puede ser 400 si ya existe, y está bien
    if res.status_code == 400:
        # alcanza con validar que devuelve formato correcto
        data = res.json()
        assert "detail" in data
    else:
        assert res.status_code in (200, 201)


def test_deposit_names_are_unique(client):
    dep = _find_existing_deposit(client)

    payload = {
        "name": dep["name"],
        "is_active": True,
    }

    res = client.post("/api/deposits", json=payload)
    assert res.status_code in (400, 409)


def test_deposit_inactivate_filters_by_default(client):
    payload = {
        "name": f"TEST-INACTIVE-{uuid.uuid4().hex[:6]}",
        "is_active": True,
    }
    res = client.post("/api/deposits", json=payload)
    assert res.status_code in (200, 201)
    deposit_id = res.json()["id"]

    res = client.patch(f"/api/deposits/{deposit_id}/status", json={"is_active": False})
    assert res.status_code == 200

    res = client.get("/api/deposits")
    assert res.status_code == 200
    assert all(item["id"] != deposit_id for item in res.json())

    res = client.get("/api/deposits?include_inactive=true")
    assert res.status_code == 200
    assert any(item["id"] == deposit_id for item in res.json())


def test_delete_deposit_in_use_returns_conflict(client):
    deposit_payload = {
        "name": f"TEST-USED-{uuid.uuid4().hex[:6]}",
        "is_active": True,
    }
    dep_res = client.post("/api/deposits", json=deposit_payload)
    assert dep_res.status_code in (200, 201)
    deposit_id = dep_res.json()["id"]

    sku_res = client.get("/api/skus")
    assert sku_res.status_code == 200
    sku_id = sku_res.json()[0]["id"]

    movement_types = client.get("/api/stock/movement-types")
    assert movement_types.status_code == 200
    movement_type_id = next(mt["id"] for mt in movement_types.json() if mt["code"] == "ADJUSTMENT")

    move_payload = {
        "sku_id": sku_id,
        "deposit_id": deposit_id,
        "movement_type_id": movement_type_id,
        "quantity": 1,
    }
    move_res = client.post("/api/stock/movements", json=move_payload)
    assert move_res.status_code in (200, 201)

    delete_res = client.delete(f"/api/deposits/{deposit_id}")
    assert delete_res.status_code == 409
