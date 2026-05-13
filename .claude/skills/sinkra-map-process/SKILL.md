---
name: sinkra-map-process
description: "SINKRA Process Mapping — 7-phase pipeline (Discovery → Architecture → Executors → Workflows → Tasks → QA Gates → Infra → Handoff) with checkpoint enforcement."
version: "1.2.0"
owner_squad: "sinkra-squad"
sinkra_tier: Tier2
context: conversation
agent: general-purpose
user-invocable: true
argument-hint: "<process-name> [--type greenfield|brownfield] [--mode yolo|interactive]"
depends_on: []
invokes: ["/squadCreator:squad-chief"]
---

# SINKRA Map Process — 7-Phase Process Mapping Pipeline

Orchestrates the complete SINKRA Process-mode pipeline from Discovery through Handoff
using Agent Teams. Each phase is executed by the correct specialist agent with full
checkpoint enforcement. VETO checkpoints are real — phases do not advance without APPROVE.

Source of truth: `squads/sinkra-squad/workflows/sinkra-pipeline.yaml`
Orchestrator agent: `squads/sinkra-squad/agents/sinkra-chief.md`

## Usage

```
/sinkra-map-process "Casting e Seleção de Talentos"
/sinkra-map-process "Onboarding B2B" --type greenfield
/sinkra-map-process "Pipeline de Vendas" --type brownfield --mode yolo
```

## Execution Model — Spawn Canonical, Inline Fallback

Phase specialists are now published as flat-name subagents in `.claude/agents/`:
`process-discoverer`, `architecture-designer`, `executor-classifier`, `composition-engineer`, `quality-gatekeeper`, `infrastructure-mapper`, `sinkra-qa`. Each stub points to the canonical persona in `squads/sinkra-squad/agents/{name}.md` and the task protocol in `squads/sinkra-squad/tasks/{task_ref}.md`.

**Canonical execution:** each phase spawns its specialist via `Agent(subagent_type: "{phase-agent-name}", ...)` using the **flat agent id** (no squad prefix). The spawnee reads persona + task protocol, executes, emits outputs, and SendMessages the verdict back to `team-lead`.

### Phase → Agent → Task Mapping (source of truth)

The mapping is declared **once** in `squads/sinkra-squad/workflows/sinkra-pipeline.yaml`. For each phase:
- `agent: {id}` → `subagent_type` to spawn AND `.claude/agents/{id}.md` stub
- `task_ref: {id}` → `squads/sinkra-squad/tasks/{id}.md` task protocol the spawnee must load

Convention: `agent` value IS the `.claude/agents/{id}.md` filename AND the `squads/sinkra-squad/agents/{id}.md` canonical persona filename. `task_ref` value IS the `squads/sinkra-squad/tasks/{id}.md` filename.

### Spawn Fallback — Inline Execution

Before declaring a spawn stalled, the chief MUST verify BOTH conditions (NOT idle alone — see DEV-2026-001, criacao-slides-ia). `idle_notification` fires at turn boundaries, not task boundaries; an agent mid-write appears "idle" between sequential writes but is NOT stalled.

**Stall definition (both required):**
1. `no outbound SendMessage` from the spawnee to `team-lead` during the observation window, AND
2. `no artifact writes` detected in `outputs/sinkra-squad/{process-slug}/` during the observation window (Ls diff or mtime check).

Observation window: at least 2 consecutive turns.

**If stalled** (both conditions met for > 2 turns): fall back to **inline execution**:
1. Read `squads/sinkra-squad/agents/{phase-agent}.md` (persona)
2. Read `squads/sinkra-squad/tasks/{task_ref}.md` (protocol)
3. Execute the phase with persona fidelity
4. Emit the declared outputs
5. Log a deviation in `outputs/sinkra-squad/{process-slug}/deviations.yaml` (schema: MUST include `symptom`, `actual_outcome`, `root_cause_hypothesis`, `recommendation_for_skill`)

**If idle_notification fires but artifacts ARE being written:** the agent is working. Do NOT pre-empt. Wait. Prepare inline scaffolding for faster takeover if true stall later.

Inline fallback preserves pipeline continuity. Do not re-spawn indefinitely.

## NON-NEGOTIABLE RULES (read BEFORE any phase)

**RULE 1: Phase 07b MUST run `@sinkra-qa` with `SINKRA_QA_GATE` (compliance ≥ 80, structural_integrity ≥ 0.8, zero CRITICAL violations).** No bypass, no estimation, no "the mapping looks clean."

If you are about to skip this because "the artifacts look good" or "compliance is obvious" — **STOP. Run the gate. There is no shortcut.** The agent takes ~5 minutes. A pipeline that emits a handoff without SINKRA_QA_GATE APPROVE is INADMISSIBLE downstream.

**RULE 2: Checkpoints are absolute.** VETO halts. No override. REVIEW requires user approval + deviation log with **mandatory `recommendation_for_skill` field** (concrete fix). Deviation without `recommendation_for_skill` breaks the feedback loop and is INADMISSIBLE.

**RULE 3: Do NOT substitute phase agents with inline free-styling.** Each phase MUST load `squads/sinkra-squad/agents/{phase-agent}.md` (persona) + `squads/sinkra-squad/tasks/{task_ref}.md` (protocol) BEFORE emitting artifacts. Inline fallback (post spawn failure) follows the same read-first rule. Skipping the read = persona violation = VETO.

**RULE 4: Sequential execution. No parallelism across phases.** Each phase's outputs are inputs to the next. Running P03 before P02's `architecture.yaml` exists corrupts PV_PA_001 scoring. No exceptions.

