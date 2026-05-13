---
name: sinkra-upgrade-squad
description: "8-phase SINKRA-native squad upgrade (compliant → native). Consumes /sinkra-validate-squad output as input."
version: "1.0.0"
owner_squad: "sinkra-squad"
sinkra_tier: Tier2
context: conversation
agent: general-purpose
user-invocable: true
argument-hint: "<squad-name> [--scope full|token_bridge|pipeline] [--wave N]"
depends_on: ["/sinkra-validate-squad"]
invokes: ["/sinkra-validate-squad"]
---

# SINKRA Upgrade Squad — Compliant to Native (8 Phases)

Transforms a SINKRA-compliant squad into a SINKRA-native squad via 8-phase pipeline.
Consumes validation output from `/sinkra-validate-squad` to skip redundant assessment.

**Compliant** = config.yaml has SINKRA fields (surface-level)
**Native** = pipeline internals USE SINKRA grammar (Organisms/Molecules/Atoms/Tokens)

## Usage

```
/sinkra-upgrade-squad spy                          # Full upgrade — ALL waves, ALL phases, re-validate at end (DEFAULT)
/sinkra-upgrade-squad spy --wave 2                 # Only Wave 2 items (rare — use when resuming after partial run)
/sinkra-upgrade-squad spy --scope token_bridge     # Only V2 upgrade vector (data → tokens)
```

### Execution Modes

**Full mode (DEFAULT):** Executes ALL remediation waves (P0→P1→P2→P3) sequentially in a single run.
YAML validation gate between each wave. Re-validates automatically at the end (Phase 8).
This is what you want 95% of the time. User only needs to type the squad name.

**Wave mode (`--wave N`):** Execute only wave N. Use when resuming after a partial run or debugging a specific wave. Rare.

**Scope mode (`--scope`):** Limits upgrade to one vector (pipeline, token_bridge). For targeted upgrades.

## Architecture: 8 Sequential Phases + Task Tracking

Flow: team-lead runs Phase 1 Assessment via `/sinkra-validate-squad` or fresh validation (gate score >= 50), Phase 2 Gap Diagnosis across 8 dimensions + 3 upgrade vectors, Phase 3 SINKRA Mapping through brownfield `*map-process` with checkpoint `PV_BS_001` (`qa_score >= 80`), Phase 4 parallel reviews + fixes, Phase 5 surgical quick wins, Phase 6 remediation stories/epic planning, Phase 7 wave/script execution with YAML validation per wave, and Phase 8 `/sinkra-validate-squad --deep` with `SINKRA_QA_GATE` (score >= 80, 0 CRITICAL).

## NON-NEGOTIABLE RULES (read BEFORE any phase)

**RULE 1: Phase 1 and Phase 8 MUST run /sinkra-validate-squad --deep (Tier 1+2+3).**
- Spawn 3 Tier 2 agents (dim-1-2-3, dim-4-5-6, dim-7-8-9) AND 5 Tier 3 forensic agents
- ALWAYS --deep. Never standard. The upgrade needs forensic findings from Phase 1 to plan waves correctly.
  Without Tier 3, structural patterns (phantom refs, orphan tasks, cross-ref breaks) are only discovered AFTER fixes — too late.
- Write score-card.yaml to `outputs/squad-validations/{squad_name}/{timestamp}/`
- Update `latest` symlink

**RULE 2: Scoring scale is ALWAYS 0-100.** Never /10. Never manual estimation.

**RULE 3: Phase 8 output goes to a NEW timestamp directory** (not the same as Phase 1).
This creates 2 score-cards that enable the comparison dashboard.

**RULE 4: Do NOT substitute validate-squad with inline node scripts, manual /10 scoring, or prose assessments.** The ONLY acceptable method is the parallel agent pipeline described above.

If you are about to skip this because "the findings are clear" or "I can estimate" — STOP. Run the pipeline. The 3 agents take ~3 minutes. There is no shortcut.

## Agent Pattern: TeamCreate + SendMessage (full-sdc enforcement)

**This skill uses the same tool-enforced pattern as /full-sdc:**

