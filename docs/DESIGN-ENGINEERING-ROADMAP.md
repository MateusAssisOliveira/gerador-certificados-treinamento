# 🏛️ Plano de Ação & Direções de Design Engineering

> **Projeto:** SaaS de Geração de Certificados em Lote (`gerador-certificados-treinamento`)  
> **Status:** Fases 1 a 5 concluídas (Ambiente configurado, auditado e diagnosticado). Aguardando escolha da Direção de Arte para início da Fase 6.  
> **Data:** 23 de Outubro de 2026

---

## 1. O Que Foi Realizado Até Agora

### ✅ Fase 1 — Auditoria do Ambiente & Código
* **Stack Identificada:** Next.js 16.4.2 (App Router, Turbopack), React 19.3.0, TypeScript 5, Tailwind CSS v4, `pdf-lib` puro (sem Chromium/Puppeteer).
* **Integridade Validada:** `npm run lint` (0 erros) e `npm run build` (build estático 100% aprovado).
* **Regras do Projeto Respeitadas:** Stack 100% TypeScript, geração de PDFs em memória/vetorial, conformidade à LGPD.

### ✅ Fase 2 — Instalação e Estruturação das Skills
Criada a estrutura nativa de customização do Google Antigravity em `.agents/skills/`:
1. **`Taste`** ([.agents/skills/taste/SKILL.md](file:///c:/PYTHON/gerador-certificados-treinamento/.agents/skills/taste/SKILL.md)): Direção de arte, identidade visual autoral e combate ativo a "AI slop".
2. **`Impeccable`** ([.agents/skills/impeccable/SKILL.md](file:///c:/PYTHON/gerador-certificados-treinamento/.agents/skills/impeccable/SKILL.md)): Auditoria técnica, refinamento tipográfico, consistência geométrica de espaçamentos e acessibilidade WCAG AA.
3. **`Emil Design Engineering`** ([.agents/skills/emil-design-eng/SKILL.md](file:///c:/PYTHON/gerador-certificados-treinamento/.agents/skills/emil-design-eng/SKILL.md)): Microinterações com feedback tátil (`:active` scale), curvas de aceleração `cubic-bezier` e física de transição.
4. **`UI/UX Design`** ([.agents/skills/ui-ux-design/SKILL.md](file:///c:/PYTHON/gerador-certificados-treinamento/.agents/skills/ui-ux-design/SKILL.md)): Migração da skill do projeto para padrões de conformidade NR e dual-theming executivo.

### ✅ Fase 3 — Configuração dos Servidores MCP
* **Playwright MCP:** Configurado em [.agents/mcp_config.json](file:///c:/PYTHON/gerador-certificados-treinamento/.agents/mcp_config.json) via `@playwright/mcp@latest`.
* **Figma MCP:** Em *standby*, pronto para ser conectado quando houver arquivo de design.

### ✅ Fase 4 — Fluxo e Ordem de Atuação
Estabelecida a cadeia de execução:
$$\text{Taste (Direção de Arte)} \longrightarrow \text{Impeccable (Refinamento \& Grid)} \longrightarrow \text{Emil (Microinterações)} \longrightarrow \text{Playwright (QA Visual)}$$

### ✅ Fase 5 — Diagnóstico Visual com Capturas Reais
* Aplicação executada em `http://localhost:3000` e inspecionada via automação de browser (desktop e mobile).
* **Gravação gerada:** `visual_audit_1792782838819.webp`.
* **Vícios de IA Diagnosticados:**
  1. *Glow radial azul/ciano artificial* no fundo (estética de template genérico sem justificativa).
  2. *Cards brancos soltos* no fundo preto (choque de luminância e falta de refinamento nas superfícies).
  3. *Inconsistência de botões e CTAs* (mistura desordenada de degradês laranja/azul, verde fosco e cinza).
  4. *Excesso de badges/pílulas flutuantes* sem hierarquia clara.
  5. *Monotonia tipográfica* dependente da fonte `Inter` sem tensão editorial.
  6. *Ergonomia mobile deficiente* no editor de certificados (necessidade de drawer/bottom-sheet).

---

## 2. Decisão Pendente: As 3 Direções Visuais (Taste)

Para retomarmos o trabalho, escolha uma das opções abaixo:

### 🏛️ Opção 1: "Sovereign Heritage" (Chancela de Estado & Autoridade Clássica)
* **Conceito:** Solenidade jurídica de títulos públicos de alta segurança, diplomas centenários de academias europeias e documentos cartoriais solenes.
* **Tipografia:** Títulos em *Cinzel* / *Playfair Display* lapidar + corpo em *Plus Jakarta Sans* / *Inter* neutro + dados em *JetBrains Mono*.
* **Paleta:** Fundo Ardósia Mineral (`#0B0D11`), Acentos em Ouro Velho Pericial (`#C5A059`) e Verde Petróleo Oficial (`#0F4C3A`), superfícies com texturas nítidas e bordas finas de 1px.
* **Sensação:** Máxima credibilidade institucional, peso formal incontestável, ideal para certificados oficiais de NRs e SST.

---

### ⚡ Opção 2: "Linear Forensic" (Engenharia de Alta Precisão & Dark Tech Monolítico)
* **Conceito:** Inspirado na densidade informacional e elegância técnica de softwares como *Linear*, *Vercel Dashboard* e consoles industriais modernos.
* **Tipografia:** Tipografia técnica geométrica ultra-nítida (*Space Grotesk* ou *Geist Sans*) + *JetBrains Mono* para metadados e hashes em alta densidade.
* **Paleta:** Fundo Obsidiana Puro (`#08090A`), divisores micrométricos (`rgba(255, 255, 255, 0.08)`), acentos em Âmbar/Mostarda NR-1 (`#E8A93B` / `#F59E0B`).
* **Sensação:** Velocidade extrema, ergonomia cirúrgica para operadores, zero firulas e estética moderna de console.

---

### 🎨 Opção 3: "Editorial Atelier" (Design Suíço & Arquitetura Visual Contemporânea)
* **Conceito:** Inspirado no rigor da tipografia suíça (*International Typographic Style*) e publicações arquitetônicas de vanguarda (*Kinfolk*, *Awwwards SOTD*).
* **Tipografia:** Forte contraste de escala — títulos expressivos e assimétricos (*Syne* ou *Plus Jakarta Sans Bold*) com entrelinha compacta + corpo refinado (`text-balance`).
* **Paleta:** Dual-tone orgânico — Ardósia verde-escura profunda no Dark (`#0E1312`) e Branco Marfim Mineral no Light (`#F3F6F4`), acentos em Terracota (`#C05638`) e Verde Floresta (`#124334`).
* **Sensação:** Sofisticação contemporânea e autoral, distanciando completamente o produto de qualquer template de software padrão.

---

## 3. Roteiro de Execução (Fase 6 — O Que Vamos Fazer ao Voltar)

Assim que a direção for escolhida, executaremos os seguintes passos sem quebrar funcionalidades:

### Etapa 6.1 — Criação do `DESIGN.md` e Tokens Globais
- [ ] Criar o arquivo canônico [DESIGN.md](file:///c:/PYTHON/gerador-certificados-treinamento/DESIGN.md) documentando a paleta, tipografia, regras de bordas, superfícies e componentes.
- [ ] Atualizar [src/app/globals.css](file:///c:/PYTHON/gerador-certificados-treinamento/src/app/globals.css) com os novos tokens CSS semânticos, curvas cúbicas do Emil Kowalski (`--ease-out`, `--ease-spring`) e remover o glow azul neon artificial.

### Etapa 6.2 — Redesign do Shell & Navbar
- [ ] Refatorar a barra de navegação em [src/components/ui/Navbar.tsx](file:///c:/PYTHON/gerador-certificados-treinamento/src/components/ui/Navbar.tsx):
  - Limpar o excesso de badges dispersos.
  - Padronizar hierarquia de botões (Ação Primária, Secundária e Utilitária).
  - Adicionar feedback tátil com `scale(0.97)` no clique e transições de 140ms.

### Etapa 6.3 — Redesign da Biblioteca de Modelos (Página Inicial `/`)
- [ ] Refatorar [src/components/library/TemplateCard.tsx](file:///c:/PYTHON/gerador-certificados-treinamento/src/components/library/TemplateCard.tsx) e [src/components/library/TemplateGrid.tsx](file:///c:/PYTHON/gerador-certificados-treinamento/src/components/library/TemplateGrid.tsx):
  - Eliminar o choque de luminância dos cards brancos sobre fundo preto.
  - Integrar os cartões com molduras de precisão e tipografia refinada.
  - Melhorar filtros e campo de busca.

### Etapa 6.4 — Redesign do Studio Editor (`/editor`)
- [ ] Refatorar a barra de ferramentas superior e os painéis de propriedades.
- [ ] Elevar o contraste e a régua de alinhamento visual do canvas do certificado.
- [ ] Otimizar ergonomia mobile com painel colapsável em gaveta (*bottom sheet*).

### Etapa 6.5 — Refinamento das Páginas `/lotes` e `/verificar`
- [ ] Polir o fluxo de upload de planilhas e barra de progresso em tempo real.
- [ ] Aplicar selo pericial e estética de documento verificado na página pública.

### Etapa 6.6 — QA Visual & Validação Final
- [ ] Rodar testes no navegador com Playwright para comparar capturas antes e depois.
- [ ] Garantir 100% de aprovação em `npm run lint` e `npm run build`.

---

## 4. Instruções para Commitar Agora

No seu terminal, você pode executar com tranquilidade:
```powershell
git add .agents/ docs/DESIGN-ENGINEERING-ROADMAP.md
git commit -m "feat(design-engineering): configurar skills taste, impeccable, emil e roadmap visual"
git push
```
*(O dev server pode ser interrompido com `Ctrl+C` no terminal quando desejar).*