**RULE 5: Spawn stall requires BOTH conditions** — (a) no SendMessage AND (b) no artifact writes for >2 turns. `idle_notification` alone is NOT stall. See `### Spawn Fallback` above.

**RULE 6: Prior-Art before absence.** Any claim of "missing / does not exist / needs to be created" requires documented Grep/Glob search with verdict. See `.claude/rules/prior-art-search.md`. Gaps and CREATEs without Prior-Art rows are INADMISSIBLE.

**RULE 7: Incremental learning log.** Write at Phase 0, update after EVERY phase. Post-hoc writes are forbidden. See `.claude/rules/incremental-learning-log.md`.

**RULE 8: Output schema.** All artifacts persist under `outputs/sinkra-squad/{process-slug}/`. TaskCreate for visual tracking; TaskUpdate on each phase completion.

**RULE 9: Duration semantics.** Use `elapsed_minutes` (wall-clock, captured via `start_epoch = Bash("date +%s")`) and `effort_estimate_hours` (human estimate) as DISTINCT fields. Never mix.

**RULE 10: Scope.** Process mode only. Mission mode is out of scope (use `*map-mission` on `@sinkra-chief`).

---

## WHEN CALLED BY ANOTHER SKILL

This skill is invoked by `/sinkra-upgrade-squad` Phase 3 (brownfield mapping step). The pipeline MUST execute identically when called from another skill's context — TeamCreate + real Agent() spawns + all checkpoints + SINKRA_QA_GATE. Do NOT "simplify" or "estimate" because you are inside another skill.

If you are about to skip phases because "upgrade-squad already validated" — STOP. Each skill is responsible for its own gates. The 7 phases take 60-120 minutes. There is no faster alternative. Run them.

Caller receives:
- `outputs/sinkra-squad/{process-slug}/sinkra-output.yaml` (canonical handoff)
- `outputs/sinkra-squad/{process-slug}/handoff-downstream.yaml` (routing manifest)
- SINKRA_QA_GATE verdict: APPROVE (≥80) is the only green light for caller to proceed

---

## Phase 00: Parse Args + Initialize (team-lead, inline)

### 0.1 — Extract Arguments

```
process_name = argument[0]            # required
type_flag    = argument[--type]       # optional: greenfield | brownfield (default: infer)
mode         = argument[--mode]       # optional: yolo | interactive (default: interactive)
process_slug = kebab-case(process_name)
output_dir   = outputs/sinkra-squad/{process_slug}/
```

### 0.2 — Infer Type (when not provided)

Follow sinkra-chief's MODE DETECTION heuristic:
- **Brownfield signals:** existing squad/skill referenced, prior session artifacts, user points at existing code/docs, phrases "o que fizemos", "formalize this"
- **Greenfield signals:** "new process", "from scratch", "não existe ainda", generic process name with zero context
- When genuinely ambiguous → prompt the user once. Otherwise infer silently with a one-line note.

### 0.3 — Pre-Flight Checks

- Halt if `process_name` missing → ask user
- Halt if `outputs/sinkra-squad/{process_slug}/` already exists AND not brownfield re-analysis → ask user whether to resume, overwrite, or pick a new slug
- Verify `squads/sinkra-squad/workflows/sinkra-pipeline.yaml` exists (source of truth)

### 0.4 — Display Analysis Summary

```
╔══════════════════════════════════════════════════════════╗
║  SINKRA Map Process — {process_name}                      ║
╠══════════════════════════════════════════════════════════╣
║  Slug:         {process_slug}                             ║
║  Type:         {greenfield|brownfield}                    ║
║  Mode:         {yolo|interactive}                         ║
║  Output Dir:   outputs/sinkra-squad/{process_slug}/       ║
╠══════════════════════════════════════════════════════════╣
║  Pipeline (7 phases + initialization):                    ║
║    P00. Initialization (@sinkra-chief)                    ║
║    P01. Discovery (@process-discoverer)                   ║
║    P02. Architecture (@architecture-designer) [PV_BS_001] ║
║    P03. Executors (@executor-classifier) [PV_PA_001]      ║
║    P04. Workflows (@composition-engineer) [PV_PM_001]     ║
║    P05. Task Definitions (@composition-engineer)          ║
║    P06. QA Gates (@quality-gatekeeper) [META_AXIOMAS]     ║
║    P07a. Infrastructure (@infrastructure-mapper)          ║
║    P07b. QA Validation (@sinkra-qa) [SINKRA_QA_GATE]      ║
║    P07c. Squad Handoff (@sinkra-chief)                    ║
║    P07d. Downstream Handoff (@sinkra-chief)               ║
╚══════════════════════════════════════════════════════════╝
```

Proceed directly. Only HALT conditions (missing args, VETO without resolution, QA FAIL) surface to user.

---

## Phase 00b: Create Team + Tasks

### Create Team

```
TeamCreate(
  team_name: "sinkra-map-{process_slug}",
  description: "SINKRA Process Mapping — {process_name}"
)
```

### Create Tasks (visual tracking)

