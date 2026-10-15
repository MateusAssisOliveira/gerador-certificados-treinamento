"""FastAPI dependencies: Database session, authentication, and multi-tenant scoping."""

from collections.abc import AsyncGenerator
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import decode_access_token
from app.db.models.tenant import Tenant
from app.db.models.user import User
from app.db.session import async_session_maker

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Injeta a sessão assíncrona do banco de dados na rota."""
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


SessionDep = Annotated[AsyncSession, Depends(get_db)]
TokenDep = Annotated[str, Depends(oauth2_scheme)]


async def get_current_user(db: SessionDep, token: TokenDep) -> User:
    """Valida o token JWT e retorna o usuário logado."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais inválidas ou token expirado.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
        user_id_raw = payload.get("sub")
        tenant_id_raw = payload.get("tenant_id")
        if not user_id_raw or not tenant_id_raw:
            raise credentials_exception
        user_id = str(user_id_raw)
        tenant_id = str(tenant_id_raw)
    except (jwt.PyJWTError, ValueError):
        raise credentials_exception

    stmt = select(User).where(User.id == user_id, User.tenant_id == tenant_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    return user


CurrentUserDep = Annotated[User, Depends(get_current_user)]


async def get_current_tenant(db: SessionDep, current_user: CurrentUserDep) -> Tenant:
    """Garante o isolamento multi-tenant retornando o Tenant do usuário autenticado."""
    stmt = select(Tenant).where(Tenant.id == current_user.tenant_id)
    result = await db.execute(stmt)
    tenant = result.scalar_one_or_none()

    if tenant is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tenant não encontrado ou inativo."
        )

    return tenant


CurrentTenantDep = Annotated[Tenant, Depends(get_current_tenant)]
