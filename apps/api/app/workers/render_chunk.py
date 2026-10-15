"""Idempotent chunk worker for certificate rendering and storage."""

from __future__ import annotations

import json
import logging
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decrypt_data
from app.core.storage import storage
from app.db.models.batch import Batch
from app.db.models.certificate import Certificate
from app.db.models.template import Template
from app.workers.finalize_batch import finalize_batch_if_completed
from app.workers.schemas import RenderChunkMessage
from pdf_renderer.engine import render_single_certificate
from pdf_renderer.models import CertificateLayout, SignatureField

logger = logging.getLogger(__name__)


def build_layout_from_field_map(field_map: dict[str, Any] | None) -> CertificateLayout:
    """Cria um layout configurado a partir do mapa de campos do template."""
    if not field_map:
        return CertificateLayout()

    kwargs: dict[str, Any] = {}
    if "orientation" in field_map:
        kwargs["orientation"] = str(field_map["orientation"])
    if "theme_name" in field_map:
        kwargs["theme_name"] = str(field_map["theme_name"])
    if "institution" in field_map:
        kwargs["institution"] = str(field_map["institution"])
    if "title" in field_map:
        kwargs["title"] = str(field_map["title"])
    if "subtitle" in field_map:
        kwargs["subtitle"] = str(field_map["subtitle"])
    if "body_template" in field_map:
        kwargs["body_template"] = str(field_map["body_template"])

    if "signatures" in field_map and isinstance(field_map["signatures"], list):
        kwargs["signatures"] = [
            SignatureField(name=str(item.get("name", "")), role=str(item.get("role", "")))
            for item in field_map["signatures"]
            if isinstance(item, dict)
        ]

    return CertificateLayout(**kwargs)


async def handle_render_chunk(message: RenderChunkMessage, db: AsyncSession) -> dict[str, Any]:
    """
    Processa um chunk de certificados de forma totalmente idempotente e resiliente.

    Regras de execução:
    1. Verifica cancelamento do lote antes do processamento.
    2. Ignora registros já finalizados (status == 'done').
    3. Cifra/decifra em memória; zero PII gravado em logs.
    4. Grava PDF em chave determinística no storage privado.
    5. Isolamento de erro por linha: falha de 1 certificado marca 'failed' sem derrubar o chunk.
    6. Atualiza o progresso global no banco de dados.
    """
    # 1. Verifica existência e status do lote
    batch_stmt = select(Batch).where(
        Batch.id == message.batch_id, Batch.tenant_id == message.tenant_id
    )
    batch = (await db.execute(batch_stmt)).scalar_one_or_none()
    if not batch:
        logger.warning("Lote não encontrado: batch_id=%s", message.batch_id)
        return {"status": "not_found", "batch_id": message.batch_id, "processed": 0}

    # Se o lote foi cancelado, aborta imediatamente
    if batch.status == "canceled":
        logger.info("Chunk abortado pois o lote %s foi cancelado.", message.batch_id)
        return {"status": "canceled", "batch_id": message.batch_id, "processed": 0}

    # Transiciona lote de queued para processing se for o primeiro chunk
    if batch.status == "queued":
        batch.status = "processing"
        await db.commit()

    # 2. Carrega template caso configurado
    template_pdf_bytes: bytes | None = None
    layout = CertificateLayout()

    if batch.template_id:
        tmpl_stmt = select(Template).where(
            Template.id == batch.template_id, Template.tenant_id == message.tenant_id
        )
        template = (await db.execute(tmpl_stmt)).scalar_one_or_none()
        if template:
            layout = build_layout_from_field_map(template.field_map)
            if template.file_key:
                try:
                    template_pdf_bytes = storage.get_file_bytes(template.file_key)
                except Exception as err:
                    logger.warning("Template file_key %s não acessível: %s", template.file_key, err)

    # 3. Busca certificados do intervalo que ainda estejam pendentes (ignora done)
    certs_stmt = (
        select(Certificate)
        .where(
            Certificate.batch_id == message.batch_id,
            Certificate.tenant_id == message.tenant_id,
            Certificate.row_index >= message.row_from,
            Certificate.row_index <= message.row_to,
            Certificate.status == "pending",
        )
        .order_by(Certificate.row_index.asc())
    )
    pending_certs = list((await db.execute(certs_stmt)).scalars().all())

    processed_count = 0
    failed_count = 0

    # 4. Renderiza e grava cada certificado individualmente
    for cert in pending_certs:
        # Idempotência dupla: assegura que não foi marcado como done por concorrência
        if cert.status == "done":
            continue

        try:
            # Decifra dados protegidos com AES-256-GCM
            cpf_str = decrypt_data(cert.cpf_enc) if cert.cpf_enc else ""
            extra_data: dict[str, Any] = {}
            if cert.data_enc:
                extra_raw = decrypt_data(cert.data_enc)
                extra_data = json.loads(extra_raw)

            render_data: dict[str, Any] = dict(extra_data)
            render_data["NOME"] = cert.recipient_name
            render_data["CPF"] = cpf_str
            render_data["CODIGO"] = cert.public_code

            # Renderização pura via ReportLab
            pdf_bytes = render_single_certificate(
                data=render_data, layout=layout, template_pdf_bytes=template_pdf_bytes
            )

            # Chave determinística no storage privado
            pdf_key = f"certs/{cert.tenant_id}/{cert.batch_id}/{cert.id}.pdf"
            storage.put_file_bytes(
                file_key=pdf_key, content=pdf_bytes, content_type="application/pdf"
            )

            # Atualização atômica do status
            cert.pdf_key = pdf_key
            cert.status = "done"
            cert.generated_at = datetime.now(UTC)
            cert.error = None
            processed_count += 1

        except Exception as exc:
            # Isolamento estrito de falhas por linha: nunca derruba o chunk
            logger.error(
                "Falha ao renderizar linha %s do lote %s: %s",
                cert.row_index,
                cert.batch_id,
                str(exc),
            )
            cert.status = "failed"
            cert.error = f"Erro na renderização do PDF: {str(exc)[:180]}"
            failed_count += 1

    await db.commit()

    # 5. Atualiza progresso e finaliza o lote se aplicável
    final_batch = await finalize_batch_if_completed(
        tenant_id=message.tenant_id, batch_id=message.batch_id, db=db
    )

    final_status = final_batch.status if final_batch else "unknown"

    return {
        "status": final_status,
        "batch_id": message.batch_id,
        "row_from": message.row_from,
        "row_to": message.row_to,
        "processed": processed_count,
        "failed": failed_count,
    }
