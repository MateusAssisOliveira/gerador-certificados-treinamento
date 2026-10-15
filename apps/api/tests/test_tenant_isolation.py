"""Automated tests for multi-tenant isolation."""

import pytest
from httpx import AsyncClient

from app.core.config import settings
from app.core.security import create_access_token


@pytest.mark.asyncio
async def test_tenant_isolation_profile(client: AsyncClient):
    """Testa se cada usuário acessa única e exclusivamente os dados do seu próprio Tenant."""
    # 1. Registra Tenant Alpha
    resp_alpha = await client.post(
        f"{settings.API_V1_STR}/auth/register",
        json={
            "tenant_name": "Organizacao Alpha",
            "email": "admin@alpha.com",
            "password": "SenhaSeguraAlpha123!",
        },
    )
    assert resp_alpha.status_code == 201
    data_alpha = resp_alpha.json()
    token_alpha = data_alpha["access_token"]
    tenant_id_alpha = data_alpha["tenant_id"]

    # 2. Registra Tenant Beta
    resp_beta = await client.post(
        f"{settings.API_V1_STR}/auth/register",
        json={
            "tenant_name": "Organizacao Beta",
            "email": "admin@beta.com",
            "password": "SenhaSeguraBeta123!",
        },
    )
    assert resp_beta.status_code == 201
    data_beta = resp_beta.json()
    token_beta = data_beta["access_token"]
    tenant_id_beta = data_beta["tenant_id"]

    assert tenant_id_alpha != tenant_id_beta

    # 3. Consulta /tenants/me com Token Alpha
    headers_alpha = {"Authorization": f"Bearer {token_alpha}"}
    me_alpha = await client.get(f"{settings.API_V1_STR}/tenants/me", headers=headers_alpha)
    assert me_alpha.status_code == 200
    assert me_alpha.json()["id"] == tenant_id_alpha
    assert me_alpha.json()["name"] == "Organizacao Alpha"

    # 4. Consulta /tenants/me com Token Beta
    headers_beta = {"Authorization": f"Bearer {token_beta}"}
    me_beta = await client.get(f"{settings.API_V1_STR}/tenants/me", headers=headers_beta)
    assert me_beta.status_code == 200
    assert me_beta.json()["id"] == tenant_id_beta
    assert me_beta.json()["name"] == "Organizacao Beta"

    # 5. Token forjado tentando apontar para o tenant_id do outro
    forged_token = create_access_token(
        data={"sub": data_alpha["user_id"], "tenant_id": tenant_id_beta, "role": "admin"}
    )
    forged_resp = await client.get(
        f"{settings.API_V1_STR}/tenants/me", headers={"Authorization": f"Bearer {forged_token}"}
    )
    # Deve falhar com 401 porque o user_id pertence ao tenant_id_alpha, não ao beta
    assert forged_resp.status_code == 401