```
TeamCreate(
  team_name: "usq-{squad_name}",
  description: "SINKRA Upgrade Squad: {squad_name}"
)
```

**Why Teams (not fire-and-forget):**
- Phase 4-7: Reviewer + Executor PERSIST across fix iterations (SendMessage loop)
- Phase 1→8: Same team enables comparison between validation runs
- TaskUpdate creates visual checkpoints — phases cannot be skipped
- SendMessage creates explicit handoffs — agents don't die after first response

**Key difference from /full-sdc:**
- full-sdc: 5 named agents (po, executor, qg, deploy, po-close)
- upgrade-squad: 2 persistent agents (reviewer, executor) + validate-squad sub-team for Phase 1/8

## MANDATORY EXECUTION RULES (full-sdc enforcement pattern)

1. **TeamCreate FIRST** — `TeamCreate(team_name: "usq-{squad_name}")` before any agent spawn
2. **Sequential** — each phase completes (TaskUpdate) before next starts. No skipping.
3. **Phase 1 reuses existing validation** — if recent validate-squad output exists (<1h), skip re-run
4. **Phase 4-7 loop uses SendMessage** — reviewer and executor persist and communicate
5. **Phase 5 quick wins are STRUCTURAL only** — no cosmetic fixes
6. **Phase 8 re-validates with --deep** — forensic tier catches remaining cross-ref issues
7. **Tasks track progress** — TaskCreate before execution, TaskUpdate on completion

### HALT Conditions (pipeline stops, user decides — same pattern as /full-sdc)

| Condition | Phase | Action |
|-----------|-------|--------|
| Squad not found | 0 | ABORT before team creation |
| baseline_score < 50 | 1 | HALT — squad too far from compliant |
| PV_BS_001 VETO (qa_score < 70) | 3 | HALT — mapping rejected, show gaps |
| Reviewer FAIL after 3 QG loops | 4-7 | ESCALATE to user with all fix rounds |
| Phase 8 score < 80 after 2 iterations | 8 | HALT — manual intervention needed |
| YAML validation fails in any wave | 4-7 | HALT current wave — fix syntax first |

---

## Phase 0: Parse Arguments + Find Existing Validation

### 0.0 — Dialect Pre-Check (BLOCKING)

Before analyzing the squad, verify it's on the canonical L0-L4 workspace dialect. Upgrading a squad with dialect drift (e.g., `culture/` bare paths instead of `L2-tactical/culture/`) leads to fixes being reverted and wasted cycles.

```
Bash("node scripts/validate-workspace-dialect.js --scope squads/{squad_name}/ 2>&1 || true")
```

- **0 violations:** Proceed to 0.1.
- **>0 violations:** HALT. Surface the violation count and top 3 files. Recommend either:
  1. Fix dialect first via `npm run sinkra:rename-artifact` (if path rename) or targeted `Edit` per violated file
  2. Re-run `/sinkra-upgrade-squad {name}` after dialect is clean

Do NOT proceed with upgrade while dialect violations exist. They pollute baseline and mask real findings.

### 0.1 — Extract Arguments + Create Team

```
start_epoch = Bash("date +%s")
squad_name = argument[0]
scope = "full"  # default
IF "--scope token_bridge" in arguments: scope = "token_bridge"
IF "--scope pipeline" in arguments: scope = "pipeline"
squad_path = "squads/{squad_name}/"

# Create team FIRST — agents (reviewer, executor) will be spawned into this team
TeamCreate(
  team_name: "usq-{squad_name}",
  description: "SINKRA Upgrade Squad: {squad_name} (scope: {scope})"
)
```

### 0.2 — Load Validation History (ALL runs, not just latest)

