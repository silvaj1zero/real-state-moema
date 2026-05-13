---
paths:
  - ".claude/agents/**"
  - ".claude/skills/**"
  - "squads/**/agents/**"
  - "squads/**/tasks/**"
  - "squads/**/workflows/**"
  - "squads/**/templates/**"
  - "squads/**/checklists/**"
---

# Chief Parallel Delegation Protocol

## Rule

Chiefs MAY delegate independent workflow phases to `/swarm-execute` Task Mode for parallel execution. Chiefs MUST continue orchestrating dependent phases sequentially in conversation.

## When to Parallelize

- Phases without mutual dependency AND without elicitation → **YES** (swarm)
- Phases with `inputs_from_previous` → **NO** (sequential in conversation)
- Phases with `human_review: true` → **NO** (needs user interaction)
- When in doubt → **NO** (sequential is the safe default)

## Task Schema

Each delegated task MUST include:

```json
{
  "agent": "{squad}--{agent-name}",  // Full ID with squad prefix
  "prompt": "Task description + resolved inputs",
  "mode": "write",
  "effort": 5,
  "template": "squads/{squad}/templates/{tmpl}",     // Optional
  "checklist": "squads/{squad}/checklists/{check}",  // Optional
  "file_set": ["outputs/{squad}/{slug}/{output}.md"]
}
```

## Agent ID Resolution

1. If ID contains `--` → use as-is
2. Otherwise → prefix with chief's squad: `{squad}--{agent-name}`

## Template & Checklist Discovery

Templates and checklists are discovered by convention:
- `squads/{squad}/templates/` — output structure
- `squads/{squad}/checklists/` — validation criteria

If the task references them explicitly, use the explicit path.

## Chiefs with Protocol

| Chief | Squad | Parallel Phases |
|-------|-------|----------------|
| `brand-chief` | brand | foundations (3 agents), positioning (2), activation (4) |
| `decoder-chief` | domain-decoder | Phase 0 discovery (2 agents) |
| `copy-chief` | copy | multi-asset campaigns, creative competition, launch kits |

## Anti-Pattern: WEE Replacement

Do NOT build a generic Workflow Execution Engine that replaces chiefs. Chiefs preserve context between phases (saving ~3x tokens) and apply domain-specific heuristics. Swarm is only for parallelizable sub-phases.
