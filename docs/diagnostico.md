# Relatório de Diagnóstico de Arquitetura — Fase 0

> **Projeto:** SaaS de Geração de Certificados em Lote  
> **Referência:** `docs/ARCHITECTURE-FASTAPI.md`  
> **Status:** Diagnóstico Concluído — Aguardando Aprovação para Fase 1  
> **Data:** 15/10/2026  

---

## Sumário Executivo

Este documento consolida a análise detalhada da base de código legada (`CertificaFlow v2.0`), o comparativo com a nova especificação de arquitetura baseada em nuvem/serverless, o estudo das capacidades atuais da plataforma Vercel e provedores de banco de dados no Brasil (LGPD), culminando em um plano de migração incremental seguro.

Nenhuma linha de código de produção foi alterada durante esta fase, conforme os critérios de aceite da **Fase 0**.

---

## 1. Análise do Repositório Atual

### 1.1. Estrutura de Pastas e Componentes
O repositório atual foi concebido como uma aplicação desktop/monolítica local para Windows:

```
gerador-certificados-treinamento/
├── app.py                      # Servidor FastAPI e rotas REST locais
├── gerar_certificados.py       # Motor CLI e funções de preenchimento docxtpl
├── gerador_modelo.py           # Construtor programático de arquivos .docx e .xlsx
├── iniciar_app.bat             # Script de inicialização local para Windows
├── requirements.txt            # Dependências Python legadas
├── modelo/                     # Armazenamento em disco de templates Word (.docx)
│   ├── certificado_base.docx
│   └── logos/
├── entrada/                    # Armazenamento em disco de planilhas recebidas (.xlsx, .csv)
├── saida/                      # Armazenamento em disco dos certificados gerados (.docx e .pdf)
├── templates/
│   └── index.html              # Interface web monolítica única (HTML/Tailwind via CDN)
└── static/
    ├── css/style.css           # Estilização do estúdio visual
    └── js/app.js               # Lógica JavaScript cliente legada
```

### 1.2. Rotas Existentes (`app.py`)
- `GET /`: Serve o arquivo estático `templates/index.html`.
- `GET /api/status`: Varre as pastas locais do disco e verifica se o Microsoft Word (via `win32com.client`) ou LibreOffice (`soffice`) estão instalados no host.
- `POST /api/modelo/salvar`: Recebe parâmetros visuais e gera um arquivo Word `.docx` no disco através do `gerador_modelo.py`.
- `GET /api/config/carregar` e `POST /api/config/salvar`: Lê e persiste personalizações visuais em um arquivo JSON local (`modelo/configuracao_ativa.json`).
- `POST /api/modelo/upload`: Salva arquivos `.docx` na pasta local `modelo/`.
- `POST /api/planilha/upload`: Recebe upload multipart de planilha e salva diretamente na pasta `entrada/`.
- `GET /api/planilha/ler`: Lê e retorna as linhas de uma planilha salva em `entrada/`.
- `GET /api/planilha/exemplo-download`: Gera dinamicamente um arquivo Excel de exemplo na pasta `saida/` e entrega via `FileResponse`.
- `POST /api/gerar`: **Rota síncrona de processamento**. Executa o preenchimento de todos os participantes do lote na mesma requisição HTTP.
- `GET /api/download/zip`: Cria um arquivo ZIP de toda a pasta `saida/` em memória (`io.BytesIO`) e realiza streaming.
- `POST /api/abrir-pasta`: Executa `os.startfile()` para abrir o Windows Explorer (código estritamente desktop/Windows).
- `POST /api/limpar-saida`: Remove arquivos `.docx` e `.pdf` da pasta local `saida/`.

### 1.3. Modelos de Dados Atuais
- Não há banco de dados relacional (nem SQLite, nem PostgreSQL).
- Não há ORM (SQLAlchemy) nem migrações (Alembic).
- Apenas dois modelos Pydantic básicos para payload de entrada:
  - `ModeloSalvarRequest`: Valida textos e opções de layout do certificado.
  - `GeracaoLoteRequest`: Valida a solicitação de geração em lote.
- O estado de arquivos, configurações e resultados reside 100% no sistema de arquivos local (`entrada/`, `modelo/`, `saida/`).

### 1.4. Como o Upload e a Geração Funcionam Hoje
1. **Upload:** A planilha é enviada inteira pelo corpo da requisição HTTP (`POST /api/planilha/upload`) e gravada em disco na pasta `entrada/`.
2. **Leitura:** O arquivo é lido com `openpyxl` ou `csv`, com detecção inteligente de sinônimos de colunas (`NOME`, `CPF`, `CURSO`, etc.).
3. **Geração dos Documentos:**
   - Para cada linha, gera um documento intermediário `.docx` usando a biblioteca `docxtpl` (preenchimento Jinja sobre o template Word).
   - Para gerar o PDF, o sistema invoca `docx2pdf`, que se comunica via automação COM (`win32com.client`) com o **Microsoft Word instalado na máquina do usuário** ou, alternativamente, chama o executável do **LibreOffice** via `subprocess`.
   - Se `somente_pdf=True`, apaga o `.docx` e mantém o `.pdf` na pasta local `saida/`.