```
TaskCreate(title: "P00: Initialization", description: "Validate inputs, create output dir, route pipeline")
TaskCreate(title: "P01: Discovery (@process-discoverer)", description: "Map process, stakeholders, AS-IS")
TaskCreate(title: "P02: Architecture (@architecture-designer) [PV_BS_001]", description: "Design end-state, domain map")
TaskCreate(title: "P03: Executors (@executor-classifier) [PV_PA_001]", description: "Classify Human/Agent/Clone/Worker, RACI")
TaskCreate(title: "P04: Workflows (@composition-engineer) [PV_PM_001]", description: "Compose workflows + automation specs")
TaskCreate(title: "P05: Task Definitions (@composition-engineer)", description: "8-field tasks, dependency graph, tokens")
TaskCreate(title: "P06: QA Gates (@quality-gatekeeper) [META_AXIOMAS]", description: "10-dimension axioma validation")
TaskCreate(title: "P07a: Infrastructure (@infrastructure-mapper)", description: "Map Worker tasks to infrastructure")
TaskCreate(title: "P07b: QA Validation (@sinkra-qa) [SINKRA_QA_GATE]", description: "MANDATORY compliance ≥ 80")
TaskCreate(title: "P07c: Squad Handoff (@sinkra-chief)", description: "Generate sinkra-output.yaml + .md + diagram")
TaskCreate(title: "P07d: Downstream Handoff (@sinkra-chief)", description: "Emit handoff-downstream.yaml")
```

---

## Phase 00c: Context Manifest Protocol (token + time optimization)

### Why

Each subagent spawned starts with a cold context window. Without a digest, the spawnee re-reads every upstream YAML/MD individually — paying input token cost on identical material across phases. Measured baseline (5 historical runs): ~340-380k tokens of redundant upstream re-reads per pipeline (~$1+ in input cost, ~25min wall-clock). The manifest cuts this to ~30k by giving each phase a 1-page distilled summary.

### Rule

**The orchestrator (team-lead) maintains `{output_dir}/_context-manifest.md` as a single, overwritable summary file.** It is updated INCREMENTALLY at the end of each phase. Each phase prompt instructs the spawnee to read the manifest FIRST, and only Read individual upstream artifacts when the manifest pointers are insufficient for the specific decision they are making.

### Initial Write (after Phase 00b TaskCreate)

```
Write {output_dir}/_context-manifest.md with this seed content:

  # Context Manifest — {process_name}
  # Maintained by team-lead. Read this BEFORE any individual artifact Read.
  # Updated incrementally after each phase. Stale phases marked [pending].

  ## Run Metadata
  - process_slug: {process_slug}
  - type: {greenfield|brownfield}
  - mode: {yolo|interactive}
  - started_at: {ISO}
  - output_dir: {output_dir}

  ## Source Inputs (brownfield)
  - {list of canonical artifacts being mapped — workflow files, agents, scripts}
  - {1-line description of why each matters}

  ## Phase Digest

  ### P01 Discovery — [pending]
  ### P02 Architecture — [pending]
  ### P03 Executors — [pending]
  ### P04 Workflows — [pending]
  ### P05 Task Definitions — [pending]
  ### P06 QA Gates — [pending]
  ### P07a Infrastructure — [pending]
  ### P07b SINKRA QA — [pending]
```

### Update Protocol (after each phase SendMessage)

When a phase completes and SendMessages the verdict to team-lead:

1. team-lead reads the verdict + scores + 3-bullet summary returned
2. team-lead overwrites the corresponding section in `_context-manifest.md` with:

```
  ### P0N {Name} — completed | halted | failed
  - verdict: {APPROVE|REVIEW|VETO|n/a}
  - scores: {key:value, key:value}  # checkpoint scores when applicable
  - artifacts: [path1, path2, path3]
  - 3-bullet summary:
    1. {first bullet from spawnee SendMessage}
    2. {second bullet}
    3. {third bullet}
  - key_decisions: {1-2 lines on the consequential design choices, no prose}
  - pointer_to_detail: "See {output_dir}/{primary-artifact}.yaml lines L-LL for {topic}"
```

The manifest stays under ~200 lines after all 8 phases. Pointers replace re-quoting.

### Spawn Prompt Change (applied to every phase below)

Every phase prompt MUST include this preface BEFORE the persona/task read instructions:

```
FIRST: Read {output_dir}/_context-manifest.md (this is the orchestrator's distilled
upstream digest — your fast path to upstream context). Use the pointers there to
decide which individual upstream YAMLs/MDs you actually need to read in detail
for the specific work of this phase. Do NOT re-read every upstream artifact —
the manifest exists precisely to avoid that redundancy. Read individual artifacts
only when the manifest is insufficient for a specific decision you must make.
```

This preface MUST be present in every Phase 01-07c spawn/dispatch prompt.

### What the Manifest Does NOT Replace

- Phase 07b SINKRA_QA_GATE still re-validates compliance against ALL canonical artifacts (not just the manifest) — the gate is the system's authoritative check, must NOT trust a digest written by the same orchestrator it is auditing.
- Phase 07c Squad Handoff still reads the canonical artifacts to assemble sinkra-output.yaml — the handoff is the SOT export, must trace back to truth.

So P07b and P07c are **explicitly exempt** from the "manifest first" preface — they get full upstream artifact access. All other phases use the manifest as primary entry.

---

## Phase 01: Discovery

### Spawn process-discoverer

