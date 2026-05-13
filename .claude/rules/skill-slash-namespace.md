---
paths:
  - ".claude/skills/**"
  - "squads/**/skills/**"
---

# Skill Slash Namespace — Project Prefix

Thin lazy-loaded rule. Promoted from heuristic AN_KE_138 (archived as Claude Code skill registry convention).

## When to Load

Load this rule only when you are about to:

- Register a new skill in `.claude/skills/`
- Rename an existing skill
- Decide skill name in a multi-squad / multi-repo context

## Rule

**SE** registrando skill que pertence a uma família (framework, squad, projeto) **ENTÃO** nomear com prefixo `/{family}-{name}`:

| Família | Prefix | Exemplos |
|---------|--------|----------|
| AIOX framework | `/aiox-` | `/aiox-dev`, `/aiox-devops`, `/aiox-pm`, `/aiox-architect` |
| Sinkra process | `/sinkra-` | `/sinkra-map-process`, `/sinkra-validate-squad` |
| Squad chiefs | `/{squad}-chief` | `/copy-chief`, `/brand-chief`, `/data-chief` |
| Repo-wide tools | `/{tool}` (sem prefix) | `/commit`, `/handoff`, `/deploy`, `/loop` |

**NUNCA** registrar skill genérica (`/dev`, `/full-sdc`, `/copy-chief` sem prefix) se houver colisão cross-squad/cross-repo possível. **Verifique antes:** `ls .claude/skills/` + `ls ~/.claude/skills/` (skills do user global).

## Why

Skills viram comandos `/foo` no harness. Sem prefix, dois squads podem registrar `/dev` e o último venceria silenciosamente. Cross-repo (Spoke vs Hub), o problema é pior — sync sobrescreve.

## Anti-Pattern

```
Skill X (squad copy):    /dev  → conflita com aiox-dev
Skill Y (squad ads):     /dev  → último wins, ambíguo
Skill Z (repo allfluence): /commit  → conflita com /commit do hub
```

## Decision Tree

```
Nova skill chama-se X.
├── X é parte de família clara (framework, squad, projeto)?
│   ├── SIM → usar /{family}-X
│   └── NÃO → próxima pergunta
├── X é único repo-wide com nome distinto?
│   ├── SIM → /{X} (ex: /commit, /handoff)
│   └── NÃO → /{family-default}-X (default: project slug)
```

## Source

- Original heuristic: AN_KE_138 (archived 2026-04-27 v3.13.0 — Claude Code skill registry convention)
- Archived L3 doc: `minds/alan_nicolas/heuristics/_archived/AN_KE_138-archived-v3.13.0-claude-code-convention.md`
- Authority: `@devops` owns skill registry (`.claude/skills/`)
