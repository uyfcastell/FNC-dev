
def test_auth_me_includes_permission_keys_v2(client_with_perms):
    client = client_with_perms(["ops.orders.create", "orders.create"])

    response = client.get("/api/auth/me")

    assert response.status_code == 200, response.text
    payload = response.json()

    assert "permissions" in payload
    assert isinstance(payload["permissions"], list)

    assert "permission_keys_v2" in payload
    assert isinstance(payload["permission_keys_v2"], list)
    assert all(isinstance(item, str) for item in payload["permission_keys_v2"])
    assert "ops.orders.create" in payload["permission_keys_v2"]
