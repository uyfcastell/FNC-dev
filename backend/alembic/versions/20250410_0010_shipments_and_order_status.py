"""Add shipments and update order statuses

Revision ID: 20250410_0010
Revises: 20250406_0009
Create Date: 2025-04-10 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20250410_0010"
down_revision: Union[str, None] = "20250406_0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()

    if bind.dialect.name == "postgresql":
        # --- Update orders.status enum to the new workflow ---
        # orders.status currently has a DEFAULT (e.g. 'draft'::orderstatus).
        # PostgreSQL cannot automatically cast the DEFAULT during ALTER COLUMN TYPE,
        # so we must DROP DEFAULT first, then SET DEFAULT again with an explicit cast.

        # Replace orderstatus enum with the new workflow enum
        op.execute("ALTER TYPE orderstatus RENAME TO orderstatus_old")
        op.execute(
            "CREATE TYPE orderstatus AS ENUM "
            "('draft', 'submitted', 'partially_dispatched', 'dispatched', 'cancelled')"
        )

        # Drop default to avoid: default for column cannot be cast automatically
        op.execute("ALTER TABLE orders ALTER COLUMN status DROP DEFAULT")

        # Convert legacy statuses to the new ones
        op.execute(
            """
            ALTER TABLE orders
            ALTER COLUMN status TYPE orderstatus
            USING (
                CASE status::text
                    WHEN 'approved' THEN 'submitted'
                    WHEN 'prepared' THEN 'submitted'
                    WHEN 'closed' THEN 'dispatched'
                    ELSE status::text
                END
            )::orderstatus
            """
        )

        # Restore default with explicit cast
        op.execute("ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'draft'::orderstatus")

        # Old type no longer referenced
        op.execute("DROP TYPE orderstatus_old")

        # NOTE: We intentionally do NOT create shipmentstatus here.
        # SQLAlchemy/Alembic will create the enum type automatically when creating
        # the shipments table (see sa.Enum(..., name='shipmentstatus') below).
        # Creating it manually here would cause DuplicateObject errors.

    op.create_table(
        "shipments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("deposit_id", sa.Integer(), nullable=False),
        sa.Column("estimated_delivery_date", sa.Date(), nullable=False),
        sa.Column(
            "status",
            sa.Enum("draft", "confirmed", "dispatched", name="shipmentstatus"),
            nullable=False,
            server_default=sa.text("'draft'::shipmentstatus"),
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["deposit_id"], ["deposits.id"], name="fk_shipments_deposit_id"
        ),
    )

    op.create_table(
        "shipment_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("shipment_id", sa.Integer(), nullable=False),
        sa.Column("order_id", sa.Integer(), nullable=False),
        sa.Column("order_item_id", sa.Integer(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["shipment_id"], ["shipments.id"], name="fk_shipment_items_shipment_id"
        ),
        sa.ForeignKeyConstraint(
            ["order_id"], ["orders.id"], name="fk_shipment_items_order_id"
        ),
        sa.ForeignKeyConstraint(
            ["order_item_id"], ["order_items.id"], name="fk_shipment_items_order_item_id"
        ),
    )

    with op.batch_alter_table("remitos") as batch:
        batch.add_column(sa.Column("shipment_id", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("pdf_path", sa.String(length=255), nullable=True))
        batch.alter_column("order_id", existing_type=sa.Integer(), nullable=True)
        batch.create_foreign_key(
            "fk_remitos_shipment_id", "shipments", ["shipment_id"], ["id"]
        )


def downgrade() -> None:
    with op.batch_alter_table("remitos") as batch:
        batch.drop_constraint("fk_remitos_shipment_id", type_="foreignkey")
        batch.drop_column("pdf_path")
        batch.drop_column("shipment_id")
        batch.alter_column("order_id", existing_type=sa.Integer(), nullable=False)

    op.drop_table("shipment_items")
    op.drop_table("shipments")

    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        # Drop shipmentstatus enum if it exists (it is created automatically on upgrade)
        op.execute("DROP TYPE IF EXISTS shipmentstatus")

        # Revert orderstatus enum back to legacy workflow
        op.execute("ALTER TYPE orderstatus RENAME TO orderstatus_new")
        op.execute(
            "CREATE TYPE orderstatus AS ENUM "
            "('draft', 'submitted', 'approved', 'prepared', 'closed', 'cancelled')"
        )

        # Drop default before changing type
        op.execute("ALTER TABLE orders ALTER COLUMN status DROP DEFAULT")

        op.execute(
            """
            ALTER TABLE orders
            ALTER COLUMN status TYPE orderstatus
            USING (
                CASE status::text
                    WHEN 'partially_dispatched' THEN 'prepared'
                    WHEN 'dispatched' THEN 'closed'
                    ELSE status::text
                END
            )::orderstatus
            """
        )

        # Restore default with explicit cast
        op.execute("ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'draft'::orderstatus")

        op.execute("DROP TYPE orderstatus_new")

