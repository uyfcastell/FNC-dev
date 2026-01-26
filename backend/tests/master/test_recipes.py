import uuid


def _get_sku_type_id(client, code: str) -> int:
    res = client.get("/api/sku-types")
    assert res.status_code == 200
    data = res.json()
    return next(item["id"] for item in data if item["code"] == code)


def test_inactivate_recipe_filters_by_default(client):
    sku_type_id = _get_sku_type_id(client, "PT")
    sku_code = f"TEST-REC-{uuid.uuid4().hex[:6]}"
    sku_payload = {
        "code": sku_code,
        "name": "Producto receta",
        "sku_type_id": sku_type_id,
        "unit": "unit",
        "is_active": True,
    }
    sku_res = client.post("/api/skus", json=sku_payload)
    assert sku_res.status_code in (200, 201)
    product_id = sku_res.json()["id"]

    skus = client.get("/api/skus?include_inactive=true")
    assert skus.status_code == 200
    component_id = next(item["id"] for item in skus.json() if item["code"] == "MP-HARINA")

    recipe_payload = {
        "product_id": product_id,
        "name": "Receta de prueba",
        "items": [{"component_id": component_id, "quantity": 1}],
        "is_active": True,
    }
    res = client.post("/api/recipes", json=recipe_payload)
    assert res.status_code in (200, 201)
    recipe_id = res.json()["id"]

    res = client.patch(f"/api/recipes/{recipe_id}/status", json={"is_active": False})
    assert res.status_code == 200

    res = client.get("/api/recipes")
    assert res.status_code == 200
    assert all(item["id"] != recipe_id for item in res.json())

    res = client.get("/api/recipes?include_inactive=true")
    assert res.status_code == 200
    assert any(item["id"] == recipe_id for item in res.json())


def test_delete_recipe_in_use_returns_conflict(client):
    recipes = client.get("/api/recipes")
    assert recipes.status_code == 200
    recipe = recipes.json()[0]
    product_id = recipe["product_id"]

    deposits = client.get("/api/deposits")
    assert deposits.status_code == 200
    deposit_id = deposits.json()[0]["id"]

    lines = client.get("/api/production-lines")
    assert lines.status_code == 200
    production_line_id = lines.json()[0]["id"]

    movement_types = client.get("/api/stock/movement-types")
    assert movement_types.status_code == 200
    production_type_id = next(mt["id"] for mt in movement_types.json() if mt["code"] == "PRODUCTION")

    move_payload = {
        "sku_id": product_id,
        "deposit_id": deposit_id,
        "movement_type_id": production_type_id,
        "quantity": 1,
        "production_line_id": production_line_id,
    }
    move_res = client.post("/api/stock/movements", json=move_payload)
    assert move_res.status_code in (200, 201)

    delete_res = client.delete(f"/api/recipes/{recipe['id']}")
    assert delete_res.status_code == 409
