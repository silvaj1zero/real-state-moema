# KISS — No Overengineering

Always loaded. Applies to every structural decision.

## Principle

**Bounded scopes are LOGICAL (ADR-scoped + documented), not PHYSICAL (directory-scoped + filesystem-enforced).**

## Defaults

- Files flat under squad dirs (`data/`, `checklists/`, `tasks/`, `workflows/`, `templates/`, `scripts/`). No `capabilities/{name}/` subdirs.
- Use existing agent, rule, validator, registry before creating new ones.
- Edit existing file before adding a new one.
- Prose + naming convention before directory tree.

## Forbidden by Default

- Indirection without information
- Structure before usage
- Nesting before flat fails

## Gates (before adding ANY structure)

1. Cite real failure (not hypothetical).
2. Show cheaper alternative was tried.
3. Measurable benefit (tokens, confusion, runtime check). If benefit is inferred from internal data only AND scope ≥ epic/multi-story, run `/tech-research` first to triangulate before committing.
4. Migration cost bounded.
5. 24h sleep test — most proposals don't survive.

If 1-4 cannot be answered concretely, **structure does not get added**.

## Reverse direction

- Abstraction with 1 user → inline
- Dir < 3 files after 30d → flatten
- Registry fields no consumer reads → strip
- Validator that never flagged in 90d → archive

## Precedent

ADR-018 v1.2 (2026-04-18) — `capabilities/` subdir pattern proposed, implemented, then rejected. Files flat. Founder: "O certo é data, não capabilities. Isso gera mais complexidade."

Path B agent-heuristic enrichment (2026-04-18) — Internal audit recommended 5-11h enriching 11 AIOX agents with heuristic_ids. `/tech-research` (~30min) surfaced SWE-Skills-Bench: 80% of agent skill injections produce zero improvement. Path archived. See `docs/research/2026-04-18-agent-heuristic-structure-validation/`.
