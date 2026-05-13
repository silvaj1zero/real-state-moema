---
name: governance-pipeline
description: "Chains roundtable/investigation output → ADR → Epic → validated stories ready for wave-execute. 8 phases, 5 agents (@architect, @pm, @sm, @po, roundtable)."
version: "1.0.0"
context: skill
agent: governance-pipeline
user-invocable: true
---

# Governance Pipeline

Meta-skill that orchestrates the full chain from consolidated input to
wave-execute-ready Epic. Invokes existing skills (roundtable) and AIOS agents
(@architect, @pm, @sm, @po) in sequence with Human gates.

## Pre-Flight: Runtime Compatibility (INHERITED)

This skill does NOT invoke `TeamCreate`/`SendMessage`/`Agent(team_name=...)` directly.
It chains sub-skills (`/roundtable`, `/validate-story-draft`, `/wave-execute`) and AIOS
agents (@architect, @pm, @sm, @po). Runtime compatibility is inherited from sub-skills
via their own Pre-Flight probes.

**Behavior by runtime:**
- `claude-opus-*` / `claude-sonnet-*` → all sub-skills proceed → orchestrator proceeds
- `claude-haiku-*` → sub-skills like `/roundtable` may ALLOW_WITH_WARNING, `/wave-execute`
  Swarm mode ABORT → orchestrator halts at first ABORT
- `gpt-5.*+xhigh` via `codex-tui` → sub-skills proceed on their `.agents/` projections
- `glm-*` → sub-skills will ABORT at their own probes → orchestrator halts at first ABORT

**Reference:** `docs/compat/runtime-matrix.md`

No ABORT is issued from this skill directly. Chain failure propagates from the first
sub-skill that refuses to run on the current runtime — this is the correct behavior
(do NOT wrap sub-skill failures in silent retries or alternative paths).

---

## Activation

```
/governance-pipeline {input_path} [--yolo] [--yolo-gate ADR|GAPS] [--skip-wave-hint] [--dry-run]
```

**Arguments:**
- `{input_path}` — Path to input file (RT report, handoff, research doc, SINKRA output)
- `--yolo` — Auto-approve ALL Human gates (audit trail mandatory)
- `--yolo-gate ADR` or `--yolo-gate GAPS` — Auto-approve specific gate only
- `--skip-wave-hint` — Omit the "Next Step: wave-execute" section in final report
- `--dry-run` — Parse input, generate consolidation artifact, show pipeline plan. No agent invocations.

## SINKRA Architecture (ORG-GP-001)

```yaml
organism:
  id: ORG-GP-001
  name: Governance Pipeline
  mode: GERENCIAR
  owner: sinkra-squad
  molecules: 4
  atoms: 15
  tokens: 16
  states: 13
  human_gates: 2
  compliance: 92/100
  axiomas: 8.8/10
```

### Roundtable Decisions (RT-2026-03-28-002)

All 7 decisions are architectural constraints for this skill:

| # | Decision | Constraint |
|---|----------|-----------|
| D1 | 4 molecules (SINKRA standard) | Do NOT split into 8 molecules |
| D2 | Configurable Human gates, default 2 | Post-ADR + post-gap-analysis |
| D3 | Consolidation Artifact extends handoff format | Add `type: consolidation` + `decisions[]` + `conditions[]` |
| D4 | ADR loop max 3 (configurable token) | Circuit breaker recommends scope split |
| D5 | YOLO selective per-gate | `--yolo` = all; `--yolo-gate X` = specific; audit trail mandatory |
| D6 | Gap analysis reuses /roundtable --mode gap_analysis | With --directive passing artifact chain |
| D7 | Wave-execute is a SEPARATE step | Artifact-mediated handoff, not auto-invoke |

## State Machine

Flow: `IDLE -> CONSOLIDATING -> ARCHITECTING -> RT_ADR_LOOP -> PAUSED_ADR -> GENERATING_EPIC -> DRAFTING_STORIES -> VALIDATING_STORIES -> RT_FINAL -> REPORTING -> COMPLETED`. ADR rejection aborts or loops to `ARCHITECTING` until `TK-GP-001`; failed story validation loops only failed stories; final gaps enter `PAUSED_GAPS` and are fixed, accepted with deviation, or aborted.

## Tokens

