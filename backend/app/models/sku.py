from typing import Optional, TYPE_CHECKING

from sqlmodel import Field, Relationship

from .common import SKUFamily, SKUTag, TimestampedModel, UnitOfMeasure

if TYPE_CHECKING:  # pragma: no cover
    from .inventory import StockLevel
    from .merma import MermaEvent


class SKU(TimestampedModel, table=True):
    __tablename__ = "skus"

    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(index=True, unique=True, max_length=64)
    name: str = Field(max_length=255)
    tag: SKUTag = Field(description="Tipo de SKU: PT/SEMI/MP/CON")
    unit: UnitOfMeasure = Field(default=UnitOfMeasure.UNIT, description="Unidad de medida controlada")
    notes: str | None = Field(default=None, max_length=255)
    family: SKUFamily | None = Field(default=None, description="Subtipo para consumibles")
    is_active: bool = Field(default=True)

    stock_levels: list["StockLevel"] = Relationship(back_populates="sku")
    recipes: list["Recipe"] = Relationship(back_populates="product")
    merma_events: list["MermaEvent"] = Relationship(back_populates="sku")


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
