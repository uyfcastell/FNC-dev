"""Add notes to orders and current_stock to order items

Revision ID: 20240801_0002
Revises: 20240717_0001
Create Date: 2024-08-01
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20240801_0002"
down_revision = "20240717_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("orders", sa.Column("notes", sa.String(length=255), nullable=True))
    op.add_column("order_items", sa.Column("current_stock", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("order_items", "current_stock")
    op.drop_column("orders", "notes")
