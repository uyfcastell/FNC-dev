"""Add merma module tables

Revision ID: 20240720_0002
Revises: 20240717_0001
Create Date: 2024-07-20
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20240720_0002"
down_revision = "20240717_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    merma_stage = sa.Enum(
        "production",
        "empaque",
        "stock",
        "transito_post_remito",
        "administrativa",
        name="mermastage",
    )
    merma_stage.create(bind, checkfirst=True)

    merma_action = sa.Enum("discarded", "reprocessed", "admin_adjustment", "none", name="mermaaction")
    merma_action.create(bind, checkfirst=True)

    existing_order_columns = {col["name"] for col in inspector.get_columns("orders")}
    if "destination_deposit_id" not in existing_order_columns:
        with op.batch_alter_table("orders") as batch:
            batch.add_column(sa.Column("destination_deposit_id", sa.Integer(), sa.ForeignKey("deposits.id"), nullable=True))
    if "notes" not in existing_order_columns:
        with op.batch_alter_table("orders") as batch:
            batch.add_column(sa.Column("notes", sa.String(length=255), nullable=True))

    op.create_table(
        "production_lines",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("name"),
    )

    op.create_table(
        "merma_types",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("stage", merma_stage, nullable=False),
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("label", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("stage", "code", name="uq_merma_types_stage_code"),
    )

    op.create_table(
        "merma_causes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("stage", merma_stage, nullable=False),
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("label", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("stage", "code", name="uq_merma_causes_stage_code"),
    )

    op.create_table(
        "merma_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("stage", merma_stage, nullable=False),
        sa.Column("type_id", sa.Integer(), sa.ForeignKey("merma_types.id"), nullable=False),
        sa.Column("type_code", sa.String(length=64), nullable=False),
        sa.Column("type_label", sa.String(length=255), nullable=False),
        sa.Column("cause_id", sa.Integer(), sa.ForeignKey("merma_causes.id"), nullable=False),
        sa.Column("cause_code", sa.String(length=64), nullable=False),
        sa.Column("cause_label", sa.String(length=255), nullable=False),
        sa.Column("sku_id", sa.Integer(), sa.ForeignKey("skus.id"), nullable=False),
        sa.Column("quantity", sa.Float(), nullable=False),
        sa.Column("unit", sa.String(length=255), nullable=False),
        sa.Column("lot_code", sa.String(length=64), nullable=True),
        sa.Column("deposit_id", sa.Integer(), sa.ForeignKey("deposits.id"), nullable=True),
        sa.Column("remito_id", sa.Integer(), sa.ForeignKey("remitos.id"), nullable=True),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id"), nullable=True),
        sa.Column("production_line_id", sa.Integer(), sa.ForeignKey("production_lines.id"), nullable=True),
        sa.Column("reported_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("reported_by_role", sa.String(length=100), nullable=True),
        sa.Column("notes", sa.String(length=500), nullable=True),
        sa.Column("detected_at", sa.DateTime(), nullable=False),
        sa.Column("affects_stock", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("action", merma_action, nullable=False, server_default="none"),
        sa.Column("stock_movement_id", sa.Integer(), sa.ForeignKey("stock_movements.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    op.drop_table("merma_events")
    op.drop_table("merma_causes")
    op.drop_table("merma_types")
    op.drop_table("production_lines")

    existing_order_columns = {col["name"] for col in inspector.get_columns("orders")}
    if "destination_deposit_id" in existing_order_columns:
        with op.batch_alter_table("orders") as batch:
            batch.drop_column("destination_deposit_id")
    if "notes" in existing_order_columns:
        with op.batch_alter_table("orders") as batch:
            batch.drop_column("notes")

    merma_action = sa.Enum(name="mermaaction")
    merma_stage = sa.Enum(name="mermastage")
    merma_action.drop(op.get_bind(), checkfirst=True)
    merma_stage.drop(op.get_bind(), checkfirst=True)
