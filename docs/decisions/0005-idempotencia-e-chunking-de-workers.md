# ADR 0005: Idempotência de Workers, Chunking e Isolamento de Falhas

- **Status:** Aceito (Fase 4 - Processamento Assíncrono)
- **Data:** 15/10/2026
- **Contexto:** Execução assíncrona escalável e segura para geração de lotes de certificados na nuvem.

---

## Contexto e Desafio

Na arquitetura de mensageria assíncrona (seja Vercel Queues, SQS ou Redis), mensagens podem sofrer:
1. **Reentrega duplicada (at-least-once delivery):** O worker pode receber a mesma mensagem mais de uma vez em caso de timeout de rede ou reinício de função.
2. **Falhas pontuais em linhas específicas:** Um participante pode possuir campos incomuns, fontes ou dados com caracteres corrompidos. Uma falha numa linha não deve abortar o chunk nem travar o lote inteiro.
3. **Restrições de LGPD:** Mensagens em filas transitam por múltiplos componentes de infraestrutura e logs; portanto, **nenhum dado pessoal (CPF, nome, e-mail) pode trafegar nas mensagens de fila**.
4. **Lotes interrompidos:** Quedas inesperadas de infraestrutura podem deixar lotes em estado `processing` sem conclusão.

---

## Decisões Arquiteturais

### 1. Mensagens de Fila Estritamente Opaque e Sem PII
O contrato de payload para renderização de chunks trafega exclusivamente referências:
```json
{
  "type": "render_chunk",
  "tenant_id": "uuid",
  "batch_id": "uuid",
  "row_from": 0,
  "row_to": 49
}
```
Todos os dados sensíveis (nome, CPF criptografado em AES-256-GCM) são consultados pelo worker diretamente no PostgreSQL, escopados por `tenant_id`.

### 2. Dimensionamento dos Chunks (50 linhas)
Com base no benchmark medido na Fase 3 (256 cert/s em Python puro, ~3.9 ms por certificado), um chunk de 50 linhas leva cerca de **0.2 a 0.5 segundos** de renderização.
Isso deixa uma margem de segurança gigantesca perante o limite de 300 segundos da Vercel Function e permite retries rápidos e econômicos.

### 3. Idempotência e Concorrência Segura
A idempotência é garantida em três níveis:
- **Chave determinística no Storage:** `certs/{tenant_id}/{batch_id}/{certificate_id}.pdf`. Reprocessamento sobrescreve o arquivo sem criar lixo ou URLs duplicadas.
- **Filtro de busca no banco:** O worker só renderiza registros onde `status != 'done'`.
- **Condicional atômico:** Registros já processados são ignorados com custo mínimo.

### 4. Isolamento de Falhas por Linha
Se o renderizador falhar ao gerar o PDF de um registro específico:
- O erro é capturado pontualmente no loop do worker.
- O certificado é atualizado para `status = 'failed'` com mensagem de erro limpa (sem dados pessoais).
- As demais linhas do chunk continuam sua execução normalmente.
- O lote encerra como `completed_with_errors` (ou `failed` se 100% falharem).

### 5. Recuperação de Lotes Presos (Stuck Batches)
Um handler de cron periódico busca lotes em `processing` sem atualização há mais de 15 minutos e re-enfileira as fatias de linhas ainda pendentes (`status = 'pending'`).

---

## Consequências

- **Positivas:**
  - Garantia de que reentregas de mensagens não duplicam arquivos nem corrompem contadores.
  - Conformidade total com a LGPD nas filas.
  - Robustez perante falhas parciais em planilhas volumosas.
- **Mitigações:**
  - O banco de dados é a única fonte da verdade de status e contagens (`done`, `failed`, `pending`).
