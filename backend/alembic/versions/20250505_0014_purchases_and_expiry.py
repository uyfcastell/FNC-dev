"""Add suppliers, purchase receipts, and lot expiry date

Revision ID: 20250505_0014
Revises: 20250430_0013
Create Date: 2025-05-05 00:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = "20250505_0014"
down_revision: Union[str, None] = "20250430_0013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("production_lots", sa.Column("expiry_date", sa.Date(), nullable=True))

    op.create_table(
        "suppliers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("tax_id", sa.String(length=32), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("name", name="uq_suppliers_name"),
    )

    op.create_table(
        "purchase_receipts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("supplier_id", sa.Integer(), nullable=False),
        sa.Column("deposit_id", sa.Integer(), nullable=False),
        sa.Column("received_at", sa.Date(), nullable=False),
        sa.Column("document_number", sa.String(length=100), nullable=True),
        sa.Column("notes", sa.String(length=500), nullable=True),
        sa.Column("created_by_user_id", sa.Integer(), nullable=True),
        sa.Column("updated_by_user_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["supplier_id"], ["suppliers.id"], name="fk_purchase_receipts_supplier"),
        sa.ForeignKeyConstraint(["deposit_id"], ["deposits.id"], name="fk_purchase_receipts_deposit"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], name="fk_purchase_receipts_created_by_user"),
        sa.ForeignKeyConstraint(["updated_by_user_id"], ["users.id"], name="fk_purchase_receipts_updated_by_user"),
    )

    op.create_table(
        "purchase_receipt_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("receipt_id", sa.Integer(), nullable=False),
        sa.Column("sku_id", sa.Integer(), nullable=False),
        sa.Column("quantity", sa.Float(), nullable=False),
        sa.Column("unit", sa.String(length=50), nullable=False),
        sa.Column("lot_code", sa.String(length=64), nullable=True),
        sa.Column("expiry_date", sa.Date(), nullable=True),
        sa.Column("unit_cost", sa.Float(), nullable=True),
        sa.Column("stock_movement_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["receipt_id"], ["purchase_receipts.id"], name="fk_purchase_receipt_items_receipt"),
        sa.ForeignKeyConstraint(["sku_id"], ["skus.id"], name="fk_purchase_receipt_items_sku"),
        sa.ForeignKeyConstraint(["stock_movement_id"], ["stock_movements.id"], name="fk_purchase_receipt_items_stock_movement"),
    )


def downgrade() -> None:
    op.drop_table("purchase_receipt_items")
    op.drop_table("purchase_receipts")
    op.drop_table("suppliers")
    op.drop_column("production_lots", "expiry_date")
