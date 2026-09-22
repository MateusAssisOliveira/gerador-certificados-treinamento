#!/usr/bin/env python3
"""
gerar_certificados.py
======================

Geracao automatica de certificados em lote a partir de:
  - um modelo Word (.docx) com campos {{NOME}}, {{CPF}}, {{CURSO}}, etc.
  - uma planilha Excel (.xlsx) com os dados dos participantes

Preserva a formatacao original do modelo (fontes, negrito, alinhamento, imagens,
logotipo, bordas, tabelas, cabecalho e rodape), utilizando a biblioteca docxtpl.
Pode ser executado via linha de comando ou importado pelo app web.
"""

from __future__ import annotations

import csv
import os
import re
import shutil
import subprocess
import sys
import unicodedata
from datetime import datetime
from pathlib import Path
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple

try:
    import openpyxl
except ImportError:
    print("ERRO: a biblioteca 'openpyxl' nao esta instalada.")
    print("Instale com: pip install openpyxl")
    sys.exit(1)

try:
    from docxtpl import DocxTemplate
except ImportError:
    print("ERRO: a biblioteca 'docxtpl' nao esta instalada.")
    print("Instale com: pip install docxtpl")
    sys.exit(1)


# ---------------------------------------------------------------------------
# Configuracoes gerais
# ---------------------------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent
PASTA_MODELO = BASE_DIR / "modelo"
PASTA_ENTRADA = BASE_DIR / "entrada"
PASTA_SAIDA = BASE_DIR / "saida"

# Colunas obrigatorias padrao para o modo CLI (se existirem outras, serao lidas normalmente)
COLUNAS_OBRIGATORIAS = ["NOME"]

# Se True, tenta gerar tambem um .pdf de cada certificado.
GERAR_PDF = True


# ---------------------------------------------------------------------------
# Utilitarios
# ---------------------------------------------------------------------------

def normalizar_chave_coluna(col: Any) -> str:
    """Normaliza o nome da coluna para formato maiusculo sem acentos e com underscores."""
    if col is None:
        return ""
    col_str = str(col).strip()
    if not col_str:
        return ""
    nfkd = unicodedata.normalize("NFKD", col_str)
    sem_acentos = "".join(c for c in nfkd if not unicodedata.combining(c)).upper()
    limpa = re.sub(r"[^A-Z0-9]+", "_", sem_acentos).strip("_")
    return limpa


def localizar_arquivo(pasta: Path, extensoes: tuple) -> Path:
    """Localiza o primeiro arquivo valido com a extensao informada dentro da pasta."""
    if not pasta.exists():
        pasta.mkdir(parents=True, exist_ok=True)

    candidatos = [
        f for f in sorted(pasta.iterdir())
        if f.is_file() and f.suffix.lower() in extensoes and not f.name.startswith("~$")
    ]

    if not candidatos:
        raise FileNotFoundError(
            f"Nenhum arquivo {extensoes} encontrado na pasta '{pasta.name}'."
        )
    if len(candidatos) > 1:
        print(
            f"AVISO: mais de um arquivo encontrado em '{pasta.name}'. "
            f"Usando o primeiro: {candidatos[0].name}"
        )
    return candidatos[0]


def normalizar_nome_arquivo(texto: str) -> str:
    """Converte um nome de pessoa em um nome de arquivo seguro (sem acento/espaco)."""
    texto = str(texto).strip()
    nfkd = unicodedata.normalize("NFKD", texto)
    sem_acentos = "".join(c for c in nfkd if not unicodedata.combining(c))
    sem_acentos = re.sub(r"[^A-Za-z0-9\s_-]", "", sem_acentos)
    sem_acentos = re.sub(r"\s+", "_", sem_acentos.strip())
    return sem_acentos or "SEM_NOME"


def formatar_valor(valor) -> str:
    """Converte valores vindos do Excel/CSV (datas, numeros, etc.) para texto legivel."""
    if valor is None:
        return ""
    if isinstance(valor, datetime):
        return valor.strftime("%d/%m/%Y")
    if isinstance(valor, float) and valor.is_integer():
        return str(int(valor))
    return str(valor).strip()


# ---------------------------------------------------------------------------
# Leitura e validacao da planilha
# ---------------------------------------------------------------------------

