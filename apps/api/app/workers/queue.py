"""Queue dispatcher and abstract queue backend for async workers."""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod

from app.workers.schemas import RenderChunkMessage

logger = logging.getLogger(__name__)


class BaseQueueBackend(ABC):
    """Interface abstrata para o backend de filas."""

    @abstractmethod
    async def enqueue(self, message: RenderChunkMessage) -> None:
        """Enfileira uma mensagem de processamento."""
        raise NotImplementedError

    @abstractmethod
    async def get_messages(self) -> list[RenderChunkMessage]:
        """Retorna mensagens enfileiradas (para fins de teste/inspeção)."""
        raise NotImplementedError

    @abstractmethod
    def clear(self) -> None:
        """Limpa as mensagens pendentes."""
        raise NotImplementedError


class InMemoryQueueBackend(BaseQueueBackend):
    """Implementação em memória para testes e execução local desacoplada."""

    def __init__(self) -> None:
        self.messages: list[RenderChunkMessage] = []

    async def enqueue(self, message: RenderChunkMessage) -> None:
        logger.info(
            "Mensagem enfileirada: batch_id=%s, chunk=[%s, %s]",
            message.batch_id,
            message.row_from,
            message.row_to,
        )
        self.messages.append(message)

    async def get_messages(self) -> list[RenderChunkMessage]:
        return list(self.messages)

    def clear(self) -> None:
        self.messages.clear()


# Instância global do backend de filas
default_queue: BaseQueueBackend = InMemoryQueueBackend()


async def enqueue_batch_chunks(
    tenant_id: str,
    batch_id: str,
    min_row: int = 0,
    max_row: int = 0,
    chunk_size: int = 50,
    queue: BaseQueueBackend | None = None,
    total_rows: int | None = None,
) -> list[RenderChunkMessage]:
    """
    Divide o lote em chunks de até `chunk_size` linhas e enfileira uma mensagem para cada fatia.
    Garante zero PII nos payloads.
    """
    active_queue = queue or default_queue
    enqueued: list[RenderChunkMessage] = []

    if min_row == 0 and max_row == 0:
        if total_rows is None or total_rows <= 0:
            return []
        min_row = 0
        max_row = total_rows - 1

    if max_row < min_row:
        return []

    for row_from in range(min_row, max_row + 1, chunk_size):
        row_to = min(row_from + chunk_size - 1, max_row)
        msg = RenderChunkMessage(
            tenant_id=tenant_id, batch_id=batch_id, row_from=row_from, row_to=row_to
        )
        await active_queue.enqueue(msg)
        enqueued.append(msg)

    return enqueued
