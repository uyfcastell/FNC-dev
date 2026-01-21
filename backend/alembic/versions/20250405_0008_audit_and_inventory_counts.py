"""Add audit logs and inventory counts

Revision ID: 20250405_0008
Revises: e3c5240f41de
Create Date: 2025-04-05 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20250405_0008"
down_revision: Union[str, None] = "e3c5240f41de"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    audit_action = sa.Enum(
        "create",
        "update",
        "delete",
        "status",
        "approve",
        "cancel",
        name="auditaction",
    )
    inventory_status = sa.Enum(
        "draft",
        "submitted",
        "approved",
        "closed",
        "cancelled",
        name="inventorycountstatus",
    )

    audit_action.create(op.get_bind(), checkfirst=True)
    inventory_status.create(op.get_bind(), checkfirst=True)

    op.add_column("stock_movements", sa.Column("created_by_user_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_stock_movements_created_by_user",
        "stock_movements",
        "users",
        ["created_by_user_id"],
        ["id"],
    )

    op.add_column("orders", sa.Column("created_by_user_id", sa.Integer(), nullable=True))
    op.add_column("orders", sa.Column("updated_by_user_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_orders_created_by_user",
        "orders",
        "users",
        ["created_by_user_id"],
        ["id"],
    )
    op.create_foreign_key(
        "fk_orders_updated_by_user",
        "orders",
        "users",
        ["updated_by_user_id"],
        ["id"],
    )

    op.add_column("remitos", sa.Column("created_by_user_id", sa.Integer(), nullable=True))
    op.add_column("remitos", sa.Column("updated_by_user_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_remitos_created_by_user",
        "remitos",
        "users",
        ["created_by_user_id"],
        ["id"],
    )
    op.create_foreign_key(
        "fk_remitos_updated_by_user",
        "remitos",
        "users",
        ["updated_by_user_id"],
        ["id"],
    )

    op.create_table(
        "audit_logs",
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("entity_type", sa.String(length=100), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=True),
        sa.Column("action", audit_action, nullable=False),
        sa.Column("changes", sa.JSON(), nullable=True),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_audit_logs_entity_id", "audit_logs", ["entity_id"])
    op.create_index("ix_audit_logs_entity_type", "audit_logs", ["entity_type"])

    op.create_table(
        "inventory_counts",
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("deposit_id", sa.Integer(), nullable=False),
        sa.Column("status", inventory_status, nullable=False),
        sa.Column("count_date", sa.Date(), nullable=False),
        sa.Column("notes", sa.String(length=500), nullable=True),
        sa.Column("submitted_at", sa.DateTime(), nullable=True),
        sa.Column("approved_at", sa.DateTime(), nullable=True),
        sa.Column("closed_at", sa.DateTime(), nullable=True),
        sa.Column("cancelled_at", sa.DateTime(), nullable=True),
        sa.Column("created_by_user_id", sa.Integer(), nullable=True),
        sa.Column("updated_by_user_id", sa.Integer(), nullable=True),
        sa.Column("approved_by_user_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["approved_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["deposit_id"], ["deposits.id"]),
        sa.ForeignKeyConstraint(["updated_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "inventory_count_items",
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("inventory_count_id", sa.Integer(), nullable=False),
        sa.Column("sku_id", sa.Integer(), nullable=False),
        sa.Column("production_lot_id", sa.Integer(), nullable=True),
        sa.Column("lot_code", sa.String(length=64), nullable=True),
        sa.Column("counted_quantity", sa.Float(), nullable=False),
        sa.Column("system_quantity", sa.Float(), nullable=False),
        sa.Column("difference", sa.Float(), nullable=False),
        sa.Column("unit", sa.Enum("unit", "kg", "g", "l", "ml", "pack", "box", "m", "cm", name="unitofmeasure"), nullable=False),
        sa.Column("stock_movement_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["inventory_count_id"], ["inventory_counts.id"]),
        sa.ForeignKeyConstraint(["production_lot_id"], ["production_lots.id"]),
        sa.ForeignKeyConstraint(["sku_id"], ["skus.id"]),
        sa.ForeignKeyConstraint(["stock_movement_id"], ["stock_movements.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("inventory_count_items")
    op.drop_table("inventory_counts")
    op.drop_index("ix_audit_logs_entity_type", table_name="audit_logs")
    op.drop_index("ix_audit_logs_entity_id", table_name="audit_logs")
    op.drop_table("audit_logs")

    op.drop_constraint("fk_remitos_updated_by_user", "remitos", type_="foreignkey")
    op.drop_constraint("fk_remitos_created_by_user", "remitos", type_="foreignkey")
    op.drop_column("remitos", "updated_by_user_id")
    op.drop_column("remitos", "created_by_user_id")

    op.drop_constraint("fk_orders_updated_by_user", "orders", type_="foreignkey")
    op.drop_constraint("fk_orders_created_by_user", "orders", type_="foreignkey")
    op.drop_column("orders", "updated_by_user_id")
    op.drop_column("orders", "created_by_user_id")

    op.drop_constraint("fk_stock_movements_created_by_user", "stock_movements", type_="foreignkey")
    op.drop_column("stock_movements", "created_by_user_id")

    op.execute("DROP TYPE IF EXISTS inventorycountstatus")
    op.execute("DROP TYPE IF EXISTS auditaction")
