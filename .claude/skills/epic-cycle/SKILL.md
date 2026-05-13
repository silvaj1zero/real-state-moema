---
name: epic-cycle
description: "Epic Wave Orchestrator — two-level state machine (waves → stories via /story-cycle). Use ao executar epic com EXECUTION.yaml plan."
---

# Epic Development Cycle — Wave Orchestrator

Skill que orquestra o ciclo completo de execucao de epics usando uma **two-level state machine**:
- **Outer loop (waves):** Gerenciado por este skill via `epic-state.json`
- **Inner loop (stories):** Delegado ao `/story-cycle` via `state.json` por story

## Architecture: Two-Level State Machine

**CRITICAL DESIGN DECISION:** Este skill NAO reimplementa as 6 fases do story-cycle.
Cada story e delegada ao `/story-cycle` que opera como inner loop independente.
Epic-cycle detecta conclusao via leitura do `state.json` de cada story.

```
EPIC LEVEL (epic-state.json)           STORY LEVEL (state.json por story)
  current_wave: N                        current_phase: 1-6
  wave.status: stories|gate|checkpoint   phase_status: in_progress|completed
  story.status: pending|completed        retry_counts: {validate, qa}
```

**CRITICAL:** NAO usa `Task(subagent_type: ...)` para nenhuma fase.
Agents sao ativados no MAIN CONTEXT para preservar Synapse L0/L1/L2 rules.

Flow: `/epic-cycle` reads or creates `epic-state.json`, determines the state branch,
then handles `stories` by delegating the next story to `/story-cycle`, `gate` by
activating the gate agent in main context, or `checkpoint` by presenting
GO/PAUSE/REVIEW/ABORT. After each branch, update `epic-state.json` and show
"Re-invoke /epic-cycle" when another pass is needed.

---

## Commands

### /epic-cycle {EXECUTION.yaml} [--mode yolo|interactive|preflight]

Main entry point. Start or resume epic execution.

- **No epic-state.json:** Initialize from EXECUTION.yaml → Phase 0
- **epic-state.json exists:** Resume from current wave/status
- **All waves complete:** Final gate + retrospective

### /epic-cycle status

Show full progress without advancing state.

### /epic-cycle reset

Reset epic state (requires confirmation). Removes epic-state.json.

### /epic-cycle skip-story {story-id}

Skip a story in the current wave. Requires reason.

### /epic-cycle abort

Abort epic execution. State preserved for debugging.

---

## State File

Location: `.aiox/epics/{epicId}/epic-state.json`

The state file tracks:
- Current wave number and status
- Story completion status per wave
- Gate verdicts and retry counts
- Checkpoint decisions
- Bug verification results
- Accumulated context (files modified, decisions, issues)

---

## Execution Protocol

### On Each Invocation of /epic-cycle

Execute these steps IN ORDER:

#### Step 0: Locate or Initialize State

```
IF arguments include {EXECUTION.yaml}:
  1. Resolve EXECUTION.yaml path
  2. Read and validate EXECUTION.yaml structure
  3. Set epic_dir = .aiox/epics/{epicId}/
  4. IF {epic_dir}/epic-state.json exists:
     → Read state, go to Step 1
  5. ELSE:
     → Go to Phase 0: Initialize

IF arguments are "status":
  → Read epic-state.json, show summary, HALT

IF arguments are "reset":
  → Confirm with user, delete epic-state.json, HALT

IF arguments are "skip-story {id}":
  → Run: node epic-state-manager.js skip-story {dir} {wave} {id} {reason}
  → HALT

IF arguments are "abort":
  → Run: node epic-state-manager.js abort {dir}
  → HALT

IF no arguments:
  1. Check .aiox/active-workflow.json for active epic
  2. If found: read epic_progress_dir, go to Step 1
  3. If not found: show available EXECUTION.yaml files, HALT
```

#### Phase 0: Initialize

