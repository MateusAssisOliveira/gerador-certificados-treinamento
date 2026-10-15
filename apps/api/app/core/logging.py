"""Logging configuration with automatic PII redaction filter (LGPD compliance)."""

import logging
import re
from typing import Any

# Padrões regex para identificação de PII
# 1. CPF formatado: 000.000.000-00
# 2. CPF bruto: 11 dígitos numéricos isolados
# 3. E-mail: padrão RFC simplificado
CPF_FORMATTED_REGEX = re.compile(r"\b\d{3}\.\d{3}\.\d{3}-\d{2}\b")
CPF_RAW_REGEX = re.compile(r"\b\d{11}\b")
EMAIL_REGEX = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")

REDACTED_LABEL = "[PII REDACTED]"


def redact_pii_string(text: str) -> str:
    """Substitui ocorrências de CPFs e e-mails pelo marcador seguro [PII REDACTED]."""
    if not isinstance(text, str):
        return text
    # Redige primeiro CPFs formatados
    text = CPF_FORMATTED_REGEX.sub(REDACTED_LABEL, text)
    # Redige CPFs brutos de 11 dígitos
    text = CPF_RAW_REGEX.sub(REDACTED_LABEL, text)
    # Redige e-mails
    text = EMAIL_REGEX.sub(REDACTED_LABEL, text)
    return text


def redact_pii_obj(obj: Any) -> Any:
    """Aplica redação recursiva em strings, tuplas, listas ou dicionários."""
    if isinstance(obj, str):
        return redact_pii_string(obj)
    elif isinstance(obj, (list, tuple)):
        return type(obj)(redact_pii_obj(item) for item in obj)
    elif isinstance(obj, dict):
        return {k: redact_pii_obj(v) for k, v in obj.items()}
    return obj


class PIIRedactingFilter(logging.Filter):
    """
    Filtro global de logging que inspeciona toda mensagem de log e seus argumentos,
    garantindo que nenhum CPF ou dado pessoal seja gravado no stdout, arquivo ou APM.
    """

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            record.msg = redact_pii_string(record.msg)
        if record.args:
            record.args = redact_pii_obj(record.args)
        return True


def setup_logging(level: int = logging.INFO) -> None:
    """Configura o logger raiz e injeta o PIIRedactingFilter."""
    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    pii_filter = PIIRedactingFilter()

    # Injeta o filtro em todos os handlers do root
    for handler in root_logger.handlers:
        handler.addFilter(pii_filter)

    # Injeta o filtro diretamente no logger raiz
    root_logger.addFilter(pii_filter)

    # Injeta também nos loggers do Uvicorn e FastAPI
    for logger_name in ("uvicorn", "uvicorn.access", "uvicorn.error", "fastapi"):
        lgr = logging.getLogger(logger_name)
        lgr.addFilter(pii_filter)
        for h in lgr.handlers:
            h.addFilter(pii_filter)