```yaml
tokens:
  # Threshold
  TK-GP-001:
    name: max_adr_loop_iterations
    value: 3
    applies_to: ATM-GP-006
    note: "Circuit breaker. On trigger, recommend ADR scope split (K2)."

  TK-GP-002:
    name: story_validation_min_score
    value: 7
    applies_to: ATM-GP-010

  TK-GP-003:
    name: gap_severity_auto_accept
    value: MEDIUM
    applies_to: ATM-GP-013
    note: "Gaps below this severity auto-accept with log"

  # Time
  TK-GP-004:
    name: pipeline_timeout_hours
    value: 4
    applies_to: organism
    note: "Excludes PAUSED time"

  TK-GP-005:
    name: architect_timeout_minutes
    value: 30
    applies_to: ATM-GP-004

  TK-GP-006:
    name: story_draft_timeout_minutes
    value: 15
    applies_to: ATM-GP-009
    note: "Per story"

  # Capacity
  TK-GP-007:
    name: max_stories_per_epic
    value: 15
    applies_to: ATM-GP-009

  # Behavior
  TK-GP-008:
    name: yolo_mode
    value: false
    applies_to: [ATM-GP-007, ATM-GP-013]

  TK-GP-009:
    name: yolo_gate_selective
    value: null
    applies_to: [ATM-GP-007, ATM-GP-013]
    note: "ADR | GAPS | null"

  # Identity
  TK-GP-010:
    name: pipeline_id
    value: "GP-{YYYY}-{NNN}"

  # Context
  TK-GP-011:
    name: source_rt_ref
    value: null
  TK-GP-012:
    name: adr_ref
    value: null
  TK-GP-013:
    name: epic_ref
    value: null
  TK-GP-014:
    name: artifact_chain
    value: []
    note: "Array of all artifacts produced, in order"

  # Executor (added post-RT-003 gap analysis)
  TK-GP-015:
    name: accountable
    value: "user"
    applies_to: organism
  TK-GP-016:
    name: escalation_target
    value: "user"
    applies_to: [ATM-GP-006, ATM-GP-013]

  # Time (K3 — deferred from RT-002, implemented as optional)
  TK-GP-017:
    name: adr_loop_cooldown_seconds
    value: 0
    applies_to: ATM-GP-006
    note: "K3 companion token. Default 0 (no cooldown). Set > 0 to enforce delay between ADR loop iterations."
```

---

## MOL-GP-001: Input Consolidation

**Trigger:** User invokes `/governance-pipeline {path}`
**Maps to user phase:** Consolidate

### ATM-GP-001: Parse Input Source

Read the input file. Extract structured data:

```yaml
extract:
  decisions: []      # From RT report decisions section
  conditions: []     # From RT conditions/K-items
  gaps: []           # From gap analysis or investigation
  next_steps: []     # From action plan or execution plan
  participants: []   # From RT participants or stakeholders
  source_type: ""    # roundtable | handoff | research | sinkra_output
  source_ref: ""     # File path
```

If input is a roundtable report, parse the `decisions` and `conditions` sections directly.
If input is a handoff, parse `what_remains` and `decisions_made`.
If input is a research doc, parse conclusions and recommendations.

### ATM-GP-002: Generate Consolidation Artifact

Use template `templates/consolidation-artifact-tmpl.yaml`.
The consolidation artifact EXTENDS the handoff format (D3) with:
- `type: consolidation`
- `decisions[]` with ID, text, vote, source
- `conditions[]` with ID, severity, text
- `artifact_chain: [source_ref]`

Persist to: `.aiox/governance-pipelines/{pipeline_id}/consolidation.yaml`

### ATM-GP-003: Validate Pipeline Readiness

Run readiness checklist (`checklists/readiness-checklist.md`):

1. Input has at least 1 decision or 1 actionable next_step
2. Source type identified
3. No blocking veto conditions from input
4. At least 1 stakeholder/participant identified

If ANY check fails: HALT. Present missing items. Ask user to provide or abort.
If ALL pass: Transition to ARCHITECTING.

---

## MOL-GP-002: Architecture & Decision Loop

**Trigger:** Consolidation artifact ready and validated
**Maps to user phases:** Architect ADR, RT Loop, Human Approve

### ATM-GP-004: Invoke @architect