```
Agent(
  subagent_type: "process-discoverer",
  name: "process-discoverer",
  team_name: "sinkra-map-{process_slug}",
  model: "sonnet",
  description: "SINKRA P01: Discovery",
  prompt: "You are @process-discoverer.

    FIRST: Read {output_dir}/_context-manifest.md (orchestrator's distilled upstream digest — your fast path to upstream context). Use the pointers there to decide which individual upstream artifacts you actually need to read in detail. Do NOT re-read every upstream artifact — the manifest exists precisely to avoid that redundancy. P01 is the first phase, so the manifest contains only seed metadata (process_name, type, source inputs) — that's enough at this stage.
    THEN: Read persona from squads/sinkra-squad/agents/process-discoverer.md
    THEN: Read task protocol from squads/sinkra-squad/tasks/discover-process.md
    THEN: Execute the COMPLETE discovery protocol for:

    Process: {process_name}
    Type: {greenfield|brownfield}
    Output dir: {output_dir}

    Produce:
      - {output_dir}/process_map.yaml
      - {output_dir}/stakeholders.yaml
      - {output_dir}/as_is_doc.md

    Completion criteria:
      - process_map contains ≥ 1 phase
      - stakeholders contains ≥ 1 stakeholder
      - as_is_doc is AS-IS (not TO-BE)
      - PRIOR-ART SEARCH (brownfield MANDATORY): as_is_doc.md contains a 'Prior-Art Search' section with at least one row per declared GAP-*. Each row documents: claim, search performed (Grep/Glob command), matches count, verdict. Gaps without this row are INADMISSIBLE — do not declare them. See process-discoverer.md § PRIOR-ART SEARCH PROTOCOL.
      - Burden of proof: you must PROVE absence (grep/glob across squads/**, scripts/**, .aiox-core/**, .claude/**) before claiming any script/task/artifact is missing. Unverified gaps fossilize into fictional architecture downstream.

    When done, SendMessage to 'team-lead' with:
      - Status: completed | halted
      - Files produced: list
      - AS-IS summary (3 bullets)
      - Gap count declared vs. Prior-Art rows documented (must match)
      - Any blockers"
)
```

**On completed:** TaskUpdate(P01, completed). Proceed to P02.
**On halted:** Show blocker to user; resume via SendMessage.

---

## Phase 02: Architecture — Checkpoint PV_BS_001

### Spawn architecture-designer

```
Agent(
  subagent_type: "architecture-designer",
  name: "architecture-designer",
  team_name: "sinkra-map-{process_slug}",
  model: "sonnet",
  description: "SINKRA P02: Architecture",
  prompt: "You are @architecture-designer.

    FIRST: Read {output_dir}/_context-manifest.md (orchestrator's distilled upstream digest, contains P01 verdict + AS-IS summary + Prior-Art rows + pointers). Use the manifest first; read the canonical artifacts ONLY when its pointer is insufficient for an architectural decision you must make.
    THEN: Read persona from squads/sinkra-squad/agents/architecture-designer.md
    THEN: Read task protocol from squads/sinkra-squad/tasks/design-architecture.md
    THEN: Execute COMPLETE architecture protocol.

    Inputs (consult only as needed per manifest pointers): {output_dir}/process_map.yaml, stakeholders.yaml, as_is_doc.md

    Produce:
      - {output_dir}/architecture.yaml
      - {output_dir}/domain_map.yaml
      - {output_dir}/architecture_diagram.md

    Run Checkpoint PV_BS_001 (Future Back-Casting):
      - end_state_vision_clarity ≥ 0.7 (veto if below, weight 0.9)
      - market_signals (informative, weight 0.1)

    When done, SendMessage to 'team-lead' with:
      - Checkpoint verdict: APPROVE | REVIEW | VETO
      - Scores: end_state_vision_clarity, market_signals, weighted
      - Files produced
      - If REVIEW/VETO: rationale and remediation plan"
)
```

### Process Checkpoint Result

Apply sinkra-chief's checkpoint heuristics:
- **APPROVE** → TaskUpdate(P02, completed). Proceed to P03.
- **REVIEW** → Show scores+gaps to user. Ask approve/reject.
  - Approve → log deviation in `squads/sinkra-squad/data/deviation-registry.yaml` (DEV-YYYY-NNN) → proceed.
  - Reject → SendMessage(architecture-designer) with feedback → re-run checkpoint.
- **VETO** → HALT pipeline. No override. Show failing dimension. SendMessage(architecture-designer) for redesign on user instruction.

---

## Phase 03: Executors — Checkpoint PV_PA_001

### Spawn executor-classifier

```
Agent(
  subagent_type: "executor-classifier",
  name: "executor-classifier",
  team_name: "sinkra-map-{process_slug}",
  model: "sonnet",
  description: "SINKRA P03: Executors",
  prompt: "You are @executor-classifier.

    FIRST: Read {output_dir}/_context-manifest.md (orchestrator's distilled upstream digest, contains P01 + P02 verdicts, architecture decisions, and pointers). Use the manifest first; read individual upstream YAMLs only when its pointers are insufficient for the executor classification you must do.
    THEN: Read squads/sinkra-squad/agents/executor-classifier.md
    THEN: Read squads/sinkra-squad/tasks/classify-executors.md
    THEN: Execute COMPLETE executor classification protocol.

    Inputs: {output_dir}/architecture.yaml, domain_map.yaml, architecture_diagram.md

    Produce:
      - {output_dir}/executor_matrix.yaml
      - {output_dir}/raci_matrix.yaml
      - {output_dir}/capability_gaps.md

    Run Checkpoint PV_PA_001 (Systemic Coherence Scan):
      - truthfulness_coherence thresholds by executor (Human 0.7, Agent 0.9, Clone 0.9, Worker 0.95)
      - weighted_coherence ≥ 0.8 (veto if below)

    When done, SendMessage to 'team-lead' with verdict (APPROVE|REVIEW|VETO), scores, files, rationale."
)
```

Apply checkpoint handling (APPROVE | REVIEW | VETO) as in P02.

---