```
# Load ALL validation runs for this squad — not just the latest
all_runs = Glob("outputs/squad-validations/{squad_name}/*/score-card.yaml")
Sort by directory timestamp.

# Read the LAST 3 runs (or all if < 3)
FOR each of last 3 runs:
  Read score-card.yaml → extract overall_score, verdict, dimension_scores, forensic counts
  Read remediation-plan.yaml (if exists) → extract wave items and status

# Build evolution timeline
validation_history = [
  {date, score, verdict, dimensions, critical_count, remediation_items},
  ...
]

# Analyze: what was fixed, what persists, what regressed
persistent_issues = findings that appear in 2+ consecutive runs
resolved_issues = findings in run N-1 that are absent in run N
regressed_issues = dimensions that dropped > 5 points between runs

# Use latest run as Phase 1 input (skip fresh validate if < 1 hour old)
latest = validation_history[-1]
IF latest.age < 1 hour:
  "Found recent validation ({timestamp}, score {score}). Reusing as Phase 1 input."
  skip_phase_1 = true
ELSE:
  skip_phase_1 = false
```

### 0.3 — Display Validation History

```
### Validation History ({squad_name})

| Run | Date | Score | Verdict | CRITs | Trend |
|-----|------|-------|---------|-------|-------|
| 1 | {date} | {score} | {verdict} | {crits} | baseline |
| 2 | {date} | {score} | {verdict} | {crits} | {delta:+.1f} |
| 3 | {date} | {score} | {verdict} | {crits} | {delta:+.1f} |

Persistent issues (appear in 2+ runs): {count}
Resolved since last run: {count}
Regressions: {count}
```

This history informs Phase 2 (diagnosis) — persistent issues get higher priority than new ones.
Resolved issues validate that previous remediation worked.

### 0.3 — Classify Scale

```
agents_count = Glob("squads/{squad_name}/agents/*.md").count
tasks_count = Glob("squads/{squad_name}/tasks/*.md").count

IF tasks_count <= 20 AND agents_count < 10:
  scale = "small"   # Manual edits, Epic + self-contained stories
ELSE:
  scale = "large"   # Scripts automatizados, Story + tasks
```

### 0.4 — Display Banner

```
╔═══════════════════════════════════════════════════════════╗
║  /sinkra-upgrade-squad — {squad_name}                     ║
╠═══════════════════════════════════════════════════════════╣
║  Scope:    {scope} (V1+V2+V3 | V2 only | V1 only)        ║
║  Scale:    {scale} ({tasks} tasks, {agents} agents)       ║
║  Existing: {recent validation score or "none"}             ║
║  Pipeline:                                                ║
║    P1: Assessment    P2: Diagnosis   P3: Mapping          ║
║    P4: Reviews       P5: Quick Wins  P6: Planning         ║
║    P7: Execution     P8: Validation                       ║
╚═══════════════════════════════════════════════════════════╝
```

### 0.5 — Create Tasks

```
TaskCreate("Phase 1: Assessment & Baseline")
TaskCreate("Phase 2: Gap Diagnosis (8 dimensions)")
TaskCreate("Phase 3: SINKRA Brownfield Mapping")
TaskCreate("Phase 4: Reviews + Fix Findings")
TaskCreate("Phase 5: Quick Wins (STRUCTURAL only)")
TaskCreate("Phase 6: Planning (Epic/Stories)")
TaskCreate("Phase 7: Execution (waves)")
TaskCreate("Phase 8: Re-validation (--deep)")
```

---

## Phase 1: Assessment & Baseline

```
IF skip_phase_1:
  "Reusing validation from {timestamp}: score {score}, verdict {verdict}"
  baseline_score = overall_score
  TaskUpdate(phase1, completed)
  → Phase 2
ELSE:
  "Running fresh validation..."
  Execute the FULL /sinkra-validate-squad pipeline:
    - Tier 1: inventory (Globs + Read)
    - Tier 2: spawn 3 parallel scoring agents (dim-1-2-3, dim-4-5-6, dim-7-8-9)
    - Consolidate scores, generate score-card.yaml + remediation-plan.yaml
    - Write outputs to outputs/squad-validations/{squad_name}/{timestamp}/
  Read output score-card.yaml
  baseline_score = overall_score
  TaskUpdate(phase1, completed)
```

**CRITICAL: Phase 1 MUST produce a score-card.yaml in outputs/squad-validations/.**
Do NOT do a manual inline assessment with a different scale (0-10 vs 0-100).
The validate-squad pipeline with parallel agents is the ONLY acceptable Phase 1 method.
This ensures: comparison dashboard works, remediation-plan is generated, scoring is consistent.