Delegate to @architect with context:

```
@architect *analyze-project-structure

Context: {consolidation_artifact_path}
Decisions to implement: {decisions[].text}
Conditions to respect: {conditions[].text}
Produce: ADR draft at docs/architecture/ADR-NNN-{slug}.md
```

The architect reads the consolidation artifact, analyzes the project structure,
and produces an ADR draft. Wait for completion (timeout: TK-GP-005).

Record `adr_ref` in token TK-GP-012. Append to `artifact_chain`.

### ATM-GP-005: Invoke /roundtable (ADR Review)

```
/roundtable {adr_path} --mode decision
  --directive "Validate this ADR against the original roundtable decisions: {source_rt_ref}.
  Check: (1) All original decisions reflected in ADR, (2) No contradictions with conditions,
  (3) Technical feasibility, (4) SINKRA compliance."
```

Wait for roundtable verdict.

### ATM-GP-006: ADR Loop Controller

```yaml
logic:
  if verdict == DECIDED or verdict == APPROVE:
    proceed: true
  else:
    iteration += 1
    if iteration > TK-GP-001:
      # Circuit breaker (K2): recommend scope split
      present_to_user:
        message: "ADR loop atingiu {max} iteracoes. Recomendacao: dividir ADR em escopos menores."
        options: [split_adr, force_approve, abort]
    else:
      # Loop back to ATM-GP-004 with RT feedback
      feedback = extract_changes_requested(verdict)
      goto: ATM-GP-004 (with feedback)
```

### ATM-GP-007: Human Gate — ADR Approval

**State: PAUSED_ADR**

Present to user:
```
## ADR Approval Gate

**ADR:** {adr_ref}
**RT Verdict:** {verdict} ({score}/10)
**Iterations:** {iteration}/{max}

**Decisions validated:** {count}/{total}
**Conditions respected:** {count}/{total}

Options:
  [1] APPROVE — proceed to Epic creation
  [2] REJECT — abort pipeline
  [3] REVISE — send back to @architect with notes
```

**YOLO behavior:**
- If `--yolo` or `--yolo-gate ADR`: auto-approve with audit log entry
- Audit log entry (K1): `{ gate: ADR, action: auto_approved, yolo: true, timestamp }`

On APPROVE: transition to GENERATING_EPIC.

---

## MOL-GP-003: Epic & Story Generation

**Trigger:** ADR approved (Human or YOLO)
**Maps to user phases:** PM Epic, SM Stories, PO Validate

### ATM-GP-008: Invoke @pm — Create Epic

```
@pm

Context:
- ADR approved: {adr_ref}
- Consolidation artifact: {consolidation_path}
- Original decisions: {decisions[]}
- Scope: {extracted from ADR}

Create Epic at: docs/stories/epic-{N}/EPIC-{N}-{SLUG}.md
Include: wave structure, story stubs, acceptance criteria outline
```

Wait for Epic creation. Record `epic_ref` in TK-GP-013. Append to `artifact_chain`.

### ATM-GP-009: Invoke @sm *draft — Create Stories

For each story stub in the Epic:

```
@sm *draft

Context:
- Epic: {epic_ref}
- ADR: {adr_ref}
- Story number: {N.M}
```

Sequential execution (each story may reference prior stories).
Timeout per story: TK-GP-006.
Max stories: TK-GP-007.

Collect all story file paths. Append to `artifact_chain`.

### ATM-GP-010: Invoke @po *validate-story-draft

For each drafted story:

```
@po *validate-story-draft {story_path}
```

Collect validation reports: `{ story_id, score, pass, issues[] }`.

### ATM-GP-011: Story Validation Controller

```yaml
logic:
  passed = stories where score >= TK-GP-002
  failed = stories where score < TK-GP-002

  if failed.length == 0:
    proceed to RT_FINAL
  else:
    present_to_user:
      message: "{failed.length} stories falhou na validacao PO."
      failed_details: [{ story_id, score, issues }]
      options: [redraft_failed, accept_as_is, abort]
    if redraft_failed:
      goto ATM-GP-009 (only for failed stories)
    if accept_as_is:
      log_deviation(failed_stories)
      proceed to RT_FINAL
```

---

## MOL-GP-004: Final Validation & Output