```
1. Parse EXECUTION.yaml:
   node epic-state-manager.js init {epic_dir} {execution_yaml_path} {mode}

2. Validate references:
   - Check story files exist in storyBasePath
   - Check wave dependencies are valid (no circular deps)
   - Check all story IDs in waves exist in stories map

3. Classify scope:
   - SINGLE (1-2 stories), SMALL (3-6), STANDARD (7-15), LARGE (16+)

3.5. Triangulation pre-flight (per `.claude/rules/kiss-no-overengineering.md` Gate 3):
   IF scope ∈ {STANDARD, LARGE} AND EXECUTION.yaml has no `evidence:` section
   referencing external research (docs/research/* or external sources):
     → SURFACE warning: "Epic scope = {scope}. Gate 3 (measurable benefit) requires
       external triangulation. Recommend `/tech-research` (~30min) before proceed.
       See precedent: docs/research/2026-04-18-agent-heuristic-structure-validation/
       (saved 5-11h on 80%-zero-RoI path)."
     → Ask user: PROCEED | RUN_TECH_RESEARCH | ABORT
     → Do NOT block — user may have evidence outside EXECUTION.yaml; advisory only.
   IF scope ∈ {SINGLE, SMALL}: skip check (Gate 3 trigger doesn't fire).

4. Save active-workflow.json:
   {
     "workflow": "epic-development-cycle",
     "epic_id": "{epicId}",
     "epic_progress_dir": ".aiox/epics/{epicId}/",
     "current_story": null,
     "started_at": "{now}"
   }

5. DISPLAY wave structure for approval:

   ## Epic Development Cycle: {title}

   **Epic ID:** {epicId}
   **Scope:** {scope} ({total_stories} stories, {total_waves} waves)
   **Mode:** {mode}

   ### Wave Structure
   | Wave | Name | Stories | Gate Agent | Dependencies |
   |------|------|---------|------------|--------------|
   | 1    | ...  | ...     | @architect | —            |
   | 2    | ...  | ...     | @qa        | Wave 1       |

   ### Local Mode
   {show local_mode constraints if set}

   **Approve to start Wave 1?**

6. HALT — wait for user approval
```

#### Step 1: Read State and Determine Action

```
Read epic-state.json
current_wave = state.current_wave
wave = state.waves[current_wave]

IF state.status == "paused":
  → Show: "Epic paused at Wave {N}. Resume with GO."
  → HALT

IF state.status == "aborted":
  → Show: "Epic aborted. Use /epic-cycle reset to start over."
  → HALT

IF current_wave == 0 (all waves done):
  → Go to Phase F: Final Gate + Retro

SWITCH wave.status:
  "pending"      → Start wave: node epic-state-manager.js start-wave {dir} {N}
                   Then proceed with "stories" logic below
  "stories"      → Go to Step 2: Story Execution
  "gate"         → Go to Step 3: Wave Gate
  "checkpoint"   → Go to Step 4: Checkpoint
  "completed"    → Should not happen (current_wave should advance)
```

#### Step 2: Story Execution (wave.status == "stories")

```
1. Find first non-complete story in wave:
   stories = wave.stories where status NOT IN (completed, skipped)

   IF none found (all done):
     → Transition to gate: node epic-state-manager.js start-gate {dir} {N}
     → Go to Step 3: Wave Gate

2. For the first pending/in_progress story (story_id):

   a. Resolve story_cycle progress dir:
      progress_dir = {storyBasePath}/.progress/{story_id}/

   b. Check story-cycle state.json:
      IF {progress_dir}/state.json exists:
        Read state.json
        IF phase_status == "completed":
          → Story done! Mark: node epic-state-manager.js complete-story {dir} {N} {story_id}
          → Check bug_verification for this story
          → Show: "Story {story_id} complete. Re-invoke /epic-cycle to continue."
          → HALT

        IF current_phase > 0 (in progress):
          → Show progress bar from story-cycle
          → Show: "Story {story_id} in progress (Phase {P}/6)."
          → Show: "Continue with /story-cycle to advance the story."
          → HALT

      IF state.json does NOT exist:
        → Story not started yet
        → Update active-workflow.json with current_story info
        → Show:

          ## Wave {N}: {wave.name} — Story {story_id}

          **Next step:** Start this story with /story-cycle

          ```
          /story-cycle {epicId} --story {story_id} --mode {mode}
          ```

          When the story completes all 6 phases, re-invoke `/epic-cycle`
          to advance to the next story or wave gate.

        → HALT
```

