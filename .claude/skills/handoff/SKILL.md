---
name: "handoff"
description: "Generates a SINKRA-compliant handoff that lets another AI resume work"
version: "3.1.0"
agent: "handoff"
user-invocable: true
maxTurns: 25
---

# Handoff Generator v3.1 (SINKRA-Compliant)

**GOLDEN RULE: The AI reading this handoff is a NEWBORN BABY. Zero context.**

## Objective

Create continuity document that allows any AI (without prior context) to continue work where you stopped. This skill is the **single source of truth** for handoff generation.

## SINKRA Process Architecture

```yaml
process:
  id: ARCH-HANDOFF-GEN
  mode: CRIAR
  sinkra_version: "1.2"
  organism: ORG-HO-001 (Handoff Generation Pipeline)
  molecules: [Context Extraction, Document Assembly, Quality Assurance, Artifact-Handoff]
  atoms: 11 | tokens: 14 | families: 9/9
  compliance: 100/100
  reference: "outputs/sinkra-squad/handoff-generation/"
```

## Critical Constraints

### NEVER assume the reader knows:
- What the project is
- Who the people are (Alan, PV, etc)
- What domain terms mean ("clone", "ouro/bronze", "trindade")
- Why something matters
- Where files are located

### ALWAYS include:
- Priority (P0-P3) in header to calibrate depth
- Section "CRITICAL CONTEXT" with problem/solution in one sentence
- Key Facts with temporal markers (ACTIVE / SUPERSEDED / DEPRECATED)
- Glossary with 10+ terms minimum
- List of files to read BEFORE executing
- Concrete example of what to do (not just abstract explanation)
- Current state vs desired state (use ASCII diagrams when helpful)
- Self-verification questions in bootstrap protocol
- Handoff scope classification (intra_processo / intra_bu / inter_bu)

## Template Selection

ATM-003 auto-selects the template based on Priority + Scope:

| Condition | Template | Checklist | Gate |
|-----------|----------|-----------|------|
| P2/P3 + `intra_processo` or `self_continuation` | [handoff-template-lite.md](./handoff-template-lite.md) | [quality-checklist-lite.md](./checklists/quality-checklist-lite.md) (6-point) | >= 4 |
| P0/P1 or `intra_bu`/`inter_bu` | [handoff-template-full.md](./handoff-template-full.md) | [quality-checklist-full.md](./checklists/quality-checklist-full.md) (10-point) | >= 7 |

**Size limits:** P3=500w, P2=1500w, P1=3000w, P0=unlimited.

**Glossary/Bootstrap/Veto** are OPTIONAL for lite template (P2/P3). They remain REQUIRED for full template (P0/P1).

### New Fields (v3.1)

| Field | Description | Values |
|-------|-------------|--------|
| `type` | Handoff classification | `session`, `agent_transfer`, `phase_transition`, `roundtable_summary`, `self_continuation` |
| `consumed` | Timestamp when next session consumed this handoff | `null` or `YYYY-MM-DD by Agent:name` |
| `parent_handoff` | Reference to parent handoff in a chain | handoff_id or `null` |
| `to` | Recipient(s) — supports array for multi-recipient | `"Agent:next-session"` or `["Agent:A", "Agent:B"]` |
| `self_continuation` | 4th scope type for agent-to-self continuity | Used when `from` == `to` (same agent, context window limit) |

### Scope Types (v3.1)

| Scope | Criteria | Human Signoff |
|-------|----------|---------------|
| `intra_processo` | Same project, same team, same session continuation | No |
| `self_continuation` | Same agent, context window approaching limit | No |
| `intra_bu` | Same Business Unit, different project or team | Recommended |
| `inter_bu` | Different Business Unit entirely | **Required** (NON-NEGOTIABLE) |

## Template

Use [handoff-template.md](./handoff-template.md) (router) to select the appropriate template. Fill every section from conversation context.

## Execution Pipeline

