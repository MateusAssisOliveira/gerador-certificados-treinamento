"""Application configuration via Pydantic Settings."""

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "apps/api/.env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
    )

    PROJECT_NAME: str = "CertificaFlow API"
    VERSION: str = "3.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./certificaflow.db"

    # Security & Cryptography
    # Chave padrão apenas para desenvolvimento local e testes. Em produção, DEVE ser injetada via Secret Manager.
    ENCRYPTION_KEY: str = "certificaflow-secret-key-32bytes!!"
    HMAC_SECRET: str = "certificaflow-hmac-secret-deterministic"
    JWT_SECRET: str = "certificaflow-jwt-secret-very-secure-key-2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 horas

    # CORS
    BACKEND_CORS_ORIGINS: list[str] | str = ["*"]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return ["*"]


settings = Settings()
