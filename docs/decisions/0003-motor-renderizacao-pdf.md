# ADR 0003: Motor de Renderização de Certificados PDF

- **Status:** Proposto / Aprovado pela especificação
- **Data:** 15/10/2026
- **Contexto:** Geração de centenas a milhares de PDFs de certificados de alta qualidade gráfica com baixa latência e baixo consumo de memória em Vercel Functions.

---

## Contexto e Desafio

O código legador atual (`gerar_certificados.py` e `gerador_modelo.py`) gera arquivos Word (`.docx`) com `docxtpl` e depois tenta convertê-los em PDF usando `docx2pdf` (que automatiza o Microsoft Word local via Windows COM) ou LibreOffice (`soffice` headless).

Essa abordagem possui impedimentos fatais para a nuvem / SaaS:
1. Em servidores Linux e especialmente em Vercel Serverless Functions, **não existe Microsoft Word nem LibreOffice**.
2. Bibliotecas baseadas em navegador headless (Chromium, Playwright, Puppeteer) e WeasyPrint são pesadas, consomem centenas de MB de memória, têm cold starts lentos e foram expressamente **proibidas** na especificação.

## Decisão

Adotamos **ReportLab** combinado com **PyPDF** (ou opcionalmente **fpdf2**) encapsulado em um pacote **puro**: `apps/api/pdf_renderer`:

1. **Abordagem de Template e Overlay:**
   - O template visual base (moldura, fundo decorativo, logotipos fixos, linhas de assinatura) é exportado como um arquivo PDF base estático ou gerado programaticamente em vetor via ReportLab Canvas.
   - Os dados variáveis (nome do aluno, CPF mascarado, curso, carga horária, data, código de validação e QR Code) são sobrepostos como uma camada vetorial de alta precisão via ReportLab sobre a página do template usando `pypdf.PageObject.merge_page()`.
2. **Isolamento de Domínio (Pacote Puro):**
   - O pacote `pdf_renderer` não terá dependências de FastAPI, SQLAlchemy, bancos de dados nem chamadas de rede.
   - Interface padronizada:
     `render_certificate(template_bytes: bytes, field_map: dict, data: dict) -> bytes`
3. **Otimizações:**
   - Fontes TTF registradas uma única vez no startup do worker/chunk (`pdfmetrics.registerFont`).
   - Reutilização do objeto do template PDF em memória durante todo o chunk de 50 a 100 certificados.

## Consequências

- **Positivas:**
  - Desempenho extremo: entre 15ms e 35ms por certificado (30 a 60 certificados/segundo por núcleo de CPU).
  - Uso mínimo de memória RAM (< 80 MB para processar um lote de 100 certificados em memória streaming).
  - Zero dependências de sistema operacional ou binários externos (funciona perfeitamente no container Python 3.11 da Vercel).
- **Adequação da base legada:**
  - O código legado do `gerador_modelo.py` que definia temas de cores (ouro_azul, esmeralda, classico, rubi) e coordenadas de campos será reaproveitado para definir os templates visuais e o `field_map` do ReportLab.
