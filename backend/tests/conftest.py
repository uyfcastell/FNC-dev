import os
import sys
from pathlib import Path

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
from app.main import app
from app.db import init_db
from app.core.seed import seed_demo


# =======================
# AUTH OVERRIDE PARA TEST
# =======================

from app.api.deps import get_current_user


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
