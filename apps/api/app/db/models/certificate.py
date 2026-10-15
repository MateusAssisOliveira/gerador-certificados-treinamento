"""Certificate ORM model."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    Integer,
    LargeBinary,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.db.models.batch import Batch
    from app.db.models.tenant import Tenant


class Certificate(Base):
    __tablename__ = "certificates"
    __table_args__ = (
        UniqueConstraint("batch_id", "row_index", name="uq_batch_row"),
        Index("ix_certificates_tenant_cpf_hmac", "tenant_id", "cpf_hmac"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True
    )
    tenant_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    batch_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("batches.id", ondelete="CASCADE"), nullable=False, index=True
    )
    row_index: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False, index=True)

    recipient_name: Mapped[str] = mapped_column(String(255), nullable=False)
    cpf_enc: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    cpf_hmac: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    data_enc: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)

    pdf_key: Mapped[str | None] = mapped_column(String(500), nullable=True)
    public_code: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    generated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relacionamentos
    tenant: Mapped[Tenant] = relationship("Tenant", back_populates="certificates")
    batch: Mapped[Batch] = relationship("Batch", back_populates="certificates")