4. **Gargalos Críticos:**
   - **Incompatibilidade Serverless:** Na Vercel (ambiente Linux Serverless), não existe Microsoft Word nem LibreOffice instalado. A chamada de conversão falha imediatamente.
   - **Bloqueio de Threads:** A geração é síncrona. Um lote com 100 participantes pode levar de 30 a 60 segundos com automação do Word, excedendo o timeout HTTP do navegador ou da infraestrutura.
   - **Sistema de Arquivos Read-Only:** A Vercel possui sistema de arquivos efêmero e somente leitura (exceto pela pasta temporária `/tmp`).

### 1.5. Dependências e Testes
- Dependências atuais: `docxtpl>=0.16`, `openpyxl>=3.1`, `docx2pdf>=0.1.8`, `fastapi`, `uvicorn`, `python-docx`.
- **Testes:** Totalmente inexistentes no repositório atual (0 testes unitários, 0 testes de integração).

---

## 2. Comparativo de Lacunas por Prioridade

| Prioridade | Área | Estado Atual | Especificação (`ARCHITECTURE-FASTAPI.md`) | Lacunas Identificadas |
|---|---|---|---|---|
| **P1** | **Segurança & LGPD** | CPFs em texto claro; sem criptografia; logs expõem nomes e CPFs via `print`; sem autenticação; dados em pastas públicas locais. | Criptografia AES-256-GCM para dados sensíveis; HMAC-SHA256 para buscas; logs com redação de PII; multi-tenant isolado por token; URLs privadas assinadas; página de validação pública sem CPF. | - Criptografia em repouso inexistente.<br>- Falta blind index (`cpf_hmac`).<br>- Falta filtro de logs anti-PII.<br>- Falta modelo multi-tenant com `tenant_id`. |
| **P2** | **Processamento em Lote & Nuvem** | Síncrono no request HTTP; dependente de MS Word / LibreOffice; filesystem local. | Processamento assíncrono particionado em chunks (50-100 linhas); Vercel Queues; motor ReportLab puro; armazenamento em Object Storage privado. | - Falta motor `pdf_renderer` puro.<br>- Falta orquestração por fila.<br>- Falta chunking idempotente.<br>- Falta integração com Storage S3/Blob. |
| **P3** | **Idempotência & Confiabilidade** | Se interrompido, perde o progresso; arquivos sobrescritos sem chave determinística; falha em 1 linha derruba lote. | Banco de dados como fonte da verdade; chave determinística de PDF; retry exponencial; recuperação de lotes presos via cron; relatório de falhas (`errors.csv`). | - Sem controle de estado de lote (`batches`) e certificados (`certificates`).<br>- Sem retry de falhas.<br>- Sem recuperação de lotes. |
| **P4** | **Custo & Escalabilidade** | Upload de arquivo passa pelo servidor; ZIP construído em memória RAM com `io.BytesIO`. | Upload direto browser -> Storage via URL pré-assinada; ZIP em streaming; carregamento único de fontes TTF por chunk; sem pandas/WeasyPrint. | - Falta endpoint `/uploads/sign`.<br>- Falta geração de ZIP em streaming.<br>- Falta reutilização de fontes no worker. |
| **P5** | **Observabilidade & Qualidade** | Prints simples no terminal; zero testes; sem padronização de linter ou checagem de tipos. | Logs estruturados em JSON; rastreamento de métricas por chunk; `ruff`, `mypy`, `pytest` com 100% de sucesso; testes com dados sintéticos. | - Falta suite de testes unitários e de integração.<br>- Falta configuração de `ruff` e `mypy`.<br>- Falta structured logging JSON. |

---

## 3. Investigação Técnica da Vercel (Python, Queues e Limites)

Conforme orientação do documento de arquitetura (`[VERIFICAR DOCS]`), realizamos uma consulta detalhada à documentação técnica oficial da Vercel para o runtime Python:

### 3.1. Vercel Queues para Python
- **Suporte Oficial:** A Vercel disponibiliza suporte a Python via SDKs oficiais `vercel` e o pacote focado `vercel-queue` (com extensão `vercel-queue[typed]` para validação de esquemas via Pydantic).
- **Mecanismos de Consumo:**
  - **Push Delivery:** As mensagens acionam diretamente Vercel Functions assíncronas decoradas com `@subscribe(topic="nome_topico")`.
  - **Poll Delivery:** Suporte a workers externos que fazem polling na fila.
