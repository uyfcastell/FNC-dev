from fastapi.testclient import TestClient

from app.api.deps import get_current_user
from app.main import app


def _client_without_user_override() -> TestClient:
    original_override = app.dependency_overrides.pop(get_current_user, None)
    client = TestClient(app)
    app.state._original_get_current_user_override = original_override
    return client


def _restore_user_override() -> None:
    original_override = getattr(app.state, "_original_get_current_user_override", None)
    if original_override is not None:
        app.dependency_overrides[get_current_user] = original_override
        delattr(app.state, "_original_get_current_user_override")


def test_get_orders_without_token_returns_auth_error_not_500():
    client = _client_without_user_override()
    try:
        response = client.get("/api/orders")
    finally:
        _restore_user_override()

    assert response.status_code in {401, 403}, response.text
    assert response.status_code != 500, response.text


def test_get_orders_with_invalid_token_returns_401_not_500():
    client = _client_without_user_override()
    try:
        response = client.get("/api/orders", headers={"Authorization": "Bearer token-invalido"})
    finally:
        _restore_user_override()

    assert response.status_code == 401, response.text
    assert response.status_code != 500, response.text
