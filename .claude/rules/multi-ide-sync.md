---
paths:
  - ".claude/skills/**"
  - ".claude/commands/**"
  - ".claude/agents/**"
  - ".gemini/**"
  - ".cursor/**"
  - ".agents/**"
  - ".aiox-core/infrastructure/scripts/ide-sync/**"
  - ".aiox-core/infrastructure/scripts/codex-skills-sync/**"
---

# Multi-IDE Sync Protocol

Thin lazy-loaded rule. Promoted from heuristic AN_KE_070 (archived as repo-specific governance).

## When to Load

Load this rule only when you are about to:

- Create or modify slash commands, agents, skills in this repo
- Decide where to surface a new capability (Claude Code vs Gemini vs Roo vs Cursor)
- Sync a cross-IDE feature

## Rule

**SE** criando ou atualizando capability invocável no editor (commands/skills/agents) **ENTÃO** sincronizar transversalmente seguindo a hierarquia:

| IDE | Surface principal | Surface compatível secundária |
|-----|-------------------|-------------------------------|
| **Claude Code** (canônico) | `.claude/commands/`, `.claude/agents/`, `.claude/skills/` | — |
| **Gemini / Roo** | `.gemini/skills/` (apenas o que for compatível) | — |
| **Codex** | runner-lib | — |
| **Cursor** | `.cursor/rules/` (auto-gerado de `.claude/rules/`) | — |

**NUNCA** publicar capability em IDE secundário sem antes registrar no Claude Code (canonical). Sync é Claude Code → outros, não inverso.

## Why

Claude Code é a surface canônica do framework AIOX/Sinkra (CLAUDE.md). Outros IDEs têm capacidades parciais (skills sim, agents nem sempre). Trabalhar contra essa hierarquia produz drift.

## Sync Rule (one direction)

```
Claude Code (canonical)  →  Gemini/Roo (skills compatíveis apenas)
                         →  Cursor (rules apenas, auto-gen)
                         →  Codex (runner-lib via runner-chief)
```

## Anti-Pattern

- Criar skill em Gemini sem ter no Claude Code → drift
- Tentar replicar agent system completo em Roo (Roo só suporta skills) → frustração
- Editar skill em Cursor (rules são auto-geradas) → sobrescritura no próximo sync

## Source

- Original heuristic: AN_KE_070 (archived 2026-04-27 v3.13.0 — Claude Code/Gemini/Roo specific governance)
- Archived L3 doc: `minds/alan_nicolas/heuristics/_archived/AN_KE_070-archived-v3.13.0-multi-ide-governance.md`
- Authority: `@devops` owns IDE sync (`.claude/rules/agent-authority.md` + `ide-sync sync` command)
