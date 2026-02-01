"""Add PIN login support.

Revision ID: 20250915_0018
Revises: 20250915_0017
Create Date: 2025-09-15 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = "20250915_0018"
down_revision: Union[str, None] = "20250915_0017"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_column(insp, table: str, column: str, schema: str = "public") -> bool:
    cols = insp.get_columns(table, schema=schema)
    return any(c["name"] == column for c in cols)


def _has_constraint(insp, table: str, constraint_name: str, schema: str = "public") -> bool:
    # incluye UNIQUE, CHECK, FK, etc.
    for c in insp.get_unique_constraints(table, schema=schema):
        if c.get("name") == constraint_name:
            return True
    # por si alguien lo creó como constraint genérico, miramos constraints también
    for c in insp.get_check_constraints(table, schema=schema):
        if c.get("name") == constraint_name:
            return True
    # PKs no aplican acá; FKs tampoco en este caso
    return False


def _has_index(insp, table: str, index_name: str, schema: str = "public") -> bool:
    idxs = insp.get_indexes(table, schema=schema)
    return any(i.get("name") == index_name for i in idxs)


def upgrade() -> None:
    conn = op.get_bind()
    insp = inspect(conn)
    schema = "public"

    # --- users.pin_hash column
    if not _has_column(insp, "users", "pin_hash", schema=schema):
        op.add_column("users", sa.Column("pin_hash", sa.String(length=255), nullable=True))

    # --- unique constraint on users.pin_hash
    if not _has_constraint(insp, "users", "uq_users_pin_hash", schema=schema):
        op.create_unique_constraint("uq_users_pin_hash", "users", ["pin_hash"])

    # --- index on users.pin_hash
    if not _has_index(insp, "users", "ix_users_pin_hash", schema=schema):
        op.create_index("ix_users_pin_hash", "users", ["pin_hash"])

    # --- pin_login_attempts table
    existing_tables = insp.get_table_names(schema=schema)
    if "pin_login_attempts" not in existing_tables:
        op.create_table(
            "pin_login_attempts",
            sa.Column("pin_hash", sa.String(length=255), primary_key=True),
            sa.Column("failed_attempts", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("locked_until", sa.DateTime(), nullable=True),
            sa.Column("last_attempt_at", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
        )
        # dejar el default como estaba pensado: solo para el create, no persistente
        op.alter_column("pin_login_attempts", "failed_attempts", server_default=None)
    else:
        # Si la tabla ya existía, igual intentamos asegurar el estado final esperado:
        # que failed_attempts no tenga server_default persistente.
        # (Si no existe la columna o la tabla difiere, esto podría fallar,
        # pero en tu caso lo relevante es evitar el DuplicateTable).
        try:
            op.alter_column("pin_login_attempts", "failed_attempts", server_default=None)
        except Exception:
            # No bloqueamos el upgrade por esto; el objetivo principal es idempotencia.
            pass


def downgrade() -> None:
    conn = op.get_bind()
    insp = inspect(conn)
    schema = "public"

    # --- drop table pin_login_attempts (si existe)
    if "pin_login_attempts" in insp.get_table_names(schema=schema):
        op.drop_table("pin_login_attempts")

    # --- drop index (si existe)
    if _has_index(insp, "users", "ix_users_pin_hash", schema=schema):
        op.drop_index("ix_users_pin_hash", table_name="users")

    # --- drop unique constraint (si existe)
    if _has_constraint(insp, "users", "uq_users_pin_hash", schema=schema):
        op.drop_constraint("uq_users_pin_hash", "users", type_="unique")

    # --- drop column (si existe)
    if _has_column(insp, "users", "pin_hash", schema=schema):
        op.drop_column("users", "pin_hash")

