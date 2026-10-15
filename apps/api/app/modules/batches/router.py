"""Batches and Uploads router."""

from fastapi import APIRouter, HTTPException, Query, Response, status

from app.core.deps import CurrentTenantDep, CurrentUserDep, SessionDep
from app.core.storage import generate_file_key, storage
from app.modules.batches.schemas import (
    BatchCreateRequest,
    BatchListResponse,
    BatchResponse,
    UploadSignRequest,
    UploadSignResponse,
)
from app.modules.batches.service import (
    cancel_batch,
    create_batch_from_file,
    generate_batch_errors_csv,
    get_batch_by_id,
    list_tenant_batches,
    retry_failed_batch,
)

router = APIRouter(tags=["Batches & Uploads"])


# ---------------------------------------------------------------------------
# Upload Direct Signing
# ---------------------------------------------------------------------------


@router.post("/uploads/sign", response_model=UploadSignResponse)
async def sign_upload_url(payload: UploadSignRequest, current_tenant: CurrentTenantDep):
    """Gera uma URL pré-assinada para upload direto ao storage privado pelo navegador."""
    file_key = generate_file_key(current_tenant.id, "spreadsheets", payload.filename)
    sign_info = storage.create_upload_signed_url(file_key=file_key, expires_in=3600)

    return UploadSignResponse(
        upload_url=sign_info["upload_url"], file_key=file_key, expires_in=3600
    )


# ---------------------------------------------------------------------------
# Batches Management
# ---------------------------------------------------------------------------


@router.post("/batches", response_model=BatchResponse, status_code=status.HTTP_201_CREATED)
async def create_batch(
    payload: BatchCreateRequest,
    current_user: CurrentUserDep,
    current_tenant: CurrentTenantDep,
    db: SessionDep,
):
    """Inicia o lote a partir do arquivo já carregado no storage privado."""
    try:
        batch = await create_batch_from_file(
            tenant_id=current_tenant.id, payload=payload, created_by=current_user.id, db=db
        )
        return batch
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Arquivo de origem não encontrado no storage: {e}",
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=f"Erro ao processar planilha: {e}"
        )


@router.get("/batches", response_model=BatchListResponse)
async def list_batches(
    current_tenant: CurrentTenantDep,
    db: SessionDep,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """Lista os lotes de certificados do tenant logado (paginado)."""
    items, total = await list_tenant_batches(
        tenant_id=current_tenant.id, db=db, limit=limit, offset=offset
    )
    return BatchListResponse(items=[BatchResponse.model_validate(b) for b in items], total=total)


@router.get("/batches/{id}", response_model=BatchResponse)
async def get_batch(id: str, current_tenant: CurrentTenantDep, db: SessionDep):
    """Retorna os dados, status e contadores de progresso de um lote específico."""
    batch = await get_batch_by_id(tenant_id=current_tenant.id, batch_id=id, db=db)
    if not batch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lote não encontrado.")
    return batch


@router.get("/batches/{id}/errors.csv")
async def download_batch_errors_csv(id: str, current_tenant: CurrentTenantDep, db: SessionDep):
    """Exporta o relatório CSV de inconsistências e linhas com erro de validação (sem expor PII)."""
    csv_content = await generate_batch_errors_csv(tenant_id=current_tenant.id, batch_id=id, db=db)
    if csv_content is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lote não encontrado.")

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=erros_lote_{id}.csv"},
    )


@router.post("/batches/{id}/cancel", response_model=BatchResponse)
async def cancel_batch_endpoint(id: str, current_tenant: CurrentTenantDep, db: SessionDep):
    """Cancela o processamento de um lote em andamento."""
    try:
        batch = await cancel_batch(tenant_id=current_tenant.id, batch_id=id, db=db)
        return batch
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/batches/{id}/retry-failed", response_model=BatchResponse)
async def retry_failed_batch_endpoint(id: str, current_tenant: CurrentTenantDep, db: SessionDep):
    """Reprocessa as linhas que falharam durante a geração ou validação do lote."""
    try:
        batch = await retry_failed_batch(tenant_id=current_tenant.id, batch_id=id, db=db)
        return batch
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
