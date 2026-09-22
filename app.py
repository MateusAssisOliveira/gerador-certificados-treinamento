#!/usr/bin/env python3
"""
app.py
======
Servidor web local e API REST (FastAPI) para o Gerador e Estúdio Visual de Certificados.
Permite editar textos, gerenciar variáveis dinâmicas, visualizar em tempo real,
importar dados de participantes e gerar certificados em lote (.docx e .pdf).
"""

from __future__ import annotations

import io
import os
import re
import shutil
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import openpyxl
from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import gerador_modelo
from gerar_certificados import (
    BASE_DIR,
    PASTA_ENTRADA,
    PASTA_MODELO,
    PASTA_SAIDA,
    carregar_participantes,
    converter_para_pdf,
    executar_lote,
    gerar_certificado_docx,
    normalizar_nome_arquivo,
)

app = FastAPI(
    title="CertificaFlow - Gerador de Certificados",
    description="Estúdio visual para criação e geração em lote de certificados personalizados.",
    version="2.0.0"
)

# Habilita CORS para maior flexibilidade
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cria as pastas do projeto se não existirem
PASTA_MODELO.mkdir(parents=True, exist_ok=True)
PASTA_ENTRADA.mkdir(parents=True, exist_ok=True)
PASTA_SAIDA.mkdir(parents=True, exist_ok=True)
PASTA_LOGOS = PASTA_MODELO / "logos"
PASTA_LOGOS.mkdir(parents=True, exist_ok=True)

# Monta arquivos estáticos
STATIC_DIR = BASE_DIR / "static"
TEMPLATES_DIR = BASE_DIR / "templates"
STATIC_DIR.mkdir(parents=True, exist_ok=True)
TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


# ---------------------------------------------------------------------------
# Modelos Pydantic para requisições
# ---------------------------------------------------------------------------

class ModeloSalvarRequest(BaseModel):
    titulo: str = "CERTIFICADO"
    subtitulo: str = "DE CONCLUSÃO E PARTICIPAÇÃO"
    instituicao: str = "CENTRO DE DESENVOLVIMENTO & CAPACITAÇÃO PROFISSIONAL"
    texto_corpo: str
    assinatura_1_nome: str = "Prof. Coordenador(a)"
    assinatura_1_cargo: str = "Coordenação Pedagógica"
    assinatura_2_nome: str = "Diretoria Acadêmica"
    assinatura_2_cargo: str = "Direção Geral"
    tema: str = "ouro_azul"
    orientacao: str = "paisagem"
    nome_arquivo: str = "certificado_personalizado.docx"
    codigo_verificacao: bool = True
    
    # Logotipos da Frente
    logo_prestadora_base64: Optional[str] = None
    logo_contratante_base64: Optional[str] = None
    
    # Folha de Trás (Verso)
    habilitar_verso: bool = False
    verso_titulo: str = "CONTEÚDO PROGRAMÁTICO & REGISTRO"
    verso_conteudo: Optional[str] = None
    verso_livro: str = "01"
    verso_folha: str = "45"
    verso_registro: str = "REG-{{CPF}}"
    verso_amparo_legal: Optional[str] = None
    verso_assinatura_nome: str = "Coordenação Técnica Pedagógica"
    verso_assinatura_cargo: str = "Responsável Técnico(a)"


class GeracaoLoteRequest(BaseModel):
    modelo_nome: str
    gerar_pdf: bool = True
    limpar_saida_antes: bool = False
    origem_dados: str = "arquivo"  # "arquivo" ou "tabela"
    arquivo_planilha: Optional[str] = None
    participantes_tabela: Optional[List[Dict[str, Any]]] = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def salvar_base64_imagem(data_url: Optional[str], prefixo: str) -> Optional[Path]:
    """Decodifica uma imagem enviada em base64/DataURL e salva no disco."""
    if not data_url or not isinstance(data_url, str):
        return None
    if not data_url.startswith("data:image/"):
        return None
    try:
        import base64
        header, encoded = data_url.split(",", 1)
        ext = "png"
        if "jpeg" in header or "jpg" in header:
            ext = "jpg"
        elif "webp" in header:
            ext = "webp"
        elif "svg" in header:
            ext = "svg"

        PASTA_LOGOS.mkdir(parents=True, exist_ok=True)
        caminho = PASTA_LOGOS / f"{prefixo}.{ext}"
        with open(caminho, "wb") as f:
            f.write(base64.b64decode(encoded))
        return caminho
    except Exception as e:
        print(f"Erro ao salvar logo '{prefixo}': {e}")
        return None


