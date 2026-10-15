"""Batch processing and spreadsheet ingestion service."""

from __future__ import annotations

import csv
import io
import json
import secrets

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import encrypt_data, generate_cpf_hmac
from app.core.storage import sanitize_csv_cell, storage
from app.db.models.batch import Batch
from app.db.models.certificate import Certificate
from app.modules.batches.parser import parse_spreadsheet_bytes
from app.modules.batches.schemas import BatchCreateRequest
from app.workers.queue import default_queue, enqueue_batch_chunks
from app.workers.schemas import RenderChunkMessage


async def create_batch_from_file(
    tenant_id: str, payload: BatchCreateRequest, created_by: str, db: AsyncSession
) -> Batch:
    """
    Ingere a planilha do storage privado, valida linha a linha,
    cifra dados pessoais (AES-256-GCM + HMAC) e registra Batch e Certificates no banco.
    """
    # 1. Busca os bytes da planilha armazenada
    file_bytes = storage.get_file_bytes(payload.source_file_key)

    # 2. Executa o parser e a validação linha a linha
    parse_result = parse_spreadsheet_bytes(file_bytes, payload.source_file_key)

    # 3. Cria a entidade Batch inicial
    status_inicial = "queued" if len(parse_result.valid_rows) > 0 else "failed"
    error_summary = None
    if status_inicial == "failed":
        error_summary = (
            "Todas as linhas da planilha continham inconsistências ou erros de validação."
        )
    elif len(parse_result.invalid_rows) > 0:
        error_summary = f"{len(parse_result.invalid_rows)} linha(s) com erros de validação."

    batch = Batch(
        tenant_id=tenant_id,
        template_id=payload.template_id,
        status=status_inicial,
        total=parse_result.total_rows,
        done=0,
        failed=len(parse_result.invalid_rows),
        source_file_key=payload.source_file_key,
        error_summary=error_summary,
        created_by=created_by,
    )
    db.add(batch)
    await db.flush()  # Garante a geração do batch.id

    # 4. Registra as linhas válidas (status: pending, com CPF cifrado em AES-256-GCM)
    for row in parse_result.valid_rows:
        cpf_enc = encrypt_data(row.cpf) if row.cpf else b""
        cpf_hmac = generate_cpf_hmac(row.cpf) if row.cpf else ""
        data_enc = (
            encrypt_data(json.dumps(row.extra_data, ensure_ascii=False)) if row.extra_data else None
        )

        cert = Certificate(
            tenant_id=tenant_id,
            batch_id=batch.id,
            row_index=row.row_index,
            status="pending",
            recipient_name=row.recipient_name,
            cpf_enc=cpf_enc,
            cpf_hmac=cpf_hmac,
            data_enc=data_enc,
            public_code=secrets.token_urlsafe(16),
            error=None,
        )
        db.add(cert)

    # 5. Registra as linhas inválidas (status: failed, com o motivo do erro sem PII)
    for invalid_row in parse_result.invalid_rows:
        cert = Certificate(
            tenant_id=tenant_id,
            batch_id=batch.id,
            row_index=invalid_row.row_index,
            status="failed",
            recipient_name=invalid_row.recipient_name or "(Sem Nome)",
            cpf_enc=b"",
            cpf_hmac="",
            data_enc=None,
            public_code=secrets.token_urlsafe(16),
            error=invalid_row.error_reason,
        )
        db.add(cert)

    await db.commit()
    await db.refresh(batch)

    # 6. Enfileira chunks para processamento assíncrono caso haja linhas válidas
    if batch.status == "queued" and len(parse_result.valid_rows) > 0:
        valid_indices = [r.row_index for r in parse_result.valid_rows]
        await enqueue_batch_chunks(
            tenant_id=tenant_id,
            batch_id=batch.id,
            min_row=min(valid_indices),
            max_row=max(valid_indices),
            chunk_size=50,
        )

    return batch


