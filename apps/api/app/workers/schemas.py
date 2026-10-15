"""Worker messaging and queue schemas."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class RenderChunkMessage(BaseModel):
    """
    Mensagem de fila estritamente livre de PII.
    Trafega apenas identificadores e limites de índices de linha.
    """

    type: Literal["render_chunk"] = "render_chunk"
    tenant_id: str = Field(..., description="ID do tenant do lote")
    batch_id: str = Field(..., description="ID do lote")
    row_from: int = Field(..., ge=0, description="Índice de linha inicial (inclusivo)")
    row_to: int = Field(..., ge=0, description="Índice de linha final (inclusivo)")
