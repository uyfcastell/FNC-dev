"""add semi conversion rules and base unit kg

Revision ID: 20250219_0001
Revises: 20240802_0003_sku_active_store
Create Date: 2025-02-19 00:01:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import func

# revision identifiers, used by Alembic.
revision: str = "20250219_0001"
down_revision: Union[str, None] = "20240802_0003_sku_active_store"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "semi_conversion_rules",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("sku_id", sa.Integer(), sa.ForeignKey("skus.id"), nullable=False, unique=True),
        sa.Column("units_per_kg", sa.Numeric(12, 4), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=func.now()),
    )

    # Default conversion for existing SEMI SKUs: 1 unit = 1 kg (can be adjusted later).
    conn = op.get_bind()
    semi_type_id = conn.execute(sa.text("select id from sku_types where code = 'SEMI'")).scalar()
    if semi_type_id:
        conn.execute(sa.text("update skus set unit = 'kg' where sku_type_id = :semi_type_id"), {"semi_type_id": semi_type_id})
        conn.execute(
            sa.text(
                """
                insert into semi_conversion_rules (sku_id, units_per_kg)
                select id, 1 from skus
                where sku_type_id = :semi_type_id
                  and id not in (select sku_id from semi_conversion_rules)
                """
            ),
            {"semi_type_id": semi_type_id},
        )


def downgrade() -> None:
    op.drop_table("semi_conversion_rules")