**Gate:** baseline_score >= 50 (minimum for upgrade). If < 50: "Squad too far from compliant. Fix critical issues first with /sinkra-validate-squad."

---

## Phase 2: Gap Diagnosis — Compliant vs Native

Analyze 8 dimensions by reading squad files:

| Dimension | Compliant (has) | Native (needs) |
|-----------|----------------|----------------|
| 1. Pipeline | Workflows exist | Workflows AS Organisms with phase/checkpoint bindings |
| 2. Tasks | .md files exist | Tasks AS Atoms with 8 SINKRA fields + token bindings |
| 3. Quality Gates | Checklists exist | Gates with numeric thresholds + 3-state verdict |
| 4. Tokens | Data files exist | Token Registry with 9 families + producer/consumer |
| 5. Handoffs | Informal | Artifact-Handoff Protocol with scope + lifecycle |
| 6. Journey Log | None | pipeline-execution-log.yaml with per-execution records |
| 7. Composition | workflows/ directory | composition_mapping with atoms/molecules/organisms/templates/instances |
| 8. Traceability | Code works | Token → Atom → Molecule → Organism traceable chain |

**Prioritization from history:**
- Persistent issues (2+ runs): P0 — these survived previous attempts, need different approach
- New issues (first appearance): P1 — standard priority
- Resolved issues: SKIP — already fixed, verify don't regress

**Output:** `gap-analysis.yaml` with per-dimension status (native|partial|missing) and 3 upgrade vectors:
- **V1:** Pipeline as Organism (workflow → SINKRA composition)
- **V2:** Token Bridge (data → SINKRA Token Registry)
- **V3:** Composition Proposal (artifacts → Atoms → Molecules)

**Heuristic checks (from sinkra minds):**
- AN_KE_085: >70% incoherent → greenfield, not brownfield
- PV_PA_028: Token with conditional logic → must be Atom
- PV_KE_078: Task naming = camelCase VERB+OBJECT
- PV_PA_006: methodology_rigidity > 0.8 → Clone, not Agent
- PV_KE_060: Hardcoded identity → bind to ROLE TYPE

**Doc-rot check (NEW — from copy squad lesson):**
Large squads accumulate dead weight. Phase 2 SHOULD estimate rot:
- Count scripts not referenced by any task/workflow
- Count templates not in composition_mapping
- Count data files not referenced by config/tasks/workflows
If orphan_ratio > 25%: flag as structural pattern "accumulated rot" and recommend
/doc-rot analysis or dedicated cleanup Epic BEFORE polishing SINKRA score.

TaskUpdate(phase2, completed)

---

## Phase 3: SINKRA Process Mapping (Brownfield)

This is the heaviest phase. Runs the full SINKRA 7-phase mapping pipeline on the squad.

```
IF existing_mapping provided:
  Use as base (accelerates Phase 1 of mapping)
ELSE:
  Run from scratch via sinkra-chief *map-process brownfield
```

The mapping produces:
- phase1-discovery.yaml (process map)
- phase2-architecture.yaml
- phase3-executors.yaml
- phase4-5-composition.yaml
- phase6-quality-gates.yaml
- phase7-infrastructure.yaml
- sinkra-qa-scorecard.yaml

**Checkpoint: PV_BS_001**
- Gate: qa_score >= 80 AND no CRITICAL violations
- On APPROVE (>= 80): advance to Phase 4
- On VETO (< 80): identify gaps, fix, resubmit (max 2 iterations)
- On REVIEW (>= 70 but < 80): Human decides. If approved, MUST log deviation:
  ```yaml
  # Write to squads/{squad_name}/data/deviation-registry.yaml BEFORE advancing
  - id: DEV-{YYYY}-{NNN}
    phase: phase_3_mapping
    checkpoint: PV_BS_001
    score_achieved: {qa_score}
    threshold_required: 80
    justification: "{why proceeding despite < 80}"
    approved_by: Human
  ```
  Do NOT bypass PV_BS_001 without deviation record. "Parser artifacts" is not a valid justification
  unless the specific parser bugs are documented with file:line evidence.