def carregar_participantes(caminho_arquivo: Path, colunas_obrigatorias: Optional[List[str]] = None) -> list:
    """
    Le planilha Excel (.xlsx, .xlsm) ou CSV e retorna lista de dicionarios dos participantes.
    Aplica normalizacao automatica de colunas e mapeia sinonimos (aliases) comuns.
    """
    caminho = Path(caminho_arquivo)
    ext = caminho.suffix.lower()

    linhas_brutas: List[List[Any]] = []

    if ext == ".csv":
        for enc in ("utf-8-sig", "latin-1", "utf-8"):
            try:
                with open(caminho, "r", encoding=enc, newline="") as f:
                    amostra = f.read(2048)
                    f.seek(0)
                    sep = ";" if ";" in amostra else ","
                    leitor = csv.reader(f, delimiter=sep)
                    linhas_brutas = [list(row) for row in leitor]
                if linhas_brutas:
                    break
            except Exception:
                continue
    else:
        wb = openpyxl.load_workbook(caminho, data_only=True)
        aba = wb.active
        linhas_brutas = [list(row) for row in aba.iter_rows(values_only=True)]

    if not linhas_brutas:
        raise ValueError("A planilha está vazia.")

    # Localiza a linha de cabeçalho
    idx_cabecalho = 0
    cabecalho_bruto = []
    for idx_l, linha in enumerate(linhas_brutas[:5]):
        textos = [str(c).strip() for c in linha if c is not None and str(c).strip()]
        norm_teste = [normalizar_chave_coluna(t) for t in textos]
        if any(term in norm_teste for term in ("NOME", "CPF", "CURSO", "ALUNO", "PARTICIPANTE")):
            idx_cabecalho = idx_l
            cabecalho_bruto = linha
            break
        elif len(textos) >= 2 and idx_l == 0:
            cabecalho_bruto = linha

    if not cabecalho_bruto:
        cabecalho_bruto = linhas_brutas[0]

    # Mapeamento de colunas
    colunas_map: Dict[str, int] = {}
    for idx, c in enumerate(cabecalho_bruto):
        if c is not None and str(c).strip():
            chave = normalizar_chave_coluna(c)
            if chave and chave not in colunas_map:
                colunas_map[chave] = idx

    # Verifica colunas obrigatorias (se especificadas)
    if colunas_obrigatorias:
        faltantes = [c for c in colunas_obrigatorias if c not in colunas_map]
        if faltantes:
            raise ValueError(
                "Colunas obrigatórias ausentes na planilha: "
                f"{', '.join(faltantes)}.\n"
                f"Colunas encontradas: {', '.join(colunas_map.keys())}"
            )

    participantes = []
    for num_linha, linha in enumerate(linhas_brutas[idx_cabecalho + 1:], start=idx_cabecalho + 2):
        if all(v is None or str(v).strip() == "" for v in linha):
            continue

        dados: Dict[str, Any] = {}
        for chave, idx in colunas_map.items():
            val = formatar_valor(linha[idx]) if idx < len(linha) else ""
            dados[chave] = val

        # Mapeamento inteligente de sinonimos / aliases para garantir compatibilidade com as tags {{...}}
        if "NOME" not in dados or not dados["NOME"]:
            for k in ("NOME_COMPLETO", "NOME_DO_ALUNO", "NOME_ALUNO", "ALUNO", "PARTICIPANTE", "ESTUDANTE"):
                if k in dados and dados[k]:
                    dados["NOME"] = dados[k]
                    break

        if "CPF" not in dados or not dados["CPF"]:
            for k in ("DOCUMENTO", "DOC", "CPF_RG", "IDENTIDADE", "RG_CPF"):
                if k in dados and dados[k]:
                    dados["CPF"] = dados[k]
                    break

        if "CURSO" not in dados or not dados["CURSO"]:
            for k in ("TREINAMENTO", "EVENTO", "NOME_DO_CURSO", "TITULO_CURSO", "PROGRAMA"):
                if k in dados and dados[k]:
                    dados["CURSO"] = dados[k]
                    break

        if "DATA" not in dados or not dados["DATA"]:
            for k in ("DATA_CONCLUSAO", "DATA_DE_CONCLUSAO", "CONCLUSAO", "DATA_CURSO", "PERIODO", "EMISSAO"):
                if k in dados and dados[k]:
                    dados["DATA"] = dados[k]
                    break

        if "CARGA_HORARIA" not in dados or not dados["CARGA_HORARIA"]:
            for k in ("CARGAHORARIA", "CH", "DURACAO", "HORAS", "HORAS_AULA"):
                if k in dados and dados[k]:
                    dados["CARGA_HORARIA"] = dados[k]
                    break

        if "CIDADE" not in dados or not dados["CIDADE"]:
            for k in ("LOCAL", "MUNICIPIO", "CIDADE_UF"):
                if k in dados and dados[k]:
                    dados["CIDADE"] = dados[k]
                    break

        dados["_LINHA_EXCEL"] = num_linha
        participantes.append(dados)

    if not participantes:
        raise ValueError("Nenhum participante encontrado na planilha (apenas cabeçalho).")

    return participantes


