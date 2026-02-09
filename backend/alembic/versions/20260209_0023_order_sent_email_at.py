"""Add sent_email_at to orders

Revision ID: 20260209_0023
Revises: 20260206_0022
Create Date: 2026-02-09 00:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "20260209_0023"
down_revision: Union[str, None] = "20260206_0022"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("orders", sa.Column("sent_email_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("orders", "sent_email_at")
