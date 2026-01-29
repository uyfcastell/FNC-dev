"""Add shipment_items.is_ready

Revision ID: 20250915_0017
Revises: 20250915_0016
Create Date: 2025-09-15 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = "20250915_0017"
down_revision: Union[str, None] = "20250915_0016"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("shipment_items", sa.Column("is_ready", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.alter_column("shipment_items", "is_ready", server_default=None)


def downgrade() -> None:
    op.drop_column("shipment_items", "is_ready")
