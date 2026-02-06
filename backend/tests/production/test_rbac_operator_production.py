from types import SimpleNamespace

from app.api.deps import get_current_user
from app.db import engine
from app.main import app
from app.models import Role
from sqlmodel import Session, select


def _set_user_override(role_name: str) -> None:
    with Session(engine) as session:
        role = session.exec(select(Role).where(Role.name == role_name)).first()
        assert role is not None

    def _override_user():
        return SimpleNamespace(
            id=777,
            email="op@example.com",
            username="op",
            full_name="Operario",
            is_active=True,
            role_id=role.id,
            role=role_name,
        )

    app.dependency_overrides[get_current_user] = _override_user


def test_operario_produccion_cannot_mutate_lines_or_recipes(client):
    _set_user_override("Operario de Producción")

    line_res = client.post("/api/production-lines", json={"name": "Línea RBAC"})
    assert line_res.status_code == 403

    skus = client.get("/api/skus").json()
    assert len(skus) >= 2
    recipe_res = client.post(
        "/api/recipes",
        json={
            "product_id": skus[0]["id"],
            "name": "Receta RBAC",
            "items": [{"component_id": skus[1]["id"], "quantity": 1}],
        },
    )
    assert recipe_res.status_code == 403
