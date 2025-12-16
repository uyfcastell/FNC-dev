from typing import Optional

from sqlmodel import Field, Relationship, SQLModel

from .common import TimestampedModel


class Role(TimestampedModel, table=True):
    __tablename__ = "roles"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True, max_length=50)
    description: str | None = Field(default=None, max_length=255)

    users: list["User"] = Relationship(back_populates="role")


class User(TimestampedModel, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True, max_length=255)
    full_name: str = Field(max_length=255)
    hashed_password: str = Field(max_length=255)
    is_active: bool = Field(default=True)
    role_id: int | None = Field(default=None, foreign_key="roles.id")

    role: Role | None = Relationship(back_populates="users")

