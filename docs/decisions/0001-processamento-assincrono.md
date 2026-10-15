# ADR 0001: Arquitetura de Processamento Assíncrono de Lotes

- **Status:** Proposto (Fase 0 - Diagnóstico)
- **Data:** 15/10/2026
- **Contexto:** SaaS de geração de certificados em lote (de centenas a dezenas de milhares por lote)

---

## Contexto e Desafio

A geração de certificados em lote é intensiva em CPU e I/O. O sistema atual executa a geração de forma síncrona dentro da requisição HTTP (`POST /api/gerar`), o que é inviável na nuvem e trava conexões.

A especificação de arquitetura prevê duas alternativas:
- **Plano A:** Tudo na Vercel (Vercel Functions + Vercel Queues / Vercel Workflows em Python).
- **Plano B:** FastAPI e React na Vercel + Worker dedicado (Celery ou RQ + Redis em Railway/Fly.io/ECS).

Precisamos avaliar o suporte atual da Vercel para Python e decidir o modelo ideal.

## Investigação Técnica da Vercel (Python)

1. **Vercel Queues:**
   - Suporte oficial a Python disponível via pacotes `vercel` e `vercel-queue` (com suporte tipado via Pydantic: `vercel-queue[typed]`).
   - Paradigmas: Publicação (`await send("topic", payload)`) e consumo via decorador `@subscribe(topic="topic")`. Suporta modo push (Vercel Functions) e modo poll (workers externos).
   - Limites do Vercel Queues:
     - **Payload máximo por mensagem:** 100 MB (muito além dos KB necessários para mensagens que só trafegam IDs).
     - **Unidade de faturamento:** Chunks de 4 KiB.
     - **Retenção de mensagens (TTL):** 60 segundos a 7 dias (padrão: 24h).
     - **Visibility Timeout:** até 60 minutos (padrão: 60s).
     - **Concorrência:** Ilimitada por padrão, configurável por consumer group.

2. **Vercel Functions (Python Runtime):**
   - **Timeout (`maxDuration`):** Padrão de 15s a 300s em contas Pro, configurável até 800s/900s (e até 1800s com Fluid Compute).
   - **Limite de Payload HTTP:** 4.5 MB para requisição e resposta direta na API (exige upload de planilhas direto ao Storage via URL assinada).
   - **Tamanho de Bundle:** 500 MB descompactado (adequado, já que não usaremos Chromium, Playwright nem pandas).

3. **Cálculo de Desempenho e Chunking:**
   - O novo renderer baseado em `reportlab` + `pypdf` gera de 30 a 60 certificados por segundo em Python puro (média de 15 a 30 ms por certificado).
   - Um chunk de 50 certificados consome aproximadamente **1.0 a 1.5 segundo** de CPU.
   - Isso fica ordens de magnitude abaixo do `maxDuration` de 300s da Vercel Function.

## Decisão

Adotamos uma **Estratégia Híbrida Progressiva (Plano A Inicial com Desacoplamento para Plano B)**:

1. **Fase Inicial (Plano A):**
   - Publicação e orquestração de chunks via **Vercel Queues** (`vercel-queue` / `vercel`).
   - Consumers rodando como Vercel Functions assíncronas com `@subscribe`.
   - Mensagens de fila estritamente leves e sem PII: `{"type": "render_chunk", "tenant_id": "...", "batch_id": "...", "row_from": 0, "row_to": 49}`.
   - O banco de dados (PostgreSQL) permanece como a fonte da verdade do progresso e status de cada linha.

2. **Desacoplamento Rigoroso (Garantia de Plano B a Custo Zero):**
   - O pacote `pdf_renderer` será uma biblioteca pura (sem dependência de FastAPI, SQLAlchemy ou Vercel).
   - O handler de consumo de fila receberá uma abstração de interface de mensagens.
   - Se a operação escalar para centenas de milhares de certificados simultâneos ou houver necessidade de processamento contínuo sem cold start, basta subir um container com Celery/RQ + Redis em Railway ou Fly.io apontando para o mesmo PostgreSQL e `pdf_renderer`, sem alterar o código de domínio.

## Consequências

- **Positivas:**
  - Infraestrutura 100% serverless no início: zero servidores fixos para manter e custo proporcional estritamente ao uso.
  - Chunks de 50 certificados garantem tempo de execução seguro (< 2s) e excelente granularidade de retry em caso de falha isolada.
  - Total conformidade com a restrição de "Sem PII em filas".
- **Riscos e Mitigações:**
  - *Risco:* Vercel Queues Python está em evolução/beta.
  - *Mitigação:* O Vercel Queues suporta modo de consumo push ou poll e o código é abstraído em worker handlers, facilitando troca imediata para SQS ou Redis caso necessário.
