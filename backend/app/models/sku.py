from typing import Optional, TYPE_CHECKING

from sqlmodel import Field, Relationship

from .common import SKUTag, TimestampedModel

if TYPE_CHECKING:  # pragma: no cover
    from .inventory import StockLevel


class SKU(TimestampedModel, table=True):
    __tablename__ = "skus"

    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(index=True, unique=True, max_length=64)
    name: str = Field(max_length=255)
    tag: SKUTag = Field(description="Tipo de SKU: PT/SEMI/MP/CON")
    unit: str = Field(default="unit")
    notes: str | None = Field(default=None, max_length=255)

    stock_levels: list["StockLevel"] = Relationship(back_populates="sku")
    recipes: list["Recipe"] = Relationship(back_populates="product")


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

