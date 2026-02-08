
def test_users_endpoint_returns_200_with_permission_keys_v2(client_with_perms):
    client = client_with_perms(["admin.users.list", "ops.orders.create"])

    response = client.get("/api/users")

    assert response.status_code == 200, response.text
    payload = response.json()
    assert isinstance(payload, list)
    assert payload

    first_user = payload[0]
    assert "permission_keys_v2" in first_user
    assert isinstance(first_user["permission_keys_v2"], list)
    assert all(isinstance(item, str) for item in first_user["permission_keys_v2"])


def test_auth_me_still_works_with_scalar_permission_loading(client_with_perms):
    client = client_with_perms(["admin.users.list", "ops.orders.create"])

    response = client.get("/api/auth/me")

    assert response.status_code == 200, response.text
    payload = response.json()
    assert "permission_keys_v2" in payload
    assert all(isinstance(item, str) for item in payload["permission_keys_v2"])
