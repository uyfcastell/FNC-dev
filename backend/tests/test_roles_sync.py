from sqlmodel import Session, select

from app.core.roles_catalog import CANONICAL_ROLE_NAMES, is_test_role_name
from app.db import engine
from app.models import Permission, Role, RolePermission, User
from app.core.security import hash_password
from scripts.sync_roles import cleanup_test_roles, ensure_canonical_roles


def test_is_test_role_name_detects_known_prefixes():
    assert is_test_role_name("RBAC Role f52c9f85")
    assert is_test_role_name("PR2 BaseOnly")
    assert not is_test_role_name("Administración")


def test_sync_roles_creates_missing_canonical_roles():
    with Session(engine) as session:
        role = session.exec(select(Role).where(Role.name == "Auditoría")).first()
        if role:
            session.delete(role)
            session.commit()

        result = ensure_canonical_roles(session)
        assert result["canonical_roles_created"] >= 1

        restored = session.exec(select(Role).where(Role.name == "Auditoría")).first()
        assert restored is not None


def test_cleanup_test_roles_deletes_roles_permissions_and_test_users():
    with Session(engine) as session:
        test_role = Role(name="PR2 Inventory", description="tmp")
        session.add(test_role)
        session.flush()

        permission = Permission(key="test.cleanup.role", label="Test", category="Tests", action="run")
        session.add(permission)
        session.flush()
        session.add(RolePermission(role_id=test_role.id, permission_id=permission.id))
        session.add(
            User(
                email="rbac-temp@example.com",
                full_name="RBAC Temp",
                hashed_password=hash_password("Test1234!"),
                is_active=True,
                role_id=test_role.id,
            )
        )
        session.commit()

        summary = cleanup_test_roles(session)
        assert summary["roles_deleted"] >= 1
        assert summary["users_deleted"] >= 1

        deleted_role = session.exec(select(Role).where(Role.name == "PR2 Inventory")).first()
        assert deleted_role is None


def test_roles_endpoint_only_canonical_filter(client_with_perms):
    client = client_with_perms(["roles.view"])
    with Session(engine) as session:
        if not session.exec(select(Role).where(Role.name == "RBAC Role to-hide")).first():
            session.add(Role(name="RBAC Role to-hide", description="tmp"))
            session.commit()

    response = client.get("/api/roles?only_canonical=true")
    assert response.status_code == 200
    names = {role["name"] for role in response.json()}
    assert names.issubset(CANONICAL_ROLE_NAMES)
    assert "RBAC Role to-hide" not in names
