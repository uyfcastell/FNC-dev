from typing import Optional, TYPE_CHECKING

from sqlmodel import Field, Relationship
from sqlalchemy import UniqueConstraint

from .common import SKUFamily, TimestampedModel, UnitOfMeasure

if TYPE_CHECKING:  # pragma: no cover
    from .inventory import StockLevel
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
    family: SKUFamily | None = Field(default=None, description="Subtipo para consumibles")
    is_active: bool = Field(default=True)

    stock_levels: list["StockLevel"] = Relationship(back_populates="sku")
    recipes: list["Recipe"] = Relationship(back_populates="product")
    merma_events: list["MermaEvent"] = Relationship(back_populates="sku")
    sku_type: SKUType = Relationship(back_populates="skus")


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
