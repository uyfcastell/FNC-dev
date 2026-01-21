"""Add audit logs and inventory counts

Revision ID: 20250405_0008
Revises: e3c5240f41de
Create Date: 2025-04-05 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "20250405_0008"
down_revision: Union[str, None] = "e3c5240f41de"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)

    # ------------------------------------------------------------------
    # Enums (crear SOLO si no existen, sin creación implícita en tablas)
    # ------------------------------------------------------------------

    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_type t
                JOIN pg_namespace n ON n.oid = t.typnamespace
                WHERE n.nspname = 'public' AND t.typname = 'auditaction'
            ) THEN
                CREATE TYPE auditaction AS ENUM (
                    'create', 'update', 'delete', 'status', 'approve', 'cancel'
                );
            END IF;
        END$$;
        """
    )

    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_type t
                JOIN pg_namespace n ON n.oid = t.typnamespace
                WHERE n.nspname = 'public' AND t.typname = 'inventorycountstatus'
            ) THEN
                CREATE TYPE inventorycountstatus AS ENUM (
                    'draft', 'submitted', 'approved', 'closed', 'cancelled'
                );
            END IF;
        END$$;
        """
    )

    audit_action = postgresql.ENUM(name="auditaction", create_type=False)
    inventory_status = postgresql.ENUM(name="inventorycountstatus", create_type=False)
    unit_enum = postgresql.ENUM(name="unitofmeasure", create_type=False)

    # ------------------------------------------------------------------
    # Helpers idempotentes
    # ------------------------------------------------------------------

    def _has_table(table_name: str) -> bool:
        return insp.has_table(table_name)

    def _has_column(table_name: str, column_name: str) -> bool:
        if not _has_table(table_name):
            return False
        return any(c["name"] == column_name for c in insp.get_columns(table_name))

    def _fk_exists(table_name: str, fk_name: str) -> bool:
        if not _has_table(table_name):
            return False
        return any(fk.get("name") == fk_name for fk in insp.get_foreign_keys(table_name))

    def _index_exists(table_name: str, index_name: str) -> bool:
        if not _has_table(table_name):
            return False
        return any(i.get("name") == index_name for i in insp.get_indexes(table_name))

    # ------------------------------------------------------------------
    # Columns + FKs (idempotente)
    # ------------------------------------------------------------------

    # stock_movements.created_by_user_id
    if not _has_column("stock_movements", "created_by_user_id"):
        op.add_column(
            "stock_movements",
            sa.Column("created_by_user_id", sa.Integer(), nullable=True),
        )
    if not _fk_exists("stock_movements", "fk_stock_movements_created_by_user"):
        op.create_foreign_key(
            "fk_stock_movements_created_by_user",
            "stock_movements",
            "users",
            ["created_by_user_id"],
            ["id"],
        )

    # orders.created_by_user_id / updated_by_user_id
    if not _has_column("orders", "created_by_user_id"):
        op.add_column(
            "orders",
            sa.Column("created_by_user_id", sa.Integer(), nullable=True),
        )
    if not _has_column("orders", "updated_by_user_id"):
        op.add_column(
            "orders",
            sa.Column("updated_by_user_id", sa.Integer(), nullable=True),
        )
    if not _fk_exists("orders", "fk_orders_created_by_user"):
        op.create_foreign_key(
            "fk_orders_created_by_user",
            "orders",
            "users",
            ["created_by_user_id"],
            ["id"],
        )
    if not _fk_exists("orders", "fk_orders_updated_by_user"):
        op.create_foreign_key(
            "fk_orders_updated_by_user",
            "orders",
            "users",
            ["updated_by_user_id"],
            ["id"],
        )

    # remitos.created_by_user_id / updated_by_user_id
    if not _has_column("remitos", "created_by_user_id"):
        op.add_column(
            "remitos",
            sa.Column("created_by_user_id", sa.Integer(), nullable=True),
        )
    if not _has_column("remitos", "updated_by_user_id"):
        op.add_column(
            "remitos",
            sa.Column("updated_by_user_id", sa.Integer(), nullable=True),
        )
    if not _fk_exists("remitos", "fk_remitos_created_by_user"):
        op.create_foreign_key(
            "fk_remitos_created_by_user",
            "remitos",
            "users",
            ["created_by_user_id"],
            ["id"],
        )
    if not _fk_exists("remitos", "fk_remitos_updated_by_user"):
        op.create_foreign_key(
            "fk_remitos_updated_by_user",
            "remitos",
            "users",
            ["updated_by_user_id"],
            ["id"],
        )

    # ------------------------------------------------------------------
    # Tables
    # ------------------------------------------------------------------

    if not _has_table("audit_logs"):
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
            sa.ForeignKeyConstraint(
                ["user_id"], ["users.id"], name="fk_audit_logs_user_id"
            ),
            sa.PrimaryKeyConstraint("id", name="pk_audit_logs"),
        )

    if _has_table("audit_logs") and not _index_exists(
        "audit_logs", "ix_audit_logs_entity_id"
    ):
        op.create_index(
            "ix_audit_logs_entity_id", "audit_logs", ["entity_id"]
        )

    if _has_table("audit_logs") and not _index_exists(
        "audit_logs", "ix_audit_logs_entity_type"
    ):
        op.create_index(
            "ix_audit_logs_entity_type", "audit_logs", ["entity_type"]
        )

    if not _has_table("inventory_counts"):
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
            sa.ForeignKeyConstraint(
                ["approved_by_user_id"],
                ["users.id"],
                name="fk_inventory_counts_approved_by_user",
            ),
            sa.ForeignKeyConstraint(
                ["created_by_user_id"],
                ["users.id"],
                name="fk_inventory_counts_created_by_user",
            ),
            sa.ForeignKeyConstraint(
                ["deposit_id"],
                ["deposits.id"],
                name="fk_inventory_counts_deposit_id",
            ),
            sa.ForeignKeyConstraint(
                ["updated_by_user_id"],
                ["users.id"],
                name="fk_inventory_counts_updated_by_user",
            ),
            sa.PrimaryKeyConstraint("id", name="pk_inventory_counts"),
        )

    if not _has_table("inventory_count_items"):
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
            sa.Column("unit", unit_enum, nullable=False),
            sa.Column("stock_movement_id", sa.Integer(), nullable=True),
            sa.ForeignKeyConstraint(
                ["inventory_count_id"],
                ["inventory_counts.id"],
                name="fk_inventory_count_items_inventory_count",
            ),
            sa.ForeignKeyConstraint(
                ["production_lot_id"],
                ["production_lots.id"],
                name="fk_inventory_count_items_production_lot",
            ),
            sa.ForeignKeyConstraint(
                ["sku_id"],
                ["skus.id"],
                name="fk_inventory_count_items_sku",
            ),
            sa.ForeignKeyConstraint(
                ["stock_movement_id"],
                ["stock_movements.id"],
                name="fk_inventory_count_items_stock_movement",
            ),
            sa.PrimaryKeyConstraint("id", name="pk_inventory_count_items"),
        )


def downgrade() -> None:
    op.drop_table("inventory_count_items")
    op.drop_table("inventory_counts")

    op.drop_index("ix_audit_logs_entity_type", table_name="audit_logs")
    op.drop_index("ix_audit_logs_entity_id", table_name="audit_logs")
    op.drop_table("audit_logs")

    op.execute("DROP TYPE IF EXISTS inventorycountstatus")
    op.execute("DROP TYPE IF EXISTS auditaction")

