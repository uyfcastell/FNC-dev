"""Add order cancellation audit fields and requester

Revision ID: 20250120_0003
Revises: 20240720_0002
Create Date: 2025-01-20
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20250120_0003"
down_revision = "20240720_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE orderstatus ADD VALUE IF NOT EXISTS 'cancelled'")

    with op.batch_alter_table("orders") as batch:
        batch.add_column(sa.Column("requested_by", sa.String(length=255), nullable=True))
        batch.add_column(sa.Column("cancelled_at", sa.DateTime(), nullable=True))
        batch.add_column(sa.Column("cancelled_by_user_id", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("cancelled_by_name", sa.String(length=255), nullable=True))
        batch.create_foreign_key(
            "fk_orders_cancelled_by_user_id",
            "users",
            ["cancelled_by_user_id"],
            ["id"],
        )


def downgrade() -> None:
    with op.batch_alter_table("orders") as batch:
        batch.drop_constraint("fk_orders_cancelled_by_user_id", type_="foreignkey")
        batch.drop_column("cancelled_by_name")
        batch.drop_column("cancelled_by_user_id")
        batch.drop_column("cancelled_at")
        batch.drop_column("requested_by")
