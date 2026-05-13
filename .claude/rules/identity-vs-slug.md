---
paths:
  - "squads/**/agents/**"
  - "squads/**/config.yaml"
  - "outputs/minds/**"
  - "minds/**"
  - "outputs/qa/aliases-pending-registry.yaml"
  - ".claude/agents/**"
---

# Identity vs Filesystem Slug — Sinkra Hub

Applies when renaming operators, agents, or any @-prefixed identity in the repo.

## Distinction

| Concept | What it is | How to rename |
|---|---|---|
| **Filesystem slug** | Directory names, agent file names, YAML config field values (`slug:`, `id:`, `name:`, `heuristic_namespace:`) | `git mv` + `Edit` surgical |
| **Identity handle** | @-prefixed token in content (PRD author fields, history stamps, agent invocations, decision framework body text) | NEVER mechanically rename. Alias registry resolves at runtime. |

## Why

Identity handles fragment into 3+ semantic classes indistinguishable by regex:
- GitHub handle literal (linked to real account)
- Historic author stamp (immutable attribution)
- Active agent invocation (runtime-resolved)

Mechanical rename corrupts 2/3 classes (broken GitHub links, falsified authorship). Alias layer is the correct disambiguation primitive.

## Rule

1. **Filesystem slugs** migrate via `git mv` for dirs/files + `Edit` for YAML config fields. Scope bounded to 10-30 files max for operator-scope renames.
2. **Identity handles** (`@foo`) are **PRESERVED as-is** across the entire repo. Alias entry in `outputs/qa/aliases-pending-registry.yaml` (or `workspace_artifact_registry` when delivered) maps `foo` → canonical slug.
3. **Workspace doc artifacts** (brandbook, product-spec, etc) continue via `sinkra:rename-artifact` CLI — its design target.

## Enforcement

- `git mv` preserves history
- `Edit` tool for surgical frontmatter changes (id, slug, name, namespace fields)
- Alias registry serves as canonical runtime disambiguation
- `sinkra:rename-artifact` CLI remains for workspace-doc renames (not identity renames)

## Identity-Bound Squads — Exception

Squads classified as **Category 1 (Identity-Bound)** per `.claude/rules/squads-pii-policy.md` are an explicit exception to the global "preserve identity handles" rule. Inside an identity-bound squad (`identity_bound: true` declared in `config.yaml`), person_id references in kebab-case are the canonical form and may be renamed mechanically alongside the underlying person record (e.g., `pedro_valerio` → `pedro-valerio` follows the registry).

For Category 2 (Operational) squads, person_ids should not exist at all — replace with abstract slots (`{steward}`, `{accountable}`).

## Related

- `.claude/rules/canonical-artifact-names.md` (CANP) — amended: CLI execution requirement applies to workspace-doc artifacts, not operator identity renames
- `.claude/rules/skills-ownership.md` — alias registry schema
- `.claude/rules/squads-pii-policy.md` — Identity-Bound vs Operational categorization
- `docs/architecture/adrs/ADR-SQUAD-PII-POLICY.yaml` — authoritative ADR
- ADR-UNIFY-MINDS D2 (refined 2026-04-17) — source decision
- STORY-UM-2 — first application
