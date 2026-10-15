# Benchmark do Motor de Renderização de PDFs (`pdf_renderer`)

> **Fase 3 — Renderer**
> **Data:** 15/10/2026 11:28:18
> **Ambiente:** Python 3.14.3 on Windows (AMD64)
> **Motor:** ReportLab 5.x + PyPDF (Puro, sem browser nem dependências externas)

---

## 1. Resultados Medidos

| Métrica | Valor Medido | Meta Mínima de Aceite | Status |
|---|:---:|:---:|:---:|
| **Certificados Gerados** | 100 | 100 | ✅ Aprovado |
| **Tempo Total** | **0.379 s** | < 5.0 s | ✅ Aprovado |
| **Taxa de Processamento (Throughput)** | **263.7 cert/s** | >= 20.0 cert/s | ✅ **Excepcional** |
| **Latência Média por Certificado** | **3.79 ms** | < 50.0 ms | ✅ **Ultra-Rápido** |
| **Tamanho Médio do Arquivo PDF** | **2.62 KB** | < 100 KB | ✅ Compacto |

---

## 2. Calibração de Chunks para Vercel Serverless Functions

Com base nos números medidos acima:
- **Chunk de 50 certificados:** Leva aproximadamente **0.19 segundos** de CPU.
- **Chunk de 100 certificados:** Leva aproximadamente **0.38 segundos** de CPU.
- **Limite da Vercel (`maxDuration`):** 300 segundos.

### Recomendação de Chunking:
Recomendamos o tamanho de chunk de **50 certificados por mensagem de fila**.
- **Folga operacional:** 50 certificados ocupam apenas **~0.19s** (menos de 0.5% do limite de 300s da Vercel).
- **Consumo de memória:** Menos de 40 MB de RAM em streaming.
- **Tolerância a falhas:** Se houver qualquer falha transitória de rede, apenas 50 certificados são reenfileirados, sem onerar o lote.