#### Step 3: Wave Gate (wave.status == "gate")

```
1. Show gate context:

   ## Wave {N} Gate: {wave.name}

   **Gate Agent:** @{wave.gate.agent}
   **Focus:** {wave.gate.focus}
   **Retries:** {count}/{max}

   ### Completed Stories
   | Story | Status | Result |
   |-------|--------|--------|
   | ...   | ...    | ...    |

2. Activate gate agent in MAIN CONTEXT:

   Show: "Activating @{gate.agent} for wave gate review."

   The gate agent must check:
   - Cross-story integration: do outputs connect correctly?
   - File conflicts: any stories modify same files with contradictions?
   - Tests: all story tests still passing after integration?
   - Regressions: any prior wave functionality broken?
   - Architecture: does implementation match epic design?

3. After gate review, record verdict:

   IF APPROVED:
     → node epic-state-manager.js complete-gate {dir} {N} APPROVED
     → Go to Step 4: Checkpoint

   IF REJECTED:
     → node epic-state-manager.js retry-gate {dir} {N} "{reason}"
     → IF canRetry:
       Show: "Gate REJECTED ({count}/{max}). Returning to stories for fixes."
       → HALT (wave returns to "stories" status)
     → IF !canRetry:
       Show: "Gate failed {max} times. Escalating to @aiox-master."
       → HALT — human intervention required

4. HALT
```

#### Step 4: Wave Checkpoint (wave.status == "checkpoint")

```
1. Show checkpoint options:

   ## Wave {N} Checkpoint: {wave.name}

   Gate: APPROVED by @{gate.agent}

   **Options:**
   - **GO** — Wave complete, advance to Wave {N+1}
   - **PAUSE** — Save state, stop execution
   - **REVIEW** — Show detailed summary first
   - **ABORT** — Abort epic execution

2. Wait for user choice

3. Execute:
   node epic-state-manager.js checkpoint {dir} {N} {decision}

   GO → Show "Wave {N} complete. Starting Wave {N+1}..."
        Start next wave, go to Step 2
   PAUSE → Show "Epic paused. Resume with /epic-cycle"
           HALT
   REVIEW → Show detailed summary via status command
            Re-present checkpoint options
   ABORT → Show "Epic aborted."
           Clean up active-workflow.json
           HALT
```

#### Phase F: Final Gate + Retrospective

```
When current_wave == 0 (all waves completed):

1. Final Gate:
   IF final_gate configured:
     → Activate @{final_gate.agent} in main context
     → Focus areas from final_gate.focus
     → Bug verification: check all bugs verified
     → IF APPROVED: proceed to retro
     → IF REJECTED: show issues, HALT

2. Bug Verification Summary:
   | Bug | Description | Fixed By | Verified |
   |-----|-------------|----------|----------|
   | 1   | ...         | SYNC-1   | ✅/❌    |

3. Retrospective:
   Activate @po for retrospective:
   - What went well
   - What could improve
   - Lessons learned

4. Completion Summary:

   ## Epic Complete: {title}

   ### Progress
   | Wave | Name | Stories | Gate | Duration |
   |------|------|---------|------|----------|
   | 1    | ...  | 1/1     | ✅    | ...      |
   | 2    | ...  | 3/3     | ✅    | ...      |

   ### Stats
   - **Mode:** {mode}
   - **Scope:** {scope}
   - **Stories:** {completed}/{total}
   - **Gate Retries:** {total_retries}
   - **Bugs Verified:** {verified}/{total}
   - **Total Duration:** {duration}

5. Clean up:
   - Delete .aiox/active-workflow.json
   - Keep epic-state.json as historical record
   - IF final_gate.tag: suggest git tag creation

6. HALT
```

---

## Active Workflow Tracking

Epic-cycle and story-cycle coexist in `.aiox/active-workflow.json`:

