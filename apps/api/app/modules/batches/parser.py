"""Spreadsheet parser for CSV and XLSX files with alias resolution and line-by-line validation."""

from __future__ import annotations

import csv
import io
import os
import re
import unicodedata
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

import openpyxl  # type: ignore[import-untyped]

from app.core.security import normalize_cpf

# ---------------------------------------------------------------------------
# Algoritmo de Validação de CPF (Módulo 11)
# ---------------------------------------------------------------------------


def is_valid_cpf(cpf: str | None) -> bool:
    """Valida um CPF brasileiro através do cálculo dos dígitos verificadores (módulo 11)."""
    digits = normalize_cpf(cpf)
    if len(digits) != 11:
        return False
    # CPFs com todos os dígitos iguais são inválidos
    if digits == digits[0] * 11:
        return False

    # Primeiro dígito verificador
    soma_1 = sum(int(digits[i]) * (10 - i) for i in range(9))
    d1 = (soma_1 * 10 % 11) % 10
    if d1 != int(digits[9]):
        return False

    # Segundo dígito verificador
    soma_2 = sum(int(digits[i]) * (11 - i) for i in range(10))
    d2 = (soma_2 * 10 % 11) % 10
    return d2 == int(digits[10])


# ---------------------------------------------------------------------------
# Estruturas de Dados do Parser
# ---------------------------------------------------------------------------


@dataclass
class ParsedRow:
    row_index: int
    recipient_name: str
    cpf: str | None
    extra_data: dict[str, Any] = field(default_factory=dict)


@dataclass
class InvalidRow:
    row_index: int
    recipient_name: str
    error_reason: str


@dataclass
class ParseResult:
    total_rows: int
    valid_rows: list[ParsedRow]
    invalid_rows: list[InvalidRow]
    columns_found: list[str]


# ---------------------------------------------------------------------------
# Normalização e Mapeamento Inteligente de Colunas
# ---------------------------------------------------------------------------


def normalizar_chave_coluna(col: Any) -> str:
    """Normaliza o nome da coluna para formato MAIÚSCULO sem acentos e com underscores."""
    if col is None:
        return ""
    col_str = str(col).strip()
    if not col_str:
        return ""
    nfkd = unicodedata.normalize("NFKD", col_str)
    sem_acentos = "".join(c for c in nfkd if not unicodedata.combining(c)).upper()
    return re.sub(r"[^A-Z0-9]+", "_", sem_acentos).strip("_")


def formatar_valor_celula(valor: Any) -> str:
    """Converte valores da planilha (datas, floats, inteiros) em texto amigável."""
    if valor is None:
        return ""
    if isinstance(valor, datetime):
        return valor.strftime("%d/%m/%Y")
    if isinstance(valor, float) and valor.is_integer():
        return str(int(valor))
    return str(valor).strip()


ALIASES = {
    "NOME": ("NOME_COMPLETO", "NOME_DO_ALUNO", "NOME_ALUNO", "ALUNO", "PARTICIPANTE", "ESTUDANTE"),
    "CPF": ("DOCUMENTO", "DOC", "CPF_RG", "IDENTIDADE", "RG_CPF"),
    "CURSO": ("TREINAMENTO", "EVENTO", "NOME_DO_CURSO", "TITULO_CURSO", "PROGRAMA"),
    "CARGA_HORARIA": ("CARGAHORARIA", "CH", "DURACAO", "HORAS", "HORAS_AULA"),
    "DATA": (
        "DATA_CONCLUSAO",
        "DATA_DE_CONCLUSAO",
        "CONCLUSAO",
        "DATA_CURSO",
        "PERIODO",
        "EMISSAO",
    ),
    "CIDADE": ("LOCAL", "MUNICIPIO", "CIDADE_UF"),
}


def resolver_aliases(dados: dict[str, Any]) -> dict[str, Any]:
    """Aplica o dicionário de sinônimos para garantir as chaves canônicas."""
    resultado = dict(dados)
    for chave_padrao, sinonimos in ALIASES.items():
        if not resultado.get(chave_padrao):
            for sin in sinonimos:
                if resultado.get(sin):
                    resultado[chave_padrao] = resultado[sin]
                    break
    return resultado


# ---------------------------------------------------------------------------
# Leitura e Validação por Linha
# ---------------------------------------------------------------------------