## Phase 04: Workflows — Checkpoint PV_PM_001

### Spawn composition-engineer

```
Agent(
  subagent_type: "composition-engineer",
  name: "composition-engineer",
  team_name: "sinkra-map-{process_slug}",
  model: "sonnet",
  description: "SINKRA P04+P05: Workflows + Tasks",
  prompt: "You are @composition-engineer. You will execute TWO sequential phases (P04 then P05 on re-dispatch).

    === PHASE 04: WORKFLOWS ===
    FIRST: Read {output_dir}/_context-manifest.md (orchestrator's distilled upstream digest, contains P01+P02+P03 verdicts, executor distribution, capability gaps with Prior-Art, and pointers). Use the manifest first; read individual upstream YAMLs (executor_matrix.yaml, capability_gaps.md, architecture.yaml) only when manifest pointers are insufficient for a composition decision.
    THEN: Read squads/sinkra-squad/agents/composition-engineer.md
    THEN: Read squads/sinkra-squad/tasks/compose-workflows.md
    Execute COMPLETE workflow composition.

    Inputs: {output_dir}/executor_matrix.yaml, raci_matrix.yaml, capability_gaps.md, architecture.yaml

    Produce:
      - {output_dir}/workflow_definition.yaml
      - {output_dir}/composition_map.yaml
      - {output_dir}/automation_specs.yaml

    Run Checkpoint PV_PM_001 (Automation Tipping Point):
      - guardrails_missing == true → VETO ABSOLUTE
      - frequencia ≥ 2 executions/month
      - padronizacao ≥ 0.7
      - output ∈ {AUTOMATE, DELEGATE, ELIMINATE, KEEP_MANUAL, VETO}

    When done, SendMessage to 'team-lead' with verdict, scores, files."
)
```

Apply checkpoint handling. On APPROVE → keep agent alive, dispatch P05.

---

## Phase 05: Task Definitions

### Reuse composition-engineer

```
SendMessage(
  to: "composition-engineer",
  summary: "P05: Task Definitions",
  message: "Phase 04 approved. Execute Phase 05 (Task Definitions).

    Read squads/sinkra-squad/tasks/define-tasks.md
    Execute COMPLETE task definition protocol.

    Inputs: {output_dir}/workflow_definition.yaml, composition_map.yaml,
            automation_specs.yaml, executor_matrix.yaml

    Produce:
      - {output_dir}/task_definitions.yaml
      - {output_dir}/dependency_graph.yaml
      - {output_dir}/token_assignments.yaml

    Completion criteria (task anatomy validation):
      - EVERY task has 8 fields
      - EVERY task has exactly 1 executor
      - dependency_graph is a valid DAG (0 cycles, 0 orphans)

    When done, SendMessage to 'team-lead' with:
      - Status: completed | failed
      - Anatomy validation: pass | fail (with violations)
      - Files produced"
)
```

**On pass:** TaskUpdate(P05, completed). Proceed to P06.
**On fail:** WARN (veto_on_fail=false). Show violations; ask user to proceed or request fix.

---

## Phase 06: QA Gates — Checkpoint META_AXIOMAS

### Spawn quality-gatekeeper

```
Agent(
  subagent_type: "quality-gatekeeper",
  name: "quality-gatekeeper",
  team_name: "sinkra-map-{process_slug}",
  model: "sonnet",
  description: "SINKRA P06: QA Gates",
  prompt: "You are @quality-gatekeeper.

    FIRST: Read {output_dir}/_context-manifest.md (orchestrator's distilled upstream digest with P01..P05 verdicts and pointers). Use the manifest first; consult task_definitions.yaml/dependency_graph.yaml/workflow_definition.yaml only when its pointers are insufficient for the axiomatic dimension you are scoring.
    THEN: Read squads/sinkra-squad/agents/quality-gatekeeper.md
    THEN: Read squads/sinkra-squad/tasks/design-qa-gates.md
    THEN: Execute COMPLETE QA gate design.

    Inputs: {output_dir}/task_definitions.yaml, dependency_graph.yaml,
            workflow_definition.yaml, executor_matrix.yaml

    Produce:
      - {output_dir}/quality_gates.yaml
      - {output_dir}/axioma_report.md
      - (compliance_score numeric lives INSIDE quality_gates.yaml — do NOT emit a standalone `compliance_score` file; it duplicates data and creates drift)

    Run Checkpoint META_AXIOMAS (10-dimension Axiomatic Validation):
      Dim 1 Verdade (veto, weight 2, thr 7.0) — VETO if < 7.0
      Dim 2 Coerência (weight 2, thr 6.0)
      Dim 3 Alinhamento Estratégico (weight 1, thr 6.0)
      Dim 4 Excelência Operacional (weight 1, thr 6.0)
      Dim 5 Inovação (weight 1, thr 5.0)
      Dim 6 Gestão de Riscos (weight 1, thr 6.0)
      Dim 7 Otimização de Recursos (weight 1, thr 6.0)
      Dim 8 Valor para Stakeholders (weight 1, thr 6.0)
      Dim 9 Sustentabilidade (weight 1, thr 6.0)
      Dim 10 Adaptabilidade (weight 1, thr 5.0)
      Overall threshold: 7.0

    When done, SendMessage to 'team-lead' with verdict, dimension scores, overall, files."
)
```

Apply checkpoint handling. Dim 1 Verdade < 7.0 is absolute VETO — redesign required.

---

## Phase 07a: Infrastructure Mapping

### Spawn infrastructure-mapper