async def get_batch_by_id(tenant_id: str, batch_id: str, db: AsyncSession) -> Batch | None:
    """Retorna um lote específico garantindo o isolamento pelo tenant_id."""
    stmt = select(Batch).where(Batch.id == batch_id, Batch.tenant_id == tenant_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def list_tenant_batches(
    tenant_id: str, db: AsyncSession, limit: int = 50, offset: int = 0
) -> tuple[list[Batch], int]:
    """Lista os lotes de um tenant com paginação e contagem total."""
    count_stmt = select(func.count(Batch.id)).where(Batch.tenant_id == tenant_id)
    total = (await db.execute(count_stmt)).scalar() or 0

    stmt = (
        select(Batch)
        .where(Batch.tenant_id == tenant_id)
        .order_by(Batch.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    items = list((await db.execute(stmt)).scalars().all())
    return items, total


async def generate_batch_errors_csv(tenant_id: str, batch_id: str, db: AsyncSession) -> str | None:
    """
    Gera o conteúdo de um CSV com o relatório de falhas do lote.
    Aplica proteção contra CSV injection e NÃO exporta CPFs em conformidade com a LGPD.
    """
    # Verifica se o lote existe e pertence ao tenant
    batch = await get_batch_by_id(tenant_id, batch_id, db)
    if not batch:
        return None

    stmt = (
        select(Certificate)
        .where(
            Certificate.batch_id == batch_id,
            Certificate.tenant_id == tenant_id,
            Certificate.status == "failed",
        )
        .order_by(Certificate.row_index.asc())
    )
    failed_certs = (await db.execute(stmt)).scalars().all()

    output = io.StringIO()
    writer = csv.writer(output, delimiter=";")
    writer.writerow(["LINHA", "NOME", "MOTIVO_ERRO"])

    for cert in failed_certs:
        writer.writerow(
            [
                cert.row_index,
                sanitize_csv_cell(cert.recipient_name),
                sanitize_csv_cell(cert.error or "Inconsistência desconhecida"),
            ]
        )

    return output.getvalue()


async def cancel_batch(tenant_id: str, batch_id: str, db: AsyncSession) -> Batch:
    """Cancela o lote caso ainda não tenha sido concluído."""
    batch = await get_batch_by_id(tenant_id, batch_id, db)
    if not batch:
        raise ValueError("Lote não encontrado.")

    if batch.status in ("completed", "completed_with_errors", "failed", "canceled"):
        raise ValueError(
            f"Não é possível cancelar um lote já finalizado com status '{batch.status}'."
        )

    batch.status = "canceled"
    await db.commit()
    await db.refresh(batch)
    return batch


async def retry_failed_batch(tenant_id: str, batch_id: str, db: AsyncSession) -> Batch:
    """Reprocessa as linhas com status 'failed' de um lote."""
    batch = await get_batch_by_id(tenant_id, batch_id, db)
    if not batch:
        raise ValueError("Lote não encontrado.")

    if batch.status == "canceled":
        raise ValueError("Lotes cancelados não podem ser reprocessados.")

    stmt = select(Certificate).where(
        Certificate.batch_id == batch_id,
        Certificate.tenant_id == tenant_id,
        Certificate.status == "failed",
    )
    failed_certs = list((await db.execute(stmt)).scalars().all())
    if not failed_certs:
        return batch

    failed_indices = [c.row_index for c in failed_certs]
    for c in failed_certs:
        c.status = "pending"
        c.error = None

    batch.failed = max(0, batch.failed - len(failed_certs))
    batch.status = "processing"
    await db.commit()
    await db.refresh(batch)

    # Reenfileira chunks para as linhas que voltaram para pending
    min_idx = min(failed_indices)
    max_idx = max(failed_indices)
    for row_from in range(min_idx, max_idx + 1, 50):
        row_to = min(row_from + 49, max_idx)
        if any(row_from <= idx <= row_to for idx in failed_indices):
            await default_queue.enqueue(
                RenderChunkMessage(
                    tenant_id=tenant_id, batch_id=batch_id, row_from=row_from, row_to=row_to
                )
            )

    return batch
