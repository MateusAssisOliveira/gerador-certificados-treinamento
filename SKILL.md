---
name: ui-ux-design
description: Especialista em Design System, Dual-Theming (Light/Dark Mode), Acessibilidade WCAG e UI/UX Corporativo para o SaaS NR-1. Use sempre que for criar, auditar ou polir interfaces visuais, garantindo contraste pericial, estética executiva e tema claro impecável.
---

# 🎨 Skill: UI/UX Design System & Dual-Theming (SaaS NR-1)

Esta skill estabelece os padrões e o processo rigoroso de UI/UX, acessibilidade visual e calibração de temas (com ênfase especial no **Modo Claro Executivo**) para o **SaaS NR-1**.

---

## 🎯 Objetivo & Filosofia de Design

O SaaS NR-1 é um software B2B de missão crítica utilizado por **médicos do trabalho, engenheiros de segurança (SST), gestores de RH e diretores de empresas**.

* **Padrão de Referência**: O design deve ter nível de acabamento executivo comparável a plataformas modernas como *Stripe*, *Linear* e *Notion*.
* **Contraste Pericial (WCAG 2.1 AA/AAA)**: Em ambientes de escritório iluminados, tabelas com notas psicométricas, matrizes de risco e planos de ação devem ser legíveis instantaneamente, sem cansaço visual.
* **Dual-Theming Blindado**: O sistema possui dois temas canônicos. Qualquer tela deve ser 100% harmoniosa tanto no Dark quanto no Light, sem elementos "esquecidos" ou cores residuais do outro tema.

---

## 🏛️ As Duas Paletas Canônicas do Sistema

### 1. ☀️ Modo Claro Corporativo (`data-theme="verde_petroleo"`)
* **Fundo Geral (`--theme-bg`)**: `#F2F6F4` (Branco gelo sutil com leve toque mineral, reduz fadiga visual).
* **Superfícies Principais (`--theme-surface`)**: `#FFFFFF` (Cards, modais, painéis, cabeçalho e sidebar).
* **Sub-superfícies & Filtros (`--theme-surface-alt`)**: `#E4EEEA` (Fundo de tabelas de cabeçalho, caixas de busca, agrupadores).
* **Bordas & Divisores (`--theme-border`)**: `#CFE0D8` (Bordas nítidas, estruturadas e elegantes).
* **Cor Primária da Marca (`--theme-brand`)**: `#0F4C3A` (Verde petróleo profundo — transmite autoridade médica e SST).
* **Fundo de Destaque Suave (`--theme-brand-soft`)**: `#DCEBE5` (Hover de botões sutis, badges institucionais).
* **Texto Principal (`--theme-text`)**: `#142420` (Verde carvão ultra-escuro, contraste pericial > 8:1).
* **Texto Secundário / Muted (`--theme-text-muted`)**: `#5B6B64` (Cinza médio calibrado para metadados legíveis).

### 2. 🌙 Modo Escuro Padrão (`data-theme="mustard"`)
* **Fundo Geral**: `#101012`
* **Superfícies**: `#1B1B1E`
* **Sub-superfícies**: `#232327`
* **Bordas**: `#2E2E33`
* **Cor Primária**: `#E8A93B` (Mostarda/Âmbar NR-1)
* **Texto Principal**: `#F4F4F2`
* **Texto Secundário**: `#9C9CA3`

---

## 🚦 Cores Semânticas de Riscos em Fundo Claro (NR-1)

Nas matrizes e tabelas, **NUNCA** use texto branco sobre fundo claro ou cores fluorescentes que se percam no papel/tela.

| Nível de Risco | Fundo da Tag / Célula | Borda | Texto / Ícone |
| :--- | :--- | :--- | :--- |
| **Baixo** | `#DCFCE7` (Emerald 100) | `#86EFAC` (Emerald 300) | `#166534` (Emerald 800) |
| **Moderado** | `#FEF9C3` (Yellow 100) | `#FDE047` (Yellow 300) | `#854D0E` (Yellow 800) |
| **Alto** | `#FFEDD5` (Orange 100) | `#FDBA74` (Orange 300) | `#9A3412` (Orange 800) |
| **Crítico** | `#FEE2E2` (Red 100) | `#FCA5A5` (Red 300) | `#991B1B` (Red 800) |
| **🔒 Reservado** | `#F1F5F9` (Slate 100) | `#CBD5E1` (Slate 300) | `#475569` (Slate 600) |
| **[-] Sem Coleta** | `#F8FAFC` (Slate 50) | `#E2E8F0` (Slate 200) | `#94A3B8` (Slate 400) |

