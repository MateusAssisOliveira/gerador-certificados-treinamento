# Prompts prontos para o agente de IA (Python / FastAPI)

## 1. `CLAUDE.md` (ou `AGENTS.md`) na raiz do repositório

```markdown
# Regras do projeto

- Antes de qualquer tarefa, leia `docs/ARCHITECTURE-FASTAPI.md`. Ele é a fonte da verdade da arquitetura.
- Stack: FastAPI + Pydantic v2 + SQLAlchemy 2 + Alembic (Python 3.11+), React no front, deploy na Vercel.
- Trabalhe uma fase por vez e pare para revisão ao final de cada uma.
- Nunca coloque CPF ou dados pessoais em logs, filas, URLs, erros ou testes. Use dados sintéticos.
- Não use pandas, Chromium, Playwright nem Puppeteer.
- Onde o documento marcar [VERIFICAR DOCS], consulte a documentação oficial atual. Não invente APIs.
- Rode `ruff`, `mypy` e `pytest` antes de dar uma fase como concluída.
- Decisões relevantes vão em `docs/decisions/` como ADR curto.
```

## 2. Prompt da Fase 0 (diagnóstico, sem alterar código)

```text
Leia docs/ARCHITECTURE-FASTAPI.md por inteiro.

Execute APENAS a Fase 0 (diagnóstico). Não altere código de produção.

1. Analise o repositório atual e resuma: estrutura de pastas, rotas, modelos de dados,
   como o upload e a geração de certificados funcionam hoje, dependências e testes.
2. Compare com a especificação e liste as lacunas por prioridade
   (segurança/LGPD, idempotência, processamento em lote, custo, observabilidade).
3. Consulte a documentação atual da Vercel e responda: o Vercel Queues/Workflow
   funciona com Python? Quais os limites (duração, payload, concorrência, bundle)?
   Recomende Plano A (tudo na Vercel) ou Plano B (worker dedicado), com justificativa.
4. Recomende o provedor de Postgres considerando LGPD e região (ex.: Neon, Supabase, RDS),
   sem depender de recursos exclusivos de um provedor.
5. Proponha um plano de migração incremental, aproveitando o código existente.
6. Liste as perguntas que precisam de resposta minha antes da Fase 1.

Entregue o relatório em docs/diagnostico.md e os ADRs em docs/decisions/.
Pare ao final e aguarde minha aprovação.
```

## 3. Prompt-modelo para as demais fases

```text
Leia docs/ARCHITECTURE-FASTAPI.md e docs/diagnostico.md.

Execute APENAS a Fase <N> (<nome da fase>), respeitando os critérios de aceite
descritos no documento.

Regras:
- Mudanças pequenas e commits lógicos; não refatore o que está fora do escopo da fase.
- Escreva os testes da fase junto com o código.
- Antes de terminar, rode ruff, mypy e pytest e mostre o resultado.
- Confirme que nenhum CPF aparece em logs ou payloads (teste automatizado).

Ao final, entregue: resumo do que foi feito, decisões tomadas, riscos e próximos passos.
Pare e aguarde minha revisão.
```

## 4. Prompt para investigar custo/desempenho (use após a Fase 3 ou 4)

```text
Meça o desempenho do pacote pdf_renderer: gere 1.000 certificados sintéticos e informe
tempo total, certificados por segundo, uso de memória e tamanho médio do PDF.
Com base nisso, sugira o tamanho ideal de chunk para ficar com folga abaixo do
maxDuration da função e estime o custo por 10.000 certificados. Não altere a arquitetura;
apenas proponha ajustes e justifique com os números medidos.
```

## Como usar

1. Salve o spec como `docs/ARCHITECTURE-FASTAPI.md` e o trecho da seção 1 como `CLAUDE.md` na raiz.
2. Cole o prompt da Fase 0, leia o relatório e responda às perguntas.
3. Avance uma fase por vez com o prompt-modelo da seção 3.