# ---------------------------------------------------------------------------
# Geracao dos certificados
# ---------------------------------------------------------------------------

def gerar_certificado_docx(caminho_modelo: Path, dados: dict, caminho_saida: Path) -> None:
    """Gera um unico certificado .docx a partir do modelo e dos dados do participante."""
    caminho_saida.parent.mkdir(parents=True, exist_ok=True)
    doc = DocxTemplate(str(caminho_modelo))
    doc.render(dados)
    doc.save(str(caminho_saida))


def converter_para_pdf(caminho_docx: Path) -> Optional[Path]:
    """
    Converte um .docx em .pdf.
    Tenta primeiro docx2pdf (usa o Microsoft Word via pywin32 COM no Windows).
    Se nao disponivel, tenta LibreOffice headless.
    Retorna o caminho do PDF gerado, ou None se nao foi possivel converter.
    """
    caminho_pdf = caminho_docx.with_suffix(".pdf")

    # 1. Tenta docx2pdf (Word no Windows)
    try:
        from docx2pdf import convert
        convert(str(caminho_docx), str(caminho_pdf))
        if caminho_pdf.exists():
            return caminho_pdf
    except Exception as e:
        print(f"      (docx2pdf falhou: {e}. Tentando LibreOffice...)")

    # 2. Tenta LibreOffice
    soffice = shutil.which("soffice") or shutil.which("libreoffice")
    if soffice:
        try:
            subprocess.run(
                [
                    soffice, "--headless", "--convert-to", "pdf",
                    "--outdir", str(caminho_docx.parent), str(caminho_docx),
                ],
                check=True,
                capture_output=True,
                timeout=60,
            )
            if caminho_pdf.exists():
                return caminho_pdf
        except Exception as e:
            print(f"      (LibreOffice falhou: {e})")

    return None