- **Limites Operacionais do Vercel Queues:**
  - **Tamanho Máximo de Mensagem:** Até **100 MB** por mensagem (a arquitetura do projeto trafega mensagens de menos de 1 KB contendo apenas `batch_id`, `tenant_id`, `row_from`, `row_to`).
  - **Unidade de Tarifação:** Mensagens são tarifadas em blocos de 4 KiB.
  - **Retenção de Mensagens (TTL):** De 60 segundos até 7 dias (padrão: 24 horas).
  - **Visibility Timeout:** De 0 a 60 minutos (padrão: 60 segundos).
  - **Concorrência:** Ilimitada por padrão, com suporte a limitação explícita por consumer group (útil para proteger o pool de conexões do banco).

### 3.2. Vercel Serverless Functions (Python Runtime)
- **Duração Máxima (`maxDuration`):**
  - Plano Pro: Configurável de 15s até 300s (podendo chegar a 800s/900s em configurações avançadas e até 1.800s com Fluid Compute).
  - Para um chunk de 50 certificados com ReportLab puro (~20ms por certificado), o tempo total de processamento do chunk é de **aproximadamente 1.0 a 1.5 segundo**, consumindo menos de 1% do limite de timeout.
- **Tamanho Máximo do Request / Response Body:**
  - Limite estrito de **4.5 MB** para requisições e respostas HTTP diretas.
  - Isso **invalida** o upload direto de planilhas pesadas na API FastAPI e confirma a exigência da arquitetura: upload direto do cliente para o Storage via URL pré-assinada.
- **Tamanho do Bundle de Deploy:**
  - 500 MB descompactado para Python padrão (e até 5 GB com Fluid Compute). O ecossistema ReportLab + SQLAlchemy + Pydantic v2 ocupa menos de 80 MB, mantendo cold starts baixos (< 600ms).

