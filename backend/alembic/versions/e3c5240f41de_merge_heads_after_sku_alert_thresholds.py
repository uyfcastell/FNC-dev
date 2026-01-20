"""Merge heads after SKU alert thresholds

Revision ID: e3c5240f41de
Revises: 20250326_0007, fe9883c1e869
Create Date: 2026-01-20 20:17:26.893521

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e3c5240f41de'
down_revision: Union[str, None] = ('20250326_0007', 'fe9883c1e869')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
