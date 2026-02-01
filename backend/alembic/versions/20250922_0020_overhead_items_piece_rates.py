"""Add overhead items and piece rates.

Revision ID: 20250922_0020
Revises: 20250920_0019
Create Date: 2025-09-22 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "20250922_0020"
down_revision: Union[str, None] = "20250920_0019"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    insp = inspect(conn)
    schema = "public"

    enum_name = "dailyoverheaditemtype"
    enum_for_create = postgresql.ENUM(
        "labor_indirect",
        "other",
        name=enum_name,
    )
    enum_for_create.create(conn, checkfirst=True)

    item_enum = postgresql.ENUM(
        "labor_indirect",
        "other",
        name=enum_name,
        create_type=False,
    )

    if "daily_overhead_items" not in insp.get_table_names(schema=schema):
        op.create_table(
            "daily_overhead_items",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("daily_overhead_id", sa.Integer(), nullable=False),
            sa.Column("concept_type", item_enum, nullable=False, server_default="other"),
            sa.Column("concept_name", sa.String(length=255), nullable=False),
            sa.Column("amount", sa.Float(), nullable=False),
            sa.Column("notes", sa.String(length=500), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["daily_overhead_id"], ["daily_overheads.id"]),
        )
        op.create_index("ix_daily_overhead_items_daily_overhead_id", "daily_overhead_items", ["daily_overhead_id"])
        op.alter_column("daily_overhead_items", "concept_type", server_default=None)

    if "production_line_piece_rates" not in insp.get_table_names(schema=schema):
        op.create_table(
            "production_line_piece_rates",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("production_line_id", sa.Integer(), nullable=False),
            sa.Column("rate_per_unit", sa.Float(), nullable=False),
            sa.Column("active_from", sa.Date(), nullable=True),
            sa.Column("active_to", sa.Date(), nullable=True),
            sa.Column("notes", sa.String(length=500), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["production_line_id"], ["production_lines.id"]),
        )
        op.create_index(
            "ix_production_line_piece_rates_line_id",
            "production_line_piece_rates",
            ["production_line_id"],
        )


def downgrade() -> None:
    conn = op.get_bind()
    insp = inspect(conn)
    schema = "public"

    if "production_line_piece_rates" in insp.get_table_names(schema=schema):
        op.drop_index("ix_production_line_piece_rates_line_id", table_name="production_line_piece_rates")
        op.drop_table("production_line_piece_rates")

    if "daily_overhead_items" in insp.get_table_names(schema=schema):
        op.drop_index("ix_daily_overhead_items_daily_overhead_id", table_name="daily_overhead_items")
        op.drop_table("daily_overhead_items")

    enum_name = "dailyoverheaditemtype"
    enum_for_drop = postgresql.ENUM(name=enum_name)
    enum_for_drop.drop(conn, checkfirst=True)
