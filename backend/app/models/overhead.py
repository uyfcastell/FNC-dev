from datetime import date as dt_date
from typing import Optional, TYPE_CHECKING

from sqlmodel import Field, Relationship
from sqlalchemy import UniqueConstraint

from .common import DailyOverheadAllocationMethod, DailyOverheadItemType, TimestampedModel, enum_column

if TYPE_CHECKING:  # pragma: no cover
    from .user import User


class DailyOverhead(TimestampedModel, table=True):
    __tablename__ = "daily_overheads"
    __table_args__ = (UniqueConstraint("date", name="uq_daily_overheads_date"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    date: dt_date = Field(index=True)
    energy_cost: float = Field(default=0, ge=0)
    gas_cost: float = Field(default=0, ge=0)
    allocation_method: DailyOverheadAllocationMethod = Field(
        default=DailyOverheadAllocationMethod.UNITS,
        sa_column=enum_column(DailyOverheadAllocationMethod, "dailyoverheadallocationmethod"),
    )
    notes: str | None = Field(default=None, max_length=500)
    created_by_user_id: int | None = Field(default=None, foreign_key="users.id")

    created_by_user: Optional["User"] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[DailyOverhead.created_by_user_id]"},
    )

    items: list["DailyOverheadItem"] = Relationship(back_populates="daily_overhead")


class DailyOverheadItem(TimestampedModel, table=True):
    __tablename__ = "daily_overhead_items"

    id: Optional[int] = Field(default=None, primary_key=True)
    daily_overhead_id: int = Field(foreign_key="daily_overheads.id")
    concept_type: DailyOverheadItemType = Field(
        default=DailyOverheadItemType.OTHER,
        sa_column=enum_column(DailyOverheadItemType, "dailyoverheaditemtype"),
    )
    concept_name: str = Field(max_length=255)
    amount: float = Field(ge=0)
    notes: str | None = Field(default=None, max_length=500)

    daily_overhead: DailyOverhead = Relationship(back_populates="items")
