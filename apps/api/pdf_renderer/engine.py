"""Core certificate rendering engine based on pure ReportLab and PyPDF."""

from __future__ import annotations

import io
import re
from typing import Any

import pypdf
from reportlab.lib.colors import Color  # type: ignore[import-untyped]
from reportlab.lib.pagesizes import A4, landscape, portrait  # type: ignore[import-untyped]
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet  # type: ignore[import-untyped]
from reportlab.pdfgen import canvas  # type: ignore[import-untyped]
from reportlab.platypus import Paragraph  # type: ignore[import-untyped]

from .models import CertificateLayout
from .themes import get_theme


def mask_cpf(cpf: str | None) -> str:
    """Retorna CPF mascarado no formato ***.456.789-**."""
    if not cpf:
        return ""
    digits = re.sub(r"\D", "", str(cpf))
    if len(digits) != 11:
        return "***.***.***-**"
    return f"***.{digits[3:6]}.{digits[6:9]}-**"


def _to_reportlab_color(c) -> Color:
    """Converte ColorRGB para reportlab.lib.colors.Color."""
    return Color(c.r, c.g, c.b)


def substitute_template_text(template_text: str, data: dict[str, Any]) -> str:
    """Substitui variáveis {{TAG}} pelos valores correspondentes do dicionário."""
    result = template_text

    # Trata mascaramento de CPF caso esteja presente
    dados_processados = dict(data)
    if "CPF" in dados_processados and dados_processados["CPF"]:
        dados_processados["CPF"] = mask_cpf(str(dados_processados["CPF"]))

    for key, val in dados_processados.items():
        pattern = re.compile(rf"\{{\{{\s*{re.escape(str(key))}\s*\}}\}}", re.IGNORECASE)
        val_str = str(val) if val is not None else ""
        result = pattern.sub(val_str, result)

    # Remove quaisquer tags não preenchidas restantes
    result = re.sub(r"\{\{[^}]+\}\}", "", result)
    return result


def draw_decorative_borders(
    c: canvas.Canvas, width: float, height: float, border_color: Color, margin: float = 30.0
) -> None:
    """Desenha moldura dupla de alta precisão com cantos ornamentados."""
    c.saveState()
    c.setStrokeColor(border_color)

    # 1. Borda externa mais fina
    c.setLineWidth(1.0)
    c.rect(margin, margin, width - 2 * margin, height - 2 * margin)

    # 2. Borda interna mais espessa
    inner_margin = margin + 6.0
    c.setLineWidth(2.5)
    c.rect(inner_margin, inner_margin, width - 2 * inner_margin, height - 2 * inner_margin)

    # 3. Ornamentos decorativos nos 4 cantos
    corner_size = 12.0
    for cx, cy in [
        (inner_margin, inner_margin),
        (inner_margin, height - inner_margin),
        (width - inner_margin, inner_margin),
        (width - inner_margin, height - inner_margin),
    ]:
        c.circle(cx, cy, 3.0, stroke=1, fill=1)
        c.rect(cx - corner_size / 2, cy - corner_size / 2, corner_size, corner_size)

    c.restoreState()


