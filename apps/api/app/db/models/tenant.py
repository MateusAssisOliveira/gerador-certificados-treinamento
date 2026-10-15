"""Tenant ORM model."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.db.models.batch import Batch
    from app.db.models.certificate import Certificate
    from app.db.models.template import Template
    from app.db.models.user import User


class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    plan: Mapped[str] = mapped_column(String(50), default="free", nullable=False)
    monthly_quota: Mapped[int] = mapped_column(Integer, default=1000, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    # Relacionamentos
    users: Mapped[list[User]] = relationship(
        "User", back_populates="tenant", cascade="all, delete-orphan"
    )
    templates: Mapped[list[Template]] = relationship(
        "Template", back_populates="tenant", cascade="all, delete-orphan"
    )
    batches: Mapped[list[Batch]] = relationship(
        "Batch", back_populates="tenant", cascade="all, delete-orphan"
    )
    certificates: Mapped[list[Certificate]] = relationship(
        "Certificate", back_populates="tenant", cascade="all, delete-orphan"
    )
