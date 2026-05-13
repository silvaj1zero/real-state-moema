---
paths:
  - "apps/**/*.tsx"
  - "apps/**/*.jsx"
  - "apps/**/src/**"
  - "apps/**/app/**"
  - "apps/**/pages/**"
  - "apps/**/components/**"
---

# URL as State Truth — Frontend

Thin lazy-loaded rule. Promoted from heuristic AN_KE_044 (archived as not-cross-domain).

## When to Load

Load this rule only when you are about to:

- Implement state management for navigation-heavy UI components (lists, filters, tabs, paginated views, modals with shareable state)
- Decide between `useState` local vs URL-backed state in a frontend app
- Build deep-linkable pages where refresh / share / bookmark must preserve state

If neither condition holds, skip — most components don't need URL state.

## Rule

**SE** componente de UI gerencia state visível para o usuário (filtros, tabs, queries, paginação, modais com conteúdo selecionado) **ENTÃO** state DEVE viver em `searchParams` ou pathing slug, não em `useState` local. Refresh / share / bookmark deve preservar visualização.

**NUNCA** trancar state em memória da página se o usuário pode dar refresh ou compartilhar URL.

## Why

URL é o contrato com o usuário (browser history, share, bookmark, deep linking). State em memória se perde a cada refresh. Migration cost depois é caro: cada componente que assume `useState` precisa ser refatorado.

## Anti-Pattern

```tsx
// ERRADO — state em memória
function ProductList() {
  const [filter, setFilter] = useState('all');  // perde no refresh
  // ...
}

// CERTO — state na URL
function ProductList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = searchParams.get('filter') ?? 'all';
  // ...
}
```

## When Not to Apply

State efêmero genuíno (form input em digitação, hover state, animation state, modal open/closed sem conteúdo importante). Esses ficam em memória.

## Source

- Original heuristic: AN_KE_044 (archived 2026-04-27 v3.13.0 — not cross-domain enough for heuristic, promoted as frontend rule)
- Archived L3 doc: `minds/alan_nicolas/heuristics/_archived/AN_KE_044-archived-v3.13.0-frontend-specific.md`
