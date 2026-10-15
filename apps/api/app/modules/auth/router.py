"""Authentication router: Register, Login, and User Profile."""

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.core.deps import CurrentUserDep, SessionDep
from app.core.security import create_access_token, hash_password, verify_password
from app.db.models.tenant import Tenant
from app.db.models.user import User
from app.modules.auth.schemas import (
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: UserRegisterRequest, db: SessionDep):
    """Registra uma nova organização (Tenant) e seu primeiro usuário Administrador."""
    # Verifica se já existe usuário com esse e-mail
    stmt = select(User).where(User.email == payload.email)
    existing_user = (await db.execute(stmt)).scalar_one_or_none()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe uma conta cadastrada com este e-mail.",
        )

    # Cria o Tenant
    tenant = Tenant(name=payload.tenant_name.strip(), plan="free", monthly_quota=1000)
    db.add(tenant)
    await db.flush()  # Obtém o tenant.id gerado

    # Cria o usuário Admin
    user = User(
        tenant_id=tenant.id,
        email=payload.email.strip().lower(),
        password_hash=hash_password(payload.password),
        role="admin",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Gera token JWT
    token = create_access_token(data={"sub": user.id, "tenant_id": tenant.id, "role": user.role})

    return TokenResponse(
        access_token=token, token_type="bearer", tenant_id=tenant.id, user_id=user.id
    )


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLoginRequest, db: SessionDep):
    """Autentica o usuário e retorna o token JWT escopado ao seu Tenant."""
    stmt = select(User).where(User.email == payload.email.strip().lower())
    user = (await db.execute(stmt)).scalar_one_or_none()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha incorretos.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(
        data={"sub": user.id, "tenant_id": user.tenant_id, "role": user.role}
    )

    return TokenResponse(
        access_token=token, token_type="bearer", tenant_id=user.tenant_id, user_id=user.id
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: CurrentUserDep):
    """Retorna o perfil do usuário logado."""
    return current_user
