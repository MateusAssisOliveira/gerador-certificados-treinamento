"""Pydantic v2 schemas for Batches and Direct Upload signing."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

# ---------------------------------------------------------------------------
# Upload Signing Schemas
# ---------------------------------------------------------------------------


class UploadSignRequest(BaseModel):
    filename: str = Field(..., min_length=3, max_length=255, description="Nome original do arquivo")
    content_type: str = Field(
        default="application/octet-stream", description="MIME type do arquivo"
    )


class UploadSignResponse(BaseModel):
    upload_url: str
    file_key: str
    expires_in: int


# ---------------------------------------------------------------------------
# Batch Schemas
# ---------------------------------------------------------------------------


class BatchCreateRequest(BaseModel):
    template_id: str | None = Field(default=None, description="ID do template visual associado")
    source_file_key: str = Field(..., description="Chave do arquivo já enviado ao storage privado")


class BatchResponse(BaseModel):
    id: str
    tenant_id: str
    template_id: str | None
    status: str
    total: int
    done: int
    failed: int
    source_file_key: str | None
    zip_key: str | None
    error_summary: str | None
    created_at: datetime
    completed_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class BatchListResponse(BaseModel):
    items: list[BatchResponse]
    total: int
