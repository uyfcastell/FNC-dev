"""Add required delivery date and plant note to orders

Revision ID: 20250406_0009
Revises: 20250405_0008
Create Date: 2025-04-06 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20250406_0009"
down_revision: Union[str, None] = "20250405_0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("orders") as batch:
        batch.add_column(sa.Column("required_delivery_date", sa.Date(), nullable=True))
        batch.add_column(sa.Column("plant_internal_note", sa.String(length=500), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("orders") as batch:
        batch.drop_column("plant_internal_note")
        batch.drop_column("required_delivery_date")
