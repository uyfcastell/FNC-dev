"""Rename sent_email_at to submitted_email_sent_at

Revision ID: 20260210_0024
Revises: 20260209_0023
Create Date: 2026-02-10 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op


revision: str = "20260210_0024"
down_revision: Union[str, None] = "20260209_0023"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("orders", "sent_email_at", new_column_name="submitted_email_sent_at")


def downgrade() -> None:
    op.alter_column("orders", "submitted_email_sent_at", new_column_name="sent_email_at")
