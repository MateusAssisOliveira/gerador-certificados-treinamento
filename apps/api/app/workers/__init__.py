"""Worker module for background tasks and asynchronous batch processing."""

from __future__ import annotations

from app.workers.finalize_batch import finalize_batch_if_completed
from app.workers.queue import (
    BaseQueueBackend,
    InMemoryQueueBackend,
    default_queue,
    enqueue_batch_chunks,
)
from app.workers.render_chunk import handle_render_chunk
from app.workers.schemas import RenderChunkMessage
from app.workers.stuck_batches import recover_stuck_batches

__all__ = [
    "RenderChunkMessage",
    "BaseQueueBackend",
    "InMemoryQueueBackend",
    "default_queue",
    "enqueue_batch_chunks",
    "handle_render_chunk",
    "finalize_batch_if_completed",
    "recover_stuck_batches",
]
