"""Routine to detect and recover stuck batches (Cron job)."""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.batch import Batch
from app.db.models.certificate import Certificate
from app.workers.queue import BaseQueueBackend, default_queue
from app.workers.schemas import RenderChunkMessage

logger = logging.getLogger(__name__)


async def recover_stuck_batches(
    db: AsyncSession,
    older_than_minutes: int = 15,
    chunk_size: int = 50,
    queue: BaseQueueBackend | None = None,
) -> list[str]:
    """
    Identifica lotes em 'processing' ou 'queued' sem conclusão há mais de `older_than_minutes`
    e reenfileira chunks para as linhas que ainda se encontram pendentes.
    """
    cutoff_time = datetime.now(UTC) - timedelta(minutes=older_than_minutes)
    active_queue = queue or default_queue

    # Busca lotes que possam estar travados
    stmt = select(Batch).where(
        Batch.status.in_(["processing", "queued"]), Batch.created_at <= cutoff_time
    )
    stuck_batches = list((await db.execute(stmt)).scalars().all())
    recovered_batch_ids: list[str] = []

    for batch in stuck_batches:
        # Busca índices das linhas ainda pendentes
        pending_stmt = (
            select(Certificate.row_index)
            .where(
                Certificate.batch_id == batch.id,
                Certificate.tenant_id == batch.tenant_id,
                Certificate.status == "pending",
            )
            .order_by(Certificate.row_index.asc())
        )
        pending_indices = list((await db.execute(pending_stmt)).scalars().all())

        if not pending_indices:
            # Não há pendências, apenas finaliza
            from app.workers.finalize_batch import finalize_batch_if_completed

            await finalize_batch_if_completed(batch.tenant_id, batch.id, db)
            continue

        # Agrupa índices contíguos ou em fatias de até chunk_size
        min_idx = min(pending_indices)
        max_idx = max(pending_indices)

        logger.info(
            "Recuperando lote travado: batch_id=%s, pendentes=%d, intervalo=[%d, %d]",
            batch.id,
            len(pending_indices),
            min_idx,
            max_idx,
        )

        for row_from in range(min_idx, max_idx + 1, chunk_size):
            row_to = min(row_from + chunk_size - 1, max_idx)
            # Só enfileira se houver de fato linha pendente nesta fatia
            has_pending_in_slice = any(row_from <= idx <= row_to for idx in pending_indices)
            if has_pending_in_slice:
                msg = RenderChunkMessage(
                    tenant_id=batch.tenant_id, batch_id=batch.id, row_from=row_from, row_to=row_to
                )
                await active_queue.enqueue(msg)

        batch.status = "processing"
        recovered_batch_ids.append(batch.id)

    await db.commit()
    return recovered_batch_ids