### 3.3. Recomendação: Plano A (Tudo na Vercel) vs Plano B (Worker Dedicado)
- **Decisão:** **Recomendamos o Plano A (Tudo na Vercel)** para as Fases 1 a 6, mantendo o isolamento estrito para permitir o Plano B a qualquer momento (registrado no [ADR 0001](file:///c:/PYTHON/gerador-certificados-treinamento/docs/decisions/0001-processamento-assincrono.md)).
- **Justificativa:**
  1. O custo de infraestrutura é zero quando o sistema está ocioso (verdadeiro pay-per-use).
  2. A velocidade do ReportLab puro elimina a necessidade de servidores fixos ligados 24/7 (como Celery + Redis em Railway/Fly).
  3. O pacote `pdf_renderer` será mantido como biblioteca pura sem dependência da Vercel ou do FastAPI. Caso a demanda ultrapasse centenas de milhares de certificados diários, a transição para um worker dedicado (Celery/RQ) demandará apenas a criação de um wrapper consumer.

---

## 4. Provedor PostgreSQL Serverless e LGPD

Conforme investigado no [ADR 0002](file:///c:/PYTHON/gerador-certificados-treinamento/docs/decisions/0002-provedor-postgresql-lgpd.md):

### 4.1. Conformidade com a LGPD (Data Residency)
A LGPD impõe regras estritas sobre transferência internacional de dados pessoais (Art. 33). Manter os dados pessoais (inclusive cifrados) armazenados fisicamente no território nacional simplifica enormemente a conformidade jurídica da organização emissora.
- Tanto o **Neon Database** quanto o **Supabase** possuem datacenter disponível na região **AWS São Paulo (`sa-east-1` / `aws-sa-east-1`)**.

### 4.2. Connection Pooling e Concorrência Serverless
Funções serverless abrem e fecham conexões em alta frequência. Sem um pooler intermediário, ocorre esgotamento de conexões do PostgreSQL (`max_connections exceeded`).
- O **Neon** oferece PgBouncer nativo integrado em todas as instâncias (porta de pooling padrão).
- O **Supabase** utiliza o pooler Supavisor na porta 6543.

### 4.3. Recomendação
- **Recomendação Principal:** **Neon** na região `aws-sa-east-1` (São Paulo) ou **Supabase** na região `sa-east-1`.
- **Independência Tecnológica:** A aplicação se comunicará exclusivamente via **SQLAlchemy 2.x** com o driver `psycopg 3` e migrações geridas pelo **Alembic**. Nenhuma extensão proprietária será utilizada, garantindo que o banco possa ser trocado a qualquer momento apenas alterando a variável `DATABASE_URL`.

---

## 5. Plano de Migração Incremental

Para não romper a funcionalidade existente e manter commits pequenos e lógicos, o plano de transição será estruturado da seguinte forma:

```
[Código Legado Atual]
       │
       ▼  (Fase 1)
[Fundação: Estrutura apps/, Core Config, SQLAlchemy 2, Alembic, Cripto AES-GCM + HMAC, Logging Sanitizado]
       │
       ▼  (Fase 2)
[Upload & Validação: Migração do Parser inteligente de planilhas + Schemas Pydantic v2 + Models DB]
       │
       ▼  (Fase 3)
[Renderer Puro: Migração dos temas e dados visuais para ReportLab + PyPDF em apps/api/pdf_renderer]
       │
       ▼  (Fase 4)
[Processamento Assíncrono: Chunks de 50 linhas, Vercel Queues/Handlers, Idempotência e Progresso no DB]
       │
       ▼  (Fase 5)
[Entrega & Validação Pública: Streaming ZIP, URLs Assinadas, Rota pública /verify/{public_code}]
       │
       ▼  (Fase 6)
[Frontend React (Vite) + OpenAPI Client gerado + Cotas e Planos]
```

### Como o código existente será aproveitado:
1. **Lógica de Mapeamento de Colunas (`gerar_certificados.py`):** As rotinas `carregar_participantes`, `normalizar_chave_coluna` e o dicionário de sinônimos/aliases (`NOME`, `CPF`, `CURSO`, `CARGA_HORARIA`, `DATA`) serão transferidas e adaptadas para o módulo `apps/api/app/modules/batches/parser.py`, enriquecidas com tipagem Pydantic v2.
2. **Definições Visuais de Temas (`gerador_modelo.py`):** As paletas de cores (`TEMAS`), proporções, tipografias e molduras desenvolvidas para o Word serão convertidas diretamente em instruções de desenho vetorial no ReportLab Canvas.
3. **Padrões de UI/UX (`SKILL.md` e `templates/index.html`):** O design corporativo limpo, as cores semânticas e o suporte a dual-theme documentados na skill de UI/UX serão reutilizados na interface React com Tailwind/Vanilla CSS.

---

## 6. Questões a Serem Alinhadas Antes da Fase 1

Antes de iniciarmos a implementação da **Fase 1 (Fundação)**, solicitamos sua validação e resposta para as 4 perguntas abaixo:

1. **Estrutura de Monorepo:** Confirma a organização do repositório no formato monorepo especificado (`apps/web` para o frontend React/Vite e `apps/api` para a API FastAPI)? Podemos criar a nova estrutura mantendo os scripts legados na raiz até a substituição completa?
2. **Provedor PostgreSQL Inicial:** Você prefere utilizar uma instância do **Neon** ou do **Supabase** para o ambiente de desenvolvimento/staging (ambos configurados na região `sa-east-1` de São Paulo)? Para os testes locais automatizados da Fase 1, usaremos SQLite em memória ou PostgreSQL via Docker local?
3. **Storage de Arquivos:** Para o armazenamento privado das planilhas e dos certificados gerados (com emissão de URLs assinadas de curta duração), qual serviço de Storage deseja adotar: **Vercel Blob** (modo privado), **AWS S3** (`sa-east-1`), ou **Cloudflare R2** (sem custo de saída de dados)?
4. **Estratégia de Autenticação de Tenants:** Para o multi-tenant da Fase 1, prefere autenticação baseada em JWT emitido pela própria API FastAPI (com `email`, `password_hash` via argon2/bcrypt e `tenant_id` no payload) ou integração com serviço de identidade externo (ex.: Supabase Auth, Clerk ou Auth0)?

---

## 7. Registro de Decisões de Arquitetura (ADRs) Criados

Foram elaborados e persistidos em `docs/decisions/` os seguintes registros de decisão:

- [ADR 0001: Arquitetura de Processamento Assíncrono de Lotes](file:///c:/PYTHON/gerador-certificados-treinamento/docs/decisions/0001-processamento-assincrono.md)
- [ADR 0002: Provedor PostgreSQL Serverless e Conformidade LGPD](file:///c:/PYTHON/gerador-certificados-treinamento/docs/decisions/0002-provedor-postgresql-lgpd.md)
- [ADR 0003: Motor de Renderização de Certificados PDF](file:///c:/PYTHON/gerador-certificados-treinamento/docs/decisions/0003-motor-renderizacao-pdf.md)
- [ADR 0004: Segurança, Criptografia em Nível de Aplicação e Proteção de Dados (LGPD)](file:///c:/PYTHON/gerador-certificados-treinamento/docs/decisions/0004-seguranca-criptografia-lgpd-cpf.md)

---
*Fim do Relatório da Fase 0. Aguardando aprovação e direcionamentos para o início da Fase 1.*
