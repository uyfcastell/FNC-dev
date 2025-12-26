import os
import sys
from pathlib import Path

# --- IMPORTANTE: esto va primero ---
os.environ["DATABASE_URL"] = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:20251212@localhost:5432/fnc_test"
)
os.environ["LOAD_SEED"] = "true"
# -----------------------------------

# Asegura que la carpeta backend esté en PYTHONPATH
BASE_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(BASE_DIR))

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db import init_db

# =======================
# AUTH OVERRIDE PARA TEST
# =======================
from fastapi.security import OAuth2PasswordBearer

def fake_oauth():
    return "fake-token"

# Override global de seguridad
app.dependency_overrides[OAuth2PasswordBearer] = fake_oauth


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """
    Inicializa la base de datos de test + seeds.
    Se ejecuta una sola vez por sesión de pytest.
    """
    init_db()
    yield


@pytest.fixture()
def client():
    """
    Cliente HTTP para pruebas.
    """
    return TestClient(app)
