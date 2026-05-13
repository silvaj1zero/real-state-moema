---
name: compare
description: "Architectural Modernization Pipeline — compara dois repositorios com deep scan 5P, quality scoring 12D, verdict engine e surgical merge via SDC"
version: "3.0.0"
owner_squad: sinkra-squad
sinkra_tier: Tier2
context: conversation
agent: general-purpose
user-invocable: true
argument-hint: "[repo_a_path] [repo_b_path]"
---

# /compare — Architectural Modernization Pipeline

> **Auto-Trigger:** When user mentions "compare repos", "merge repos", "architectural modernization", "codebase comparison"
> **Keywords:** "compare", "merge", "repos", "modernization", "delta", "scoring", "verdict"
> **Prioridade:** ALTA
> **Tools:** Read, Glob, Grep, Bash, Write, Edit

## Purpose

Execute a structured 9-phase pipeline to compare, score, and surgically merge two repositories. Produces AUDIT.md, KNOWLEDGE.md, SCORING.md (12 dimensions), DELTA.md, TAXONOMY.md, MERGE_LOG.md, and ADRs.

## Usage

```
/compare [repo_a_path] [repo_b_path]
```

## Pipeline Phases

| Phase | Name | Agent | Output |
|-------|------|-------|--------|
| 0 | Setup | Claude | 7 artifacts created |
| 1 | Deep Scan Repo A | @architect | AUDIT.md + KNOWLEDGE.md (Repo A) |
| 2 | Deep Scan Repo B | @architect | AUDIT.md + KNOWLEDGE.md (Repo B) |
| 3 | Delta Analysis | Claude | DELTA.md |
| 4 | Quality Scoring 12D | @qa + @architect | SCORING.md |
| 5 | Verdict Engine | @architect + @qa | KEEP/MIGRATE/REPLACE/TRANSCEND |
| 6 | Architectural Evolution | @architect | TAXONOMY.md |
| 7 | Surgical Merge | @dev via SDC | MERGE_LOG.md |
| 8 | Audit Trail | @qa | ADRs + Brownfield Check |

## Execution

1. Read the full protocol: `.claude/commands/COMPARE-PROTOCOL-v3.md`
2. Load workflow definition: `.aiox-core/development/workflows/compare-pipeline.yaml`
3. Execute each phase sequentially with mandatory checkpoints between phases
4. Output directory: `outputs/compare/{slug}-{date}/`

## Key Rules

- NEVER skip a phase or checkpoint
- UNKNOWN is valid; inventing is not
- Brownfield honest > pretty map
- TRANSCEND must win >=9/12 dimensions or it is a badly justified REPLACE
- Each merge item = 1 commit (atomic)

## Quando NAO Ativar

- Simple persona comparison (use `/compare` command directly for that — the persona comparison variant)
- Single-repo analysis (use brownfield discovery workflow instead)
- When user asks to "compare prices" or "compare products" — this is for repository architecture only

## Related Files

- `.claude/commands/compare.md` — Simple persona comparison command
- `.claude/commands/COMPARE-PROTOCOL-v3.md` — Full protocol documentation
- `.aiox-core/development/workflows/compare-pipeline.yaml` — Workflow definition
- `.aiox-core/development/tasks/compare/` — 8 task files
