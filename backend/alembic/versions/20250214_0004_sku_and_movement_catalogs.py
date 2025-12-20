"""Add administrable SKU and stock movement types

Revision ID: 20250214_0004
Revises: a25ec5cec522
Create Date: 2025-02-14
"""

from datetime import datetime

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column


# revision identifiers, used by Alembic.
revision = "20250214_0004"
down_revision = "a25ec5cec522"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "sku_types",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("code", sa.String(length=16), nullable=False),
        sa.Column("label", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("code", name="uq_sku_types_code"),
    )

    op.create_table(
        "stock_movement_types",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("label", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("code", name="uq_stock_movement_types_code"),
    )

    op.add_column("skus", sa.Column("sku_type_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "skus_sku_type_id_fkey",
        "skus",
        "sku_types",
        ["sku_type_id"],
        ["id"],
    )

    op.add_column("stock_movements", sa.Column("movement_type_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "stock_movements_movement_type_id_fkey",
        "stock_movements",
        "stock_movement_types",
        ["movement_type_id"],
        ["id"],
    )

    sku_types_table = table(
        "sku_types",
        column("code", sa.String),
        column("label", sa.String),
        column("is_active", sa.Boolean),
        column("created_at", sa.DateTime),
        column("updated_at", sa.DateTime),
    )
    movement_types_table = table(
        "stock_movement_types",
        column("code", sa.String),
        column("label", sa.String),
        column("is_active", sa.Boolean),
        column("created_at", sa.DateTime),
        column("updated_at", sa.DateTime),
    )

    now = datetime.utcnow()
    op.bulk_insert(
        sku_types_table,
        [
            {"code": "MP", "label": "Materia Prima", "is_active": True, "created_at": now, "updated_at": now},
            {"code": "SEMI", "label": "Semielaborado", "is_active": True, "created_at": now, "updated_at": now},
            {"code": "PT", "label": "Producto Terminado", "is_active": True, "created_at": now, "updated_at": now},
            {"code": "CON", "label": "Consumible", "is_active": True, "created_at": now, "updated_at": now},
            {"code": "PAP", "label": "Papelería", "is_active": True, "created_at": now, "updated_at": now},
            {"code": "LIM", "label": "Limpieza", "is_active": True, "created_at": now, "updated_at": now},
            {"code": "PACK", "label": "Pack / Packaging", "is_active": True, "created_at": now, "updated_at": now},
            {"code": "OTRO", "label": "Otro", "is_active": True, "created_at": now, "updated_at": now},
        ],
    )

    op.bulk_insert(
        movement_types_table,
        [
            {"code": "PRODUCTION", "label": "Producción", "is_active": True, "created_at": now, "updated_at": now},
            {"code": "CONSUMPTION", "label": "Consumo / Receta", "is_active": True, "created_at": now, "updated_at": now},
            {"code": "ADJUSTMENT", "label": "Ajuste", "is_active": True, "created_at": now, "updated_at": now},
            {"code": "TRANSFER", "label": "Transferencia", "is_active": True, "created_at": now, "updated_at": now},
            {"code": "REMITO", "label": "Remito", "is_active": True, "created_at": now, "updated_at": now},
            {"code": "MERMA", "label": "Merma", "is_active": True, "created_at": now, "updated_at": now},
            {"code": "PURCHASE", "label": "Ingreso desde Proveedor", "is_active": True, "created_at": now, "updated_at": now},
        ],
    )

    bind = op.get_bind()
    sku_type_rows = bind.execute(sa.text("SELECT id, code FROM sku_types")).fetchall()
    sku_type_map = {row.code: row.id for row in sku_type_rows}
    for code, sku_type_id in sku_type_map.items():
        bind.execute(
            sa.text("UPDATE skus SET sku_type_id = :sku_type_id WHERE tag = :code"),
            {"sku_type_id": sku_type_id, "code": code},
        )

    movement_type_rows = bind.execute(sa.text("SELECT id, code FROM stock_movement_types")).fetchall()
    movement_type_map = {row.code: row.id for row in movement_type_rows}
    for old_code, new_code in [
        ("production", "PRODUCTION"),
        ("consumption", "CONSUMPTION"),
        ("adjustment", "ADJUSTMENT"),
        ("transfer", "TRANSFER"),
        ("remito", "REMITO"),
        ("merma", "MERMA"),
    ]:
        movement_type_id = movement_type_map.get(new_code)
        if movement_type_id:
            bind.execute(
                sa.text(
                    "UPDATE stock_movements SET movement_type_id = :movement_type_id WHERE movement_type = :old_code"
                ),
                {"movement_type_id": movement_type_id, "old_code": old_code},
            )

    default_sku_type_id = sku_type_map.get("MP")
    if default_sku_type_id:
        bind.execute(
            sa.text("UPDATE skus SET sku_type_id = :default_id WHERE sku_type_id IS NULL"),
            {"default_id": default_sku_type_id},
        )

    default_movement_type_id = movement_type_map.get("ADJUSTMENT")
    if default_movement_type_id:
        bind.execute(
            sa.text("UPDATE stock_movements SET movement_type_id = :default_id WHERE movement_type_id IS NULL"),
            {"default_id": default_movement_type_id},
        )

    op.alter_column("skus", "sku_type_id", existing_type=sa.Integer(), nullable=False)
    op.drop_column("skus", "tag")
    op.execute("DROP TYPE IF EXISTS skutag")

    op.alter_column("stock_movements", "movement_type_id", existing_type=sa.Integer(), nullable=False)
    op.drop_column("stock_movements", "movement_type")
    op.execute("DROP TYPE IF EXISTS movementtype")


def downgrade() -> None:
    op.add_column(
        "stock_movements",
        sa.Column(
            "movement_type",
            sa.Enum(
                "production",
                "consumption",
                "adjustment",
                "transfer",
                "remito",
                "merma",
                name="movementtype",
            ),
            nullable=False,
        ),
    )
    op.add_column(
        "skus",
        sa.Column(
            "tag",
            sa.Enum("PT", "SEMI", "MP", "CON", name="skutag"),
            nullable=False,
            server_default="MP",
        ),
    )

    bind = op.get_bind()
    movement_types = bind.execute(sa.text("SELECT id, code FROM stock_movement_types")).fetchall()
    movement_type_map = {row.id: row.code for row in movement_types}
    for movement_type_id, code in movement_type_map.items():
        bind.execute(
            sa.text("UPDATE stock_movements SET movement_type = :code WHERE movement_type_id = :movement_type_id"),
            {"code": code.lower(), "movement_type_id": movement_type_id},
        )

    sku_types = bind.execute(sa.text("SELECT id, code FROM sku_types")).fetchall()
    for sku_type_id, code in sku_types:
        bind.execute(
            sa.text("UPDATE skus SET tag = :code WHERE sku_type_id = :sku_type_id"),
            {"code": code, "sku_type_id": sku_type_id},
        )

    op.alter_column("skus", "tag", nullable=False)
    op.drop_constraint("stock_movements_movement_type_id_fkey", "stock_movements", type_="foreignkey")
    op.drop_constraint("skus_sku_type_id_fkey", "skus", type_="foreignkey")
    op.drop_column("stock_movements", "movement_type_id")
    op.drop_column("skus", "sku_type_id")
    op.drop_table("stock_movement_types")
    op.drop_table("sku_types")
