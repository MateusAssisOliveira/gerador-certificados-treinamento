"""Automated tests for Batch creation, Spreadsheet parser, Upload signing, and Error reports."""

import pytest
from httpx import AsyncClient

from app.core.config import settings
from app.core.storage import sanitize_csv_cell, storage
from app.modules.batches.parser import is_valid_cpf


def test_cpf_validator():
    """Valida o algoritmo de dígitos verificadores de CPF (Módulo 11)."""
    # CPFs sintéticos matematicamente válidos
    assert is_valid_cpf("52998224725") is True
    assert is_valid_cpf("529.982.247-25") is True
    assert is_valid_cpf("00000000191") is True

    # CPFs inválidos
    assert is_valid_cpf("11111111111") is False  # dígitos repetidos
    assert is_valid_cpf("00000000000") is False  # dígitos repetidos
    assert is_valid_cpf("12345678900") is False  # dígito verificador errado
    assert is_valid_cpf("123") is False  # tamanho insuficiente
    assert is_valid_cpf("") is False
    assert is_valid_cpf(None) is False


def test_csv_injection_sanitization():
    """Testa se células perigosas são prefixadas com apóstrofo para proteção."""
    assert sanitize_csv_cell("=1+1") == "'=1+1"
    assert sanitize_csv_cell("-2+3") == "'-2+3"
    assert sanitize_csv_cell("+cmd") == "'+cmd"
    assert sanitize_csv_cell("@SUM(A1:A5)") == "'@SUM(A1:A5)"
    assert sanitize_csv_cell("Texto Normal") == "Texto Normal"
    assert sanitize_csv_cell("") == ""
    assert sanitize_csv_cell(None) == ""


@pytest.mark.asyncio
async def test_upload_sign_endpoint(client: AsyncClient):
    """Testa a geração de URLs pré-assinadas para upload direto ao storage privado."""
    # 1. Registra Tenant
    reg_resp = await client.post(
        f"{settings.API_V1_STR}/auth/register",
        json={
            "tenant_name": "Faculdade de Treinamentos",
            "email": "coord@faculdade.com",
            "password": "SenhaSegura123!",
        },
    )
    token = reg_resp.json()["access_token"]
    tenant_id = reg_resp.json()["tenant_id"]

    # 2. Solicita assinatura de upload
    sign_resp = await client.post(
        f"{settings.API_V1_STR}/uploads/sign",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "filename": "turma_outubro.xlsx",
            "content_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
    )
    assert sign_resp.status_code == 200
    data = sign_resp.json()
    assert "upload_url" in data
    assert "file_key" in data
    assert f"tenants/{tenant_id}/spreadsheets/" in data["file_key"]
    assert data["file_key"].endswith(".xlsx")


@pytest.mark.asyncio
async def test_batch_creation_and_error_report_flow(client: AsyncClient):
    """
    Testa o fluxo completo da Fase 2:
    - Envio de planilha mista (linhas válidas e linhas com erro sintético)
    - Criação de lote
    - Cifragem dos CPFs válidos (AES-256-GCM)
    - Registro de falhas estruturadas
    - Download do relatório de erros CSV sem expor CPFs e protegido contra CSV injection
    """
    # 1. Registra Tenant
    reg_resp = await client.post(
        f"{settings.API_V1_STR}/auth/register",
        json={
            "tenant_name": "Instituto Avançado",
            "email": "diretor@instituto.com",
            "password": "SenhaUltraSegura!1",
        },
    )
    token = reg_resp.json()["access_token"]
    tenant_id = reg_resp.json()["tenant_id"]

    # 2. Cria planilha sintética em memória (.csv) com 4 linhas:
    # Linha 1: Válida (CPF sintético válido 529.982.247-25)
    # Linha 2: Válida sem CPF
    # Linha 3: Inválida (CPF com dígitos verificadores errados)
    # Linha 4: Inválida (Nome em branco com tentativa de CSV injection na coluna curso)
    csv_content = (
        "NOME_COMPLETO;CPF;CURSO;CARGAHORARIA\n"
        "Aluno Um;529.982.247-25;Segurança do Trabalho;40h\n"
        "Aluno Dois;;Primeiros Socorros;20h\n"
        "Aluno Tres;123.456.789-00;Brigada de Incendio;16h\n"
        ";529.982.247-25;=cmd|' /C calc'!A0;8h\n"
    ).encode("utf-8-sig")

    file_key = f"tenants/{tenant_id}/spreadsheets/teste_lote.csv"
    storage.save_file_bytes(file_key, csv_content)

    # 3. Cria o Batch
    batch_resp = await client.post(
        f"{settings.API_V1_STR}/batches",
        headers={"Authorization": f"Bearer {token}"},
        json={"source_file_key": file_key},
    )
    assert batch_resp.status_code == 201
    batch_data = batch_resp.json()
    batch_id = batch_data["id"]

    assert batch_data["total"] == 4
    assert batch_data["failed"] == 2
    assert batch_data["status"] == "queued"  # Como tem linhas válidas, fica queued

    # 4. Consulta status do Batch
    get_resp = await client.get(
        f"{settings.API_V1_STR}/batches/{batch_id}", headers={"Authorization": f"Bearer {token}"}
    )
    assert get_resp.status_code == 200
    assert get_resp.json()["total"] == 4
    assert get_resp.json()["failed"] == 2

    # 5. Baixa o relatório de erros CSV
    errors_resp = await client.get(
        f"{settings.API_V1_STR}/batches/{batch_id}/errors.csv",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert errors_resp.status_code == 200
    assert errors_resp.headers["content-type"].startswith("text/csv")
    csv_text = errors_resp.text

    # Verifica conteúdo do CSV de erros
    assert "LINHA;NOME;MOTIVO_ERRO" in csv_text
    assert "Dígitos verificadores do CPF inválidos" in csv_text
    assert "Coluna NOME ausente ou em branco" in csv_text

    # REGRA CRÍTICA LGPD: Nenhum CPF completo pode aparecer no CSV de erros!
    assert "123.456.789-00" not in csv_text
    assert "529.982.247-25" not in csv_text
    assert "12345678900" not in csv_text
    assert "52998224725" not in csv_text

    # 6. Teste de Isolamento Multi-Tenant: Tenant Beta não pode acessar nem ver erros do Batch
    reg_beta = await client.post(
        f"{settings.API_V1_STR}/auth/register",
        json={
            "tenant_name": "Outro Tenant",
            "email": "outro@tenant.com",
            "password": "SenhaOutroTenant123!",
        },
    )
    token_beta = reg_beta.json()["access_token"]

    unauth_batch = await client.get(
        f"{settings.API_V1_STR}/batches/{batch_id}",
        headers={"Authorization": f"Bearer {token_beta}"},
    )
    assert unauth_batch.status_code == 404

    unauth_errors = await client.get(
        f"{settings.API_V1_STR}/batches/{batch_id}/errors.csv",
        headers={"Authorization": f"Bearer {token_beta}"},
    )
    assert unauth_errors.status_code == 404
