import uuid


def _create_production_line(client, name: str, is_active: bool = True) -> dict:
    payload = {"name": name, "is_active": is_active}
    res = client.post("/api/production-lines", json=payload)
    assert res.status_code in (200, 201)
    return res.json()


def test_list_production_lines(client):
    res = client.get("/api/production-lines")
    assert res.status_code == 200
    lines = res.json()

    assert isinstance(lines, list)
    assert len(lines) > 0
    assert "name" in lines[0]


def test_create_production_line(client):
    _create_production_line(client, f"LINEA_TEST_{uuid.uuid4().hex[:6]}")


def test_update_and_toggle_production_line(client):
    line = _create_production_line(client, f"LINEA_EDIT_{uuid.uuid4().hex[:6]}")
    updated_name = f"{line['name']}_EDIT"

    res = client.put(f"/api/production-lines/{line['id']}", json={"name": updated_name})
    assert res.status_code in (200, 201)
    data = res.json()
    assert data["name"] == updated_name

    res = client.put(f"/api/production-lines/{line['id']}", json={"is_active": False})
    assert res.status_code in (200, 201)
    data = res.json()
    assert data["is_active"] is False

    res = client.put(f"/api/production-lines/{line['id']}", json={"is_active": True})
    assert res.status_code in (200, 201)
    data = res.json()
    assert data["is_active"] is True