---

## 🔍 Checklist de Auditoria Visual de Componentes

Ao inspecionar ou construir uma tela, execute este checklist de verificação:

### 1. Inputs, Selects e Áreas de Busca
- [ ] Fundo do input é `#FFFFFF` no Light Mode (nunca preto, chumbo ou cinza escuro residual).
- [ ] O texto digitado é `#142420` (quase preto).
- [ ] O placeholder é `#71827A` (visível, sem parecer desabilitado).
- [ ] A borda padrão é `#CFE0D8` e no `:focus` ganha anel sutil verde petróleo (`ring-2 ring-[#0F4C3A]/20 border-[#0F4C3A]`).
- [ ] Ícones de busca (`<Search />`) e setas de dropdown têm cor nítida (`text-[#5B6B64]`).

### 2. Modais, Diálogos e Gavetas
- [ ] Fundo do modal é `#FFFFFF`.
- [ ] O backdrop (máscara de fundo) usa opacidade controlada (`bg-[#142420]/40 backdrop-blur-sm`).
- [ ] O botão de fechar (`<X />`) tem bom contraste e hover elegante (`hover:bg-[#E4EEEA] text-[#5B6B64]`).
- [ ] O rodapé do modal tem fundo `#F7FAF8` e borda superior `#E4EEEA` separando as ações.

### 3. Tabelas e Listas de Dados
- [ ] Cabeçalhos (`<thead>`) têm fundo `#E4EEEA` com texto em caixa alta ou semibold `#142420`.
- [ ] Linhas (`<tr>`) possuem separador `#E4EEEA` e efeito hover sutil (`hover:bg-[#F7FAF8]`).
- [ ] Paginação e filtros no rodapé estão legíveis, sem botões invisíveis.

### 4. Botões de Ação
- [ ] **Primário**: Fundo `#0F4C3A` com texto branco `#FFFFFF` e hover `#145E49`.
- [ ] **Secundário**: Fundo `#FFFFFF`, borda `#CFE0D8`, texto `#142420` e hover `#F2F6F4`.
- [ ] **Destrutivo / Alerta**: Fundo `#FEF2F2`, borda `#FECACA`, texto `#DC2626` e hover `#FEE2E2`.

### 5. Ícones e Tipografia
- [ ] **Zero Emojis de Teclado**: Use estritamente `<LucideIcon className="w-X h-X" />`.
- [ ] Evitar `text-white` solto sem verificar o contexto de fundo. Se um card no dark usa `text-white`, no light deve ser `text-[#142420]`.

---

## 🚀 Roteiro de Execução de Melhorias (Runbook)

Quando solicitado para auditar e melhorar uma tela:
1. **Identificar a Rota / Arquivo**: Localizar o arquivo da página (`src/app/(dashboard)/.../page.tsx`) e seus componentes filhos em `@/components/...`.
2. **Varredura de Hardcodes Escuros**:
   - Procurar por classes utilitárias que forçam tema escuro incondicionalmente: `bg-slate-900`, `bg-zinc-950`, `text-white`, `border-slate-800`, etc.
   - Ajustar para que respeitem as variáveis CSS semânticas ou adicionar os modificadores do tema claro (`html[data-theme="verde_petroleo"]`).
3. **Verificação Visual no Navegador**:
   - Rodar o navegador de teste em `http://localhost:3000`.
   - Alternar para o tema claro e capturar screenshot da área de trabalho.
   - Avaliar nitidez, hierarquia tipográfica e usabilidade.
4. **Validação da Compilação**:
   - Garantir que `npx tsc --noEmit` continue passando com Exit Code 0.
   - Confirmar ausência de regressões no tema escuro original.
