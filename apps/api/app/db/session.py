"""Database engine and session management with SQLAlchemy 2.0 (async)."""

from collections.abc import AsyncGenerator
from typing import Any

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from app.core.config import settings

# Se for PostgreSQL em ambiente Serverless, usamos NullPool para delegar o pooling ao PgBouncer/Supavisor
engine_kwargs: dict[str, Any] = {}
if "sqlite" in settings.DATABASE_URL:
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    engine_kwargs["poolclass"] = NullPool

engine = create_async_engine(settings.DATABASE_URL, echo=False, **engine_kwargs)

async_session_maker = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that yields an active async database session."""
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()
