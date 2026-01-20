"""Drop SKU family

Revision ID: 20250325_0006
Revises: 20250214_0004, 20250305_0005
Create Date: 2025-03-25 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20250325_0006"
down_revision: Union[str, None] = ("20250214_0004", "20250305_0005")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("skus", "family")
    op.execute("DROP TYPE IF EXISTS skufamily")


def downgrade() -> None:
    sku_family_enum = sa.Enum("consumible", "papeleria", "limpieza", name="skufamily")
    sku_family_enum.create(op.get_bind(), checkfirst=True)
    op.add_column("skus", sa.Column("family", sku_family_enum, nullable=True))
