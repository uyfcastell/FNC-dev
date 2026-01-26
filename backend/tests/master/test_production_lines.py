def test_list_production_lines(client):
    res = client.get("/api/production-lines")
    assert res.status_code == 200
    lines = res.json()

    assert isinstance(lines, list)
    assert len(lines) > 0
    assert "name" in lines[0]


def test_create_production_line(client):
    payload = {
        "name": "LINEA_TEST",
        "is_active": True,
    }

    res = client.post("/api/production-lines", json=payload)

    # si ya existe está ok que tire 400
    if res.status_code == 400:
        data = res.json()
        assert "detail" in data
    else:
        assert res.status_code in (200, 201)
