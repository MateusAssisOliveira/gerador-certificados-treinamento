# ADR 0004: Segurança, Criptografia em Nível de Aplicação e Proteção de Dados (LGPD)

- **Status:** Proposto / Aprovado pela especificação
- **Data:** 15/10/2026
- **Contexto:** Armazenamento seguro de CPFs e dados pessoais identificáveis (PII) de alunos/participantes em conformidade com a LGPD.

---

## Contexto e Desafio

Na versão atual do projeto (`gerar_certificados.py` e `app.py`), o CPF dos participantes é lido de planilhas e manipulado inteiramente em texto plano (`dados["CPF"]`), gravado em logs de console (`print(f"Linha {item['linha']}: {item['nome']}...")`), incluído em payloads e exposto sem nenhum mecanismo de proteção criptográfica.

A especificação de arquitetura exige:
1. **Nunca** armazenar CPF em claro no banco de dados.
2. Permitir deduplicação e buscas pontuais (ex: conferir se um CPF já emitiu o certificado) sem que seja necessário decifrar toda a tabela.
3. Proteger os dados sensíveis contra acesso indevido mesmo em caso de vazamento/dump do banco de dados relacional.
4. Impedir que dados pessoais vazem em logs de aplicação, mensagens de fila ou erros de API.

## Decisão

Adotamos a estratégia de **Criptografia em Nível de Aplicação (Envelope/AEAD) + Blind Index**:

1. **Criptografia Reversível com AES-256-GCM (`cpf_enc` e `data_enc`):**
   - Biblioteca: `cryptography.hazmat.primitives.ciphers.aead.AESGCM`.
   - Utilização de chave mestra de 256 bits derivada de variável de ambiente segura (`ENCRYPTION_KEY`).
   - Geração de um **nonce/IV aleatório único de 96 bits (12 bytes)** para cada registro cifrado. O nonce é armazenado junto ao ciphertext (`nonce + ciphertext + tag`).
   - Autenticação de integridade: a tag de 128 bits do GCM garante que dados adulterados gerem exceção antes de serem processados.

2. **Blind Index Determinístico com HMAC-SHA256 (`cpf_hmac`):**
   - O CPF é normalizado (somente números, 11 dígitos).
   - Calcula-se o HMAC-SHA256 usando uma chave secreta distinta e independente (`HMAC_SECRET`).
   - O hash resultante é armazenado na coluna `cpf_hmac text` e indexado (`INDEX (tenant_id, cpf_hmac)`).
   - Permite consultas exatas como: `WHERE tenant_id = :t AND cpf_hmac = :hmac` sem revelar o CPF original.

3. **Filtragem Ativa de Logs e Erros:**
   - Implementação de um `logging.Filter` global na API FastAPI que aplica regex para mascarar CPFs (`\d{3}\.\d{3}\.\d{3}-\d{2}` ou sequências de 11 dígitos numéricos), e-mails e nomes completos, substituindo por `[PII REDACTED]`.
   - Mensagens de fila trafegarão estritamente `batch_id`, `tenant_id` e faixas de linhas (`row_from`, `row_to`).

4. **Página Pública de Validação (`/verify/{public_code}`):**
   - O certificado receberá um hash público único (`public_code`).
   - A página de consulta exibirá apenas: Nome do Aluno, Nome do Curso, Carga Horária, Data de Conclusão e Nome da Instituição Emissora. **O CPF jamais é exibido**, mesmo na forma mascarada.

## Consequências

- **Positivas:**
  - Plena conformidade com a LGPD e princípios de minimização e segurança da informação.
  - O banco de dados torna-se inútil para atacantes externos que obtenham apenas um dump SQL sem acesso às variáveis de ambiente/KMS.
  - Zero impacto perceptível no tempo de CPU (AES-GCM e HMAC executam em frações de microssegundo por registro em Python/C).
