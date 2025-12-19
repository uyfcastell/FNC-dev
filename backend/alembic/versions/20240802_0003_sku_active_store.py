"""Add SKU active flag, family, and destination link

Revision ID: 20240802_0003
Revises: 20240801_0002
Create Date: 2024-08-02
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20240802_0003"
down_revision = "20240801_0002"
branch_labels = None
depends_on = None


sku_family_enum = sa.Enum("consumible", "papeleria", "limpieza", name="skufamily")

def upgrade() -> None:
    sku_family_enum.create(op.get_bind(), checkfirst=True)

    op.add_column("skus", sa.Column("family", sku_family_enum, nullable=True))
    op.add_column("skus", sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")))
    op.add_column("deposits", sa.Column("is_store", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column(
        "orders",
        sa.Column("destination_deposit_id", sa.Integer(), sa.ForeignKey("deposits.id"), nullable=True),
    )



def downgrade() -> None:
    op.drop_column("orders", "destination_deposit_id")
    op.drop_column("deposits", "is_store")
    op.drop_column("skus", "is_active")
    op.drop_column("skus", "family")
    sku_family_enum.drop(op.get_bind(), checkfirst=True)