**Trigger:** All stories validated (or accepted with deviation)
**Maps to user phase:** RT Final (Gap Analysis)

### ATM-GP-012: Invoke /roundtable (Final Gap Analysis)

```
/roundtable {epic_dir} --mode gap_analysis
  --directive "Compare these artifacts for consistency gaps:
  1. Original roundtable: {source_rt_ref}
  2. ADR: {adr_ref}
  3. Epic: {epic_ref}
  4. Stories: {story_paths[]}

  Check for:
  - Decisions in RT not reflected in ADR
  - ADR scope not covered by stories
  - Stories without traceability to ADR/RT decisions
  - Conditions (K-items) not enforced in stories
  - Missing acceptance criteria for key decisions"
```

### ATM-GP-013: Gap Resolution Controller

```yaml
logic:
  if verdict == NO_GAPS:
    proceed to REPORTING
  elif verdict == GAPS_IDENTIFIED:
    gaps = extract_gaps(verdict)
    auto_accept = gaps.filter(g => g.severity < TK-GP-003)
    manual_review = gaps.filter(g => g.severity >= TK-GP-003)

    if manual_review.length == 0:
      log_auto_accepted(auto_accept)
      proceed to REPORTING
    else:
      # Human Gate 2: PAUSED_GAPS
      present_to_user:
        message: "{manual_review.length} gaps de severidade >= {TK-GP-003} encontrados."
        gaps: manual_review
        auto_accepted: auto_accept.length
        options:
          - fix: "Corrigir (voltar para fase afetada)"
          - accept: "Aceitar com desvio documentado"
          - abort: "Cancelar pipeline"

      # YOLO behavior
      if --yolo or --yolo-gate GAPS:
        auto_action: accept (with audit log)
```

### ATM-GP-014: Generate Pipeline Report

Use template `templates/pipeline-report-tmpl.md`.

Report includes:
- Pipeline ID, duration, input source
- All phases with status and artifacts
- Artifact chain (linked)
- Gate audit log (K1)
- Decisions traceability matrix (RT decision -> ADR section -> Story)
- Gap analysis summary
- Next Step section with wave-execute command (K4), unless `--skip-wave-hint`

Persist to: `docs/sessions/{YYYY-MM}/{date}-governance-pipeline-{slug}.md`

### ATM-GP-015: Persist & Register

1. Mark consolidation artifact as `consumed: true`
2. Update artifact_chain with final report
3. Persist pipeline state to `.aiox/governance-pipelines/{pipeline_id}/state.yaml`
4. Log completion in journey log

Transition to COMPLETED.

---

## Governance Checkpoints

| # | When | Check | Fail Action |
|---|------|-------|-------------|
| GPC-1 | Pre-pipeline | Input has decisions or next_steps | HALT |
| GPC-2 | Post-architect | ADR references all RT decisions | Flag missing |
| GPC-3 | Post-RT-loop | RT verdict is DECIDED | Loop or escalate |
| GPC-4 | Post-Human-Gate-1 | ADR approved | ABORT if rejected |
| GPC-5 | Post-PM | Epic has story stubs | Flag if empty |
| GPC-6 | Post-SM | All stories have ACs | Flag missing |
| GPC-7 | Post-PO | All stories score >= 7 | Redraft or accept |
| GPC-8 | Post-gap-analysis | No HIGH+ gaps unresolved | Fix or accept |
| GPC-9 | Post-pipeline | Gate audit log complete (K1) | Warn |

## Anti-Patterns

- **AP-1:** Skipping @architect and going straight to @pm — ADR is mandatory
- **AP-2:** Auto-approving gaps without audit trail — YOLO still logs
- **AP-3:** Running stories in parallel — they may depend on each other
- **AP-4:** Invoking /wave-execute from within this skill — D7 says SEPARATE step
- **AP-5:** Recreating roundtable logic — D6 says REUSE /roundtable

## Veto Conditions

- **V1:** Building without SINKRA mapping — this skill IS the mapping result
- **V2:** Recreating skill logic — INVOKE existing skills, never replicate
- **V3:** Removing Human gates in default mode — YOLO is opt-in only
- **V4:** Skipping final gap analysis — non-negotiable safety net
- **V5:** Auto-invoking wave-execute — D7 prohibits, artifact-mediated handoff only
