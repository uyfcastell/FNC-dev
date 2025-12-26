"""Add auth helpers and remito tracking fields"""

from alembic import op
import sqlalchemy as sa


revision = "20250305_0005"
down_revision = "a25ec5cec522"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("stock_movements", sa.Column("reference_type", sa.String(length=50), nullable=True))
    op.add_column("stock_movements", sa.Column("reference_id", sa.Integer(), nullable=True))
    op.add_column("stock_movements", sa.Column("reference_item_id", sa.Integer(), nullable=True))

    op.add_column("remitos", sa.Column("source_deposit_id", sa.Integer(), nullable=True))
    op.add_column("remitos", sa.Column("destination_deposit_id", sa.Integer(), nullable=True))
    op.add_column("remitos", sa.Column("dispatched_at", sa.DateTime(), nullable=True))
    op.add_column("remitos", sa.Column("received_at", sa.DateTime(), nullable=True))
    op.add_column("remitos", sa.Column("cancelled_at", sa.DateTime(), nullable=True))

    op.create_foreign_key(
        "remitos_source_deposit_id_fkey",
        "remitos",
        "deposits",
        ["source_deposit_id"],
        ["id"],
    )
    op.create_foreign_key(
        "remitos_destination_deposit_id_fkey",
        "remitos",
        "deposits",
        ["destination_deposit_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint("remitos_destination_deposit_id_fkey", "remitos", type_="foreignkey")
    op.drop_constraint("remitos_source_deposit_id_fkey", "remitos", type_="foreignkey")

    op.drop_column("remitos", "cancelled_at")
    op.drop_column("remitos", "received_at")
    op.drop_column("remitos", "dispatched_at")
    op.drop_column("remitos", "destination_deposit_id")
    op.drop_column("remitos", "source_deposit_id")

    op.drop_column("stock_movements", "reference_item_id")
    op.drop_column("stock_movements", "reference_id")
    op.drop_column("stock_movements", "reference_type")
