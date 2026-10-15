"""Automated tests for authentication routes and JWT flow."""

import pytest
from httpx import AsyncClient

from app.core.config import settings


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    """Testa endpoint de verificação de integridade."""
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


@pytest.mark.asyncio
async def test_register_and_login_flow(client: AsyncClient):
    """Testa o fluxo completo de registro, login e perfil."""
    # 1. Registro
    reg_payload = {
        "tenant_name": "Instituto Educacional Modelo",
        "email": "coordenador@modelo.edu.br",
        "password": "SenhaSuperSecreta@123",
    }
    reg_resp = await client.post(f"{settings.API_V1_STR}/auth/register", json=reg_payload)
    assert reg_resp.status_code == 201
    data = reg_resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert "tenant_id" in data
    assert "user_id" in data

    token = data["access_token"]

    # 2. Tentativa de registro duplicado com mesmo e-mail
    dup_resp = await client.post(f"{settings.API_V1_STR}/auth/register", json=reg_payload)
    assert dup_resp.status_code == 400
    assert "Já existe uma conta" in dup_resp.json()["detail"]

    # 3. Login com senha correta
    login_resp = await client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": "coordenador@modelo.edu.br", "password": "SenhaSuperSecreta@123"},
    )
    assert login_resp.status_code == 200
    login_data = login_resp.json()
    assert "access_token" in login_data
    assert login_data["tenant_id"] == data["tenant_id"]

    # 4. Login com senha incorreta
    bad_login_resp = await client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": "coordenador@modelo.edu.br", "password": "SenhaErrada!"},
    )
    assert bad_login_resp.status_code == 401

    # 5. Consulta /auth/me autenticado
    me_resp = await client.get(
        f"{settings.API_V1_STR}/auth/me", headers={"Authorization": f"Bearer {token}"}
    )
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["email"] == "coordenador@modelo.edu.br"
    assert me_data["role"] == "admin"
    assert me_data["tenant_id"] == data["tenant_id"]

    # 6. Consulta /auth/me sem token
    unauth_resp = await client.get(f"{settings.API_V1_STR}/auth/me")
    assert unauth_resp.status_code == 401
