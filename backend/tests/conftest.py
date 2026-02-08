import os
import sys
from pathlib import Path
from uuid import uuid4

# --- IMPORTANTE: esto va primero ---
os.environ["DATABASE_URL"] = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:20251212@localhost:5432/fnc_test"
)
os.environ["APP_ENV"] = "test"
# -----------------------------------

# Asegura que la carpeta backend esté en PYTHONPATH
BASE_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(BASE_DIR))

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.api.deps import get_current_user
from app.core.security import hash_password
from app.db import engine, init_db
from app.main import app
from app.core.seed import seed_demo
from app.models import Permission, Role, RolePermission, User


# =======================
# AUTH OVERRIDE PARA TEST
# =======================

def override_current_user():
    """
    Usuario fake para tests.
    Simula un usuario admin válido del sistema.
    """

    class FakeUser:
        id = 1
        email = "test-admin@example.com"
        username = "test-admin"
        full_name = "Test Admin"
        is_active = True

        # lo que espera require_role
        role_id = 1
        role = "admin"

    return FakeUser()


app.dependency_overrides[get_current_user] = override_current_user
# =======================


def _ensure_permission(session: Session, key: str) -> Permission:
    permission = session.exec(select(Permission).where(Permission.key == key)).first()
    if permission:
        return permission
    permission = Permission(key=key, category="tests", action="tests", label=key)
    session.add(permission)
    session.flush()
    return permission


def _assign_role_permissions(session: Session, role: Role, keys: list[str]) -> None:
    existing_rel = session.exec(select(RolePermission).where(RolePermission.role_id == role.id)).all()
    for rel in existing_rel:
        session.delete(rel)
    session.flush()

    for key in keys:
        permission = _ensure_permission(session, key)
        session.add(RolePermission(role_id=role.id, permission_id=permission.id))


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """
    Inicializa la base de datos de test + seeds.
    Se ejecuta una sola vez por sesión de pytest.
    """
    init_db()
    from app.db import engine
    from sqlmodel import Session

    with Session(engine) as session:
        seed_demo(session)
    yield


@pytest.fixture()
def client():
    """
    Cliente HTTP para pruebas.
    """
    return TestClient(app)


@pytest.fixture()
def client_with_perms():
    """Factory de clientes autenticados con permisos configurables para RBAC tests."""
    original_override = app.dependency_overrides.pop(get_current_user, None)
    created_clients: list[TestClient] = []

    def _build(perms: list[str]):
        unique = uuid4().hex[:8]
        email = f"rbac-{unique}@example.com"
        password = "Test1234!"
        role_name = f"RBAC Role {unique}"

        with Session(engine) as session:
            role = Role(name=role_name, description="Role for RBAC tests")
            session.add(role)
            session.flush()

            normalized_perms = sorted(set(perms))
            _assign_role_permissions(session, role, normalized_perms)

            user = User(
                email=email,
                full_name=f"RBAC User {unique}",
                hashed_password=hash_password(password),
                is_active=True,
                role_id=role.id,
            )
            session.add(user)
            session.commit()

        api_client = TestClient(app)
        login_res = api_client.post(
            "/api/auth/login",
            json={"username": email, "password": password},
        )
        assert login_res.status_code == 200, login_res.text
        token = login_res.json()["access_token"]
        api_client.headers.update({"Authorization": f"Bearer {token}"})
        created_clients.append(api_client)
        return api_client

    yield _build

    for api_client in created_clients:
        api_client.close()
    if original_override is not None:
        app.dependency_overrides[get_current_user] = original_override


@pytest.fixture()
def admin_client(client_with_perms):
    return client_with_perms(
        [
            "master.deposits.create",
            "deposits.create",
            "ops.lookups.skus.list",
            "skus.view",
            "ops.orders.create",
            "orders.create",
            "ops.orders.change_status",
            "orders.submit",
            "orders.cancel",
            "ops.orders.submit",
            "ops.orders.cancel",
            "ops.shipments.create",
            "shipments.create",
            "ops.shipments.add_orders",
            "remitos.edit",
        ]
    )