def parse_spreadsheet_bytes(file_bytes: bytes, filename: str) -> ParseResult:
    """
    Lê uma planilha em bytes (CSV ou XLSX), mapeia colunas e valida linha a linha.
    Retorna ParseResult com as linhas válidas e inválidas catalogadas.
    """
    ext = os.path.splitext(filename)[1].lower()
    linhas_brutas: list[list[Any]] = []

    if ext == ".csv":
        # Tenta decodificar o CSV com encodings comuns
        conteudo_str = ""
        for enc in ("utf-8-sig", "utf-8", "latin-1"):
            try:
                conteudo_str = file_bytes.decode(enc)
                break
            except UnicodeDecodeError:
                continue

        if not conteudo_str:
            raise ValueError("Não foi possível decodificar o arquivo CSV com encodings suportados.")

        # Identifica delimitador (, ou ;)
        amostra = conteudo_str[:2048]
        delimitador = ";" if amostra.count(";") > amostra.count(",") else ","
        leitor = csv.reader(io.StringIO(conteudo_str), delimiter=delimitador)
        linhas_brutas = [list(row) for row in leitor]
    elif ext in (".xlsx", ".xlsm"):
        wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
        aba = wb.active
        if not aba:
            raise ValueError("A planilha Excel não possui abas ativas.")
        linhas_brutas = [list(row) for row in aba.iter_rows(values_only=True)]
    else:
        raise ValueError(f"Formato de arquivo '{ext}' não suportado. Envie .csv ou .xlsx")

    if not linhas_brutas:
        raise ValueError("A planilha está completamente vazia.")

    # Localiza a linha do cabeçalho
    idx_cabecalho = 0
    cabecalho_bruto = []
    for idx_l, linha in enumerate(linhas_brutas[:5]):
        textos = [str(c).strip() for c in linha if c is not None and str(c).strip()]
        norm_teste = [normalizar_chave_coluna(t) for t in textos]
        if any(term in norm_teste for term in ("NOME", "CPF", "CURSO", "ALUNO", "PARTICIPANTE")):
            idx_cabecalho = idx_l
            cabecalho_bruto = linha
            break

    if not cabecalho_bruto:
        cabecalho_bruto = linhas_brutas[0]

    # Mapeia colunas
    colunas_map: dict[str, int] = {}
    for idx, c in enumerate(cabecalho_bruto):
        if c is not None and str(c).strip():
            chave = normalizar_chave_coluna(c)
            if chave and chave not in colunas_map:
                colunas_map[chave] = idx

    valid_rows: list[ParsedRow] = []
    invalid_rows: list[InvalidRow] = []

    # Itera sobre as linhas de dados
    for num_linha, linha in enumerate(linhas_brutas[idx_cabecalho + 1 :], start=idx_cabecalho + 2):
        # Ignora linhas totalmente em branco
        if all(v is None or str(v).strip() == "" for v in linha):
            continue

        dados_linha: dict[str, Any] = {}
        for chave, idx in colunas_map.items():
            val = formatar_valor_celula(linha[idx]) if idx < len(linha) else ""
            dados_linha[chave] = val

        dados_resolvidos = resolver_aliases(dados_linha)
        nome = dados_resolvidos.get("NOME", "").strip()
        cpf = dados_resolvidos.get("CPF", "").strip()

        # 1. Validação de Nome Obrigatório
        if not nome:
            invalid_rows.append(
                InvalidRow(
                    row_index=num_linha,
                    recipient_name="",
                    error_reason="Coluna NOME ausente ou em branco",
                )
            )
            continue

        # 2. Validação de CPF (se fornecido)
        if cpf:
            cpf_digitos = normalize_cpf(cpf)
            if len(cpf_digitos) != 11:
                invalid_rows.append(
                    InvalidRow(
                        row_index=num_linha,
                        recipient_name=nome,
                        error_reason="CPF deve conter exatamente 11 dígitos numéricos",
                    )
                )
                continue
            elif not is_valid_cpf(cpf_digitos):
                invalid_rows.append(
                    InvalidRow(
                        row_index=num_linha,
                        recipient_name=nome,
                        error_reason="Dígitos verificadores do CPF inválidos",
                    )
                )
                continue

        # Extra data (demais colunas excluindo NOME e CPF)
        extra_data = {
            k: v
            for k, v in dados_resolvidos.items()
            if k not in ("NOME", "CPF") and not k.startswith("_")
        }

        valid_rows.append(
            ParsedRow(
                row_index=num_linha,
                recipient_name=nome,
                cpf=cpf if cpf else None,
                extra_data=extra_data,
            )
        )

    total = len(valid_rows) + len(invalid_rows)
    return ParseResult(
        total_rows=total,
        valid_rows=valid_rows,
        invalid_rows=invalid_rows,
        columns_found=list(colunas_map.keys()),
    )
