"""Merge heads after family removal

Revision ID: f8077e81e924
Revises: 20250325_0006, f21b3ef888d2
Create Date: 2026-01-20 15:10:01.983145

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f8077e81e924'
down_revision: Union[str, None] = ('20250325_0006', 'f21b3ef888d2')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
