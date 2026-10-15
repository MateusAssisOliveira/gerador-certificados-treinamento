"""Tenant Pydantic v2 schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class TenantBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    plan: str = Field(default="free", max_length=50)


class TenantCreate(TenantBase):
    pass


class TenantResponse(TenantBase):
    id: str
    monthly_quota: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