The pipeline follows 4 Molecules in strict sequence. The state machine tracks progress:
`IDLE -> COLLECTING -> ASSEMBLING -> VALIDATING -> PERSISTING -> [SIGNING] -> COMPLETE`

---

### Molecule 1: Context Extraction (MOL-HO-001)

**Pattern:** (ATM-001 || ATM-002) -> ATM-003

#### ATM-001: Extract Session Context [Agent]

The AI has full conversation context. Extract these answers yourself WITHOUT asking the user:

**Q1: Project name/identifier** - Derive from conversation topic
**Q2: What was done** - Summarize actions YOU executed: files created/edited, decisions made, problems solved
**Q3: What's next** - Logical next step based on remaining work, open items, or stated goals
**Q4: Vetos/critical rules** - What should NOT be touched, immutable patterns, explicit warnings given during session

Only ask the user via AskUserQuestion if the project name is genuinely ambiguous (fallback: Human).

**Completion:** Q1-Q4 all populated with concrete content.

#### ATM-002: Detect Project State [Worker]

Run these in parallel with ATM-001 using native tools (NEVER use `find` or `ls -la`):

```
# Current date
Bash: date +%Y-%m-%d

# Relevant folder structure — use Glob tool
Glob: docs/{project}/**/*
Glob: squads/{project}/**/*

# Recently modified files — use Glob tool
Glob: **/*.md (sort by modification time, take first 20)

# Git changes in session — use Bash for git only
Bash: git diff --name-only HEAD~5
Bash: git log --oneline -5
```

**Logging (M3):** Log all tool outputs and any errors to the pipeline trace. On error:
```yaml
logging:
  level: info
  on_success: "Log: tool={tool}, files_found={count}, duration={ms}"
  on_error: "Warn: tool={tool}, error={message} — continue with partial data"
```

**Failure Behavior (M8):** If ALL detection tools fail (date, glob, git all error):
```yaml
on_failure:
  action: escalate
  to: "Human:{session_owner}"
  message: "Cannot detect project state. Provide project path and branch manually."
  fallback: "Generate handoff with Q1-Q4 only (no auto-detected context)"
```

**Completion:** Date, folder tree, recent files, and git diff collected. Errors logged, never silent.

#### ATM-003: Classify Handoff Scope [Agent]

Determine the handoff scope and type from Q1-Q4 context:

| Scope | Criteria | Human Signoff |
|-------|----------|---------------|
| `intra_processo` | Same project, same team, same session continuation | No |
| `self_continuation` | Same agent, context window approaching limit (`from` == `to`) | No |
| `intra_bu` | Same Business Unit, different project or team | Recommended |
| `inter_bu` | Different Business Unit entirely | **Required** (NON-NEGOTIABLE) |

**Handoff types:** `session` (end of work session), `agent_transfer` (agent-to-agent), `phase_transition` (between phases of work), `roundtable_summary` (post-roundtable), `self_continuation` (context window limit).

**Template selection (v3.1):**
- If Priority in (P2, P3) AND Scope in (`intra_processo`, `self_continuation`) -> use **lite** template
- Otherwise -> use **full** template

**Default:** `intra_processo` scope, `session` type (most common case for /handoff invocations).

**Completion:** Scope, type, and template resolved. If `inter_bu`, flag that human signoff will be required at the end.

---

### Molecule 2: Document Assembly (MOL-HO-002)

**Pattern:** ATM-004 -> ATM-005

#### ATM-004: Resolve Template Parameters [Agent]

Map extracted data to the 4 SINKRA parameter categories:

```yaml
parameters:
  Identity:
    session_owner: "{derive from conversation or default to user}"
    project_name: "{Q1}"
    handoff_date: "{from ATM-002}"
    handoff_id: "{date}-{project}-handoff"
  Executor:
    producer: "Agent (current AI session)"
    consumer: "Agent (next AI session, zero context)"
  Threshold:
    completeness_score_min: 7.0   # TK-HO-003
    glossary_min_terms: 10        # TK-HO-004
    sections_min: 8               # TK-HO-005
    max_handoff_size: 2000        # TK-HO-012 (words)
  Context:
    project_path: "{working directory}"
    git_branch: "{from ATM-002}"
    session_topic: "{Q1 + Q2 summary}"
    handoff_scope: "{from ATM-003}"
```

