# SaaS de Geração de Certificados em Lote — Arquitetura (Python / FastAPI)

> Especificação para agentes de IA (Claude Code, Cursor, etc.) e desenvolvedores.
> Leia INTEGRALMENTE antes de escrever qualquer código.
> Esta versão **substitui** a anterior baseada em NestJS.

## 0. Instruções para o agente

1. **Já existe código em Python/FastAPI.** Antes de alterar qualquer coisa, analise o repositório, resuma o que existe e o que diverge desta especificação, e proponha um plano de migração **incremental**. Não reescreva do zero sem aprovação.
2. Trabalhe **uma fase por vez** (seção 13). Ao final de cada fase: rode `ruff`, `mypy` e `pytest`, e pare para revisão.
3. Onde houver **[VERIFICAR DOCS]**, consulte a documentação oficial atual da Vercel antes de implementar. Vercel Queues/Workflow estão em beta e o suporte em Python pode ter mudado. Não invente APIs.
4. Se algo for ambíguo, pergunte antes de assumir. Registre decisões em `docs/decisions/` (ADRs curtos).
5. **Nunca** coloque CPF ou outros dados pessoais em logs, mensagens de fila, URLs, mensagens de erro ou testes com dados reais.

## 1. Objetivo do produto

O usuário envia uma planilha (CSV/XLSX) com **colunas nomeadas** (ex.: `nome`, `cpf`, `curso`, `carga_horaria`, `data`) e escolhe um template de certificado. O sistema gera **um PDF por linha**, em lote, mostra o progresso e entrega os arquivos (individualmente e em ZIP). Cada certificado tem um ID único e uma página pública de verificação.

Escala inicial: centenas a algumas dezenas de milhares de certificados por lote.
Prioridades: **custo proporcional ao uso**, **confiabilidade** (lote nunca fica preso), **segurança de dados pessoais (LGPD)**.

## 2. Stack e restrições

| Camada | Tecnologia |
|---|---|
| Frontend | React + TypeScript (Vite), deploy estático na Vercel |
| API | **FastAPI** (Python 3.11+) em Vercel Functions, região próxima ao banco (`gru1` quando possível) |
| Validação / schemas | **Pydantic v2** |
| Banco | PostgreSQL com **pooler** (Neon, Supabase ou RDS: provedor em decisão; **não depender de recursos exclusivos de um provedor**) |
| ORM / migrations | **SQLAlchemy 2.x** (psycopg 3) + **Alembic** |
| Processamento assíncrono | Vercel Queues (consumers) e/ou Vercel Workflow **[VERIFICAR DOCS: suporte em Python]** |
| Storage | Objeto **privado** (Vercel Blob privado ou S3/R2). Nunca URL pública permanente para arquivos com PII |
| Leitura de planilhas | módulo `csv` + `openpyxl` (**evitar pandas**: bundle pesado e cold start) |
| PDF | `reportlab` (+ `pypdf` para mesclar sobre template PDF) ou `fpdf2`. **Proibido** Chromium/Playwright/Puppeteer; evitar WeasyPrint (libs de sistema) |
| Criptografia | `cryptography` (AES-256-GCM) + `hmac` da stdlib |
| Dependências | `uv` + `pyproject.toml` (`requires-python >= 3.11`) |
| Qualidade | `ruff`, `mypy`, `pytest`, `pytest-asyncio` |

Limites da plataforma **[VERIFICAR DOCS]**:
- `maxDuration` padrão de 300s por invocação (até 800s em planos pagos).
- Bundle Python de até 500 MB descompactado. Use `excludeFiles` no `vercel.json` para tirar testes e assets.
- Limite de tamanho de body em Functions: uploads grandes vão **direto do browser ao storage** com URL assinada.

## 3. Estrutura do repositório

```
apps/
  web/                      # React (Vite)
  api/
    pyproject.toml
    vercel.json
    app/
      main.py               # cria FastAPI(), registra routers, middlewares
      core/                 # config, segurança, logging (redação de PII), deps
      db/                   # engine, sessão, models, migrations (alembic/)
      modules/
        tenants/ auth/ templates/ batches/ certificates/ verify/
      workers/              # handlers de fila: validate_batch, render_chunk, finalize_batch
    pdf_renderer/           # pacote PURO (sem FastAPI/DB): template + dados -> bytes
    tests/
docs/
  ARCHITECTURE-FASTAPI.md
  decisions/                # ADRs
```

`pdf_renderer` não pode importar FastAPI, SQLAlchemy nem acessar rede. Assim ele pode ir para um worker dedicado no futuro sem reescrita.

Contrato com o front: usar o **OpenAPI gerado pelo FastAPI** e gerar o cliente TypeScript (`openapi-typescript`) no build do `web`.

## 4. Fluxo de ponta a ponta

