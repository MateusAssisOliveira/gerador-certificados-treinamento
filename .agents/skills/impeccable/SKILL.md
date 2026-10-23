---
name: impeccable
description: >-
  Auditoria rigorosa de design, refinamento tipográfico, consistência espacial,
  acessibilidade (WCAG AA/AAA) e acabamento profissional de interfaces (craft floor).
  Utilize esta skill após a escolha da direção de arte para polir componentes,
  eliminar desalinhamentos, calibrar paddings/gaps, ajustar responsividade e garantir acabamento de elite.
---

# 📐 Skill: Impeccable (Visual Refinement & Quality Floor)

Esta skill estabelece o **padrão de refinamento técnico e acabamento artesanal de interface** (Craft Floor), garantindo que a execução do código de design alcance nível de excelência profissional internacional.

---

## 🎯 Princípios do Acabamento Impeccable

1. **Craft Floor (Piso de Qualidade Inegociável)**:
   * **Zero elementos flutuando sem âncora**: Toda borda, divisória e painel deve ter alinhamento geométrico perfeito com o grid pai.
   * **Sem preto ou cinza neutro sem matiz**: Tons escuros devem ter nuance mineral, ardósia ou sépia sutil. Tons claros devem ter calor e conforto de leitura.
   * **Sem texto cinza de baixo contraste sobre fundos coloridos**: Garanta ratio mínimo de contraste de 4.5:1 (WCAG AA) para texto normal e 7:1 para dados técnicos críticos.
   * **Sem quebras de texto desajeitadas**: Use `balance` ou `pretty` para títulos (`text-balance`) para evitar palavras órfãs.

2. **Régua Tipográfica Rigorosa**:
   * Hierarquia clara de escala: Tamanhos de fonte devem seguir uma progressão geométrica intencional (ex.: 12px / 14px / 16px / 20px / 28px / 40px / 56px).
   * Altura de linha proporcional: Títulos grandes usam `leading-tight` ou `leading-[1.1]`. Textos de leitura usam `leading-relaxed` (1.5 a 1.6).
   * Kerning / Tracking: Títulos em caixa alta usam `tracking-wider` ou `tracking-widest`. Textos de corpo usam `tracking-normal`.

3. **Espaçamento e Ritmo Visual (Spacing System)**:
   * Uso consistente de múltiplos de 4px e 8px (`gap-2`, `gap-4`, `p-6`, `p-8`).
   * Relação interna vs. externa: O padding interno de um container deve ser proporcional ou menor do que o gap entre seções irmãs.
   * Alinhamento vertical de ícones e textos (`items-center` com calibração óptica quando necessário).

4. **Responsividade Sem Gambiarras**:
   * Desktop (> 1280px): Distribuição ergonômica sem esticar campos de formulário para larguras absurdas (`max-w-7xl`, `max-w-5xl`).
   * Tablet (768px - 1024px): Adaptação de grades de 3 colunas para 2 colunas com manutenção de legibilidade.
   * Mobile (< 640px): Ações primárias fixas ou de toque confortável (mínimo de 44x44px para áreas de clique), modais que se convertem em gavetas inferiores (*drawers*), e tipografia escalada proporcionalmente.

---

## 🔍 Checklist de Auditoria Impeccable

Antes de finalizar qualquer tela ou componente:
- [ ] O contraste de cores passa na validação WCAG 2.1 AA?
- [ ] O formulário ou botão tem estados visíveis e claros de `:hover`, `:focus-visible` e `:disabled`?
- [ ] As bordas possuem espessura uniforme (1px consistente) e cores semânticas nítidas?
- [ ] Há redundância de molduras (ex.: um card com borda dentro de outro card com borda e sombra)? Se houver, simplifique para apenas uma superfície.
- [ ] A responsividade foi verificada em 375px (mobile), 768px (tablet) e 1440px (desktop grande)?
