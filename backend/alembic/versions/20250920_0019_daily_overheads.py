"""Add daily overheads and SKU overhead weight.

Revision ID: 20250920_0019
Revises: 20250915_0018
Create Date: 2025-09-20 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect


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

    if not _has_column(insp, "skus", "overhead_weight", schema=schema):
        op.add_column(
            "skus",
            sa.Column("overhead_weight", sa.Float(), nullable=False, server_default="1"),
        )
        op.alter_column("skus", "overhead_weight", server_default=None)

    if "daily_overheads" not in insp.get_table_names(schema=schema):
        allocation_enum = sa.Enum("units", "weighted_units", name="dailyoverheadallocationmethod")
        allocation_enum.create(op.get_bind(), checkfirst=True)
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

    if "daily_overheads" in insp.get_table_names(schema=schema):
        op.drop_index("ix_daily_overheads_date", table_name="daily_overheads")
        op.drop_table("daily_overheads")
    allocation_enum = sa.Enum("units", "weighted_units", name="dailyoverheadallocationmethod")
    allocation_enum.drop(op.get_bind(), checkfirst=True)

    if _has_column(insp, "skus", "overhead_weight", schema=schema):
        op.drop_column("skus", "overhead_weight")
