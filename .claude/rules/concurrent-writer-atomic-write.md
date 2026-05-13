---
paths:
  - "apps/**"
  - "packages/**"
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.jsx"
  - "**/*.vue"
  - "**/*.svelte"
  - "**/*.css"
  - "**/*.scss"
---

# Atomic Write > Split Edits (Concurrent-Writer Context)

Thin lazy-loaded rule. Canonical body lives in heuristic **AN_KE_163**.

## When to Load

Load this rule only when you are about to:

- Issue **≥ 2 consecutive `Edit` calls on the same file** that has an active linter / formatter / hook / hot-reload / agent co-writing it
- Modify **correlated pairs** (import + usage, route + component, schema + consumer, type + call site) where removing either breaks the other

If neither condition holds, skip — the standard `Edit` flow is fine.

## Rule

**SE** editando file com N mudanças correlacionadas em contexto com concurrent writers (linter / formatter / hook / hot-reload / agent) → **ENTÃO** `Write` atômico do arquivo inteiro; split `Edit`s fazem race com o escritor concorrente.

## Why (one line)

Between two `Edit` calls, a concurrent writer can mutate the file — `Edit 2`'s `old_string` either fails to match or silently reverts `Edit 1`. `Write` of the full file is a single atomic commit and wins every race.

## Anti-Pattern

```
Edit 1 — adds "import Foo from './foo'"
  → linter auto-format removes the unused import (hasn't seen the usage yet)
Edit 2 — adds "<Foo />" in JSX
  → fails with "old_string not found" OR succeeds but Foo is no longer imported
```

Same pattern with Tailwind classes, shadcn route wires, type + caller pairs.

## Detection Signal

If you see:
- "File has been modified since read, either by the user or by a linter" on `Edit 2+`
- Silent disappearance of changes that you just confirmed wrote successfully
- Tool results that claim success but the next `Read` shows the previous state

→ switch to `Write`.

## Canonical Source

- **Heuristic:** AN_KE_163 "Atomic Write > Split Edits em Concurrent-Writer Context"
- **File:** `minds/alan_nicolas/heuristics/decision-cards.yaml`
- **Triangulation:** confirmed in 3 sessions (Projects page 2026-04-19, Docs layout 2026-04-19, claude-perfected DS port 2026-04-19/20)
- **Heuristics Promotion Protocol:** see `extract-session-heuristics/SKILL.md#promotion-protocol`

## Related

- `AN_KE_057` Multi-Window Isolation (different mechanism, same principle)
- `AN_KE_076` Minimal Blast Radius (keep edits small so atomic rewrites stay cheap)