def executar_lote(
    caminho_modelo: Path,
    participantes: List[Dict],
    pasta_saida: Path = PASTA_SAIDA,
    gerar_pdf: bool = True,
    somente_pdf: bool = True,
    callback: Optional[Callable[[dict], None]] = None
) -> Dict:
    """
    Executa a geracao em lote para a lista de participantes informada.
    Por padrao (somente_pdf=True), gera exclusivamente certificados em formato PDF,
    removendo os arquivos intermediarios .docx para que apenas os PDFs fiquem salvos.
    Retorna um dicionario com estatisticas e detalhes dos arquivos gerados.
    """
    pasta_saida.mkdir(parents=True, exist_ok=True)
    sucesso = []
    erros = []
    nomes_usados = {}
    total = len(participantes)

    for idx, dados_original in enumerate(participantes, start=1):
        dados = dict(dados_original)
        linha = dados.pop("_LINHA_EXCEL", idx)
        nome_original = dados.get("NOME", "").strip()

        item_resultado = {
            "indice": idx,
            "total": total,
            "linha": linha,
            "nome": nome_original,
            "status": "iniciado",
            "docx": None,
            "pdf": None,
            "erro": None
        }

        try:
            if not nome_original:
                raise ValueError("Campo NOME está vazio.")

            nome_arquivo = normalizar_nome_arquivo(nome_original)
            if nome_arquivo in nomes_usados:
                nomes_usados[nome_arquivo] += 1
                nome_arquivo = f"{nome_arquivo}_{nomes_usados[nome_arquivo]}"
            else:
                nomes_usados[nome_arquivo] = 1

            caminho_docx = pasta_saida / f"{nome_arquivo}.docx"
            gerar_certificado_docx(caminho_modelo, dados, caminho_docx)
            item_resultado["docx"] = caminho_docx.name

            if gerar_pdf:
                caminho_pdf = converter_para_pdf(caminho_docx)
                if caminho_pdf and caminho_pdf.exists():
                    item_resultado["pdf"] = caminho_pdf.name
                    # GERAÇÃO EXCLUSIVA EM PDF: Remove o .docx intermediário
                    if somente_pdf:
                        try:
                            if caminho_docx.exists():
                                caminho_docx.unlink()
                            item_resultado["docx"] = None
                        except Exception:
                            pass
                else:
                    raise RuntimeError("Falha na conversão para PDF. Certifique-se de que o Microsoft Word ou LibreOffice está disponível.")

            item_resultado["status"] = "sucesso"
            sucesso.append(item_resultado)

        except Exception as e:
            item_resultado["status"] = "erro"
            item_resultado["erro"] = str(e)
            erros.append(item_resultado)

        if callback:
            callback(item_resultado)

    return {
        "total": total,
        "sucessos": len(sucesso),
        "erros": len(erros),
        "itens_sucesso": sucesso,
        "itens_erro": erros
    }


# ---------------------------------------------------------------------------
# Processo principal em linha de comando (CLI)
# ---------------------------------------------------------------------------

def main() -> None:
    print("=" * 64)
    print(" GERADOR DE CERTIFICADOS EM LOTE")
    print("=" * 64)

    PASTA_SAIDA.mkdir(parents=True, exist_ok=True)

    # Verifica se existem arquivos; se nao, gera os arquivos padrao automaticamente
    try:
        caminho_modelo = localizar_arquivo(PASTA_MODELO, (".docx",))
    except FileNotFoundError:
        print("Criando modelo padrão 'certificado_base.docx' em 'modelo/'...")
        from gerador_modelo import criar_modelo_docx
        caminho_modelo = PASTA_MODELO / "certificado_base.docx"
        criar_modelo_docx(caminho_modelo)

    try:
        caminho_excel = localizar_arquivo(PASTA_ENTRADA, (".xlsx", ".xlsm"))
    except FileNotFoundError:
        print("Criando planilha de exemplo 'participantes_exemplo.xlsx' em 'entrada/'...")
        from gerador_modelo import criar_planilha_exemplo
        caminho_excel = PASTA_ENTRADA / "participantes_exemplo.xlsx"
        criar_planilha_exemplo(caminho_excel)

    print(f"Modelo utilizado : {caminho_modelo.name}")
    print(f"Planilha utilizada: {caminho_excel.name}")
    print("-" * 64)

    try:
        participantes = carregar_participantes(caminho_excel)
    except ValueError as e:
        print(f"\nERRO na planilha: {e}")
        sys.exit(1)

    print(f"{len(participantes)} participante(s) encontrado(s) na planilha.\n")

    def print_item(item):
        if item["status"] == "sucesso":
            print(f"[OK]   Linha {item['linha']:>3}: {item['nome']} -> {item['docx']}")
            if item.get("pdf"):
                print(f"       PDF gerado: {item['pdf']}")
        else:
            print(f"[ERRO] Linha {item['linha']:>3}: {item['nome'] or '(sem nome)'} -> {item['erro']}")

    resumo = executar_lote(
        caminho_modelo=caminho_modelo,
        participantes=participantes,
        pasta_saida=PASTA_SAIDA,
        gerar_pdf=GERAR_PDF,
        callback=print_item
    )

    print("-" * 64)
    print(f"Certificados gerados com sucesso: {resumo['sucessos']}")
    print(f"Registros com erro:               {resumo['erros']}")
    if resumo["erros"] > 0:
        print("\nDetalhes dos erros:")
        for item in resumo["itens_erro"]:
            print(f"  - Linha {item['linha']}: {item['nome']} -> {item['erro']}")
    print("=" * 64)


if __name__ == "__main__":
    main()