def render_vector_certificate_bytes(data: dict[str, Any], layout: CertificateLayout) -> bytes:
    """
    Renderiza um certificado completo vetorialmente em formato PDF de alta resolução
    a partir dos dados do participante e do layout configurado.
    """
    page_size = landscape(A4) if layout.orientation == "landscape" else portrait(A4)
    width, height = page_size

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=page_size)

    theme = get_theme(layout.theme_name)
    color_primary = _to_reportlab_color(theme.primary)
    color_secondary = _to_reportlab_color(theme.secondary)
    color_text = _to_reportlab_color(theme.text)
    color_bg = _to_reportlab_color(theme.background)
    color_border = _to_reportlab_color(theme.border)

    # 1. Fundo suave
    c.setFillColor(color_bg)
    c.rect(0, 0, width, height, fill=1, stroke=0)

    # 2. Moldura decorativa
    if layout.show_border:
        draw_decorative_borders(c, width, height, color_border, margin=28.0)

    center_x = width / 2.0

    # 3. Nome da Instituição
    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(color_primary)
    c.drawCentredString(center_x, height - 75.0, layout.institution.upper())

    # Linha divisória fina sob o cabeçalho
    c.setStrokeColor(color_secondary)
    c.setLineWidth(0.8)
    c.line(center_x - 120, height - 85.0, center_x + 120, height - 85.0)

    # 4. Título Principal (ex: "CERTIFICADO")
    c.setFont("Helvetica-Bold", 36)
    c.setFillColor(color_primary)
    c.drawCentredString(center_x, height - 135.0, layout.title.upper())

    # 5. Subtítulo (ex: "DE CONCLUSÃO E PARTICIPAÇÃO")
    c.setFont("Helvetica", 14)
    c.setFillColor(color_secondary)
    c.drawCentredString(center_x, height - 158.0, layout.subtitle.upper())

    # 6. Nome do Aluno em Destaque Central
    student_name = data.get("NOME", "").strip() or "Participante"
    c.setFont("Helvetica-Bold", 24)
    c.setFillColor(color_primary)
    c.drawCentredString(center_x, height - 215.0, student_name)

    # Linha de destaque sob o nome do aluno
    c.setStrokeColor(color_secondary)
    c.setLineWidth(1.5)
    name_width = min(c.stringWidth(student_name, "Helvetica-Bold", 24) + 40, width - 200)
    c.line(center_x - name_width / 2, height - 225.0, center_x + name_width / 2, height - 225.0)

    # 7. Texto do Corpo com Parágrafo Formatado
    raw_body = substitute_template_text(layout.body_template, data)
    # Destaque em negrito para nome do aluno e curso no corpo se existirem
    styles = getSampleStyleSheet()
    body_style = ParagraphStyle(
        name="CertBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=13,
        leading=20,
        alignment=1,  # 1 = Centralizado
        textColor=color_text,
    )

    body_paragraph = Paragraph(raw_body, body_style)
    # Largura e altura do bloco de texto
    text_box_w = width - 180
    text_box_h = 100
    p_w, p_h = body_paragraph.wrap(text_box_w, text_box_h)
    body_paragraph.drawOn(c, (width - text_box_w) / 2, height - 340.0)

    # 8. Assinaturas
    sig_y = 125.0
    sig_count = len(layout.signatures)
    if sig_count == 1:
        sig = layout.signatures[0]
        c.setStrokeColor(color_text)
        c.setLineWidth(1.0)
        c.line(center_x - 110, sig_y, center_x + 110, sig_y)
        c.setFont("Helvetica-Bold", 10)
        c.setFillColor(color_primary)
        c.drawCentredString(center_x, sig_y - 14, sig.name)
        c.setFont("Helvetica", 9)
        c.setFillColor(color_text)
        c.drawCentredString(center_x, sig_y - 26, sig.role)
    elif sig_count >= 2:
        sig1, sig2 = layout.signatures[0], layout.signatures[1]
        x1 = width * 0.30
        x2 = width * 0.70

        # Assinatura 1
        c.setStrokeColor(color_text)
        c.setLineWidth(1.0)
        c.line(x1 - 95, sig_y, x1 + 95, sig_y)
        c.setFont("Helvetica-Bold", 10)
        c.setFillColor(color_primary)
        c.drawCentredString(x1, sig_y - 14, sig1.name)
        c.setFont("Helvetica", 9)
        c.setFillColor(color_text)
        c.drawCentredString(x1, sig_y - 26, sig1.role)

        # Assinatura 2
        c.line(x2 - 95, sig_y, x2 + 95, sig_y)
        c.setFont("Helvetica-Bold", 10)
        c.setFillColor(color_primary)
        c.drawCentredString(x2, sig_y - 14, sig2.name)
        c.setFont("Helvetica", 9)
        c.setFillColor(color_text)
        c.drawCentredString(x2, sig_y - 26, sig2.role)

    # 9. Rodapé de Autenticidade e Código de Validação Pública
    public_code = str(data.get("CODIGO", "")).strip()
    if not public_code and "public_code" in data:
        public_code = str(data["public_code"]).strip()

    footer_text = f"Registro de Autenticidade: {public_code}" if public_code else ""
    if footer_text:
        c.setFont("Helvetica", 8)
        c.setFillColor(color_secondary)
        c.drawCentredString(center_x, 48.0, footer_text)

    c.showPage()
    c.save()

    buffer.seek(0)
    return buffer.getvalue()


def render_overlay_certificate_bytes(
    template_pdf_bytes: bytes, data: dict[str, Any], layout: CertificateLayout
) -> bytes:
    """
    Mescla o texto dinâmico sobre um template PDF existente utilizando pypdf.
    """
    base_reader = pypdf.PdfReader(io.BytesIO(template_pdf_bytes))
    if len(base_reader.pages) == 0:
        raise ValueError("O template PDF base não contém páginas.")

    # Cria a camada de sobreposição transparente
    overlay_bytes = render_vector_certificate_bytes(data, layout)
    overlay_reader = pypdf.PdfReader(io.BytesIO(overlay_bytes))

    writer = pypdf.PdfWriter()
    page = writer.add_page(base_reader.pages[0])
    page.merge_page(overlay_reader.pages[0])

    out_buffer = io.BytesIO()
    writer.write(out_buffer)
    out_buffer.seek(0)
    return out_buffer.getvalue()


def render_single_certificate(
    data: dict[str, Any],
    layout: CertificateLayout | None = None,
    template_pdf_bytes: bytes | None = None,
) -> bytes:
    """
    Ponto de entrada público do renderizador PURO.
    Gera os bytes do PDF final em vetor puro ou sobreposto a template.
    """
    active_layout = layout or CertificateLayout()
    if template_pdf_bytes is not None:
        return render_overlay_certificate_bytes(template_pdf_bytes, data, active_layout)
    return render_vector_certificate_bytes(data, active_layout)
