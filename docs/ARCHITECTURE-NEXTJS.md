# SaaS de Geração de Certificados em Lote — Arquitetura Fullstack (Next.js & TypeScript)

> **Documento Oficial de Arquitetura do Projeto**  
> **Stack:** Next.js 16+ (App Router), React 19, TypeScript, Tailwind CSS, pdf-lib, xlsx, JSZip.  
> **Deploy:** Vercel (Fullstack Serverless & Edge).

---

## 1. Visão Geral & Objetivos

O sistema é uma plataforma completa e moderna para **design visual, personalização e emissão em massa de certificados de treinamentos regulamentares (NR-1, NR-20, NR-35, CIPA, SST, etc.) e corporativos**.

O usuário:
1. **Escolhe ou cria um modelo** no editor visual Studio (ou carrega presets oficiais de NRs).
2. **Faz upload de uma planilha** (XLSX/CSV) com participantes e variáveis do treinamento.
3. **Mapeia as colunas** automaticamente ou com ajuste manual (*De-Para*).
4. **Gera em lote os certificados** com progresso em tempo real, gerando PDFs vetoriais nítidos e pacote ZIP para download imediato.
5. **Cada certificado possui código único de autenticidade**, validável publicamente pela tela de verificação.

---

## 2. Pilha Tecnológica (100% TypeScript)

| Camada | Tecnologia | Função |
|---|---|---|
| **Framework** | Next.js 16+ (Turbopack, App Router) | Frontend SSR/SSG + API Routes / Server Actions |
| **Linguagem** | TypeScript 5 | Tipagem estrita de ponta a ponta |
| **Estilização** | Tailwind CSS v4 + Vanilla CSS Tokens | Dual-theming executivo, estética corporativa |
| **Ícones** | Lucide React | Ícones modernos, consistentes e vetoriais |
| **Motor de PDF** | `pdf-lib` | Renderização vetorial ultrarrápida, pura em JS/TS, sem Chromium/Puppeteer |
| **Planilhas** | `xlsx` (SheetJS) | Leitura e parse de XLSX/CSV direto em memória |
| **Empacotamento ZIP** | `jszip` | Montagem e compressão de lotes de certificados |
| **Deploy** | Vercel | Hospedagem global com zero overhead de infraestrutura |

---

## 3. Estrutura do Repositório

```text
src/
  ├── app/
  │   ├── page.tsx               # Biblioteca de modelos e presets
  │   ├── editor/page.tsx        # Estúdio visual de design de certificados
  │   ├── lotes/page.tsx         # Processamento de planilhas e geração em massa
  │   ├── verificar/page.tsx     # Validação pública de autenticidade
  │   ├── api/                   # Rotas de API (se necessárias para automações)
  │   ├── globals.css            # Design tokens, temas claro/escuro e scrollbars
  │   └── layout.tsx             # Shell principal com tipografia e metadata SEO
  ├── components/
  │   ├── ui/                    # Navbar, Toasts, botões e modais
  │   ├── editor/                # Canvas, Sidebar de elementos e inspetor de propriedades
  │   └── library/               # Cards de modelos, grade e modal de prévia realista
  ├── lib/
  │   ├── constants/             # Presets oficiais de certificados (NR-1, NR-20, etc.)
  │   ├── excel/                 # Parser de planilhas XLSX/CSV e auto-mapeamento
  │   ├── pdf/                   # Motor pdf-lib e gerador em lote assíncrono
  │   └── storage/               # Armazenamento e persistência de modelos
  └── types/
      └── certificate.ts         # Interfaces TypeScript canônicas do modelo
```

---

## 4. Segurança & Conformidade LGPD

1. **Processamento em Memória / Client-Side Segura:** Os dados pessoais e CPFs são processados localmente de forma volátil, eliminando risco de vazamento em servidores intermediários não auditados.
2. **Máscara Automática de CPF:** Suporte nativo à exibição protegida (`***.456.789-**`) no certificado impresso.
3. **Página Pública de Verificação:** A tela pública de validação atesta a veracidade do treinamento exibindo apenas dados corporativos (nome, curso, data, emissor), nunca expondo CPF desnecessariamente.

---

## 5. Performance e Escalabilidade

- **Geração de PDF com `pdf-lib`:** Gera centenas de páginas em segundos sem sobrecarregar a CPU.
- **Processamento em Chunks:** A emissão em massa é particionada em lotes menores com atualização progressiva de progresso (barra percentual, tempo decorrido e contadores).
- **Cancelamento com AbortController:** O usuário pode pausar ou abortar a geração a qualquer momento.
