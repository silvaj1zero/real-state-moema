---
name: "wave-execute"
description: "Executes a specific epic wave through the agent-team pipeline with Swarm"
version: "3.2.0"
agent: "wave-execute"
user-invocable: true
maxTurns: 25
---

# Wave Execute v3.2 — Agent Teams Execution

**Invocação:** `/wave-execute epic-68 5` ou `/wave-execute epic-69 1 --dry-run`

## MANDATORY EXECUTION PROTOCOL (SWARM VS FALLBACK)

This skill operates in computationally dynamic modes dictated by `.aiox-core/core/config/swarm-feature-flags.yaml` (`swarm_wave_teams` flag).

**DEPENDING ON THE SCRIPT OUTPUT:**
1. **Fallback Mode:** It will output standard `Agent(run_in_background: true)`.
2. **Swarm OS Mode:** It will output a *Sequential Teams Pattern*.

**Sequential Teams Pattern (Swarm OS Mode):**
To avoid memory exhaustion and `BR-SWARM-001` (flat roster constraint), **EACH BATCH** runs isolated in its own new team:
1. `TeamCreate(team_name: "wave-{epic}-{wave}-batch-{B}")`
2. `Agent(name: "story-{id}", team_name: "wave-{epic}-{wave}-batch-{B}")`
3. Wait for all teammates in the batch to complete.
4. Clean up: Send `shutdown_request` structured message individually to each active teammate, wait for responses, then call `TeamDelete()` (no params — uses session context). Do NOT broadcast to `"*"` with structured messages.

**GOLDEN RULE:** You MUST strictly execute whichever pattern the DAG script outputs for you. NUNCA faz push. Cada story tem isolamento de escopo.

## O QUE ACONTECE

Quando o usuário invoca `/wave-execute {epic} {wave}`:

1. **BUILD DAG** — Script determinístico gera plan.json com batches e spawn instructions
2. **SHOW PLAN** — Mostrar batches, stories, executors, QGs ao usuário
3. **CONFIRM** — Pedir confirmação (a menos que `--no-confirm`)
4. **SPAWN AGENTS** — Para cada batch, spawnar 1 Agent por story pendente (paralelo)
5. **COLLECT** — Aguardar todos agents do batch completarem
6. **NEXT BATCH** — Avançar para próximo batch
7. **REPORT** — Relatório final + handoff

## EXECUTION PROTOCOL (OBRIGATÓRIO — SIGA EXATAMENTE)

### Step 1: Build the DAG

Run this Bash command (replace {epic} and {wave} with $ARGUMENTS):

```bash
node .claude/skills/wave-execute/scripts/build-wave-dag.js {epic} {wave} --json
```

This creates `.aiox/waves/{epic}-wave-{wave}/plan.json` with structured spawn instructions per story.

### Step 2: Read the Plan

Read the generated plan.json:
```
.aiox/waves/{epic}-wave-{wave}/plan.json
```

Present to user:
```
## Wave {wave} Execution Plan — {epic}

| Batch | Stories | Executor | QG | Status |
|-------|---------|----------|----|--------|
| 0     | 68.22   | @dev     | @architect | Ready |
| 0     | 68.27   | @dev     | @cso | Ready |
...

Confirmar execução? (Y/n)
```

### Step 3: Filter Pending Stories

Skip stories where `status` starts with "Done". Only launch Draft/Ready/InProgress.
If ALL stories are Done, report "Wave already complete" and stop.

### Step 4: Create Team & Spawn Story Agents [PARALLEL BATCH EXECUTION]

**CRITICAL: DO NOT INVENT THE AGENT CALLS.**
The script output from Step 1 contains a dedicated section at the bottom titled `SPAWN INSTRUCTIONS`.
It will explicitly tell you whether to use `TeamCreate` (Swarm OS Mode) or `run_in_background` (Fallback).

**Your instructions:**
1. Follow EXACTLY what the script printed.
2. If it tells you to call `TeamCreate`, call it first.
3. Then launch ALL `Agent()` calls for the current batch in a SINGLE MESSAGE. Do not launch them one by one sequentially.
4. ALWAYS use `model: "sonnet"` for stories to save costs.

### Step 5: Wait for Batch Completion

Wait for all spawned agents in the current batch to finish their execution.
- If using Swarm OS mode, teammates automatically report via messaging.
- If using Fallback mode, background workers return their execution outputs.

