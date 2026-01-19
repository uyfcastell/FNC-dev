"""Merge heads 20250219_0002 and 20250305_0005

Revision ID: f21b3ef888d2
Revises: 20250219_0002, 20250305_0005
Create Date: 2026-01-19 15:37:08.435806

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f21b3ef888d2'
down_revision: Union[str, None] = ('20250219_0002', '20250305_0005')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
