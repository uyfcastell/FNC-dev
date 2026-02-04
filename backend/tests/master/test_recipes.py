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


def test_recipe_allows_ma_pi_products_and_components(client):
    component_ma = _create_sku(client, "MA", "Componente MA")
    component_pi = _create_sku(client, "PI", "Componente PI")

    for product_type in ["MA", "PI"]:
        product = _create_sku(client, product_type, f"Producto {product_type}")
        recipe_payload = {
            "product_id": product["id"],
            "name": f"Receta {product_type}",
            "items": [
                {"component_id": component_ma["id"], "quantity": 1},
                {"component_id": component_pi["id"], "quantity": 2},
            ],
            "is_active": True,
        }
        res = client.post("/api/recipes", json=recipe_payload)
        assert res.status_code in (200, 201)


def test_recipe_rejects_disallowed_types(client):
    product = _create_sku(client, "CON", "Producto CON")
    component = _create_sku(client, "PAP", "Componente PAP")

    res = client.post(
        "/api/recipes",
        json={
            "product_id": product["id"],
            "name": "Receta inválida",
            "items": [{"component_id": component["id"], "quantity": 1}],
            "is_active": True,
        },
    )
    assert res.status_code == 400
    assert res.json()["detail"] == "Tipo de producto CON no permitido; permitido: MA, PACK, PI, PT"

    product_ok = _create_sku(client, "MA", "Producto MA")
    res = client.post(
        "/api/recipes",
        json={
            "product_id": product_ok["id"],
            "name": "Receta inválida componente",
            "items": [{"component_id": component["id"], "quantity": 1}],
            "is_active": True,
        },
    )
    assert res.status_code == 400
    assert res.json()["detail"] == (
        "Tipo de componente PAP no permitido; permitido: CON, MA, MP, PACK, PI, PT"
    )