TaskUpdate(phase3, completed)

---

## Phase 4-7: Review → Fix → Re-Review Loop (QG pattern from /full-sdc)

Phases 4-7 operate as a **single loop** with persistent agents, not sequential phases.
This mirrors the QG loop from /full-sdc where reviewer and executor communicate iteratively.

### 4.1 — Spawn Persistent Review + Executor Agents

```
# Reviewer agent — spawned INTO the team, persists across fix iterations
Agent(
  name: "reviewer",
  team_name: "usq-{squad_name}",
  description: "SINKRA upgrade reviewer — persistent across fix iterations",
  prompt: "You are a SINKRA compliance reviewer for squad {squad_name}.

    Read ALL files in squads/{squad_name}/ — config.yaml, tasks, workflows, data, templates.
    Compare against SINKRA gold standard (squads/sinkra-squad/ for reference).

    Produce a review report with:
    - Findings: [{severity: CRITICAL|HIGH|MEDIUM|LOW, location: file:line, issue, impact: STRUCTURAL|COSMETIC}]
    - Verdict: PASS (score >= 80, 0 CRITICAL) | REVIEW | FAIL
    - Score: 0-100 based on countable facts

    When done, SendMessage to 'team-lead' with verdict, score, and top findings.
    
    STAY ALIVE — you will be asked to re-review after fixes are applied.",
  run_in_background: true
)

# Executor agent — spawned INTO the team, persists across fix iterations
Agent(
  name: "executor",
  team_name: "usq-{squad_name}",
  description: "SINKRA upgrade executor — applies fixes based on reviewer findings",
  prompt: "You are a SINKRA upgrade executor for squad {squad_name}.

    You will receive fix requests from the team-lead based on reviewer findings.
    For each fix:
    1. Read the file
    2. Apply the fix (Edit/Write)
    3. Validate YAML: node -e \"require('js-yaml').load(...)\"
    4. Confirm completion

    Tag each fix as [STRUCTURAL] or [COSMETIC]. Apply STRUCTURAL first.
    Only apply COSMETIC if all STRUCTURAL are done.

    When done, SendMessage to 'team-lead' with: fixes applied, files modified, YAML valid.
    
    STAY ALIVE — you may receive multiple rounds of fixes.",
  run_in_background: true
)
```

### 4.2 — Wait for Initial Review

Wait for reviewer to complete first pass. Extract:
- verdict (PASS/REVIEW/FAIL)
- score (0-100)
- findings list with severity and impact tags

### 4.3 — Fix Loop (max 3 iterations)

```
iteration = 1
max_iterations = 3

WHILE iteration <= max_iterations AND verdict != PASS:

  # 1. Classify findings into waves
  wave_items = findings.filter(f => f.impact == "STRUCTURAL")
  cosmetic_items = findings.filter(f => f.impact == "COSMETIC")

  # 2. Send fix request to Executor (STILL ALIVE)
  SendMessage(
    to: "executor",
    summary: "Fix Round {iteration} — {wave_items.length} STRUCTURAL items",
    message: "Reviewer returned {verdict} (score {score}). Fix these STRUCTURAL issues:

      {wave_items formatted as numbered list with file:line}

      Apply ALL structural fixes. Validate YAML after each.
      Do NOT fix COSMETIC items in this round.

      When done, SendMessage to 'team-lead' with:
      - Fixes applied: list
      - Files modified: list
      - YAML valid: yes/no"
  )

  # 3. Wait for Executor fix confirmation

  # 4. Send re-review request to Reviewer (STILL ALIVE)
  SendMessage(
    to: "reviewer",
    summary: "Re-review after fixes Round {iteration}",
    message: "Executor applied {N} fixes for Round {iteration}.
      Re-read the modified files and re-score ALL 9 dimensions.
      Focus on previously-failed items but do a FULL re-review.

      SendMessage to 'team-lead' with updated verdict, score, and remaining findings."
  )

  # 5. Wait for Reviewer re-verdict
  # Extract new verdict, score, findings
  iteration++

END WHILE
```

### 4.4 — Process Loop Result