For each completed story:
1. Record story result (DONE/FAILED/BLOCKED)
2. When all stories in batch reported → proceed to next batch

### Step 6: Next Batch (Sequential Transition)

If you are using Swarm OS Mode, the script will instruct you to cleanly SHUT DOWN the current team (individual `shutdown_request` to each active teammate + `TeamDelete()`) before moving to the next batch. This is an explicit requirement for **Sequential Teams Pattern**.

For the next batch, repeat Step 4 using the new batch's spawn instructions.

### Step 7: Final Report + Cleanup

After ALL batches complete:

1. Show summary table:
```
| Story | Status | Executor | QG Verdict |
|-------|--------|----------|------------|
| 68.22 | DONE   | @dev     | PASS       |
| 68.27 | DONE   | @dev     | PASS       |
```

2. If using Swarm OS Mode, ensure the final batch's team was deleted as instructed by the DAG script.

4. Create ONE commit per wave:
```bash
git add --update && git commit -m "feat({epic}): wave {wave} — {done_count} stories done"
```

5. Generate handoff at `.aiox/handoffs/handoff-wave-{epic}-wave-{wave}-{date}.yaml`

**NEVER push** — handoff to @devops.

## DRY-RUN MODE

If `--dry-run` is in $ARGUMENTS:
- Build the DAG (Step 1)
- Show the plan (Step 2)
- Show the Agent() calls that WOULD be dispatched
- Do NOT spawn any agents
- Stop after showing the plan

## Mission Pitch

**Appetite:** 2 semanas por wave (TK-WE-005)
**Problem:** Executar stories de epic sequencialmente desperdiça tempo e perde problemas de integração cross-story. Execução manual não tem consistência de QG.
**Solution:** Execução DAG-based com stories em PARALELO via Agent Teams (cada teammate = 1 story com worktree isolado), QG loops por teammate, e Flywheel learning entre waves.
**Circuit Breaker:** TK-WE-001 (3 retries) por story, TK-WE-004 (50% extensão timebox) por wave. Se wave timebox excedido, stories restantes deferidas para próxima wave.
**Rabbit Holes (NO-GOs):** (1) Push automatizado — NUNCA, @devops only. (2) Seleção de QG agent — sempre do YAML, nunca inferido. (3) Pular governance checks — nunca, mesmo para stories "simples".

## SINKRA Process Architecture

```yaml
process:
  id: ARCH-WAVE-EXECUTE
  mode: GERENCIAR
  sinkra_version: "1.2"
  organism: ORG-WE-001 (Wave Execution Engine)
  pattern: Mission (DAG) per wave | Flywheel inter-waves
  molecules: [Story Validation, Story Execution, Quality Gate Loop, Wave Consolidation]
  atoms: 13  # 12 original + ATM-WE-009B (SCM Checkpoint)
  state_machine: "PLANNING → VALIDATING → EXECUTING → REVIEWING → [QG_LOOP] → COMMITTING → CONSOLIDATING → COMPLETE | ABORTED | ESCALATED | PAUSED"

tokens:
  # Threshold
  - { id: TK-WE-001, family: Threshold, name: qg_max_retries, default: 3, desc: "Max QG fail→rework cycles before circuit breaker" }
  - { id: TK-WE-002, family: Threshold, name: qg_min_score, default: 7.0, desc: "Min score for QG PASS" }
  - { id: TK-WE-003, family: Threshold, name: validation_min_score, default: 8.0, desc: "Min score for @po validation PASS" }
  - { id: TK-WE-004, family: Threshold, name: wave_timebox_extension_pct, default: 50, desc: "Max timebox extension %. If wave elapsed > timebox * (1 + pct/100), force-defer remaining stories." }
  - { id: TK-WE-017, family: Threshold, name: decomposition_effort_threshold, default: 8, desc: "Stories with effort > Xh flagged for potential decomposition" }
  - { id: TK-WE-018, family: Threshold, name: decomposition_task_threshold, default: 6, desc: "Stories with > N tasks flagged for potential decomposition" }
  # Time
  - { id: TK-WE-005, family: Time, name: wave_timebox, default: "2w", desc: "Wave timebox (small_batch)" }
  - { id: TK-WE-006, family: Time, name: story_timeout_hours, default: 4, desc: "Max hours per story execution. Exceeded → Blocked." }
  - { id: TK-WE-007, family: Time, name: qg_timeout_hours, default: 2, desc: "Max hours for QG review. Exceeded → skip QG, escalate." }
  # Capacity
  - { id: TK-WE-008, family: Capacity, name: parallel_stories, default: 3, desc: "Stories in parallel per batch" }
  - { id: TK-WE-009, family: Capacity, name: max_stories_per_wave, default: 8, desc: "Max stories in one wave" }
  # Context
  - { id: TK-WE-010, family: Context, name: epic_ref, default: null, desc: "Epic being executed" }
  - { id: TK-WE-011, family: Context, name: wave_number, default: null, desc: "Current wave number" }
  - { id: TK-WE-012, family: Context, name: repo_target, default: null, desc: "Wave-level default repo. Stories can override via story-level repo_target." }
  # Executor
  - { id: TK-WE-013, family: Executor, name: accountable, default: "pedro-valerio", desc: "Human accountable" }
  - { id: TK-WE-014, family: Executor, name: escalation_target, default: "user", desc: "Escalation on circuit break" }
  # Scope
  - { id: TK-WE-015, family: Context, name: story_status, type: enum, values: [Draft, Ready, InProgress, InReview, Done, Blocked, Skipped], desc: "Universal story status — aligned with story-lifecycle.md" }
  - { id: TK-WE-016, family: Context, name: qg_verdict, type: enum, values: [PASS, FAIL, PASS_WITH_CONDITIONS], desc: "QG result" }
  # Calibration
  - { id: TK-WE-019, family: Context, name: effort_calibration_ratio, default: 0.3, desc: "Multiply documented effort by this ratio for realistic estimate. Historical data: 3-5x overestimation. Overridden by prior wave retrospective." }
```

