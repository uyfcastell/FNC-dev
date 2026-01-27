"""Add permissions and role permissions tables

Revision ID: 20250901_0015
Revises: 20250505_0014
Create Date: 2025-09-01 00:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = "20250901_0015"
down_revision: Union[str, None] = "20250505_0014"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(bind, name: str) -> bool:
    inspector = sa.inspect(bind)
    return inspector.has_table(name)


def upgrade() -> None:
    bind = op.get_bind()

    if not _has_table(bind, "permissions"):
        op.create_table(
            "permissions",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("key", sa.String(length=100), nullable=False),
            sa.Column("label", sa.String(length=255), nullable=False),
            sa.Column("category", sa.String(length=100), nullable=False),
            sa.Column("action", sa.String(length=100), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.UniqueConstraint("key", name="uq_permissions_key"),
        )

    if not _has_table(bind, "role_permissions"):
        op.create_table(
            "role_permissions",
            sa.Column("role_id", sa.Integer(), nullable=False),
            sa.Column("permission_id", sa.Integer(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.PrimaryKeyConstraint("role_id", "permission_id", name="pk_role_permissions"),
            sa.ForeignKeyConstraint(["role_id"], ["roles.id"], name="fk_role_permissions_role_id"),
            sa.ForeignKeyConstraint(["permission_id"], ["permissions.id"], name="fk_role_permissions_permission_id"),
        )

    if _has_table(bind, "roles"):
        role_renames = {
            "ADMIN": "Administración",
            "WAREHOUSE": "Encargado de Depósito",
            "PRODUCTION": "Operario de Producción",
            "SALES": "Encargado de Locales",
            "AUDIT": "Auditoría",
        }
        for old_name, new_name in role_renames.items():
            op.execute(
                sa.text("UPDATE roles SET name = :new_name WHERE name = :old_name").bindparams(
                    new_name=new_name, old_name=old_name
                )
            )

        new_roles = [
            ("Administración", "Control total del sistema"),
            ("Encargado de Planta", "Supervisión operativa de planta"),
            ("Encargado de Depósito", "Gestión de stock y depósitos"),
            ("Operario de Producción", "Operación de producción"),
            ("Operario de Empaque", "Operación de empaque"),
            ("Encargado de Reparto", "Gestión de remitos y entregas"),
            ("Encargado de Locales", "Pedidos y remitos de locales"),
            ("Auditoría", "Acceso de lectura y auditoría"),
        ]
        for name, description in new_roles:
            op.execute(
                sa.text(
                    "INSERT INTO roles (name, description, created_at, updated_at) "
                    "SELECT :name, :description, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP "
                    "WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = :name)"
                ).bindparams(name=name, description=description)
            )


def downgrade() -> None:
    bind = op.get_bind()
    if _has_table(bind, "role_permissions"):
        op.drop_table("role_permissions")
    if _has_table(bind, "permissions"):
        op.drop_table("permissions")
