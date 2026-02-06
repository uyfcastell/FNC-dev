"""Add orders.submit permission (idempotent)

Revision ID: 20260206_0021
Revises: 20250922_0020_overhead_items_piece_rates
Create Date: 2026-02-06 00:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "20260206_0021"
down_revision: Union[str, None] = "20250922_0020"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            INSERT INTO permissions (key, category, action, label, created_at, updated_at)
            SELECT :key, :category, :action, :label, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE key = :key)
            """
        ).bindparams(
            key="orders.submit",
            category="Ventas / Pedidos",
            action="Enviar a planta",
            label="Enviar pedido a planta",
        )
    )


def downgrade() -> None:
    # No-op intencional para evitar pérdida de datos de permisos en entornos existentes.
    pass
