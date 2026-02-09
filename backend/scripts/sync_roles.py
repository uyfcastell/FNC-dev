from __future__ import annotations

import argparse

from sqlmodel import Session, select

from app.core.roles_catalog import CANONICAL_ROLES, is_test_role_name, is_test_user_email
from app.db import engine
from app.models import Role, RolePermission, User


def cleanup_test_roles(session: Session) -> dict[str, int]:
    """
    Borra roles de test (RBAC Role*, PR2*, etc.) y sus RolePermission.
    IMPORTANTÍSIMO: NO borra usuarios de test, porque pueden estar referenciados
    por FKs (ej: orders.created_by_user_id). En su lugar, los desactiva y les
    quita el role_id si apuntaba a un rol de test.
    """
    roles = session.exec(select(Role)).all()
    test_roles = [role for role in roles if is_test_role_name(role.name)]
    test_role_ids = {role.id for role in test_roles if role.id is not None}

    if not test_role_ids:
        # igual podemos desactivar users "rbac-%@example.com" aunque no haya roles test
        users = session.exec(
            select(User).where(User.email.ilike("rbac-%@example.com"))
        ).all()
        users_disabled = 0
        for user in users:
            if is_test_user_email(user.email):
                if user.is_active:
                    user.is_active = False
                    users_disabled += 1
        if users_disabled:
            session.commit()
        return {
            "roles_deleted": 0,
            "role_permissions_deleted": 0,
            "users_deleted": 0,
            "users_disabled": users_disabled,
        }

    # 1) borrar role_permissions de roles test
    role_permissions = session.exec(
        select(RolePermission).where(RolePermission.role_id.in_(test_role_ids))
    ).all()
    for rel in role_permissions:
        session.delete(rel)

    # 2) desactivar users de test (NO borrar)
    #   - users que tengan role_id en roles test
    #   - users con email de test (rbac-%@example.com)
    users = session.exec(
        select(User).where(
            (User.role_id.in_(test_role_ids))
            | (User.email.ilike("rbac-%@example.com"))
        )
    ).all()

    users_disabled = 0
    users_role_cleared = 0

    for user in users:
        is_test_email = is_test_user_email(user.email)
        has_test_role = user.role_id in test_role_ids

        if not (is_test_email or has_test_role):
            continue

        # Desactivar
        if user.is_active:
            user.is_active = False
            users_disabled += 1

        # Si tenía rol test, lo limpiamos (evita que quede apuntando a un rol borrado)
        if has_test_role:
            user.role_id = None
            users_role_cleared += 1

    # 3) borrar roles test
    for role in test_roles:
        session.delete(role)

    session.commit()
    return {
        "roles_deleted": len(test_roles),
        "role_permissions_deleted": len(role_permissions),
        "users_deleted": 0,
        "users_disabled": users_disabled,
        "users_role_cleared": users_role_cleared,
    }


def ensure_canonical_roles(session: Session) -> dict[str, int]:
    """
    Asegura que existan los roles canónicos EXACTOS (nombres).
    No toca roles no-canónicos.
    """
    existing = {role.name for role in session.exec(select(Role)).all()}
    created = 0
    for role_name in CANONICAL_ROLES:
        if role_name in existing:
            continue
        session.add(Role(name=role_name, description=f"Rol canónico: {role_name}"))
        created += 1
    if created:
        session.commit()
    return {"canonical_roles_created": created}


def run(cleanup: bool = True, sync: bool = True) -> dict[str, int]:
    summary: dict[str, int] = {}
    with Session(engine) as session:
        if cleanup:
            summary.update(cleanup_test_roles(session))
        if sync:
            summary.update(ensure_canonical_roles(session))
    return summary


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Cleanup test RBAC roles and ensure canonical roles (safe: does NOT delete users)"
    )
    parser.add_argument("--skip-cleanup", action="store_true", help="No borra roles/permissions de test ni desactiva users de test")
    parser.add_argument("--skip-sync", action="store_true", help="No crea roles canónicos faltantes")
    args = parser.parse_args()

    summary = run(cleanup=not args.skip_cleanup, sync=not args.skip_sync)
    print("sync_roles summary:")
    for key, value in summary.items():
        print(f" - {key}: {value}")


if __name__ == "__main__":
    main()

