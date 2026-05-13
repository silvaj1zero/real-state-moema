---
paths:
  - "apps/**/*.tsx"
  - "apps/**/*.jsx"
  - "packages/**/*.tsx"
  - "packages/**/*.jsx"
---

# React Reserved Props — `ref`, `key`

Thin lazy-loaded rule. Promoted from heuristic AN_KE_167 (archived as React framework knowledge).

## When to Load

Load this rule only when you are about to:

- Define a `Props` type for a Client Component in React/Next.js
- Add a new prop to a component crossing Server → Client boundary
- Audit React components for typecheck-passing-but-runtime-failing bugs

## Rule

**SE** definindo `Props` type em Client Component React (RSC `'use client'`, ou em qualquer boundary Server → Client) **ENTÃO** **NUNCA** nomear prop `ref` ou `key`. Ambos são reservados por React.

### Substitutos canônicos

| Caso de uso | Forbidden | Canonical replacement |
|-------------|-----------|------------------------|
| Identifier string | `ref: string` | `code`, `identifier`, `slug`, `id` |
| Lookup key (não DOM ref) | `key: string` | `slug`, `name`, `lookup` |
| Forwarding ref real | (use `forwardRef`) | (mecanismo oficial React) |

## Why

- `ref` é DOM ref forwarding — React intercepta, não passa como prop normal
- `key` é reconciliação interna de listas — React intercepta, não passa como prop
- TypeScript **não detecta** o conflito — typecheck passa
- Runtime falha como `500: Refs cannot be used in Server Components` ou prop chega `undefined` silenciosamente

## Anti-Pattern

```tsx
// ERRADO — typecheck passa, runtime falha
type PostCardProps = {
  ref: string;        // forbidden — React intercept
  title: string;
};

function PostCard({ ref, title }: PostCardProps) {
  return <article data-ref={ref}>{title}</article>;
}

<PostCard ref="post-1" title="Hello" />  // runtime: ref forwarding error
```

```tsx
// CERTO
type PostCardProps = {
  code: string;
  title: string;
};

function PostCard({ code, title }: PostCardProps) {
  return <article data-code={code}>{title}</article>;
}
```

## Detection

Se ver `Refs cannot be used in Server Components` ou prop chegando `undefined` em Client Component sem razão clara, suspeitar de prop com nome reservado.

## Source

- Original heuristic: AN_KE_167 (archived 2026-04-27 v3.13.0 — React framework knowledge)
- Archived L3 doc: `minds/alan_nicolas/heuristics/_archived/AN_KE_167-archived-v3.13.0-react-specific.md`
- Original case: Redpine `/redes-sociais` PostCard ref bug (2026-04-19)