**Map complexity to priority:**

| Complexity | Priority | Description |
|-----------|----------|-------------|
| 4 (System) | P0 Critical | Cross-domain, architectural impact |
| 3 (Feature) | P1 High | Multi-file, decisions needed |
| 2 (Enhancement) | P2 Medium | Few files, known pattern |
| 1 (Quick fix) | P3 Low | Single file, clear problem |

**Completion:** All 4 parameter categories resolved.

#### ATM-005: Generate Handoff Document [Agent]

1. Read the template: `.claude/skills/handoff/handoff-template.md`
2. Fill every section using resolved parameters + Q1-Q4 + detected context
3. Replace all `{PLACEHOLDERS}` with real content
4. Remove sections that genuinely don't apply (rare — most should be filled)
5. Ensure max ~2000 words (TK-HO-012)

**Completion:** All sections populated, zero unresolved placeholders, within size limit.

---

### Molecule 3: Quality Assurance & Persistence (MOL-HO-003)

**Pattern:** ATM-006 -> [ATM-007 conditional] -> ATM-008 -> ATM-010 -> ATM-011

#### ATM-006: Validate Handoff Quality [Agent]

Score each item 0 or 1. Sum = completeness score (0-10):

| # | Check | Score |
|---|-------|-------|
| 1 | Priority (P0-P3) set in header | 0/1 |
| 2 | CRITICAL CONTEXT has problem + solution in one sentence | 0/1 |
| 3 | Key Facts have temporal markers (ACTIVE/SUPERSEDED/DEPRECATED) | 0/1 |
| 4 | All main sections present (min 8 of 10) | 0/1 |
| 5 | Glossary has min 10 terms | 0/1 |
| 6 | Bootstrap has self-verification questions with expected answers | 0/1 |
| 7 | First command is copy-paste ready | 0/1 |
| 8 | Concrete example has step-by-step (not abstract) | 0/1 |
| 9 | Success criteria are measurable | 0/1 |
| 10 | Files to read BEFORE executing are listed | 0/1 |

**Gate:** Score >= 7 (TK-HO-003) = PASS. Score < 7 = FAIL -> ATM-007.

**Completion:** Score calculated and logged.

#### ATM-007: Auto-Fix Defects [Agent] (conditional)

**Only executes if ATM-006 score < 7.**

1. Identify all items with score = 0
2. Fix each from conversation context (do NOT ask the user)
3. Max 1 retry cycle (TK-HO-011: retry_policy.count = 1)
4. If still < 7 after fix: emit warning to user, persist anyway with `artifact_status: draft`

**Completion:** All fixable items corrected. Score re-evaluated.

#### ATM-008: Persist Handoff Artifact [Worker]

```bash
mkdir -p docs/sessions/$(date +%Y-%m)
```

**8a. Save markdown handoff** to: `docs/sessions/{YYYY-MM}/{date}-{project}-handoff.md`

**8b. Save YAML summary** (INFRA-GAP-3 fix — dual output for agent-handoff protocol compatibility):

```bash
mkdir -p .aiox/handoffs
```

Write a compact YAML summary (~400 tokens) to `.aiox/handoffs/handoff-session-to-next-{date}.yaml`:

```yaml
handoff:
  from: "Agent:current-session"
  to: "Agent:next-session"
  date: "{CURRENT_DATE}"
  scope: "{from ATM-003}"
  story: "{active story if any}"
  branch: "{git branch}"
context:
  what_was_done: ["{Q2 bullets}"]
  what_remains: ["{Q3 bullets}"]
  files_modified: ["{from ATM-002 git diff}"]
  decisions_made: ["{key decisions from Q2}"]
  blockers: ["{from Q4 vetos}"]
artifacts:
  - id: "{handoff_id}"
    path: "docs/sessions/{YYYY-MM}/{date}-{project}-handoff.md"
    status: "{approved|draft}"
    score: "{0-10}"
```

