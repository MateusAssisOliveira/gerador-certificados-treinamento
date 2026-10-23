---
name: emil-design-eng
description: >-
  Engenharia de design, microinterações refinadas, física de movimento (springs),
  curvas de aceleração customizadas e transições de alta performance baseadas na
  filosofia de Emil Kowalski. Utilize esta skill para polir estados interativos,
  criar feedback tátil em botões, menus, modais e transições de estado, garantindo
  que o software transmita solidez e responsividade imediata.
---

# ⚡ Skill: Emil Design Engineering (Microinteractions & Motion)

Esta skill codifica a filosofia de **Design Engineering e Microinterações** inspirada nos padrões de excelência de produtos como *Linear*, *Vercel* e *Apple*, focando nos detalhes invisíveis que fazem uma interface parecer polida, rápida e viva.

---

## 🧭 O Framework de Decisão de Animação

Antes de escrever qualquer linha de CSS de animação ou transição, responda em ordem:

### 1. Isto deve mesmo ser animado?
* **Ações frequentes (100+ vezes/dia)**: Ex.: navegação por teclado, atalhos, inputs de texto, seleções repetitivas. **NUNCA anime**. A resposta deve ser instantânea (0ms).
* **Ações cotidianas (dezenas de vezes)**: Hover states, alternância de tabs. Transição ultra-curta (100ms - 150ms).
* **Ações pontuais (modais, gavetas, toasts)**: Transição intencional e suave (180ms - 280ms).
* **Regra de ouro**: Em interfaces produtivas B2B, a animação nunca deve fazer o usuário esperar.

### 2. Escolha da Curva de Aceleração (Easing)
* ❌ **NUNCA use `ease-in` em componentes de UI**: O início lento faz o botão ou menu parecer travado e sem resposta imediata.
* ❌ **Evite o `ease` ou `ease-in-out` padrão do navegador**: As curvas padrão são fracas e sem impacto.
* ✅ **Use `ease-out` expressivo com curvas personalizadas**: O elemento responde no milissegundo 0 e desacelera suavemente.

```css
/* Tokens canônicos de aceleração */
:root {
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
  --ease-spring: cubic-bezier(0.32, 0.72, 0, 1);
}
```

### 3. Tabela de Durações Recomendadas
| Elemento | Duração Ideal | Comportamento |
| :--- | :--- | :--- |
| **Press feedback (botão / card clicável)** | 100ms - 140ms | `transform: scale(0.97)` no `:active` |
| **Tooltips e popovers** | 120ms - 180ms | `opacity` + `scale(0.96) -> scale(1)` |
| **Dropdowns e selects** | 150ms - 200ms | Origem do trigger (`transform-origin: top`) |
| **Modais e diálogos** | 200ms - 260ms | Entrada suave com backdrop blur |
| **Toasts de notificação** | 220ms - 280ms | Deslocamento vertical com amortecimento |

### 4. Regras Absolutas de Construção

1. **Nunca anime a partir de `scale(0)`**:
   No mundo real, nada surge de um ponto invisível. Comece de `scale(0.95)` combinado com `opacity: 0`.
   ```css
   /* Correto */
   @keyframes modal-enter {
     from { opacity: 0; transform: scale(0.96) translateY(6px); }
     to   { opacity: 1; transform: scale(1) translateY(0); }
   }
   ```
2. **Propriedades específicas em `transition`**:
   Nunca use `transition: all 300ms`. Sempre declare explicitamente:
   `transition: transform 160ms var(--ease-out), opacity 160ms ease`.
3. **Respeito estrito a Acessibilidade (`prefers-reduced-motion`)**:
   ```css
   @media (prefers-reduced-motion: reduce) {
     *, *::before, *::after {
       animation-duration: 0.01ms !important;
       animation-iteration-count: 1 !important;
       transition-duration: 0.01ms !important;
     }
   }
   ```