```
Agent(
  subagent_type: "infrastructure-mapper",
  name: "infrastructure-mapper",
  team_name: "sinkra-map-{process_slug}",
  model: "sonnet",
  description: "SINKRA P07a: Infrastructure",
  prompt: "You are @infrastructure-mapper.

    FIRST: Read {output_dir}/_context-manifest.md (orchestrator's distilled upstream digest with P01..P06 verdicts and pointers — especially the Worker task list, gap_count and CREATE/ADAPT/REUSE distribution from P03 capability_gaps.md). Use the manifest first; consult task_definitions.yaml/quality_gates.yaml only when its pointers are insufficient for an infrastructure mapping decision. Note: Prior-Art Search remains MANDATORY (regardless of manifest) — do not bypass grep/glob across squads/**, scripts/**, .aiox-core/**.
    THEN: Read squads/sinkra-squad/agents/infrastructure-mapper.md
    THEN: Read squads/sinkra-squad/tasks/map-infrastructure.md
    THEN: Execute COMPLETE infrastructure mapping.

    Inputs: {output_dir}/quality_gates.yaml, task_definitions.yaml,
            workflow_definition.yaml, automation_specs.yaml, executor_matrix.yaml

    Produce:
      - {output_dir}/infrastructure_connections.yaml
      - {output_dir}/gap_analysis.md

    Completion criteria:
      - 100% Worker tasks mapped to infrastructure
      - 0 resource duplication
      - Gaps documented
      - PRIOR-ART SEARCH MANDATORY: gap_analysis.md contains a 'Prior-Art Search (before CREATE tags)' section with one row per task marked CREATE. Each row documents: proposed CREATE, search performed (grep/glob cross-squad), matches, verdict (REUSE/ADAPT/CREATE). CREATE without this row is INADMISSIBLE.
      - Re-verify every upstream gap claim: rerun grep for each GAP-* from P01/P03 before endorsing. Never inherit upstream confidence. See infrastructure-mapper.md § PRIOR-ART SEARCH PROTOCOL.

    BEFORE creating new infrastructure, consult IDS gates (REUSE > ADAPT > CREATE):
      - squads/infra-ops-squad/data/service-catalog.yaml
      - squads/sinkra-squad/data/ecosystem-registry.yaml
      - ALL squads/*/scripts/ and squads/*/tasks/ — the solution often lives in the squad that owns the domain (e.g., squad-creator for squad-publishing utilities)

    When done, SendMessage to 'team-lead' with status, coverage %, gaps, CREATE count with Prior-Art rows count (must match), files."
)
```

**On completed:** TaskUpdate(P07a, completed). Proceed to P07b.

---

## Phase 07b: MANDATORY QA Validation — Checkpoint SINKRA_QA_GATE

### Spawn sinkra-qa

```
Agent(
  subagent_type: "sinkra-qa",
  name: "sinkra-qa",
  team_name: "sinkra-map-{process_slug}",
  model: "sonnet",
  description: "SINKRA P07b: Mandatory QA Validation",
  prompt: "You are @sinkra-qa executing the MANDATORY compliance gate.

    FIRST: Read squads/sinkra-squad/agents/sinkra-qa.md
    THEN: Read squads/sinkra-squad/tasks/validate-map-readiness.md
    THEN: Execute COMPLETE SINKRA compliance validation.

    Inputs: ALL outputs from phases 01-07a in {output_dir}

    Produce:
      - {output_dir}/sinkra_compliance_report.md
      - {output_dir}/score_card.yaml

    Checkpoint SINKRA_QA_GATE:
      - compliance_score ≥ 80 (veto if below)
      - structural_integrity ≥ 0.8 (veto if below)
      - zero CRITICAL violations pending

    When done, SendMessage to 'team-lead' with:
      - Verdict: APPROVE | REVIEW | VETO
      - compliance_score (0-100)
      - structural_integrity (0-1)
      - CRITICAL violations (list, must be empty for APPROVE)
      - Files produced"
)
```

### Process QA Result

- **APPROVE:** TaskUpdate(P07b, completed). Proceed to P07c.
- **REVIEW:** Show to user. Approve → log deviation → proceed. Reject → return to P07a.
- **VETO:** HALT pipeline. `on_veto: "return_to phase_07_infrastructure with feedback"`. Re-dispatch @infrastructure-mapper with QA feedback via SendMessage.

**This gate is MANDATORY. Do NOT bypass even in YOLO mode.**

---

## Phase 07c: Squad Handoff Generation

### Reuse sinkra-chief teammate (spawn if first use)

Model selection — Haiku is appropriate here because P07c work is template-bound (sinkra-output.yaml + .md + Mermaid diagram follow rigid templates from squads/sinkra-squad/tasks/generate-squad-handoff.md and generate-pipeline-diagram.md). Sonnet's nuance is not required; Haiku produces the same structural output at lower latency and ~5x lower cost. P07b (which precedes this and is the authoritative quality gate) remains Sonnet.

```
Agent(
  name: "sinkra-chief",
  team_name: "sinkra-map-{process_slug}",
  model: "haiku",
  description: "SINKRA P07c: Squad Handoff",
  prompt: "You are @sinkra-chief executing P07c (Squad Handoff Generation).

    FIRST: Read squads/sinkra-squad/agents/sinkra-chief.md
    THEN: Read squads/sinkra-squad/tasks/generate-squad-handoff.md
    AND: Read squads/sinkra-squad/tasks/generate-pipeline-diagram.md
    THEN: Execute BOTH tasks sequentially.

    Inputs: ALL outputs from phases 01-07b in {output_dir}

    Produce:
      - {output_dir}/sinkra-output.yaml
      - {output_dir}/sinkra-output.md
      - {output_dir}/pipeline-diagram.md (Mermaid)

    Completion criteria:
      - sinkra-output.yaml is valid YAML
      - Contains ALL tasks, tokens, handoffs, quality gates, infrastructure
      - sinkra-output.md covers ALL mandatory sections
      - pipeline-diagram.md has Mermaid diagram
      - compliance_score ≥ 70

    When done, SendMessage to 'team-lead' with status, files, compliance_score."
)
```

