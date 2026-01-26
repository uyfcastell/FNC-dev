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


def upgrade() -> None:
    op.add_column("deposits", sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column("recipes", sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()))


def downgrade() -> None:
    op.drop_column("recipes", "is_active")
    op.drop_column("deposits", "is_active")