```json
{
  "workflow": "epic-development-cycle",
  "epic_id": "IDE-SYNC",
  "epic_progress_dir": ".aiox/epics/IDE-SYNC/",
  "current_story": {
    "story_id": "SYNC-3",
    "story_progress_dir": "docs/stories/epics/epic-ide-sync/.progress/SYNC-3/"
  },
  "started_at": "2026-03-01T10:00:00Z"
}
```

When /story-cycle completes a story, /epic-cycle reads the updated state.json
and advances the epic state accordingly.

---

## State Manager Utility

`scripts/epic-state-manager.js` provides CLI operations for epic state management:

```bash
# Initialize from EXECUTION.yaml
node scripts/epic-state-manager.js init {dir} {execution_yaml_path} [mode]

# Read current state
node scripts/epic-state-manager.js read {dir}

# Wave operations
node scripts/epic-state-manager.js start-wave {dir} {wave_number}
node scripts/epic-state-manager.js complete-story {dir} {wave_number} {story_id} [result]
node scripts/epic-state-manager.js skip-story {dir} {wave_number} {story_id} {reason}

# Gate operations
node scripts/epic-state-manager.js start-gate {dir} {wave_number}
node scripts/epic-state-manager.js complete-gate {dir} {wave_number} {verdict} [agent]
node scripts/epic-state-manager.js retry-gate {dir} {wave_number} {reason}

# Checkpoint
node scripts/epic-state-manager.js checkpoint {dir} {wave_number} {decision}

# Context accumulation
node scripts/epic-state-manager.js context {dir} {key} {value}

# Bug verification
node scripts/epic-state-manager.js bug-verify {dir} {bug_number} {story_id}

# Status summary
node scripts/epic-state-manager.js status {dir}

# Abort execution
node scripts/epic-state-manager.js abort {dir}
```

---

## Wave Status Transitions

```
pending → stories → gate → checkpoint → completed
               ^      |
               +------+ (gate rejected, retry ≤ 2)
```

| From | To | Trigger |
|------|----|---------|
| pending | stories | Wave started (deps met) |
| stories | gate | All stories completed/skipped |
| gate | checkpoint | Gate APPROVED |
| gate | stories | Gate REJECTED (retry) |
| checkpoint | completed | User chooses GO |

---

## Anti-Patterns (NEVER DO)

1. **NEVER spawn subagents via Task tool.** This bypasses Synapse L0/L1/L2 rules entirely.
2. **NEVER duplicate /story-cycle logic.** Epic-cycle delegates story execution, does not re-implement it.
3. **NEVER allow gate retries > 2.** Hard limit: max_retries=2 per wave gate.
4. **NEVER advance wave without gate APPROVED.** Gate is mandatory between waves.
5. **NEVER delete epic-state.json during execution.** It enables resume after interruption.
6. **NEVER modify EXECUTION.yaml.** It is a read-only input document.
7. **NEVER skip the checkpoint step.** User must explicitly choose GO/PAUSE/REVIEW/ABORT.

---

## IDS Philosophy (inherited)

```
REUSE > ADAPT > CREATE

This skill REUSEs /story-cycle as inner loop (100% delegation).
The epic-state-manager.js ADAPTs the pattern from story-cycle's state-manager.js.
The wave orchestration is the only CREATE component.
```

---

## Reference Files

- Wave definitions: `references/wave-definitions.yaml`
- Execution plan schema: `references/execution-plan-schema.yaml`
- Story-cycle skill: `.claude/skills/story-cycle/skill.md`
- Story state manager: `.claude/skills/story-cycle/scripts/state-manager.js`
- Phase definitions: `.claude/skills/story-cycle/references/phase-definitions.yaml`

## EXECUTION.yaml Format (DO NOT MODIFY)

Canonical example: `docs/stories/epics/epic-ide-sync/IDE-SYNC-EXECUTION.yaml`

The format is 100% backwards-compatible. See `references/execution-plan-schema.yaml` for full schema.

---

Epic Development Cycle SKILL.md v1.0
Updated: 2026-03-01 — Created as wave orchestrator with /story-cycle delegation
Design: Two-level state machine (epic-state.json + story state.json)
Based on: story-cycle skill v3.0 + execute-epic workflow analysis