On completed → TaskUpdate(P07c, completed). Proceed to P07d.

---

## Phase 07d: Downstream Handoff (Worker mode — deterministic)

### Reuse sinkra-chief

```
SendMessage(
  to: "sinkra-chief",
  summary: "P07d: Downstream Handoff",
  message: "Execute P07d (Downstream Handoff) in Worker mode.

    Read squads/sinkra-squad/tasks/handoff-downstream.md
    Execute deterministic handoff emission.

    Inputs: {output_dir}/sinkra-output.yaml, pipeline_mode='process', process_name='{process_name}'

    Produce: {output_dir}/handoff-downstream.yaml

    Completion criteria:
      - Valid YAML
      - status = pending
      - downstream_squad = squad-creator (process mode)
      - handoff_id unique

    When done, SendMessage to 'team-lead' with handoff_id, file path, status."
)
```

On completed → TaskUpdate(P07d, completed). Proceed to Shutdown.

---

## Phase 08: Shutdown + Summary

### Shutdown All Teammates

```
For each spawned agent (process-discoverer, architecture-designer, executor-classifier,
                       composition-engineer, quality-gatekeeper, infrastructure-mapper,
                       sinkra-qa, sinkra-chief):
  SendMessage(to: agent, message: {type: "shutdown_request", reason: "Pipeline complete"})
TeamDelete()
```

### Display Final Summary

```
╔══════════════════════════════════════════════════════════╗
║  SINKRA Map Process Complete — {process_name}             ║
╠══════════════════════════════════════════════════════════╣
║  P01 Discovery          ✅                                ║
║  P02 Architecture       ✅ PV_BS_001: APPROVE ({score})   ║
║  P03 Executors          ✅ PV_PA_001: APPROVE ({score})   ║
║  P04 Workflows          ✅ PV_PM_001: APPROVE ({score})   ║
║  P05 Task Definitions   ✅ Anatomy valid                  ║
║  P06 QA Gates           ✅ META_AXIOMAS: APPROVE ({score})║
║  P07a Infrastructure    ✅ Coverage: {pct}%               ║
║  P07b QA Validation     ✅ Compliance: {score}/100        ║
║  P07c Squad Handoff     ✅ sinkra-output.yaml emitted     ║
║  P07d Downstream        ✅ handoff_id: {id}               ║
╠══════════════════════════════════════════════════════════╣
║  Output dir: outputs/sinkra-squad/{process_slug}/         ║
║  Next step:  /squadCreator:squad-chief                    ║
║              (consumes handoff-downstream.yaml)           ║
╚══════════════════════════════════════════════════════════╝
```

Ask the user: "Generate the squad from this mapping via @squad-chief now?"

---

## Error Handling

### HALT Conditions

| Condition | Phase | Action |
|-----------|-------|--------|
| Missing `process_name` | P00 | HALT — ask user |
| Output dir conflict | P00 | HALT — ask resume/overwrite |
| Checkpoint VETO | P02/P03/P04/P06 | HALT — redesign on user instruction, re-run checkpoint |
| Task anatomy fail | P05 | WARN (veto_on_fail=false) — show violations, ask user |
| QA Compliance < 80 | P07b | HALT — return to P07a with feedback |
| QA CRITICAL violations | P07b | HALT — fix and re-run |
| Agent halted | any | HALT — show blocker, resume via SendMessage |

### Checkpoint State Machine

| Verdict | Action |
|---------|--------|
| APPROVE | Proceed to next phase |
| REVIEW | Ask user; if approved → log deviation to `squads/sinkra-squad/data/deviation-registry.yaml` (DEV-YYYY-NNN) then proceed; if rejected → SendMessage feedback, re-run |
| VETO | HALT; no override; redesign required |

Max VETO retries: 3. Then escalate to user.

### Recovery

On any HALT:
1. Tasks show partial progress.
2. Team stays alive — user can SendMessage any agent.
3. User resolves → SendMessage team-lead → pipeline resumes.
4. User aborts → graceful shutdown of all agents.

---

## Agent Persistence Map

```
P00:  [sinkra-chief spawned] ─────────────────── [reused P07c+P07d]
P01:  [process-discoverer spawned] ─── shutdown after P01
P02:  [architecture-designer spawned] ─── shutdown after P02
P03:  [executor-classifier spawned] ─── shutdown after P03
P04:  [composition-engineer spawned] ─── [reused P05] ─── shutdown after P05
P06:  [quality-gatekeeper spawned] ─── shutdown after P06
P07a: [infrastructure-mapper spawned] ─── [reused on P07b VETO] ─── shutdown
P07b: [sinkra-qa spawned] ─── shutdown after P07b
```

---

## Output Artifacts (canonical)

All artifacts persist under `outputs/sinkra-squad/{process_slug}/`:

