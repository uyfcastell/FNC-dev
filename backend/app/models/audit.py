from typing import Optional, TYPE_CHECKING

from sqlalchemy import Column, JSON
from sqlmodel import Field, Relationship

from .common import AuditAction, TimestampedModel, enum_column

if TYPE_CHECKING:  # pragma: no cover
    from .user import User


class AuditLog(TimestampedModel, table=True):
    __tablename__ = "audit_logs"

    id: Optional[int] = Field(default=None, primary_key=True)
    entity_type: str = Field(max_length=100, index=True)
    entity_id: int | None = Field(default=None, index=True)
    action: AuditAction = Field(sa_column=enum_column(AuditAction, "auditaction"))
    changes: dict | None = Field(default=None, sa_column=Column(JSON))
    user_id: int | None = Field(default=None, foreign_key="users.id")
    ip_address: str | None = Field(default=None, max_length=64)

    user: Optional["User"] = Relationship(
        back_populates="audit_logs",
        sa_relationship_kwargs={"foreign_keys": "[AuditLog.user_id]"},
    )
