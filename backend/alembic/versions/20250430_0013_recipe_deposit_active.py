"""Add is_active to recipes and deposits

Revision ID: 20250430_0013
Revises: 20250420_0012
Create Date: 2025-04-30 00:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = "20250430_0013"
down_revision: Union[str, None] = "20250420_0012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_exists(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    return column_name in {c["name"] for c in insp.get_columns(table_name)}


def upgrade() -> None:
    if not _column_exists("deposits", "is_active"):
        op.add_column("deposits", sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()))
    if not _column_exists("recipes", "is_active"):
        op.add_column("recipes", sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()))


def downgrade() -> None:
    # Best-effort (también idempotente)
    if _column_exists("recipes", "is_active"):
        op.drop_column("recipes", "is_active")
    if _column_exists("deposits", "is_active"):
        op.drop_column("deposits", "is_active")
