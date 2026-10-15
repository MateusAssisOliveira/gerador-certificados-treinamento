"""Tenant router."""

from fastapi import APIRouter

from app.core.deps import CurrentTenantDep
from app.modules.tenants.schemas import TenantResponse

router = APIRouter(prefix="/tenants", tags=["Tenants"])


@router.get("/me", response_model=TenantResponse)
async def get_current_tenant_info(current_tenant: CurrentTenantDep):
    """Retorna os dados do tenant autenticado."""
    return current_tenant