```
IF verdict == PASS:
  TaskUpdate(phase4_7, completed)
  "Review-Fix loop converged in {iteration} rounds. Score: {score}"
  → Phase 8

IF verdict == REVIEW AND iteration > max_iterations:
  TaskUpdate(phase4_7, completed)
  "Review-Fix loop reached max iterations ({max_iterations}). Score: {score} (REVIEW)."
  "Remaining findings are COSMETIC or require manual intervention."
  → Phase 8 (proceed with REVIEW — may not reach PASS)

IF verdict == FAIL AND iteration > max_iterations:
  "Review-Fix loop FAILED after {max_iterations} iterations. Score: {score}."
  "ESCALATE to user. Show all rounds of findings."
  HALT — user decides whether to continue or abort.
```

### 4.5 — YAML Validation Gate (after each executor round)

```
Bash("npm run validate:yaml:changed")
IF fails: SendMessage(to: "executor", "YAML broke. Fix syntax errors before re-review.")
```

### 4.6 — Cleanup

After loop completes (regardless of verdict):
```
# Agents auto-cleanup when conversation ends
# No explicit TeamDelete needed in fire-and-forget v1.0
# In v2.0 (Agent Teams): SendMessage shutdown + TeamDelete
```

---

## Phase 8: Re-validation

```
Execute the FULL /sinkra-validate-squad pipeline (same as Phase 1):
  - Tier 1: inventory
  - Tier 2: spawn 3 parallel scoring agents
  - If --deep was used in Phase 1: also spawn 5 Tier 3 forensic agents
  - Consolidate, generate score-card.yaml + remediation-plan.yaml
  - Write to outputs/squad-validations/{squad_name}/{new_timestamp}/
```

This runs the full validation with comparison dashboard showing before/after delta.

**CRITICAL: Phase 8 MUST use the same pipeline as Phase 1 — parallel agents, score-card output.**
Do NOT substitute with an inline node script or manual scoring.
The comparison dashboard depends on having TWO score-card.yaml files (Phase 1 + Phase 8) in the same format.

**Gate: SINKRA_QA_GATE**
- score >= 80 AND 0 CRITICAL → PASS
- Max 2 re-validation iterations

**Phase 8 output MUST be written to outputs/squad-validations/{squad_name}/{new_timestamp}/.**
This creates the SECOND score-card that enables the comparison dashboard.

**Scoring scale MUST be 0-100.** If agents return /10, that is a template compliance failure.
Do NOT accept /10 scores and convert. Instruct agents to score on 0-100 scale.

TaskUpdate(phase8, completed)

---

## Phase 9: Summary + Learning Log

### Display Summary

```
### Upgrade Complete: {squad_name}

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Score | {baseline} | {final} | {delta:+.1f} |
| Verdict | {before_verdict} | {after_verdict} | |
| CRITICAL | {before_crit} | {after_crit} | {delta} |

Duration: {measured_seconds}s
Scale: {scale}
Scope: {scope}
Phases: 8/8 completed
```

### Learning Log

Write to `.aiox/learning/logs/upgrade-squad/upgrade-squad-{squad_name}-{timestamp}.yaml`

---

## Error Handling

| Condition | Action |
|-----------|--------|
| Phase 1 score < 50 | HALT — squad too far from compliant |
| Phase 3 PV_BS_001 VETO | Fix gaps, resubmit (max 2 iterations) |
| Phase 7 YAML validation fails | HALT wave, show error, ask user |
| Phase 8 score < 80 after 2 iterations | HALT — manual intervention needed |

---

## References

- **Task:** `squads/sinkra-squad/tasks/sinkra-native-upgrade.md`
- **Workflow:** `squads/sinkra-squad/workflows/wf-sinkra-native-upgrade.yaml`
- **Checklist:** `squads/sinkra-squad/checklists/sinkra-native-upgrade-checklist.md`
- **Validate skill:** `.claude/skills/sinkra-validate-squad/SKILL.md`
- **Chief heuristic:** `squads/sinkra-squad/agents/sinkra-chief.md` → "QUANDO o usuario pede *upgrade-squad"