**8c. Update artifact registry** (INFRA-GAP-1 fix):

Append entry to `docs/sessions/registry.yaml` (create if not exists):

```yaml
# Append this entry
- id: "{handoff_id}"
  date: "{CURRENT_DATE}"
  project: "{Q1}"
  scope: "{from ATM-003}"
  score: "{0-10}"
  status: "{approved|draft}"
  path: "docs/sessions/{YYYY-MM}/{date}-{project}-handoff.md"
  word_count: "{N}"
  sections: "{N}/10"
```

Set artifact lifecycle status:
- Score >= 7: `artifact_status: approved`
- Score < 7 (after fix attempt): `artifact_status: draft`
- TTL: 30 days (TK-HO-002) — after which status -> `stale`

**Logging (M3):**
```yaml
logging:
  level: info
  on_success: "Log: saved={path}, yaml={yaml_path}, registry=updated, score={score}, status={status}"
  on_error: "Error: write_failed={path}, error={message}"
```

**Failure Behavior (M8):** If Write tool fails:
```yaml
on_failure:
  action: escalate
  to: "Human:{session_owner}"
  message: "Failed to save handoff to {path}. Error: {error}. Content is ready — save manually."
  fallback: "Output full handoff content directly to user in conversation"
```

**Completion:** Markdown file + YAML summary + registry entry all saved. Errors logged, never silent.

#### ATM-010: Record Journey Log Entry [Worker]

**Always executes after ATM-008** (SINKRA Extension 7 — Journey Log Universal).

Append a birth event to the project's journey log. If no journey log exists, create one.

Target: `docs/sessions/journey-log.yaml` (create if not exists)

```yaml
# Append this entry
- event: birth
  entity_type: handoff_artifact
  entity_id: "{handoff_id}"
  date: "{CURRENT_DATE}"
  producer: "Agent:current-session"
  consumer: "Agent:next-session (pending)"
  scope: "{from ATM-003}"
  score: "{0-10}"
  path: "docs/sessions/{YYYY-MM}/{date}-{project}-handoff.md"
  notes: "{Q2 one-line summary}"
```

When the **next AI session** consumes this handoff, it should append a consumption event:
```yaml
- event: consumed
  entity_id: "{handoff_id}"
  date: "{consumption date}"
  consumer: "Agent:consuming-session"
  notes: "Bootstrap protocol executed, work resumed"
```

**Logging (M3):**
```yaml
logging:
  level: info
  on_success: "Log: journey_log=updated, event=birth, entity={handoff_id}"
  on_error: "Warn: journey_log_write_failed, error={message} — non-blocking, continue"
```

**Failure Behavior (M8):** Journey log failure is **non-blocking**. Log warning and continue.

**Completion:** Journey log entry appended. Birth event recorded.

#### ATM-011: Update Baseline KPIs [Worker]

**Always executes after ATM-010** (M6 — Baseline de KPIs).

Read `docs/sessions/registry.yaml` and calculate running baseline from all entries:

```yaml
# Update or create docs/sessions/baseline-kpi.yaml
baseline:
  total_handoffs: "{count of entries in registry}"
  avg_score: "{average score across all handoffs}"
  avg_word_count: "{average word count}"
  avg_sections: "{average sections filled}"
  score_distribution:
    "10": "{count}"
    "9": "{count}"
    "8": "{count}"
    "7": "{count}"
    "<7": "{count}"
  scope_distribution:
    intra_processo: "{count}"
    intra_bu: "{count}"
    inter_bu: "{count}"
  last_updated: "{CURRENT_DATE}"
  baseline_established: "{true if total >= 5, else false}"
```

**Note:** Baseline is meaningful after 5+ handoffs. Before that, `baseline_established: false` — the data is collected but not yet statistically representative.

**Logging (M3):**
```yaml
logging:
  level: info
  on_success: "Log: baseline=updated, total={count}, avg_score={avg}, established={bool}"
  on_error: "Warn: baseline_update_failed — non-blocking, continue"
```

