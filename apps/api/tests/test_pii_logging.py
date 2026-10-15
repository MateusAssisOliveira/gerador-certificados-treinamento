"""Automated test verifying that no synthetic CPF or PII leaks into logs."""

import io
import logging

from app.core.logging import CPF_FORMATTED_REGEX, CPF_RAW_REGEX, EMAIL_REGEX, PIIRedactingFilter


def test_pii_redacting_filter_in_logs():
    """Testa se o filtro de logging bloqueia ativamente o vazamento de CPF e e-mail."""
    # Cria stream em memória para inspecionar os logs
    log_stream = io.StringIO()
    handler = logging.StreamHandler(log_stream)
    handler.setFormatter(logging.Formatter("%(levelname)s: %(message)s"))
    handler.addFilter(PIIRedactingFilter())

    test_logger = logging.getLogger("test_pii_redaction")
    test_logger.setLevel(logging.INFO)
    test_logger.addHandler(handler)
    test_logger.propagate = False

    # Mensagens de teste contendo dados sintéticos
    cpf_sintetico_formatado = "123.456.789-01"
    cpf_sintetico_bruto = "98765432109"
    email_sintetico = "usuario.sintetico@exemplo.com"

    test_logger.info("Iniciando emissão para o CPF formatado %s", cpf_sintetico_formatado)
    test_logger.warning("Falha na validação do CPF bruto: %s no lote", cpf_sintetico_bruto)
    test_logger.error("Notificação enviada para o e-mail: %s", email_sintetico)
    test_logger.info(f"Concatenação direta: {cpf_sintetico_formatado} e {cpf_sintetico_bruto}")

    output = log_stream.getvalue()

    # 1. Garante que as informações reais sintéticas NÃO estão presentes no log
    assert cpf_sintetico_formatado not in output
    assert cpf_sintetico_bruto not in output
    assert email_sintetico not in output

    # 2. Garante que a etiqueta [PII REDACTED] foi inserida
    assert "[PII REDACTED]" in output

    # 3. Varredura rigorosa com regex no output inteiro para confirmar zero vazamentos
    assert CPF_FORMATTED_REGEX.search(output) is None
    assert CPF_RAW_REGEX.search(output) is None
    assert EMAIL_REGEX.search(output) is None
