---
name: "validate-skill"
description: "Validates skills against SINKRA compliance rules with weighted scoring,"
version: "2.0.0"
agent: "validate-skill"
user-invocable: true
maxTurns: 25
---

# validate-skill v2.0

Validates any skill in `.claude/skills/` against the SINKRA skill compliance rules defined in `skill-standards.md` and `skills.md`.

## Usage

This skill is invoked via the bash script, not as a slash command:

```bash
# Validate a single skill
squads/sinkra-squad/scripts/validate-skill.sh roundtable

# Verbose output (per-dimension detail)
squads/sinkra-squad/scripts/validate-skill.sh commit --verbose

# Deep mode (includes qualitative D10 via Claude CLI)
squads/sinkra-squad/scripts/validate-skill.sh handoff --deep

# Validate all 35 registered skills
squads/sinkra-squad/scripts/validate-skill.sh --all

# JSON output for CI/automation
squads/sinkra-squad/scripts/validate-skill.sh --all --json

# Filter by tier
squads/sinkra-squad/scripts/validate-skill.sh --all --tier Tier3
```

Also available via `@sinkra-chief *validate-skill <name>`.

## Dimensions (10)

| Dim | Name | Checks | Tier | Weight | Type |
|-----|------|--------|------|--------|------|
| D1 | Frontmatter compliance | T1_01, T1_02, T1_04 | ALL | 2.0 | Deterministic |
| D2 | Naming | T1_03 | ALL | 1.0 | Deterministic |
| D3 | Structure | T2_01 (Tier2+), T3_01-03 (Tier3) | ALL | 2.0 | Deterministic |
| D4 | Registry | T1_05a | ALL | 1.5 | Deterministic |
| D5 | Version sync (SKILL.md <-> config.yaml) | T2_04 | Tier2+ | 1.0 | Deterministic |
| D6 | Config compliance | T2_02, T2_03 | Tier2+ | 1.5 | Deterministic |
| D7 | Tier 3 structure | T3_01, T3_02, T3_03 | Tier3 | 1.5 | Deterministic |
| D8 | Artifact contracts | T3_04, T3_05 | Tier3 | 1.5 | Deterministic |
| D9 | Registry version sync | T1_05b | ALL | 1.0 | Deterministic |
| D10 | Quality | Q_01, Q_02 | Tier2+ | 1.0 | Qualitative |

## Quality Gates

| Gate | Type | Rule |
|------|------|------|
| G1 Structural | Blocking | D1 or D3 FAIL = total FAIL |
| G2 Registry | Warning | Registry mismatch = WARN |
| G3 Tier Compliance | Blocking | Tier2 without config.yaml = FAIL |
| G4 Version | Warning | Version drift = WARN |
| G5 Contracts | Blocking | template_path not found = FAIL |
| G6 Score | Final | >= 7.0 PASS, >= 5.0 WARN, < 5.0 FAIL |

## Scoring

Weighted average of applicable dimensions. Only dimensions that apply to the skill's declared tier are counted. Score scale: 0-10.

## Output

- Terminal: colored report with per-dimension scores (--verbose)
- JSON: structured output for CI (--json)
- Score card: `outputs/skill-validations/{name}/{date}/score_card.yaml`

## SINKRA Process

```yaml
process_id: SP-VALIDATE-SKILL
mode: VALIDAR
organism: ORG-VS-001
mapping: outputs/sinkra-squad/validate-skill/map/process-mapping.yaml
```

## Knowledge Sources

1. `.claude/rules/skill-standards.md` — Frontmatter schema, tier requirements matrix
2. `.claude/rules/skills.md` — Governance, versioning, structure rules
3. `.claude/skills/skill-registry.yaml` — Registry SOT (35 skills)
