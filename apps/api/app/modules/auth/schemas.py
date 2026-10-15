"""Authentication Pydantic v2 schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserRegisterRequest(BaseModel):
    tenant_name: str = Field(
        ..., min_length=2, max_length=255, description="Nome da organização/escola"
    )
    email: EmailStr = Field(..., description="E-mail profissional do administrador")
    password: str = Field(..., min_length=6, max_length=128, description="Senha de acesso")


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    tenant_id: str
    user_id: str


class UserResponse(BaseModel):
    id: str
    tenant_id: str
    email: str
    role: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