```
[Browser] ── upload direto (URL assinada) ──▶ [Storage privado: planilha]
    │
    ▼
POST /batches  → cria Batch (status=validating), registra arquivo
    │
    ▼
[Orquestrador: Workflow ou handler de fila]
  1. parse + validação linha a linha (colunas obrigatórias, CPF válido, tamanhos)
  2. insere N linhas em `certificates` (pending); linhas inválidas viram `failed` com motivo
  3. divide em chunks (50–100 linhas) e enfileira 1 mensagem por chunk
  4. cada consumer renderiza o chunk e grava os PDFs no storage
  5. quando done + failed == total -> gera ZIP (streaming) -> status final
  6. notifica (e-mail/webhook) e apaga a planilha original conforme retenção

[UI] ◀── polling (ou SSE) em GET /batches/{id}  (progresso, falhas, links)
```

**O banco é a fonte da verdade do progresso**, não a fila. O fim do lote é decidido por contagem no banco, de forma idempotente.

## 5. Modelo de dados (mínimo)

```
tenants        (id, name, plan, monthly_quota, created_at)
users          (id, tenant_id, email, role, ...)
templates      (id, tenant_id, name, file_key, field_map jsonb, version, created_at)
batches        (id, tenant_id, template_id, status, total, done, failed,
                source_file_key, zip_key, error_summary, created_by,
                created_at, completed_at, expires_at)
certificates   (id uuid, tenant_id, batch_id, row_index, status,
                recipient_name, cpf_enc bytea, cpf_hmac text,
                data_enc bytea,            -- demais campos sensíveis, cifrados
                pdf_key, public_code text unique, error text,
                created_at, generated_at)
  UNIQUE (batch_id, row_index)
  INDEX  (tenant_id, cpf_hmac)
```

Status de `batches`: `validating -> queued -> processing -> completed | completed_with_errors | failed | canceled`.
Status de `certificates`: `pending -> processing -> done | failed`.

## 6. Segurança e LGPD (obrigatório)

1. **Minimização:** só colete CPF se o certificado exigir; suporte CPF mascarado no documento (`***.456.789-**`).
2. **Criptografia em nível de aplicação:** CPF e campos sensíveis com **AES-256-GCM** (`cryptography.hazmat.primitives.ciphers.aead.AESGCM`), nonce único por registro, chave vinda de secret manager/KMS com `key_id` para rotação. Para busca/deduplicação: **HMAC-SHA256** com segredo separado (`cpf_hmac`). Nunca armazenar o CPF em claro.
3. **Sem PII em filas:** mensagens só com `batch_id`, `tenant_id` e intervalo de linhas. O consumer busca os dados no banco.
4. **Logs:** `logging.Filter` global que redige CPF (regex), e-mail e nomes; mesma política em Sentry/APM (`before_send`). Testes automatizados verificam que logs não vazam CPF.
5. **Storage privado + URLs assinadas** de curta duração. Planilha original apagada após o parse ou em prazo curto configurável.
6. **Multi-tenant:** o `tenant_id` vem do token e é injetado via `Depends`; todo repositório recebe uma sessão/consulta já escopada por tenant. Se o banco suportar, adicionar Row Level Security como segunda barreira. **Testes de isolamento entre tenants são obrigatórios.**
7. **Página pública de verificação** (`GET /verify/{public_code}`): mostra nome, curso, data e emissor. **Nunca** CPF.
8. **Retenção e exclusão:** `expires_at` em lotes/arquivos; job de limpeza; rotina de exclusão a pedido do titular.
9. **Rate limiting** por tenant e IP; limite de linhas e tamanho por upload; cotas por plano verificadas **antes** de enfileirar.
10. Validação de toda entrada com Pydantic; proteção contra CSV injection (células iniciadas por `=`, `+`, `-`, `@`) ao exportar relatórios.

## 7. Idempotência e confiabilidade

- A fila entrega **pelo menos uma vez**: todo consumer deve ser idempotente.
- Antes de renderizar uma linha, verifique se já está `done`. PDF gravado com chave determinística (`certs/{tenant}/{batch}/{certificate_id}.pdf`) e update condicional (`WHERE status <> 'done'`).
- Falha numa linha **não** derruba o chunk nem o lote: marcar `failed` com motivo (sem PII) e seguir.
- Retry com backoff para erros transitórios (storage, banco). Erros determinísticos (dado inválido) não fazem retry.
- Lote "preso": Cron periódico detecta lotes em `processing` sem progresso há X minutos e reenfileira os chunks pendentes.
- Endpoint e botão para **reprocessar só as linhas com falha** e baixar **CSV de erros** (sem CPF completo).
- Cancelamento: consumers checam `batches.status == canceled` antes de cada chunk.

## 8. Regras de renderização e custo (específicas de Python)

