---
paths:
  - "squads/*/config.yaml"
  - "squads/sinkra-squad/data/ecosystem-registry.yaml"
  - "squads/infra-ops-squad/data/service-catalog.yaml"
  - "workspace/businesses/**/L1-strategy/bu-map.yaml"
  - "workspace/businesses/**/document-registry.yaml"
  - "workspace/businesses/**/L2-tactical/sinkra-processes/**/sinkra-output.yaml"
  - "squads/squad-creator-pro/minds/**/heuristics/PV_KE_*.md"
  - "squads/squad-creator-pro/minds/**/heuristics/decision-cards.yaml"
  - "docs/stories/**"
  - "scripts/registry-governance-check.js"
---

# Registry Governance — Sinkra Hub

Applies when @devops performs push operations or when entity files are modified.

## Pre-Push Registry Check (Synapse L3 — workflow-registry-governance)

Before every push, @devops MUST consult the registry governance workflow:

```bash
node scripts/registry-governance-check.js --mode advisory
```

### What It Does

1. Reads git diff to detect changed files
2. Maps changed files to entity types using the file_entity_map
3. Checks if corresponding SOT registries were also updated
4. Emits warning (advisory) or error (blocking) if registries are missing

### File Entity Map (9 mappings)

| File Pattern | Entity Type | SOT Registry |
|-------------|-------------|--------------|
| `squads/*/config.yaml` | Squad | `squads/sinkra-squad/data/ecosystem-registry.yaml` |
| `squads/infra-ops-squad/data/service-catalog.yaml` | Service | `squads/infra-ops-squad/data/service-catalog.yaml` |
| `workspace/businesses/{slug}/L1-strategy/bu-map.yaml` | BusinessUnit | `workspace/businesses/{slug}/L1-strategy/bu-map.yaml` |
| `workspace/businesses/{slug}/document-registry.yaml` | WorkspaceDocument | `workspace/businesses/{slug}/document-registry.yaml` |
| `docs/stories/epic-*/EPIC-*.md` | Epic | `docs/stories/` (filesystem) |
| `docs/stories/epic-*/STORY-*.md` | Story | `docs/stories/` (filesystem) |
| `workspace/businesses/{slug}/L2-tactical/sinkra-processes/*/sinkra-output.yaml` | Process | `squads/sinkra-squad/data/process-registry.yaml` |
| `squads/squad-creator-pro/minds/*/heuristics/PV_KE_*.md` | Heuristic | `decision-cards.yaml` (per owner) |
| `squads/squad-creator-pro/minds/*/heuristics/decision-cards.yaml` | DecisionCards | self-referencing |

### Enforcement Levels (TK-RG-004)

| Level | Behavior | Sprint |
|-------|----------|--------|
| `advisory` | Log warning, does NOT block push | Sprint 1-2 (current) |
| `blocking` | Throws error, blocks push until registries updated | Sprint 3+ |

To switch to blocking mode: change `--mode advisory` to `--mode blocking` in the pre-push command.

### Self-Referencing Registries

Some entity files ARE their own registry (e.g., bu-map.yaml, document-registry.yaml).
These auto-pass the check — modifying the file IS updating the registry.

### Coverage Score (TK-RG-003)

Coverage is calculated as: update points executed / update points expected.
- Baseline: 14%
- Target: 60%
- Metrics persisted to: `.synapse/metrics/registry-coverage.json`

### Canonical Source

The file_entity_map originates from:
`workspace/businesses/{slug}/L2-tactical/sinkra-processes/registry-governance/sinkra-output.yaml`
Section: `infrastructure.file_entity_map`
