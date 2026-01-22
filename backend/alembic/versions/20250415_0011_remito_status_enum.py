"""Rebuild remito status enum values

Revision ID: 20250415_0011
Revises: 20250410_0010
Create Date: 2025-04-15 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "20250415_0011"
down_revision: Union[str, None] = "20250410_0010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()

    if bind.dialect.name == "postgresql":
        op.execute("ALTER TYPE remitostatus RENAME TO remitostatus_old")
        op.execute(
            "CREATE TYPE remitostatus AS ENUM "
            "('pending', 'dispatched', 'received', 'cancelled')"
        )
        op.execute("ALTER TABLE remitos ALTER COLUMN status DROP DEFAULT")
        op.execute(
            """
            ALTER TABLE remitos
            ALTER COLUMN status TYPE remitostatus
            USING (
                CASE status::text
                    WHEN 'sent' THEN 'dispatched'
                    WHEN 'delivered' THEN 'received'
                    ELSE status::text
                END
            )::remitostatus
            """
        )
        op.execute("ALTER TABLE remitos ALTER COLUMN status SET DEFAULT 'pending'::remitostatus")
        op.execute("DROP TYPE remitostatus_old")


def downgrade() -> None:
    pass