## Usage

```bash
# Execute a specific wave of an epic
/wave-execute epic-68 wave-2

# Execute with custom parallel limit
/wave-execute epic-68 wave-1 --parallel 4

# Resume a previously started wave (reads state from .aiox/waves/)
/wave-execute epic-68 wave-2 --resume

# Dry-run: show plan without executing
/wave-execute epic-68 wave-1 --dry-run

# Execute only specific stories from a wave
/wave-execute epic-68 wave-4 --stories 68.14,68.17,68.18

# Add emergent story to in-progress wave
/wave-execute epic-68 wave-2 --add-story 68.25

# Skip confirmation prompts (CLI-first)
/wave-execute epic-68 wave-1 --no-confirm
```

## Cold Start (First Wave of Epic)

When `wave_number == 1` and no prior retrospective exists:
1. No Flywheel data available — use default effort calibration TK-WE-019 (0.3x)
2. If Epic file has no formal wave structure, treat all stories as single wave in dependency order
3. Skip retrospective comparison metrics (trending = `baseline`)
4. Default executor is `@dev` when field is empty (instead of HALT, with warning)

## Critical Constraints

### PIPELINE NEVER:
- Runs `git push`, `git tag`, or creates PRs (exclusive @devops authority)
- Overrides `quality_gate` assigned in story YAML
- Skips governance checkpoints (CHK-1 through CHK-9)
- Defers findings of any severity (ALL block PASS, including COSMETIC)
- Executes a story with empty `executor` or `quality_gate` (warning + default @dev for executor only)

### PIPELINE ALWAYS:
- Extracts executor/QG from story YAML (source of truth)
- Persists state to `.aiox/waves/` (survives context compaction)
- Logs every state transition in story Change Log
- Populates Dev Agent Record before QG handoff
- Creates 1 git commit per batch (after all stories in batch pass QG)
- Runs governance checks post-wave

---

## MOLECULE 1: Story Validation (MOL-WE-001)

**Pattern:** `ATM-001 → ATM-002 (parallel per story) → ATM-003`
**Executor:** @po

### ATM-WE-001: Parse Wave & Build DAG [Worker — DETERMINISTIC SCRIPT]

**Input:** Epic ID + Wave number
**Output:** Execution plan with DAG, batches, assignments + spawn instructions
**Execution:** Run the deterministic JS script (NOT interpreted prose):

```bash
node .claude/skills/wave-execute/scripts/build-wave-dag.js {epic} {wave} --spawn-instructions
```