def extrair_variaveis_do_texto(texto: str) -> List[str]:
    """Extrai todas as tags no formato {{VARIAVEL}} de um texto."""
    if not texto:
        return []
    encontradas = re.findall(r"\{\{([A-Za-z0-9_]+)\}\}", texto)
    # Mantém ordem de aparição sem duplicar
    vistas = set()
    unicas = []
    for var in encontradas:
        var_upper = var.strip().upper()
        if var_upper not in vistas:
            vistas.add(var_upper)
            unicas.append(var_upper)
    return unicas


def listar_arquivos(pasta: Path, extensoes: tuple) -> List[Dict[str, Any]]:
    """Lista arquivos de uma pasta com informações de tamanho e data."""
    if not pasta.exists():
        return []
    arquivos = []
    for f in sorted(pasta.iterdir(), key=lambda p: p.stat().st_mtime if p.is_file() else 0, reverse=True):
        if f.is_file() and f.suffix.lower() in extensoes and not f.name.startswith("~$") and not f.name.startswith("."):
            st = f.stat()
            arquivos.append({
                "nome": f.name,
                "tamanho_bytes": st.st_size,
                "tamanho_formatado": f"{st.st_size / 1024:.1f} KB" if st.st_size < 1024*1024 else f"{st.st_size / (1024*1024):.2f} MB",
                "data_modificacao": datetime.fromtimestamp(st.st_mtime).strftime("%d/%m/%Y %H:%M:%S")
            })
    return arquivos


# ---------------------------------------------------------------------------
# Rotas Principais
# ---------------------------------------------------------------------------

@app.get("/")
def index():
    """Retorna a interface visual principal."""
    index_file = TEMPLATES_DIR / "index.html"
    if not index_file.exists():
        raise HTTPException(status_code=404, detail="Template index.html não encontrado.")
    return FileResponse(index_file)


@app.get("/api/status")
def status_sistema():
    """Retorna o estado das pastas, arquivos disponíveis e ferramentas instaladas."""
    modelos = listar_arquivos(PASTA_MODELO, (".docx",))
    planilhas = listar_arquivos(PASTA_ENTRADA, (".xlsx", ".xlsm", ".csv"))
    saida = listar_arquivos(PASTA_SAIDA, (".docx", ".pdf"))

    # Verifica se ferramentas de PDF estão disponíveis
    word_disponivel = False
    try:
        import win32com.client
        word_disponivel = True
    except Exception:
        word_disponivel = bool(shutil.which("soffice") or shutil.which("libreoffice"))

    return {
        "status": "ok",
        "pastas": {
            "modelo": str(PASTA_MODELO),
            "entrada": str(PASTA_ENTRADA),
            "saida": str(PASTA_SAIDA)
        },
        "modelos": modelos,
        "planilhas": planilhas,
        "saida_arquivos": saida,
        "total_gerados": len(saida),
        "pdf_habilitado": word_disponivel
    }


@app.post("/api/modelo/salvar")
def salvar_modelo_docx(payload: ModeloSalvarRequest):
    """Gera e salva um modelo .docx formatado a partir dos parâmetros visuais (frente e verso)."""
    nome = payload.nome_arquivo.strip()
    if not nome.endswith(".docx"):
        nome += ".docx"
    caminho_arquivo = PASTA_MODELO / nome

    # Salva logos em disco se fornecidas
    caminho_logo_prestadora = salvar_base64_imagem(payload.logo_prestadora_base64, "logo_prestadora")
    caminho_logo_contratante = salvar_base64_imagem(payload.logo_contratante_base64, "logo_contratante")

    texto_total = f"{payload.texto_corpo}\n{payload.verso_conteudo or ''}\n{payload.verso_registro or ''}"
    variaveis = extrair_variaveis_do_texto(texto_total)

    gerador_modelo.criar_modelo_docx(
        caminho_saida=caminho_arquivo,
        titulo=payload.titulo,
        subtitulo=payload.subtitulo,
        instituicao=payload.instituicao,
        texto_corpo=payload.texto_corpo,
        assinatura_1_nome=payload.assinatura_1_nome,
        assinatura_1_cargo=payload.assinatura_1_cargo,
        assinatura_2_nome=payload.assinatura_2_nome,
        assinatura_2_cargo=payload.assinatura_2_cargo,
        tema=payload.tema,
        orientacao=payload.orientacao,
        codigo_verificacao=payload.codigo_verificacao,
        logo_prestadora_path=str(caminho_logo_prestadora) if caminho_logo_prestadora else None,
        logo_contratante_path=str(caminho_logo_contratante) if caminho_logo_contratante else None,
        habilitar_verso=payload.habilitar_verso,
        verso_titulo=payload.verso_titulo,
        verso_conteudo=payload.verso_conteudo,
        verso_livro=payload.verso_livro,
        verso_folha=payload.verso_folha,
        verso_registro=payload.verso_registro,
        verso_amparo_legal=payload.verso_amparo_legal,
        verso_assinatura_nome=payload.verso_assinatura_nome,
        verso_assinatura_cargo=payload.verso_assinatura_cargo
    )

    return {
        "ok": True,
        "mensagem": f"Modelo '{nome}' criado com sucesso!",
        "nome_arquivo": nome,
        "caminho": str(caminho_arquivo),
        "variaveis_detectadas": variaveis
    }


