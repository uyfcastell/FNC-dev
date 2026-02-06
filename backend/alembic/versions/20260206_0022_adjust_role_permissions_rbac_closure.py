"""Adjust RBAC role permissions (idempotent)

Revision ID: 20260206_0022
Revises: 20260206_0021
Create Date: 2026-02-06 00:10:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "20260206_0022"
down_revision: Union[str, None] = "20260206_0021"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _grant_permission(role_name: str, permission_key: str) -> None:
    op.execute(
        sa.text(
            """
            INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
            SELECT r.id, p.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            FROM roles r
            JOIN permissions p ON p.key = :permission_key
            WHERE r.name = :role_name
              AND NOT EXISTS (
                SELECT 1
                FROM role_permissions rp
                WHERE rp.role_id = r.id AND rp.permission_id = p.id
              )
            """
        ).bindparams(role_name=role_name, permission_key=permission_key)
    )


def _revoke_permission(role_name: str, permission_key: str) -> None:
    op.execute(
        sa.text(
            """
            DELETE FROM role_permissions rp
            USING roles r, permissions p
            WHERE rp.role_id = r.id
              AND rp.permission_id = p.id
              AND r.name = :role_name
              AND p.key = :permission_key
            """
        ).bindparams(role_name=role_name, permission_key=permission_key)
    )


def upgrade() -> None:
    _grant_permission("Encargado de Locales", "orders.submit")

    for permission in ["remitos.create", "remitos.edit"]:
        _revoke_permission("Encargado de Locales", permission)

    for permission in [
        "production_lines.create_edit",
        "production_lines.delete",
        "recipes.create",
        "recipes.edit",
        "recipes.deactivate",
        "production.create_lot",
        "production.close_lot",
    ]:
        _revoke_permission("Operario de Producción", permission)

    for permission in [
        "production.create_lot",
        "production.close_lot",
        "inventory.create",
        "inventory.edit",
        "inventory.close",
    ]:
        _revoke_permission("Operario de Empaque", permission)

    for permission in [
        "stock.transfer",
        "stock.register",
        "stock.adjust",
        "orders.create",
        "orders.edit",
        "orders.cancel",
    ]:
        _revoke_permission("Encargado de Reparto", permission)

    catalog_mutations = [
        "units.create_edit",
        "units.delete",
        "movement_types.create_edit",
        "movement_types.delete",
        "sku_types.create_edit",
        "sku_types.delete",
        "skus.create",
        "skus.edit",
        "skus.deactivate",
        "suppliers.create",
        "suppliers.edit",
        "suppliers.deactivate",
        "deposits.create",
        "deposits.edit",
        "deposits.deactivate",
    ]
    for permission in catalog_mutations:
        _revoke_permission("Encargado de Depósito", permission)
        _revoke_permission("Encargado de Planta", permission)


def downgrade() -> None:
    pass
