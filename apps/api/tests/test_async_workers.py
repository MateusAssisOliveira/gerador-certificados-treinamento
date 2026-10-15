"""Tests for Phase 4: Async workers, idempotency, fault isolation, and recovery."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from unittest.mock import patch

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.storage import storage
from app.db.models.batch import Batch
from app.db.models.certificate import Certificate
from app.workers.queue import default_queue
from app.workers.render_chunk import handle_render_chunk
from app.workers.schemas import RenderChunkMessage
from app.workers.stuck_batches import recover_stuck_batches


@pytest.mark.asyncio
async def test_queue_message_has_zero_pii():
    """Garante que o payload de mensagem de fila não contém campos de PII."""
    msg = RenderChunkMessage(tenant_id="tenant-123", batch_id="batch-456", row_from=0, row_to=49)
    dumped = msg.model_dump()
    assert set(dumped.keys()) == {"type", "tenant_id", "batch_id", "row_from", "row_to"}
    assert "cpf" not in dumped
    assert "name" not in dumped
    assert "email" not in dumped


@pytest.mark.asyncio
async def test_full_batch_processing_and_idempotency(client: AsyncClient, db_session: AsyncSession):
    """
    Testa o fluxo completo:
    1. Upload de planilha sintética e criação de lote.
    2. Enfileiramento de chunks.
    3. Processamento assíncrono pelo worker handle_render_chunk.
    4. Reentrega duplicada do chunk (teste de idempotência estrita).
    """
    default_queue.clear()

    # 1. Registra Tenant
    reg_resp = await client.post(
        f"{settings.API_V1_STR}/auth/register",
        json={
            "tenant_name": "Instituto Worker Test",
            "email": "worker@instituto.com",
            "password": "SenhaUltraSegura!1",
        },
    )
    token = reg_resp.json()["access_token"]
    tenant_id = reg_resp.json()["tenant_id"]

    # 2. Prepara planilha sintética com 3 linhas (2 válidas, 1 com CPF inválido)
    csv_bytes = (
        "NOME_COMPLETO;CPF;CURSO;CARGAHORARIA;DATA\n"
        "Aluno Um;529.982.247-25;Segurança do Trabalho;40h;15/10/2026\n"
        "Aluno Dois;111.444.777-35;Primeiros Socorros;20h;15/10/2026\n"
        "Aluno Invalido;111.222.333-44;Brigada;10h;15/10/2026\n"
    ).encode("utf-8-sig")

    file_key = f"tenants/{tenant_id}/spreadsheets/lote_worker.csv"
    storage.save_file_bytes(file_key, csv_bytes)

    # 3. Cria Batch
    batch_resp = await client.post(
        f"{settings.API_V1_STR}/batches",
        headers={"Authorization": f"Bearer {token}"},
        json={"source_file_key": file_key},
    )
    assert batch_resp.status_code == 201
    batch_data = batch_resp.json()
    batch_id = batch_data["id"]

    assert batch_data["total"] == 3
    assert batch_data["failed"] == 1
    assert batch_data["done"] == 0

    # 4. Verifica se a fila recebeu a mensagem do chunk
    queued_msgs = await default_queue.get_messages()
    assert len(queued_msgs) >= 1
    chunk_msg = queued_msgs[0]
    assert chunk_msg.batch_id == batch_id
    assert chunk_msg.tenant_id == tenant_id

    # 5. Executa o worker para processar o chunk
    result = await handle_render_chunk(chunk_msg, db_session)
    assert result["processed"] == 2
    assert result["failed"] == 0

    # 6. Verifica o estado final do lote no banco
    get_resp = await client.get(
        f"{settings.API_V1_STR}/batches/{batch_id}", headers={"Authorization": f"Bearer {token}"}
    )
    batch_info = get_resp.json()
    assert batch_info["status"] == "completed_with_errors"
    assert batch_info["done"] == 2
    assert batch_info["failed"] == 1
    assert batch_info["completed_at"] is not None

    # 7. Verifica se os PDFs foram gerados e armazenados no storage
    certs_stmt = select(Certificate).where(
        Certificate.batch_id == batch_id, Certificate.status == "done"
    )
    done_certs = list((await db_session.execute(certs_stmt)).scalars().all())
    assert len(done_certs) == 2
    for cert in done_certs:
        assert cert.pdf_key is not None
        pdf_bytes = storage.get_file_bytes(cert.pdf_key)
        assert len(pdf_bytes) > 500
        assert pdf_bytes.startswith(b"%PDF")

    # 8. TESTE DE IDEMPOTÊNCIA (Reentrega duplicada do mesmo chunk)
    # Executar o mesmo chunk novamente NÃO pode reprocessar, duplicar nem alterar contadores
    re_result = await handle_render_chunk(chunk_msg, db_session)
    assert re_result["processed"] == 0  # Linhas já estavam 'done', ignoradas com segurança

    # Consulta novamente o lote
    re_get = await client.get(
        f"{settings.API_V1_STR}/batches/{batch_id}", headers={"Authorization": f"Bearer {token}"}
    )
    re_info = re_get.json()
    assert re_info["done"] == 2
    assert re_info["failed"] == 1
    assert re_info["status"] == "completed_with_errors"


@pytest.mark.asyncio
async def test_chunk_partial_line_failure_isolation(client: AsyncClient, db_session: AsyncSession):
    """
    Testa isolamento estrito de falhas por linha:
    Se a renderização de uma linha falhar por qualquer motivo inesperado,
    o worker não quebra o chunk nem derruba as demais linhas.
    """
    default_queue.clear()

    # Cria Tenant
    reg_resp = await client.post(
        f"{settings.API_V1_STR}/auth/register",
        json={
            "tenant_name": "Instituto Isolamento Test",
            "email": "isolamento@instituto.com",
            "password": "SenhaUltraSegura!1",
        },
    )
    token = reg_resp.json()["access_token"]
    tenant_id = reg_resp.json()["tenant_id"]

    # Planilha com 2 linhas válidas
    csv_bytes = (
        "NOME_COMPLETO;CPF;CURSO;CARGAHORARIA\n"
        "Aluno Sucesso;529.982.247-25;Curso A;10h\n"
        "Aluno FalhaSimulada;111.444.777-35;Curso B;20h\n"
    ).encode("utf-8-sig")

    file_key = f"tenants/{tenant_id}/spreadsheets/isolamento.csv"
    storage.save_file_bytes(file_key, csv_bytes)

    batch_resp = await client.post(
        f"{settings.API_V1_STR}/batches",
        headers={"Authorization": f"Bearer {token}"},
        json={"source_file_key": file_key},
    )
    batch_id = batch_resp.json()["id"]

    chunk_msg = RenderChunkMessage(tenant_id=tenant_id, batch_id=batch_id, row_from=0, row_to=10)

    # Simula falha apenas quando o nome for "Aluno FalhaSimulada"
    from pdf_renderer import engine

    original_render = engine.render_single_certificate

    def mock_render(data, layout=None, template_pdf_bytes=None):
        if data.get("NOME") == "Aluno FalhaSimulada":
            raise RuntimeError("Erro simulado de corrupção gráfica")
        return original_render(data, layout, template_pdf_bytes)

    with patch("app.workers.render_chunk.render_single_certificate", side_effect=mock_render):
        result = await handle_render_chunk(chunk_msg, db_session)

    assert result["processed"] == 1
    assert result["failed"] == 1

    # Verifica status dos dois certificados
    stmt = (
        select(Certificate)
        .where(Certificate.batch_id == batch_id)
        .order_by(Certificate.row_index.asc())
    )
    certs = list((await db_session.execute(stmt)).scalars().all())
    assert certs[0].status == "done"
    assert certs[1].status == "failed"
    assert "Erro simulado" in (certs[1].error or "")

    # Lote finalizou como completed_with_errors
    batch_stmt = select(Batch).where(Batch.id == batch_id)
    batch = (await db_session.execute(batch_stmt)).scalar_one()
    assert batch.status == "completed_with_errors"
    assert batch.done == 1
    assert batch.failed == 1


@pytest.mark.asyncio
async def test_batch_cancellation_flow(client: AsyncClient, db_session: AsyncSession):
    """
    Testa o fluxo de cancelamento:
    POST /batches/{id}/cancel interrompe o processamento e o worker ignora o chunk.
    """
    default_queue.clear()

    reg_resp = await client.post(
        f"{settings.API_V1_STR}/auth/register",
        json={
            "tenant_name": "Instituto Cancelamento",
            "email": "cancel@instituto.com",
            "password": "SenhaUltraSegura!1",
        },
    )
    token = reg_resp.json()["access_token"]
    tenant_id = reg_resp.json()["tenant_id"]

    csv_bytes = (
        "NOME_COMPLETO;CPF;CURSO;CARGAHORARIA\nAluno A;529.982.247-25;Curso A;10h\n"
    ).encode("utf-8-sig")

    file_key = f"tenants/{tenant_id}/spreadsheets/cancel.csv"
    storage.save_file_bytes(file_key, csv_bytes)

    batch_resp = await client.post(
        f"{settings.API_V1_STR}/batches",
        headers={"Authorization": f"Bearer {token}"},
        json={"source_file_key": file_key},
    )
    batch_id = batch_resp.json()["id"]

    # Cancela o lote antes de rodar o worker
    cancel_resp = await client.post(
        f"{settings.API_V1_STR}/batches/{batch_id}/cancel",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == "canceled"

    # Agora o worker consome o chunk
    chunk_msg = RenderChunkMessage(tenant_id=tenant_id, batch_id=batch_id, row_from=0, row_to=10)
    res = await handle_render_chunk(chunk_msg, db_session)
    assert res["status"] == "canceled"
    assert res["processed"] == 0

    # Certificado deve continuar pending
    cert_stmt = select(Certificate).where(Certificate.batch_id == batch_id)
    cert = (await db_session.execute(cert_stmt)).scalar_one()
    assert cert.status == "pending"


@pytest.mark.asyncio
async def test_retry_failed_batch_flow(client: AsyncClient, db_session: AsyncSession):
    """
    Testa reprocessamento de linhas com falha via POST /batches/{id}/retry-failed.
    """
    default_queue.clear()

    reg_resp = await client.post(
        f"{settings.API_V1_STR}/auth/register",
        json={
            "tenant_name": "Instituto Retry",
            "email": "retry@instituto.com",
            "password": "SenhaUltraSegura!1",
        },
    )
    token = reg_resp.json()["access_token"]
    tenant_id = reg_resp.json()["tenant_id"]

    csv_bytes = (
        "NOME_COMPLETO;CPF;CURSO;CARGAHORARIA\nAluno Um;529.982.247-25;Curso A;10h\n"
    ).encode("utf-8-sig")

    file_key = f"tenants/{tenant_id}/spreadsheets/retry.csv"
    storage.save_file_bytes(file_key, csv_bytes)

    batch_resp = await client.post(
        f"{settings.API_V1_STR}/batches",
        headers={"Authorization": f"Bearer {token}"},
        json={"source_file_key": file_key},
    )
    batch_id = batch_resp.json()["id"]

    # Força a linha a falhar
    stmt = select(Certificate).where(Certificate.batch_id == batch_id)
    cert = (await db_session.execute(stmt)).scalar_one()
    cert.status = "failed"
    cert.error = "Erro simulado"
    batch_obj = (await db_session.execute(select(Batch).where(Batch.id == batch_id))).scalar_one()
    batch_obj.failed = 1
    batch_obj.status = "completed_with_errors"
    await db_session.commit()

    # Chama endpoint de retry
    retry_resp = await client.post(
        f"{settings.API_V1_STR}/batches/{batch_id}/retry-failed",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert retry_resp.status_code == 200
    assert retry_resp.json()["status"] == "processing"
    assert retry_resp.json()["failed"] == 0

    # Consome a mensagem reenfileirada pelo retry
    queued_msgs = await default_queue.get_messages()
    assert len(queued_msgs) > 0
    latest_msg = queued_msgs[-1]
    res = await handle_render_chunk(latest_msg, db_session)
    assert res["processed"] == 1

    # Verifica status final após retry bem-sucedido
    final_resp = await client.get(
        f"{settings.API_V1_STR}/batches/{batch_id}", headers={"Authorization": f"Bearer {token}"}
    )
    assert final_resp.json()["status"] == "completed"
    assert final_resp.json()["done"] == 1
    assert final_resp.json()["failed"] == 0


@pytest.mark.asyncio
async def test_recover_stuck_batches_routine(client: AsyncClient, db_session: AsyncSession):
    """
    Testa detecção e recuperação automática de lotes presos pelo cron job.
    """
    default_queue.clear()

    reg_resp = await client.post(
        f"{settings.API_V1_STR}/auth/register",
        json={
            "tenant_name": "Instituto Stuck",
            "email": "stuck@instituto.com",
            "password": "SenhaUltraSegura!1",
        },
    )
    tenant_id = reg_resp.json()["tenant_id"]

    # Cria um lote "preso" simulado há mais de 30 minutos
    old_time = datetime.now(UTC) - timedelta(minutes=40)
    batch = Batch(
        tenant_id=tenant_id, status="processing", total=2, done=0, failed=0, created_at=old_time
    )
    db_session.add(batch)
    await db_session.flush()

    cert1 = Certificate(
        tenant_id=tenant_id,
        batch_id=batch.id,
        row_index=0,
        status="pending",
        recipient_name="Aluno Pendente 1",
        cpf_enc=b"",
        cpf_hmac="",
        public_code="code-stuck-1",
    )
    cert2 = Certificate(
        tenant_id=tenant_id,
        batch_id=batch.id,
        row_index=1,
        status="pending",
        recipient_name="Aluno Pendente 2",
        cpf_enc=b"",
        cpf_hmac="",
        public_code="code-stuck-2",
    )
    db_session.add_all([cert1, cert2])
    await db_session.commit()

    # Executa a rotina de recuperação para lotes com mais de 15 minutos
    recovered = await recover_stuck_batches(db_session, older_than_minutes=15)
    assert batch.id in recovered

    # Verifica que mensagens foram reenfileiradas
    msgs = await default_queue.get_messages()
    assert any(m.batch_id == batch.id for m in msgs)
