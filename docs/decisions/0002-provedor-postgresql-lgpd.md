# ADR 0002: Provedor PostgreSQL Serverless e Conformidade LGPD

- **Status:** Aprovado (Supabase na região `sa-east-1` São Paulo)
- **Data:** 15/10/2026
- **Contexto:** Armazenamento relacional multi-tenant com alta concorrência de conexões de serverless functions e conformidade com a LGPD (Lei nº 13.709/2018).

---

## Contexto e Desafio

A especificação de arquitetura exige:
1. **PostgreSQL** com **pooler** para suportar a natureza efêmera das funções serverless da Vercel (onde dezenas de instâncias abrem conexões concorrentes).
2. **Conformidade com a LGPD:** Os dados tratados incluem nomes de alunos, CPFs (cifrados), dados de cursos e registros pedagógicos. A transferência internacional de dados exige cuidados adicionais; hospedar o banco no Brasil (região `sa-east-1` / São Paulo) minimiza atrito de conformidade legal e reduz a latência da API.
3. **Sem Vendor Lock-in:** O código deve usar **SQLAlchemy 2.x** padrão (driver `psycopg 3` ou `asyncpg`) com **Alembic**, sem depender de features proprietárias de uma única nuvem (como triggers exclusivos, extensões proprietárias ou RPCs do Supabase).

## Análise dos Provedores

| Critério | Neon Database | Supabase | AWS RDS PostgreSQL |
|---|---|---|---|
| **Região no Brasil (`sa-east-1` São Paulo)** | Sim (`aws-sa-east-1`) | Sim (`sa-east-1`) | Sim (`sa-east-1`) |
| **Connection Pooling Serverless** | Nativo (PgBouncer embutido nas portas 5432/6543) | Nativo (Supavisor embutido na porta 6543) | Requer RDS Proxy configurado à parte |
| **Modelo de Custo Inicial** | Tier gratuito generoso; scale-to-zero; cobrança por computação ativa | Tier gratuito generoso; planos fixos Pro | Custo mínimo mensal de instância + storage |
| **Integração Vercel** | Nativa (Vercel Postgres é provido por Neon) | Integração disponível via Marketplace | Requer configuração manual de VPC/IPs |
| **Portabilidade (Standard SQL)** | 100% Postgres padrão | Postgres padrão (possui Auth/Storage acoplados opcionais) | 100% Postgres padrão |

## Decisão

Recomendamos **Neon** (ou alternativamente **Supabase**) na região **AWS São Paulo (`sa-east-1`)**, adotando estritamente práticas agnósticas:

1. **Região:** O projeto será criado exclusivamente na região `sa-east-1` (São Paulo) para garantir data residency e baixa latência com a Vercel Function (`gru1` ou `iad1`).
2. **Connection Pooling:** Uso obrigatório da string de conexão com pooler (`-pooler` no hostname do Neon ou porta `6543` no Supabase) configurada no SQLAlchemy 2 via `NullPool` no lado do cliente Python (deixando o pool de conexões gerenciado centralmente pelo PgBouncer/Supavisor).
3. **Independência de Provedor:**
   - Nenhuma biblioteca cliente proprietária (como `@supabase/supabase-js` ou SDKs proprietários) será usada no backend.
   - Toda comunicação será via SQLAlchemy 2.x ORM e Alembic migrations.
   - Se amanhã for necessário migrar para RDS ou bare-metal Postgres, basta alterar a variável `DATABASE_URL`.

## Consequências

- **Positivas:**
  - Plena conformidade com a LGPD em relação à soberania territorial dos dados.
  - O pooler evita o erro clássico de esgotamento de conexões (`max_connections exceeded`) comum em picos de workers serverless.
  - Migrações via Alembic são executadas como parte do pipeline de CI/CD ou release hook, mantendo versionamento rigoroso de schema.
