"""Add daily overheads and SKU overhead weight.

Revision ID: 20250920_0019
Revises: 20250915_0018
Create Date: 2025-09-20 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "20250920_0019"
down_revision: Union[str, None] = "20250915_0018"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_column(insp, table: str, column: str, schema: str = "public") -> bool:
    cols = insp.get_columns(table, schema=schema)
    return any(c["name"] == column for c in cols)


def upgrade() -> None:
    conn = op.get_bind()
    insp = inspect(conn)
    schema = "public"

    # --- 1) Add overhead_weight to skus (idempotent)
    if not _has_column(insp, "skus", "overhead_weight", schema=schema):
        op.add_column(
            "skus",
            sa.Column("overhead_weight", sa.Float(), nullable=False, server_default="1"),
        )
        op.alter_column("skus", "overhead_weight", server_default=None)

    # --- 2) Ensure enum exists (idempotent + robust for Postgres)
    enum_name = "dailyoverheadallocationmethod"

    # Create enum type only if missing
    enum_for_create = postgresql.ENUM(
        "units",
        "weighted_units",
        name=enum_name,
    )
    enum_for_create.create(conn, checkfirst=True)

    # IMPORTANT: use create_type=False in the column enum so create_table does NOT try to CREATE TYPE again
    allocation_enum = postgresql.ENUM(
        "units",
        "weighted_units",
        name=enum_name,
        create_type=False,
    )

    # --- 3) Create daily_overheads table (idempotent)
    if "daily_overheads" not in insp.get_table_names(schema=schema):
        op.create_table(
            "daily_overheads",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("date", sa.Date(), nullable=False),
            sa.Column("energy_cost", sa.Float(), nullable=False, server_default="0"),
            sa.Column("gas_cost", sa.Float(), nullable=False, server_default="0"),
            sa.Column("allocation_method", allocation_enum, nullable=False, server_default="units"),
            sa.Column("notes", sa.String(length=500), nullable=True),
            sa.Column("created_by_user_id", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
            sa.UniqueConstraint("date", name="uq_daily_overheads_date"),
        )
        op.create_index("ix_daily_overheads_date", "daily_overheads", ["date"])
        op.alter_column("daily_overheads", "energy_cost", server_default=None)
        op.alter_column("daily_overheads", "gas_cost", server_default=None)
        op.alter_column("daily_overheads", "allocation_method", server_default=None)


def downgrade() -> None:
    conn = op.get_bind()
    insp = inspect(conn)
    schema = "public"

    # Drop table/index if exist
    if "daily_overheads" in insp.get_table_names(schema=schema):
        op.drop_index("ix_daily_overheads_date", table_name="daily_overheads")
        op.drop_table("daily_overheads")

    # Drop enum if exists (may fail if still referenced elsewhere; checkfirst helps)
    enum_name = "dailyoverheadallocationmethod"
    enum_for_drop = postgresql.ENUM(name=enum_name)
    enum_for_drop.drop(conn, checkfirst=True)

    # Drop overhead_weight if exists
    if _has_column(insp, "skus", "overhead_weight", schema=schema):
        op.drop_column("skus", "overhead_weight")