This script:
1. Reads Epic file → extracts stories for wave N
2. Reads each story file → extracts executor, quality_gate, depends_on, effort, status
3. Builds dependency DAG (topological sort via Kahn's algorithm)
4. Groups into parallel batches
5. Applies effort calibration (TK-WE-019)
6. Flags decomposition candidates (TK-WE-017, TK-WE-018)
7. Persists plan to `.aiox/waves/{epic}-wave-{N}/plan.yaml`
8. **`--spawn-instructions` flag:** Outputs EXPLICIT Agent() tool call instructions for each story in each batch

**CRITICAL:** The `--spawn-instructions` output is NOT prose. It is a structured list of Agent() calls that you MUST execute as tool calls. Read the output and execute each Agent() call exactly as specified.

**Present to user:**
```
## Wave {N} Execution Plan

**Epic:** {epic_id} | **Stories:** {count} | **Batches:** {batch_count}
**Estimated effort:** {calibrated_hours}h (documented: {original_hours}h, calibration: {ratio}x)
**Repo:** {repo_target}

| Batch | Stories (parallel) | Executor | QG | Effort (cal.) |
|-------|--------------------|----------|----|---------------|
| 0 | 68.14, 68.17, 68.18 | @dev, @dev, @dev | @cso, @architect, @architect | 1.5h |
| 1 | 68.15, 68.16 | @dev, @dev | @architect, @cso | 0.75h |
| 2 | 68.19 | @dev | @architect | 1.2h |
| 3 | 68.20 | @dev | @cso | 0.6h |

⚠️ Decomposition candidates: (none)

Proceed? (y/n)
```

**On Failure:** Cannot parse epic/stories → HALT with error, ask user for correct path.

**Logging:**
```yaml
log:
  atom: ATM-WE-001
  on_success: "[MOL-WE-001/ATM-001] Plan: {story_count} stories, {batch_count} batches, {calibrated_effort}h (cal. {ratio}x)"
  on_error: "[MOL-WE-001/ATM-001] ERROR: {error}. Cannot build execution plan."
```

---

### ATM-WE-002: Validate Story Drafts [Agent → @po]

**Input:** All stories from plan
**Execution:** Parallel (1 Agent per story, all in batch via `run_in_background`)

For each story, launch @po agent with **inline 10-point validation checklist:**

```
Validate Story {id} against 10-point checklist:

1. ☐ Title follows naming convention (STORY-{epic}.{N}-KEBAB-CASE.md)
2. ☐ All ACs are testable and verifiable (concrete pass/fail criteria)
3. ☐ executor field is non-empty
4. ☐ quality_gate field is non-empty AND different from executor
5. ☐ depends_on references exist and are Done or from prior completed wave
6. ☐ effort estimate present and reasonable (flag if > TK-WE-017 hours)
7. ☐ repo_target present and matches epic/wave target
8. ☐ tasks list non-empty with logical sequence
9. ☐ dev_notes provide sufficient context for executor to implement
10. ☐ no duplicate ACs with sibling stories in same wave
```

**Wave-aware enrichment (applied after checklist):**
- Update ACs based on prior wave results (decisions made, packages published, etc.)
- Apply effort calibration from retrospective or TK-WE-019
- Verify all `depends_on` stories are Done (or from prior completed wave)
- Apply corrections directly to story file
- Mark story status: `Ready`
- Log in Change Log: `{date} | @po | Validated for Wave {N}`

**Governance checkpoints CHK-1/CHK-2/CHK-3:**
- [CHK-1] Story status must be Draft or Ready (not InProgress by another)
- [CHK-2] `executor` and `quality_gate` fields non-empty
- [CHK-3] Sensitive domain check with **concrete mapping:**

```yaml
sensitive_domain_mapping:
  "workspace/*/L0-identity/*, workspace/*/L0-*": "@cso"
  "packages/db/*, **/migrations/*, *schema*.sql": "@db-sage"
  "**/auth*, **/permission*, **/rls*": "@architect"
  "apps/gateway-ai/*": "@infra-chief"
  ".claude/*, squads/sinkra-squad/data/*": "@sinkra-chief"
  "workspace/*/L1-strategy/pricing*, **/financial*": "@cso"
```
If story touches files in multiple sensitive domains, QG must include agents for ALL domains (compound QG). CHK-3 can ADD required agents but NEVER removes existing QG from YAML.

**On Failure:** Story fails validation → status stays Draft, user notified with specific issues.

**Logging:**
```yaml
log:
  atom: ATM-WE-002
  on_success: "[MOL-WE-001/ATM-002] Validated {ready_count}/{total_count} stories. {correction_count} corrections."
  on_error: "[MOL-WE-001/ATM-002] {failed_count} stories failed: {story_ids}"
```

---

### ATM-WE-003: Confirm & Persist Validation [Worker]

**Input:** Validation results
**Gate:** All stories Ready (or user overrides for specific stories)

1. Update `.aiox/waves/{epic}-wave-{N}/state.yaml` with validated assignments
2. Present validation summary to user
3. User confirms → proceed to MOL-WE-002
4. User can exclude specific stories: `--skip 68.15` (status → Skipped, deferred to next wave)

---

## MOLECULE 2+3 MERGED: Parallel Story Cycle (MOL-WE-002)

**Pattern:** `For each batch: spawn N teammates (1 per story, PARALLEL) → each runs FULL CYCLE → wait all → next batch`
**Execution:** Agent Teams with `isolation: worktree` — TRUE parallelism
**Each teammate runs:** @po validate → executor *develop → QG *review → loop until PASS → @po close story

> **CORE CHANGE v2.0:** Stories within a batch execute IN PARALLEL, not sequentially.
> Each story is a **teammate** with its own context window and git worktree.
> The lead (wave-controller) only coordinates batch boundaries and triggers roundtable.

### ATM-WE-004: Spawn Story Agents [Lead — EXECUTE Script Instructions]

**Input:** Spawn instructions from ATM-WE-001 (`--spawn-instructions` output)
**Execution:** Execute tool calls EXACTLY as specified by the script output

> **IMPERATIVE:** The script handles whether to use Swarm OS mode (`TeamCreate`) or Fallback (`run_in_background`), based on the `swarm-feature-flags.yaml` feature flag.
> Read the output from the script and run it natively.
> ALL stories in a batch MUST be dispatched in a SINGLE message (parallel).

**Max workers per batch:** TK-WE-008 (default 3, recommended 3-5)

**Each worker will:**
- Have its own independent execution environment
- Complete the full story lifecycle (validate → develop → QG loop → close)

**Logging:**
```yaml
log:
  atom: ATM-WE-004
  on_success: "[MOL-WE-002/ATM-004] Spawned {count} concurrent stories for batch {B}: {story_ids}"
  on_error: "[MOL-WE-002/ATM-004] Failed to spawn agents for batch {B}: {error}"
```

---

### ATM-WE-005: Wait All Teammates [Lead — blocking wait]

**Input:** Spawned teammates from ATM-WE-004
**Execution:** Lead waits for ALL teammates in batch to complete
**Timeout:** TK-WE-006 per story (4h default)

The lead monitors teammate completion:
1. Each teammate returns its result when done (story status + QG verdict + files modified)
2. Lead collects all results
3. If any teammate times out → mark story `Blocked`, log, continue with completed stories
4. If any teammate hits circuit breaker (3 QG fails) → mark story `Blocked`, cascade-block dependents

**On Build Error within teammate:** Teammate attempts auto-fix (1 retry). If still failing → Blocked.

**Logging:**
```yaml
log:
  atom: ATM-WE-005
  on_success: "[MOL-WE-002/ATM-005] Batch {B} complete: {done_count} Done, {blocked_count} Blocked. Elapsed: {time}."
  on_error: "[MOL-WE-002/ATM-005] Batch {B}: {timeout_count} teammates timed out."
```

---

### ATM-WE-006: Merge Worktrees & Post-Batch Checks [Lead]

**Input:** All completed teammate worktrees
**Governance checkpoints CHK-4/CHK-5 (verified by each teammate, re-checked by lead):**

1. For each Done story:
   - [CHK-4] Dev Agent Record has all 4 subsections populated
   - [CHK-5] All AC checkboxes addressed
   - [CHK-6] QG Report in story file
   - [CHK-7] Change Log updated
2. Merge teammate worktrees back to main branch (or collect changes)
3. If merge conflicts → HALT, user resolves manually
4. Proceed to ATM-WE-009B (SCM Checkpoint — commit per batch)
5. **[CHK-10] Post-merge integration check:**
   ```bash
   npm run lint && npm run typecheck
   ```
   If either fails → HALT batch. Lead reports merge-induced errors to user.
   This catches cross-story integration issues (conflicting imports, duplicate routes, shared state).

---

> **NOTE on QG Loop:** Historical data across 107+ stories shows **100% first-try QG pass rate** when PO pre-validation (MOL-WE-001) is thorough. The QG retry loop (Steps 3-4 inside each teammate) is a **safety net**, not the expected path. Each teammate handles its own QG loop internally — the lead never sees intermediate QG rounds.

> **Compound QG** (for `@cso + @architect`): Both agents review within the teammate. Merge rules: verdict=ALL_MUST_PASS, score=MIN, findings=UNION, FAIL_WINS.

> **Circuit Breaker:** Max TK-WE-001 (3) QG retries per teammate. After 3 fails, teammate reports `Blocked` to lead. Lead cascade-blocks dependents and assigns BACKLOG-{epic}-{seq}.

---

### ATM-WE-009B: SCM Checkpoint [Lead] ← Commit per batch

**Trigger:** All stories in current batch have status Done
**Output:** 1 git commit per batch

After all stories in a batch pass QG:

1. Collect all files modified across all Done stories in this batch (from Dev Agent Records → File List)
2. Stage files: `git add {file_list}`
3. Present `git diff --stat` to user for confirmation
4. Create commit:
   ```
   feat({epic}): wave {N} batch {B} — {story_count} stories

   Stories: {story_ids}
   Files: {file_count} modified

   Co-Authored-By: {executor_agents}
   ```
5. **NEVER push** — commit stays local. Handoff to @devops for push per AUTH-1.
6. Log commit SHA in `.aiox/waves/{epic}-wave-{N}/state.yaml`

**[CHK-9] Commit checkpoint:** Commit created before wave consolidation.

**On Failure:** If `git add` or `git commit` fails (e.g., merge conflict), HALT batch. User resolves manually.

**Logging:**
```yaml
log:
  atom: ATM-WE-009B
  on_success: "[MOL-WE-002/ATM-009B] Batch {B} committed: {sha} ({file_count} files, {story_count} stories)"
  on_error: "[MOL-WE-002/ATM-009B] ERROR: Commit failed for batch {B}: {error}. Manual resolution needed."
```

---

## MOLECULE 4: Wave Consolidation (MOL-WE-004)

**Pattern:** `ATM-010 → ATM-011 → ATM-012`
**Trigger:** All batches committed + all stories Done/Blocked/Skipped

### ATM-WE-010: Aggregate Wave Results [Worker]

**Input:** All story states from `.aiox/waves/`
**Output:** Wave summary

```yaml
wave_summary:
  epic: "{epic_id}"
  wave: {N}
  stories_total: {count}
  stories_done: {count}
  stories_blocked: {count}
  stories_skipped: {count}
  deferred_stories:
    - { id: "{story_id}", backlog_id: "BACKLOG-{epic}-{seq}", reason: "QG circuit breaker" }
  total_qg_rounds: {count}
  first_try_pass_rate: "{%}"
  effort_estimated: "{documented_hours}h"
  effort_calibrated: "{calibrated_hours}h"
  effort_actual: "{actual_hours}h"
  commits: ["{sha1}", "{sha2}"]
  wave_gate_result: PASS | FAIL
  decisions_made: [...]
  blockers_for_next_wave: [...]
```

**Wave Gate Check:**
Execute wave-specific gate criteria (from Epic file):
- Wave 1: `npm install @sinkra/core` works
- Wave 2: `memory_search` returns results
- Wave 4: `materialize-mission.js --dry-run` resolves assignees

**[CHK-8] Registry governance:**
```bash
node scripts/registry-governance-check.js --mode advisory
```

**Wave timebox check:** If wave elapsed > TK-WE-005 * (1 + TK-WE-004/100), log warning: "Wave exceeded timebox by {pct}%."

---

### ATM-WE-011: Run Roundtable [Skill → /roundtable]

**Input:** Wave summary + all story QG reports
**Execution:** Invoke `/roundtable` skill

```
/roundtable --mode review --preset epic_review docs/stories/{epic}/
```

Reviews everything developed in this wave:
- Individual story quality
- Cross-story integration
- Architecture consistency
- Governance compliance
- Findings that affect next waves

**Output:** Roundtable verdict + action plan for next wave

---

### ATM-WE-012: Generate Retrospective [Worker]

**Input:** Roundtable verdict + wave metrics
**Output:** Retrospective artifact (feeds next wave via Flywheel)

```yaml
retrospective:
  wave: {N}
  velocity: "{stories_done} stories / {days} days"
  qg_pass_rate: "{first_try_pass_rate}%"
  effort_accuracy: "{actual/calibrated ratio}"
  effort_calibration_next: "{actual/documented ratio}"  # feeds TK-WE-019 for next wave
  patterns_identified:
    - "Pattern X observed in stories A, B — consider for next wave"
  improvements_for_next_wave:
    - "Adjust effort calibration ratio to {new_ratio}"
    - "QG agent @Y most effective — assign similar stories"
  deferred_stories:
    - { id: "{story_id}", backlog_id: "BACKLOG-{epic}-{seq}", reason: "..." }
  flywheel_metrics:
    momentum: "{waves_completed} waves done"
    friction: "{avg_qg_rounds} avg QG rounds"
    trending: "improving | stable | degrading"
  flywheel_circularidade:
    verified_improvements_from_prior_wave:
      - { improvement: "...", applied: true|false, evidence: "..." }
    regressions:
      - { metric: "...", prior: "...", current: "...", root_cause: "..." }
```

Persist to: `.aiox/waves/{epic}-wave-{N}/retrospective.yaml`

**Flywheel circularidade (FW-R8):** ATM-WE-012 MUST reference prior wave retrospective improvements and verify they were applied:
1. Were effort calibrations applied? (log delta)
2. Were pattern-based AC enrichments applied?
3. Did friction decrease?
If any metric regressed vs prior wave, flag as `regression` with root cause.

---

## Emergent Story Injection

When `--add-story {story_id}` is used during an in-progress wave:

1. Validate story via ATM-WE-002 (10-point checklist)
2. Insert into earliest batch where dependencies are satisfied
3. Update `.aiox/waves/{epic}-wave-{N}/plan.yaml`
4. Log: `[EMERGENT] Story {id} injected into batch {B}`
5. If story has no dependencies, inject into CURRENT batch (if batch not yet committed)

---

## State Persistence

```
.aiox/waves/
  {epic}-wave-{N}/
    plan.yaml           # DAG, batches, assignments (ATM-WE-001)
    state.yaml          # Wave state + commit SHAs + timings
    summary.yaml        # Wave results (ATM-WE-010)
    retrospective.yaml  # Flywheel output (ATM-WE-012)
    stories/
      {story-id}/
        status.yaml     # Story state + transition history
        qg-round-1.yaml # QG report round 1
        qg-round-2.yaml # QG report round 2 (if retry)
        qg-round-3.yaml # QG report round 3 (if retry)
```

**Resume:** `/wave-execute {epic} {wave} --resume` reads state, skips Done stories, re-dispatches InProgress.
**PAUSED state:** User interrupt or context exhaustion → state = PAUSED. All InProgress stories stay InProgress. Resume continues from exact point.

---

## Story Status Lifecycle (aligned with story-lifecycle.md)

```
Draft → Ready (ATM-WE-002: @po validates)
Ready → InProgress (ATM-WE-005: executor starts)
InProgress → InReview (ATM-WE-005: executor completes)
InReview → Done (ATM-WE-009: QG PASS)
InReview → Blocked (ATM-WE-009: circuit breaker)
Any → Skipped (user --skip, assigned BACKLOG-{epic}-{seq})
Blocked → cascades to dependents
```

---

## Governance Checkpoints (9 mandatory)

| # | When | Check | Fail Action |
|---|------|-------|-------------|
| CHK-1 | Pre-exec | Story status == Ready or Draft | SKIP story |
| CHK-2 | Pre-exec | executor + quality_gate non-empty | HALT story (warn + default @dev for executor) |
| CHK-3 | Pre-exec | Sensitive domain → correct QG (see mapping above) | HALT story — return to @po |
| CHK-4 | Post-exec | Dev Agent Record 4 sections populated | Block QG handoff |
| CHK-5 | Post-exec | All ACs addressed | Block QG handoff |
| CHK-6 | Post-QG | QG Report in story file | Block Done transition |
| CHK-7 | Post-QG | Change Log updated with QG result | Block Done transition |
| CHK-8 | Post-wave | registry-governance-check.js advisory | Log warning |
| CHK-9 | Post-batch | Git commit created (ATM-WE-009B) | Block next batch |

## Agent Authority Rules (non-negotiable)

| Rule | Description |
|------|-------------|
| AUTH-1 | Pipeline NEVER runs git push/tag/PR — commit only, handoff to @devops for push |
| AUTH-2 | Architecture stories → @architect must be in QG |
| AUTH-3 | QG agent from story YAML is authoritative — never overridden, only augmented by CHK-3 |
| AUTH-4 | Compound QG → ALL must PASS (verdict=ALL_MUST_PASS, score=MIN, findings=UNION, FAIL wins) |

---

## QG Verdict Contract (structured output)

Every QG agent MUST return this structured format:

```yaml
quality_gate_report:
  story_id: "68.14"
  verdict: PASS | FAIL
  score: 8.5
  findings:
    - id: F-001
      severity: CRITICAL | MAJOR | MINOR | COSMETIC
      description: "What is wrong"
      location: "file:line or AC reference"
      prescription: "Specific fix required"
  all_acs_verified: true | false
  dev_agent_record_complete: true | false
  reviewed_by: "@cso"
  reviewed_at: "2026-03-28T14:30:00Z"
  tools_executed:
    - tool: "node scripts/registry-governance-check.js"
      result: "PASS"
```

**ALL severity levels block PASS.** No deferral of MINOR or COSMETIC. A story is Done when it is DONE.

---

## Flywheel: Inter-Wave Connection

```
Wave N retrospective.yaml
  ↓ (feeds)
Wave N+1 ATM-WE-001 (effort calibration from retrospective)
Wave N+1 ATM-WE-002 (validate story drafts with prior wave context)
  ↓ (verifies)
Wave N+1 ATM-WE-012 (checks if N improvements were applied — circularidade)
```

**Flywheel metrics tracked across waves:**
| Metric | What | Trending Goal |
|--------|------|---------------|
| Velocity | stories done / wave | UP |
| QG Pass Rate | % first-try passes | UP |
| Effort Accuracy | calibrated / actual ratio | → 1.0 |
| Friction | avg QG rounds per story | DOWN |

---

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 2026-03-28 | Initial release — 4 molecules, 12 atoms, 16 tokens, 8 governance checkpoints, QG verdict contract, Flywheel metrics. Designed via /roundtable with 5 agents. |
| v1.1 | 2026-03-28 | Investigation (107 stories, 8 epics) + meta-roundtable (7.0/10). 15 improvements: +ATM-WE-009B SCM Checkpoint (CRITICAL), status aligned with story-lifecycle.md (drop Executed, use InReview), inline 10-point validation checklist, concrete CHK-3 domain mapping, DAG cascade-blocking, Mission Pitch section, Flywheel circularidade (FW-R8), emergent story injection (--add-story), effort calibration (TK-WE-019 default 0.3x), deferred story backlog IDs (BACKLOG-{epic}-{seq}), PAUSED state, compound QG merge rules (ALL_MUST_PASS), build error recovery, cold-start handling, +CHK-9, +3 tokens (TK-WE-017/018/019). Total: 13 atoms, 19 tokens, 9 checkpoints. |
| v2.0 | 2026-03-28 | **PARALLEL EXECUTION via Agent Teams.** MOL-WE-002 + MOL-WE-003 merged: each story in a batch spawns as an independent teammate with isolated worktree. Teammate runs FULL CYCLE internally: @po validate → executor *develop → QG *review → loop until PASS → @po close. Lead only coordinates batch boundaries + triggers /roundtable after ALL teammates complete. Requires CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1. |
| v2.1 | 2026-03-28 | **HYBRID EXECUTION (Option C from RT decision).** Root cause fix: Claude interprets SKILL.md prose as guidance and defaults to Bash. Fix: ATM-WE-001 now runs deterministic JS script (`build-wave-dag.js --spawn-instructions`) that generates EXPLICIT Agent() tool call instructions. ATM-WE-004 is IMPERATIVE about using Agent tool (not Bash). Script output is not prose — it's structured Agent() calls that Claude MUST execute as tool invocations. |
