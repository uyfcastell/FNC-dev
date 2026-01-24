"""Add prepared order statuses

Revision ID: 20250420_0012
Revises: 20250415_0011
Create Date: 2025-04-20 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "20250420_0012"
down_revision: Union[str, None] = "20250415_0011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("ALTER TYPE orderstatus ADD VALUE IF NOT EXISTS 'prepared'")
        op.execute("ALTER TYPE orderstatus ADD VALUE IF NOT EXISTS 'partially_prepared'")


def downgrade() -> None:
    pass