ARQUIVO_CONFIG_PADRAO = PASTA_MODELO / "configuracao_ativa.json"

@app.get("/api/config/carregar")
def carregar_config_ativa():
    """Retorna a configuração salva de textos e layout, se existir."""
    if ARQUIVO_CONFIG_PADRAO.exists():
        try:
            import json
            with open(ARQUIVO_CONFIG_PADRAO, "r", encoding="utf-8") as f:
                dados = json.load(f)
            return {"ok": True, "config": dados}
        except Exception as e:
            return {"ok": False, "erro": str(e)}
    return {"ok": False, "mensagem": "Nenhuma configuração salva em disco ainda."}


@app.post("/api/config/salvar")
def salvar_config_ativa(payload: Dict[str, Any]):
    """Salva no disco (pasta modelo/configuracao_ativa.json) a estrutura de texto e personalizações."""
    try:
        import json
        with open(ARQUIVO_CONFIG_PADRAO, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        return {"ok": True, "mensagem": "Configuração salva com sucesso no disco!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/modelo/upload")
async def upload_modelo(arquivo: UploadFile = File(...)):
    """Permite fazer upload de um arquivo .docx para a pasta modelo."""
    if not arquivo.filename.lower().endswith(".docx"):
        raise HTTPException(status_code=400, detail="Apenas arquivos .docx são permitidos.")

    destino = PASTA_MODELO / arquivo.filename
    conteudo = await arquivo.read()
    with open(destino, "wb") as f:
        f.write(conteudo)

    return {
        "ok": True,
        "mensagem": f"Modelo '{arquivo.filename}' enviado com sucesso!",
        "nome_arquivo": arquivo.filename
    }


@app.post("/api/planilha/upload")
async def upload_planilha(arquivo: UploadFile = File(...)):
    """Recebe e processa uma planilha Excel (.xlsx) ou CSV."""
    nome = arquivo.filename.lower()
    if not (nome.endswith(".xlsx") or nome.endswith(".xlsm") or nome.endswith(".csv")):
        raise HTTPException(status_code=400, detail="Formato não suportado. Envie .xlsx ou .csv")

    destino = PASTA_ENTRADA / arquivo.filename
    conteudo = await arquivo.read()
    with open(destino, "wb") as f:
        f.write(conteudo)

    # Lê dados para pré-visualização
    try:
        dados = carregar_participantes(destino, colunas_obrigatorias=[])
        colunas = [k for k in dados[0].keys() if not k.startswith("_")] if dados else []
        return {
            "ok": True,
            "nome_arquivo": arquivo.filename,
            "colunas": colunas,
            "total_participantes": len(dados),
            "primeiras_linhas": dados[:15]
        }
    except Exception as e:
        return {
            "ok": True,
            "nome_arquivo": arquivo.filename,
            "aviso": f"Arquivo salvo, mas erro ao ler dados: {e}",
            "colunas": [],
            "total_participantes": 0,
            "primeiras_linhas": []
        }


@app.get("/api/planilha/ler")
def ler_planilha(nome: str = Query(...)):
    """Lê as colunas e linhas de uma planilha existente na pasta entrada."""
    caminho = PASTA_ENTRADA / nome
    if not caminho.exists():
        raise HTTPException(status_code=404, detail="Planilha não encontrada.")

    try:
        dados = carregar_participantes(caminho, colunas_obrigatorias=[])
        colunas = [k for k in dados[0].keys() if not k.startswith("_")] if dados else []
        return {
            "ok": True,
            "nome_arquivo": nome,
            "colunas": colunas,
            "total_participantes": len(dados),
            "participantes": dados
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao ler planilha: {e}")


@app.get("/api/planilha/exemplo-download")
def download_planilha_exemplo(colunas: str = Query("NOME,CPF,CURSO,DATA,CARGA_HORARIA")):
    """Gera e faz download de uma planilha Excel configurada com as variáveis requisitadas."""
    lista_colunas = [c.strip().upper() for c in colunas.split(",") if c.strip()]
    if not lista_colunas:
        lista_colunas = ["NOME", "CPF", "CURSO", "DATA", "CARGA_HORARIA"]

    temp_path = BASE_DIR / "saida" / "_temp_modelo.xlsx"
    gerador_modelo.criar_planilha_exemplo(temp_path, lista_colunas)

    return FileResponse(
        temp_path,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename="modelo_participantes.xlsx"
    )


@app.post("/api/gerar")
def gerar_certificados_api(payload: GeracaoLoteRequest):
    """Executa a geração em lote dos certificados (.docx e .pdf)."""
    caminho_modelo = PASTA_MODELO / payload.modelo_nome
    if not caminho_modelo.exists():
        raise HTTPException(status_code=404, detail=f"Modelo '{payload.modelo_nome}' não encontrado.")

    if payload.limpar_saida_antes:
        for f in PASTA_SAIDA.iterdir():
            if f.is_file() and f.suffix.lower() in (".docx", ".pdf") and not f.name.startswith("."):
                try:
                    f.unlink()
                except Exception:
                    pass

    # Obtém a lista de participantes
    if payload.origem_dados == "tabela":
        if not payload.participantes_tabela:
            raise HTTPException(status_code=400, detail="Nenhum participante fornecido na tabela.")
        participantes = payload.participantes_tabela
    else:
        if not payload.arquivo_planilha:
            raise HTTPException(status_code=400, detail="Nome da planilha não fornecido.")
        caminho_planilha = PASTA_ENTRADA / payload.arquivo_planilha
        if not caminho_planilha.exists():
            raise HTTPException(status_code=404, detail=f"Planilha '{payload.arquivo_planilha}' não encontrada.")
        try:
            participantes = carregar_participantes(caminho_planilha, colunas_obrigatorias=[])
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Erro ao ler planilha: {e}")

    # Executa a geração em lote
    resultado = executar_lote(
        caminho_modelo=caminho_modelo,
        participantes=participantes,
        pasta_saida=PASTA_SAIDA,
        gerar_pdf=payload.gerar_pdf
    )

    return {
        "ok": True,
        "resumo": resultado,
        "mensagem": f"{resultado['sucessos']} certificado(s) gerado(s) com sucesso!"
    }


@app.get("/api/download/zip")
def download_zip():
    """Compacta todos os certificados gerados na pasta saída e retorna para download."""
    buffer = io.BytesIO()
    arquivos_incluidos = 0

    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in PASTA_SAIDA.iterdir():
            if f.is_file() and f.suffix.lower() in (".docx", ".pdf") and not f.name.startswith(".") and not f.name.startswith("_temp"):
                zf.write(f, arcname=f.name)
                arquivos_incluidos += 1

    if arquivos_incluidos == 0:
        raise HTTPException(status_code=400, detail="Nenhum certificado encontrado para download.")

    buffer.seek(0)
    data_hora = datetime.now().strftime("%Y%m%d_%H%M")
    return StreamingResponse(
        buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename=certificados_{data_hora}.zip"}
    )


@app.post("/api/abrir-pasta")
def abrir_pasta_saida():
    """Abre a pasta de saída diretamente no Windows Explorer."""
    try:
        os.startfile(str(PASTA_SAIDA))
        return {"ok": True, "mensagem": "Pasta aberta com sucesso!"}
    except Exception as e:
        return {"ok": False, "erro": str(e)}


@app.post("/api/limpar-saida")
def limpar_pasta_saida():
    """Remove certificados gerados anteriormente da pasta saída."""
    removidos = 0
    for f in PASTA_SAIDA.iterdir():
        if f.is_file() and f.suffix.lower() in (".docx", ".pdf") and not f.name.startswith("."):
            try:
                f.unlink()
                removidos += 1
            except Exception:
                pass
    return {"ok": True, "removidos": removidos}


if __name__ == "__main__":
    import uvicorn
    import socket
    import webbrowser

    # Verifica se a porta 8000 já está em uso
    porta_em_uso = False
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        if s.connect_ex(("127.0.0.1", 8000)) == 0:
            porta_em_uso = True

    if porta_em_uso:
        print("\n" + "=" * 65)
        print(" O servidor CertificaFlow já está em execução em http://127.0.0.1:8000!")
        print(" Abrindo navegador...")
        print("=" * 65 + "\n")
        webbrowser.open("http://127.0.0.1:8000")
    else:
        print("Iniciando servidor CertificaFlow em http://127.0.0.1:8000...")
        uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
