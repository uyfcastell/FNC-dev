"""add remito_item_id to merma_events

Revision ID: 9d07e62a3ee7
Revises: a25ec5cec522
Create Date: 2025-12-19 12:05:28.480304

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9d07e62a3ee7'
down_revision: Union[str, None] = 'a25ec5cec522'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


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

