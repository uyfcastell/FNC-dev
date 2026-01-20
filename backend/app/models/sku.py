from typing import Optional, TYPE_CHECKING

from sqlmodel import Field, Relationship
from sqlalchemy import UniqueConstraint

from .common import TimestampedModel, UnitOfMeasure

if TYPE_CHECKING:  # pragma: no cover
    from .inventory import StockLevel
    from .inventory import ProductionLot
    from .merma import MermaEvent


class SKUType(TimestampedModel, table=True):
    __tablename__ = "sku_types"
    __table_args__ = (UniqueConstraint("code", name="uq_sku_types_code"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(max_length=16, index=True)
    label: str = Field(max_length=255)
    is_active: bool = Field(default=True)

    skus: list["SKU"] = Relationship(back_populates="sku_type")


class SKU(TimestampedModel, table=True):
    __tablename__ = "skus"

    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(index=True, unique=True, max_length=64)
    name: str = Field(max_length=255)
    sku_type_id: int = Field(foreign_key="sku_types.id", description="Tipo de SKU administrable")
    unit: UnitOfMeasure = Field(default=UnitOfMeasure.UNIT, description="Unidad de medida controlada")
    notes: str | None = Field(default=None, max_length=255)
    is_active: bool = Field(default=True)
    alert_green_min: float | None = Field(default=None, ge=0, description="Umbral mínimo para estado verde")
    alert_yellow_min: float | None = Field(default=None, ge=0, description="Umbral mínimo para estado amarillo")
    alert_red_max: float | None = Field(default=None, ge=0, description="Umbral máximo para estado rojo")

    stock_levels: list["StockLevel"] = Relationship(back_populates="sku")
    recipes: list["Recipe"] = Relationship(back_populates="product")
    merma_events: list["MermaEvent"] = Relationship(back_populates="sku")
    sku_type: SKUType = Relationship(back_populates="skus")
    semi_conversion_rule: Optional["SemiConversionRule"] = Relationship(
        back_populates="sku", sa_relationship_kwargs={"uselist": False}
    )
    production_lots: list["ProductionLot"] = Relationship(back_populates="sku")


class Recipe(TimestampedModel, table=True):
    __tablename__ = "recipes"

    id: Optional[int] = Field(default=None, primary_key=True)
    product_id: int = Field(foreign_key="skus.id")
    name: str = Field(max_length=255)

    product: SKU = Relationship(back_populates="recipes")
    items: list["RecipeItem"] = Relationship(back_populates="recipe")


class RecipeItem(TimestampedModel, table=True):
    __tablename__ = "recipe_items"

    id: Optional[int] = Field(default=None, primary_key=True)
    recipe_id: int = Field(foreign_key="recipes.id")
    component_id: int = Field(foreign_key="skus.id")
    quantity: float = Field(gt=0)

    recipe: Recipe = Relationship(back_populates="items")
    component: SKU = Relationship()


class SemiConversionRule(TimestampedModel, table=True):
    __tablename__ = "semi_conversion_rules"

    id: Optional[int] = Field(default=None, primary_key=True)
    sku_id: int = Field(foreign_key="skus.id", unique=True)
    units_per_kg: float = Field(default=1, gt=0, description="Unidades secundarias por cada kg base")

    sku: SKU = Relationship(back_populates="semi_conversion_rule")
