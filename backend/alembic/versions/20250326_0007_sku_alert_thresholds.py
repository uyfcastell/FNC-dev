"""Add SKU alert thresholds

Revision ID: 20250326_0007
Revises: f8077e81e924
Create Date: 2025-03-26 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20250326_0007"
down_revision: Union[str, None] = "f8077e81e924"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("skus", sa.Column("alert_green_min", sa.Float(), nullable=True))
    op.add_column("skus", sa.Column("alert_yellow_min", sa.Float(), nullable=True))
    op.add_column("skus", sa.Column("alert_red_max", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("skus", "alert_red_max")
    op.drop_column("skus", "alert_yellow_min")
    op.drop_column("skus", "alert_green_min")
