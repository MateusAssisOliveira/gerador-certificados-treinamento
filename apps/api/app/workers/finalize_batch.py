"""Batch completion and progress tracking worker."""

from __future__ import annotations

import logging
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.batch import Batch
from app.db.models.certificate import Certificate

logger = logging.getLogger(__name__)


async def finalize_batch_if_completed(
    tenant_id: str, batch_id: str, db: AsyncSession
) -> Batch | None:
    """
    Atualiza contadores de progresso e finaliza o status do lote de forma idempotente.
    O banco de dados é a fonte absoluta da verdade.
    """
    stmt = select(Batch).where(Batch.id == batch_id, Batch.tenant_id == tenant_id)
    batch = (await db.execute(stmt)).scalar_one_or_none()
    if not batch:
        return None

    # Se o lote já foi cancelado pelo usuário, mantemos cancelado
    if batch.status == "canceled":
        return batch

    # Contagem no banco de dados por status
    count_stmt = (
        select(Certificate.status, func.count(Certificate.id))
        .where(Certificate.batch_id == batch_id, Certificate.tenant_id == tenant_id)
        .group_by(Certificate.status)
    )
    results = dict((await db.execute(count_stmt)).all())

    done_count = results.get("done", 0)
    failed_count = results.get("failed", 0)
    pending_count = results.get("pending", 0)

    batch.done = done_count
    batch.failed = failed_count

    # Verifica se todas as linhas foram processadas
    total_processed = done_count + failed_count
    if pending_count == 0 or total_processed >= batch.total:
        if failed_count == batch.total:
            batch.status = "failed"
            batch.error_summary = "Todas as linhas falharam na validação ou renderização."
        elif failed_count > 0:
            batch.status = "completed_with_errors"
            batch.error_summary = f"{failed_count} linha(s) com erro durante o processamento."
        else:
            batch.status = "completed"
            batch.error_summary = None

        batch.completed_at = datetime.now(UTC)
        logger.info(
            "Lote finalizado com sucesso: batch_id=%s, status=%s, done=%d, failed=%d",
            batch.id,
            batch.status,
            batch.done,
            batch.failed,
        )
    else:
        # Se ainda há linhas pendentes mas começou a rodar, marca como processing
        if batch.status == "queued" and total_processed > 0:
            batch.status = "processing"

    await db.commit()
    await db.refresh(batch)
    return batch
