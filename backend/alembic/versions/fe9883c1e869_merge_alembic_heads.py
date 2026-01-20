"""Merge Alembic heads

Revision ID: fe9883c1e869
Revises: 20250120_0003, f8077e81e924
Create Date: 2026-01-20 19:33:39.709731

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fe9883c1e869'
down_revision: Union[str, None] = ('20250120_0003', 'f8077e81e924')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
