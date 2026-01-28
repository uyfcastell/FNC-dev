"""Remove SKU alert_red_max

Revision ID: 20250915_0016
Revises: 20250901_0015
Create Date: 2025-09-15 00:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = "20250915_0016"
down_revision: Union[str, None] = "20250901_0015"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("skus", "alert_red_max")


def downgrade() -> None:
    op.add_column("skus", sa.Column("alert_red_max", sa.Float(), nullable=True))
