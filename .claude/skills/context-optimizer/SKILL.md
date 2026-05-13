---
name: context-optimizer
description: "Audit and shrink always-loaded Claude Code context (rules, skills, CLAUDE.md, agents, MCPs). Use when doctor:context exceeds threshold or before publishing new squads/skills."
version: "1.1.0"
user-invocable: true
argument-hint: "[--scope=full|rules|skills|claudemd|agents|mcps] [--dry-run] [--approval=interactive|strict|advisory]"
paths:
  - ".claude/rules/**"
  - ".claude/skills/**"
  - ".claude/agents/**"
  - ".claude/settings*.json"
  - "CLAUDE.md"
  - "scripts/context-budget-audit.js"
  - ".mcp.json"
---

# Context Optimizer

Measure → audit → propose → apply → verify. One cycle trims always-loaded token budget without losing enforcement content.

## When to use

- `npm run doctor:context` reports FAIL (>12K) or WARN (>8K) always-loaded
- Before publishing a new squad/skill (baseline + post-check)
- Monthly maintenance cycle
- After bulk rule/skill changes (drift check)

## How to invoke

```
/context-optimizer                    # full cycle, interactive approval
/context-optimizer --scope=rules      # rules only
/context-optimizer --dry-run          # proposals only, zero writes
/context-optimizer --approval=strict  # CI mode, hard gates exit 1 on reject
```

## What runs

8-phase DAG with commit barriers between each phase:

1. **Baseline** — `doctor:context --json` captures current tokens
2. **Collapse config** — verify `CLAUDE_CONTEXT_COLLAPSE=1` in `~/.claude/settings.json`
3. **Rules** — add `paths:` frontmatter to always-loaded rules that fit lazy-load; convert `globs:` legacy; merge overlapping rules (hard gate); delete duplicates (hard gate)
4. **CLAUDE.md** — condense sections, remove redundant tables (preserves anchors — hard gate on structural edits)
5. **Skills** — condense verbose descriptions (>200 chars); fix owner_squad drift; delete duplicates confirmed via entry_agent check (hard gate)
6. **Agents** — report verbose names (rename deferred to v2 — squad-level refactor, high blast radius)
7. **MCPs** — proxy-audit from `outputs/qa/context-budget/mcp-marks.yaml`; delegate removal to `@devops`
8. **Final delta** — archive proposals, generate session report, verify threshold met

## Safety

| Op | Gate | Rationale |
|---|---|---|
| Delete rule/skill | **Hard** (operator `YES <proposal-id>`) | Destructive, rollback requires restore |
| Rename squad/agent | **Hard** (+ dry-run count check) | 100+ refs typical, blast radius high |
| Merge rules | **Hard** (+ audit-rule-items.js pre-check) | Content loss risk |
| Edit CLAUDE.md structural | **Hard** (+ anchor preservation check) | Anchors referenced elsewhere |
| Add `paths:` frontmatter | Soft (log + proceed) | Reversible via git revert |
| Convert `globs:` → `paths:` | Soft | Format migration |
| Condense description (<10 line diff) | Soft | Mechanical, reversible |
| MCP removal | Delegated to `@devops` | Authority boundary |

## Anti-patterns prevented mechanically

| AP | Scenario | Gate |
|---|---|---|
| CO-1 | Content loss on merge | `audit-rule-items.js` blocks if enforcement tables lost |
| CO-2 | Undercounted refs before rename | `--dry-run` preview + BLOCK if actual count deviates >2x |
| CO-3 | git stash chaos with mixed ops | `commit_barrier_guard`: working tree must be clean between phases; stash forbidden |
| CO-4 | Auto-gen stub mistaken for duplicate | `validate-skill-entry-agent-binding.js` blocks delete if skill bound to squad entry_agent |
| CO-5 | Context-obvious questions | Persona infers brownfield/greenfield from context; asks only if genuinely ambiguous |

## Full protocol

`squads/claude-code-mastery/tasks/optimize-context.md` — execution protocol, heuristics H1-H6, anti-pattern specs, script dependencies, rollback protocol, token checklist (24 items).

## Outputs

- `outputs/sinkra-squad/context-optimizer/phase-XX-*/` — per-phase artifacts
- `outputs/qa/context-budget/session-reports/{date}.md` — final delta report
- `outputs/qa/context-budget/proposals/{date}/` — approved proposals archive
- `.aiox/context-optimizer/` — runtime state (gitignored)

## Success metric

Always-loaded tokens reduced OR held steady (no regression); zero enforcement content lost; all 5 anti-patterns gated mechanically; commit log shows atomic per-phase commits.

## Required dependencies (Stories CO-1..CO-7)

- **CO-1 (P0):** `@devops` adapts `ide-sync --deletion-allowlist` — **required before first live cycle** (else sp4_agents enters revert loop)
- CO-2: Enhance `context-budget-audit.js` with `--strict` + segmentation
- CO-3..CO-5: Create `audit-rule-items.js`, `validate-rule-frontmatter.js`, `validate-claudemd-anchors.js`, `validate-skill-entry-agent-binding.js`
- CO-6: Tier 3 scaffolding (`config.yaml`, `templates/`, `checklists/`, `data/`)
- CO-7 (escalated to `@architect`): Bootstrap `.claude/skills/skill-registry.yaml`

Skill runs with partial dependencies — soft gates work today via operator prompts; hard gates enforce manually until validators land.
