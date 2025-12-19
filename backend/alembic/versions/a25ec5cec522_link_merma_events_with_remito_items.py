"""link merma events with remito items"""

from alembic import op
import sqlalchemy as sa


revision = "a25ec5cec522"
down_revision = "36239522c3a0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "merma_events",
        sa.Column("remito_item_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "merma_events_remito_item_id_fkey",
        "merma_events",
        "remito_items",
        ["remito_item_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "merma_events_remito_item_id_fkey",
        "merma_events",
        type_="foreignkey",
    )
    op.drop_column("merma_events", "remito_item_id")

