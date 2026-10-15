"""Automated unit tests for pdf_renderer (Pure package verification, themes, and PDF layout)."""

import io
import sys

import pypdf

from pdf_renderer.engine import render_single_certificate, substitute_template_text
from pdf_renderer.models import CertificateLayout
from pdf_renderer.themes import THEMES


def test_pdf_renderer_is_pure_package():
    """Garante que o pacote pdf_renderer NÃO importa FastAPI, SQLAlchemy nem bibliotecas de rede."""
    forbidden_modules = ("fastapi", "sqlalchemy", "requests", "httpx")

    # Inspeciona módulos carregados por pdf_renderer
    for mod_name in list(sys.modules.keys()):
        if mod_name.startswith("pdf_renderer"):
            module = sys.modules[mod_name]
            for forbidden in forbidden_modules:
                assert not hasattr(module, forbidden), f"{mod_name} não pode importar {forbidden}"


def test_template_text_substitution():
    """Testa a substituição de tags e mascaramento automático de CPF."""
    template = "Aluno: {{NOME}} | Doc: {{CPF}} | Curso: {{CURSO}}"
    dados = {
        "NOME": "Ana Paula Silva",
        "CPF": "52998224725",
        "CURSO": "Engenharia de Segurança do Trabalho",
    }
    result = substitute_template_text(template, dados)

    assert "Ana Paula Silva" in result
    assert "Engenharia de Segurança do Trabalho" in result
    # Garante mascaramento seguro do CPF no texto do documento
    assert "***.982.247-**" in result
    assert "52998224725" not in result


def test_render_vector_certificate_basic():
    """Testa geração vetorial básica gerando cabeçalho PDF válido."""
    dados = {
        "NOME": "Carlos Eduardo Gomes",
        "CPF": "52998224725",
        "CURSO": "Prevenção e Combate a Incêndios",
        "CARGA_HORARIA": "40 horas",
        "DATA": "15/10/2026",
        "public_code": "AUTENTIC_ABC123",
    }
    pdf_bytes = render_single_certificate(data=dados)

    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 1000
    assert pdf_bytes.startswith(b"%PDF-")

    # Inspeciona o PDF gerado com pypdf
    reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
    assert len(reader.pages) == 1

    # Dimensões da página A4 Paisagem (841.89 x 595.27 pt)
    page = reader.pages[0]
    assert float(page.mediabox.width) > 800
    assert float(page.mediabox.height) > 500

    # Extrai o texto do PDF e valida presença dos dados e do código de autenticidade
    extracted_text = page.extract_text()
    assert "Carlos Eduardo Gomes" in extracted_text
    assert "CERTIFICADO" in extracted_text
    assert "AUTENTIC_ABC123" in extracted_text
    # Garante que o CPF em claro NÃO está no texto do PDF
    assert "52998224725" not in extracted_text
    assert "***.982.247-**" in extracted_text


def test_render_all_themes():
    """Garante que todos os 4 temas visuais renderizam sem exceções."""
    dados = {
        "NOME": "Beatriz Martins",
        "CPF": "52998224725",
        "CURSO": "NR-35 Trabalho em Altura",
        "CARGA_HORARIA": "16h",
        "DATA": "10/10/2026",
    }

    for theme_key in THEMES:
        layout = CertificateLayout(theme_name=theme_key)
        pdf = render_single_certificate(data=dados, layout=layout)
        assert len(pdf) > 1000
        assert pdf.startswith(b"%PDF-")


def test_render_portrait_orientation():
    """Testa renderização em orientação Retrato (Portrait)."""
    layout = CertificateLayout(orientation="portrait")
    dados = {"NOME": "Mariana Souza"}
    pdf = render_single_certificate(data=dados, layout=layout)

    reader = pypdf.PdfReader(io.BytesIO(pdf))
    page = reader.pages[0]
    # Em portrait, altura > largura
    assert float(page.mediabox.height) > float(page.mediabox.width)


def test_render_overlay_mode():
    """Testa a sobreposição de dados dinâmicos sobre um template PDF existente."""
    # 1. Cria um template PDF base simulado em memória
    layout_base = CertificateLayout(show_border=True)
    template_base_pdf = render_single_certificate(
        data={"NOME": "Template Base"}, layout=layout_base
    )

    # 2. Renderiza dados do aluno sobre o template base
    dados_aluno = {
        "NOME": "Aluno Sobreposto",
        "CURSO": "Auditoria de Sistemas",
        "public_code": "OVERLAY_XYZ",
    }
    merged_pdf = render_single_certificate(data=dados_aluno, template_pdf_bytes=template_base_pdf)

    assert merged_pdf.startswith(b"%PDF-")
    reader = pypdf.PdfReader(io.BytesIO(merged_pdf))
    assert len(reader.pages) == 1
    text = reader.pages[0].extract_text()
    assert "Aluno Sobreposto" in text