| Phase | Artifact |
|-------|----------|
| P01 | process_map.yaml, stakeholders.yaml, as_is_doc.md |
| P02 | architecture.yaml, domain_map.yaml, architecture_diagram.md |
| P03 | executor_matrix.yaml, raci_matrix.yaml, capability_gaps.md |
| P04 | workflow_definition.yaml, composition_map.yaml, automation_specs.yaml |
| P05 | task_definitions.yaml, dependency_graph.yaml, token_assignments.yaml |
| P06 | quality_gates.yaml, axioma_report.md (compliance_score is a field inside quality_gates.yaml — no standalone file) |
| P07a | infrastructure_connections.yaml, gap_analysis.md |
| P07b | sinkra_compliance_report.md, score_card.yaml |
| P07c | sinkra-output.yaml, sinkra-output.md, pipeline-diagram.md |
| P07d | handoff-downstream.yaml |

Per `.claude/rules/artifact-classification.md`, these are squad outputs (not workspace canonical), so the `outputs/` path is correct.

---

## Comparison with Sibling Skills

| Skill | Purpose | Relation |
|-------|---------|----------|
| `/sinkra-map-process` (this) | Orchestrate Process-mode mapping (recurring processes) | Entry point for `*map-process` |
| `/sinkra-validate-squad` | Validate existing squad against SINKRA (3-tier) | Runs AFTER squad-creator consumes this skill's handoff |
| `/sinkra-upgrade-squad` | Upgrade SINKRA-compliant squad to native | Post-validation remediation |

This skill is the **front door** of the SINKRA pipeline. The output (`handoff-downstream.yaml`) is consumed by `/squadCreator:squad-chief` to scaffold the actual squad.

---

## Blocking Conditions

HALT and surface to user when:

1. **Workflow source missing** — `squads/sinkra-squad/workflows/sinkra-pipeline.yaml` not found. Resolution: restore from git.
2. **Agent file missing** — any of the 7 phase agents missing. Resolution: `npm run ide:sync:hook`.
3. **Checkpoint VETO after 3 retries** — escalate to user for manual redesign.
4. **QA compliance < 80 after loop** — escalate. Do NOT emit handoff.
5. **User cancellation** — graceful shutdown.

---

## Incremental Learning Log (MANDATORY — per phase, not post-hoc)

Per `.claude/rules/incremental-learning-log.md`, the log is written at Phase 0 and UPDATED after every phase. Post-hoc writes are forbidden — a crash at phase 5 must still leave evidence of phases 1-4.

### Path

`.aiox/learning/logs/sinkra-map-process/sinkra-map-process-{process_slug}-{YYYYMMDD}-{HHmmss}.yaml`

### Write protocol (3-step loop)

**Step 1 — At Phase 00 completion (initial write):**

```yaml
schema_version: "1.0"
skill_id: "sinkra-map-process"
run_id: "{process_slug}-{YYYYMMDD-HHmmss}"
timestamp_started: "{ISO-8601}"
timestamp_updated: "{ISO-8601}"
timestamp_completed: null
outcome: in_progress
process_name: "{process_name}"
process_slug: "{process_slug}"
type: "{greenfield|brownfield}"
mode: "{yolo|interactive}"
phases:
  p00_init: { status: completed, completed_at: "{ISO}" }
  p01_discovery: { status: pending }
  p02_architecture: { status: pending }
  p03_executors: { status: pending }
  p04_workflows: { status: pending }
  p05_task_definitions: { status: pending }
  p06_qa_gates: { status: pending }
  p07a_infrastructure: { status: pending }
  p07b_qa_validation: { status: pending }
  p07c_handoff: { status: pending }
  p07d_downstream: { status: pending }
deviations_logged: []
errors: []
```

**Step 2 — At the START of each phase:** update that phase's entry:
```yaml
p0N_{name}: { status: in_progress, started_at: "{ISO}", agent: "{subagent_id | inline}", execution: spawn | inline }
```
Refresh `timestamp_updated`. Overwrite the file.

**Step 3 — At the END of each phase:** update that phase's entry:
```yaml
p0N_{name}:
  status: completed | halted | failed
  started_at: "{ISO}"
  completed_at: "{ISO}"
  agent: "{subagent_id | inline}"
  execution: spawn | inline
  checkpoint: "{PV_XX_XXX | null}"
  verdict: "APPROVE | REVIEW | VETO | null"
  scores: { ... }
  artifacts: [path1, path2, ...]
```
Refresh `timestamp_updated`. Overwrite the file.

**On abnormal termination (VETO without resolution, crash, user halt):** set `outcome: halted|failed|escalated`, `timestamp_completed: {ISO}`, persist, stop. Log survives with partial state.

**At pipeline completion (P07d success):** add final summary:
```yaml
outcome: completed
timestamp_completed: "{ISO-8601}"
elapsed_minutes: {wall-clock}
epilogue:
  total_agents_spawned: {N}
  checkpoint_retries: {N}
  spawn_fallbacks_triggered: {N}
  confidence: HIGH|MEDIUM|LOW
  source_type: skill_execution
```

### Why this matters

A crashed pipeline with only phases 1-3 complete still leaves a YAML describing what was done and what was pending. `close-story` provenance guards continue to work. `finops-chief` can read mid-run for cost estimates. Debugging moves from "reconstruct from memory" to "read the log."

Do not batch updates. Each phase transition is one write. The file is the truth.

---

*SINKRA Map Process v1.0 — orchestrates the canonical 7-phase Process-mode pipeline via Agent Teams.*
*Source of truth: squads/sinkra-squad/workflows/sinkra-pipeline.yaml*
*Pattern parity: .claude/skills/full-sdc/SKILL.md*