**Failure Behavior (M8):** Baseline update failure is **non-blocking**. Log and continue.

**Completion:** Baseline KPIs recalculated from registry data.

---

### Molecule 4: Artifact-Handoff (MOL-HO-004) — conditional

**Pattern:** [ATM-009 conditional on inter_bu]

#### ATM-009: Human Signoff [Human] (conditional)

**Only executes if handoff_scope = `inter_bu` (from ATM-003).**

Present to user:
```
This handoff crosses Business Unit boundaries (inter_bu).
SINKRA Constitution requires human signoff before delivery.

Handoff: {file_path}
From: {current BU}
To: {target BU}
Score: {completeness_score}/10

Approve delivery? (yes/no)
```

If approved: `artifact_status: approved`, proceed.
If rejected: `artifact_status: rejected`, log reason, end.

**Completion:** Human decision recorded.

---

## Output to User (MANDATORY)

After pipeline completes, you MUST display the handoff link to the user. This is NON-NEGOTIABLE — the user needs the path to share with the next session.

**Always end with this block:**

```
Handoff: {OUTPUT_PATH}
YAML: .aiox/handoffs/handoff-session-to-next-{date}.yaml
Score: {SCORE}/6 | Priority: {P0-P3} | Scope: {SCOPE}
Sections: {COUNT} ({lite/full}) | Words: ~{COUNT} | Referenced files: {COUNT}
Artifact: {STATUS} | TTL: 30 days
Registry: updated | Journey Log: birth recorded
Baseline: {avg_score} avg ({total} handoffs) | Established: {yes/no}
```

**CRITICAL:** The `Handoff: {OUTPUT_PATH}` line MUST be the FIRST line of the output block. The user copies this path to provide context to the next session. If this line is missing, the handoff is useless.

## Usage Example

```bash
# User runs at end of session
/handoff

# Pipeline executes:
# MOL-001: Context Extraction
#   ATM-001: Q1=innerlens-docs, Q2=cleanup+syntheses, Q3=enrichment, Q4=never delete archive/
#   ATM-002: 12 files modified, branch=feat/innerlens-cleanup, 3 commits
#   ATM-003: scope=intra_processo (same project, same team)
#
# MOL-002: Document Assembly
#   ATM-004: Identity resolved, Priority=P1 (Feature), Threshold defaults
#   ATM-005: 10 sections filled, 1180 words
#
# MOL-003: Quality Assurance & Persistence
#   ATM-006: Score 9/10 (missing: concrete example detail)
#   ATM-007: skipped (9 >= 7)
#   ATM-008: saved markdown + YAML summary + registry updated
#   ATM-010: journey log birth event recorded
#   ATM-011: baseline updated (3 handoffs, avg 8.7, not yet established)
#
# MOL-004: skipped (scope != inter_bu)

Handoff created: docs/sessions/2026-03/2026-03-23-innerlens-docs-handoff.md
YAML summary: .aiox/handoffs/handoff-session-to-next-2026-03-23.yaml
Score: 9/10 | Priority: P1 | Scope: intra_processo
Sections: 10 | Words: ~1180 | Referenced files: 8
Artifact: approved | TTL: 30 days
Registry: updated | Journey Log: birth recorded
Baseline: 8.7 avg (3 handoffs) | Established: no
```

---

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| 3.1 | 2026-03-28 | Split template (lite + full), added `type`/`consumed`/`parent_handoff`/`self_continuation` fields, multi-recipient `to:` array, lite quality checklist (6-point), size limits per priority, ATM-003 auto-selects template, glossary/bootstrap/veto optional for P2/P3 |
| 3.0 | 2026-03-26 | SINKRA full compliance (100/100), 4 molecules, 11 atoms, 14 tokens, journey log, baseline KPIs, artifact registry |

---

**Version:** 3.1
**Last Updated:** 2026-03-28
**SINKRA Compliance:** 100/100
**Architecture Reference:** outputs/sinkra-squad/handoff-generation/
