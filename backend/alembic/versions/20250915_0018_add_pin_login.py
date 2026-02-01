"""Add PIN login support.

Revision ID: 20250915_0018
Revises: 20250915_0017
Create Date: 2025-09-15 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = "20250915_0018"
down_revision: Union[str, None] = "20250915_0017"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("pin_hash", sa.String(length=255), nullable=True))
    op.create_unique_constraint("uq_users_pin_hash", "users", ["pin_hash"])
    op.create_index("ix_users_pin_hash", "users", ["pin_hash"])

    op.create_table(
        "pin_login_attempts",
        sa.Column("pin_hash", sa.String(length=255), primary_key=True),
        sa.Column("failed_attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("locked_until", sa.DateTime(), nullable=True),
        sa.Column("last_attempt_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.alter_column("pin_login_attempts", "failed_attempts", server_default=None)


def downgrade() -> None:
    op.drop_table("pin_login_attempts")
    op.drop_index("ix_users_pin_hash", table_name="users")
    op.drop_constraint("uq_users_pin_hash", "users", type_="unique")
    op.drop_column("users", "pin_hash")