- Carregar template e fontes **uma vez por chunk**; registrar fontes TTF no reportlab uma única vez.
- Não importar `reportlab`/`pypdf`/`openpyxl` no bootstrap da API HTTP; importar **dentro** dos handlers de worker (reduz cold start).
- Sem `pandas`/`numpy` a menos que seja inevitável; manter o bundle enxuto com `excludeFiles`.
- Imagens (logo/assinatura) otimizadas no upload do template; embutir fontes com subsetting.
- Código síncrono dentro do consumer; dimensionar o chunk pelo **tempo medido** de renderização, com folga abaixo de `maxDuration` (começar com 50).
- Concorrência por tenant limitada para evitar monopólio da fila.
- ZIP em **streaming**: não montar tudo em memória. Se usar `/tmp`, respeitar o limite de armazenamento temporário da função **[VERIFICAR DOCS]**; para lotes grandes, gerar o ZIP em etapa própria lendo os PDFs do storage em partes.
- Futuro: geração **sob demanda** (PDF só ao baixar, com cache); manter a interface do `pdf_renderer` compatível.

## 9. API (rascunho)

```
POST   /uploads/sign                  -> URL assinada para upload direto
POST   /batches                       -> cria lote {template_id, source_file_key}
GET    /batches                       -> lista (paginada, por tenant)
GET    /batches/{id}                  -> status, progresso, contadores
GET    /batches/{id}/errors.csv       -> relatório de falhas
POST   /batches/{id}/retry-failed     -> reprocessa linhas com falha
POST   /batches/{id}/cancel
GET    /batches/{id}/download         -> URL assinada do ZIP
GET    /certificates/{id}/download    -> URL assinada do PDF
GET    /verify/{public_code}          -> público, sem PII
POST   /templates                     -> upload/definição de template + field_map
```

Mensagem de fila (exemplo):
`{"type": "render_chunk", "tenant_id": "...", "batch_id": "...", "row_from": 0, "row_to": 49}`

## 10. Plano B para processamento (decidir na Fase 0)

Se o suporte a Vercel Queues/Workflow em Python estiver imaturo ou limitado, **manter FastAPI e React na Vercel** e mover apenas o processamento pesado para um **worker dedicado** (Celery ou RQ + Redis, em Railway/Fly/ECS) consumindo a mesma lista de mensagens. O pacote `pdf_renderer` permanece idêntico. Registrar a decisão em ADR.

## 11. Observabilidade

- Log estruturado (JSON) com `batch_id`, `chunk_id`, duração e contagens. Sem PII.
- Métricas: tempo por chunk, taxa de falha, tamanho médio de PDF, certificados/minuto, custo estimado por lote.
- Alertas: lote sem progresso, taxa de falha acima do limiar, mensagens em dead-letter.

## 12. Testes

- **Unitários:** parser de planilha, validação de CPF/colunas, cripto/HMAC, `pdf_renderer` (extrair texto do PDF e comparar).
- **Integração:** fluxo completo de um lote pequeno; **reentrega duplicada de chunk** (deve ser inofensiva); falha parcial; cancelamento.
- **Segurança:** isolamento entre tenants; logs e payloads de fila sem CPF.
- **Carga:** lote de 10k linhas medindo tempo e custo para calibrar o tamanho do chunk.
- Dados de teste **sempre sintéticos**.

## 13. Plano de implementação por fases

**Fase 0 — Diagnóstico.** Analisar o código atual, listar lacunas versus este documento, decidir banco/ORM e Plano A vs B da seção 10. *Entrega: relatório + ADRs. Sem código de produção.*

**Fase 1 — Fundação.** Estrutura de pastas, config, schema do banco + Alembic, tenants/auth, criptografia de CPF (AES-GCM + HMAC), logging com redação. *Aceite: testes de cripto e de isolamento passando.*

**Fase 2 — Upload e validação.** URL assinada, parser CSV/XLSX, validação por linha, criação de `batches`/`certificates`, relatório de erros. *Aceite: planilha com linhas inválidas gera relatório correto, sem PII.*

**Fase 3 — Renderer.** Pacote `pdf_renderer`, templates com `field_map`, PDF a partir de uma linha. *Aceite: benchmark documentado (certificados/s) local.*

**Fase 4 — Processamento assíncrono.** Chunking, fila, consumers idempotentes, progresso no banco, finalização, retry, cancelamento, Cron de lotes presos. *Aceite: testes de reentrega duplicada e falha parcial passando.*

**Fase 5 — Entrega.** ZIP em streaming, downloads por URL assinada, notificação, verificação pública com `public_code`. *Aceite: lote de 10k linhas concluído dentro das metas.*

**Fase 6 — Produto.** Cotas e planos, rate limit, retenção/expurgo, exclusão sob demanda, painel de progresso no React com cliente gerado do OpenAPI.

**Fase 7 (opcional) — Otimização.** Geração sob demanda com cache; avaliar worker dedicado se o volume justificar.

## 14. Definição de pronto (cada fase)

- `ruff`, `mypy` e `pytest` passando.
- Nenhum PII em logs/payloads (verificado por teste).
- ADRs atualizados para decisões relevantes.
- README/docs atualizados.
- Resumo do que foi feito, riscos e próximos passos.
