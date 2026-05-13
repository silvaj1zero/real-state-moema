---
name: develop-story
description: "Story development/execution — implements all tasks, checks ACs, populates Dev Agent Record. Supports YOLO, Interactive (default), and Pre-Flight modes with CodeRabbit self-healing and decision logging."
version: "2.0.0"
owner_squad: sinkra-squad
sinkra_tier: Tier2
context: inline
agent: general-purpose
user-invocable: true
argument-hint: "[story-file-path] [yolo|interactive|preflight]"
---

# Develop Story — Implementation Executor

## Dynamic Agent Binding

This skill adapts to the **executor** defined in the story being developed.

1. Read the story file's `**Executor:**` field (e.g., `@dev`, `@architect`, `@db-sage`, `@devops`)
2. Extract the agent ID (strip `@` prefix, e.g., `dev`, `architect`, `db-sage`)
3. Load the agent persona from `.claude/agents/{agent-id}.md`
4. **Adopt that agent's persona** for this entire execution — their role, style, lens, core_principles, and vocabulary
5. If no executor field found or agent file doesn't exist → **fallback to @dev** (`.claude/agents/dev.md`)

**You are the executor agent defined in the story.** Not always Dex — if the story says `executor: @db-sage`, you are DB Sage. If `executor: @architect`, you are Aria. Adapt accordingly.

## Purpose

Port all task logic from `.aiox-core/development/tasks/dev-develop-story.md` into this skill so `/develop` is equivalent to running the full 925-line task. This skill covers: 3 execution modes, constitutional gates, CodeRabbit self-healing, decision logging, Code Intelligence Check, story file restrictions, blocking conditions, deploy awareness, and post-execution learning.

---

## Input

Story file path from `$ARGUMENTS` (position 0). Optional mode from `$ARGUMENTS` (position 1): `yolo`, `interactive`, or `preflight`. Default: `interactive`.

**Usage:**
```
/develop {story-file-path}              # Interactive mode (default)
/develop {story-file-path} yolo         # YOLO mode
/develop {story-file-path} preflight    # Pre-Flight Planning mode
```

**Edge cases:**
- Invalid mode → default to `interactive` with warning
- Missing story file → clear error, HALT
- User cancellation → exit gracefully, save progress message
- No mode argument → use `interactive`

---

## Pre-Execution Learning Check (Story 103.9 — Lazy Promotion)

> **Trigger:** Runs BEFORE Constitutional Gates on every invocation. Zero-overhead if no candidates exist.

1. **Scan** `.aios/learning/entries/develop-story/` for all `*.yaml` files where `status: draft`
2. **Filter** entries with `promotion_score >= 3.5` (Pattern/Anti-Pattern threshold per canonical ontology Section 4.3)
3. **If none found:** Proceed normally to Constitutional Gates — no interruption
4. **If candidates found:** Show promotion prompt BEFORE skill execution begins:

```
+----------------------------------------------------------+
| LEARNING PROMOTION — {N} candidates from develop-story   |
+----------------------------------------------------------+
| 1. [{type}] "{observed_pattern}"                         |
|    Score: {X.X} | Evidence: {N} | Classification: {cls}  |
|                                                          |
| 2. [{type}] "{observed_pattern}"                         |
|    Score: {X.X} | Evidence: {N} | Classification: {cls}  |
+----------------------------------------------------------+
| Approve? [y=all / n=skip / 1,2=select / d=defer]        |
+----------------------------------------------------------+
```

**Note for Rules/Vetos (score >= 4.0):** Show with governance notice: "These require governance review before inlining to skill. Approve to register in decision-cards; governance inlining is a separate step."

5. **Process user response:**
   - `y` (all): Promote ALL candidates
   - `n` (skip): Proceed without promoting
   - `1,2,...` (select): Promote only selected entries by number
   - `d` (defer): Mark entries `status: deferred` — not shown again until score increases or explicitly requested via `@heuristic-ops *promote`

6. **For each approved entry — execute promotion (AC-3):**
   - (a) Create L2 decision card in `squads/squad-creator-pro/minds/{owner}/heuristics/decision-cards.yaml` using v2 schema. Set `learning_source_type: skill_execution`, `policy_snapshot: {current context}`, `status: active`. Assign next available `PV_KE_NNN` ID.
   - (b) Create L3 heuristic doc at `squads/squad-creator-pro/minds/{owner}/heuristics/{ID}.md` with description, evidence summary, applicability context, and anchor.
   - (c) Update source entry in `.aios/learning/entries/develop-story/{id}.yaml`: set `status: promoted`, add `promoted_at: {ISO-8601}`, `promoted_to: {PV_KE_NNN}`. Never delete the entry.

7. **For approved Rules/Vetos — inline to SKILL.md (AC-4):**
   - If entry is classified as `Rule`: Append to this file's `## Rules` section (create if absent). Format: `- {ID}: {description}` with evidence reference.
   - If entry is classified as `Veto`: Append to this file's `## Vetos` section (create if absent). Format: `- {ID}: {description}` with evidence reference.

8. **For superseded entries (AC-6):**
   - If a promoted entry supersedes an earlier entry: mark the earlier entry `status: superseded`, add `superseded_by: {PV_KE_NNN}`.
   - Entries are NEVER deleted from `.aios/learning/entries/`.

9. **THEN** proceed to Constitutional Gates and normal skill execution.

---

## Constitutional Gates

Run BEFORE any execution. Both gates apply to ALL modes.

### Gate 1: Story-Driven Development (Article III)

**Severity: BLOCK**

Validate ALL of the following:
1. Story file exists at the path provided
2. Story status is NOT `Draft` (must be `Ready`, `InProgress`, or equivalent)
3. Story has acceptance criteria defined
4. Story has at least one task/subtask

**On violation:**
```
CONSTITUTIONAL VIOLATION: Article III — Story-Driven Development
Cannot develop without a valid story.

Issue: {violation_details}

Resolution: Create or update story via @sm *draft or @po *create-story
```
HALT execution. Do not proceed.

### Gate 2: CLI First (Article I)

**Severity: WARN (log and continue)**

Check: If story involves new user-facing functionality, CLI implementation should exist or be created before UI components.

**On violation:**
```
CONSTITUTIONAL WARNING: Article I — CLI First
UI implementation detected without CLI foundation.

Reminder: CLI First → Observability Second → UI Third

Continuing (this will be logged in decision log).
```
Log the warning. Continue execution.

---

## Execution Modes

### YOLO Mode — Fast, Autonomous (0-1 prompts)

**When to use:** Simple, deterministic tasks where requirements are unambiguous.

**Workflow:**

1. **Initialization**
   - Read story file completely
   - Initialize decision logging:
     ```javascript
     const { initializeDecisionLogging, recordDecision, trackFile, trackTest, completeDecisionLogging }
       = require('./.aiox-core/development/scripts/decision-recorder');

     const context = await initializeDecisionLogging('dev', storyPath, {
       agentLoadTime: loadTimeInMs
     });
     ```
   - Identify all tasks and ACs
   - Analyze technical requirements autonomously

2. **Task Execution (autonomous loop)**
   - Read next task
   - Run Code Intelligence Check (see below)
   - Make autonomous decisions — LOG each immediately:
     - Architecture choices → `type: 'architecture'`
     - Library selections → `type: 'library-choice'`
     - Algorithm implementations → `type: 'algorithm'`
     ```javascript
     recordDecision({
       description: 'Use Axios for HTTP client',
       reason: 'Better error handling, interceptor support, TypeScript definitions',
       alternatives: ['Fetch API (native)', 'Got library', 'node-fetch'],
       type: 'library-choice',
       priority: 'medium'
     });
     ```
   - Implement task and all subtasks
   - Track file operations:
     ```javascript
     trackFile('src/api/users.js', 'created');
     trackFile('package.json', 'modified');
     ```
   - Write tests; track results:
     ```javascript
     trackTest({ name: 'users.test.js', passed: true, duration: 125 });
     ```
   - Mark task `[x]` ONLY if ALL validations pass
   - Update story File List

3. **Completion**
   - Execute CodeRabbit Self-Healing Loop (see below)
   - Execute `.aiox-core/development/checklists/story-dod-checklist.md`
   - Set story status: `Ready for Review`
   - Generate decision log:
     ```javascript
     const logPath = await completeDecisionLogging(storyId, 'completed');
     // Saves to: .ai/decision-log-{story-id}.md
     ```
   - HALT

**User prompts:** 0-1 (only if a blocking issue requires approval)

---

### Interactive Mode — Balanced, Educational (5-10 prompts) **[DEFAULT]**

**When to use:** Learning, complex decisions, unfamiliar domain.

**Workflow:**

1. **Story Analysis (with user)**
   - Read story file completely
   - Present summary: task list, ACs, estimated effort
   - Confirm understanding with user before proceeding

2. **Task Execution (interactive loop)**
   - Read next task
   - Run Code Intelligence Check (see below)
   - **Decision checkpoints** — prompt user at:
     - Architecture decisions (e.g., "Microservices or monolith?")
     - Library selections (e.g., "Axios or Fetch?")
     - Algorithm choices
     - Testing approaches
   - **Educational explanations:**
     - Before each decision: explain options and trade-offs
     - After user choice: explain why it fits this context
     - During implementation: narrate what and why
   - Implement task and all subtasks
   - Write tests; execute validations
   - Show results to user before marking `[x]`
   - Update story File List

3. **Completion**
   - Execute CodeRabbit Self-Healing Loop (shows progress, no prompts)
   - Execute `.aiox-core/development/checklists/story-dod-checklist.md`
   - Present completion summary to user
   - Set story status: `Ready for Review`
   - HALT

**User prompts:** 5-10 (balanced for control and speed)

---

### Pre-Flight Planning Mode — Comprehensive Upfront Planning

**When to use:** Ambiguous requirements, critical work, zero-ambiguity execution needed.

**Workflow:**

1. **Story Analysis Phase**
   - Read story file completely
   - Identify ALL ambiguities:
     - Missing technical specifications
     - Unspecified library choices
     - Unclear ACs
     - Undefined edge case handling
     - Missing testing guidance

2. **Questionnaire Generation**
   - Generate comprehensive questions covering:
     - Architecture decisions
     - Library and framework choices
     - Algorithm and data structure selections
     - Testing strategy
     - Edge case handling
     - Performance requirements
     - Security considerations
   - Present ALL questions to user at once
   - Collect all responses in batch

3. **Execution Plan Creation**
   - Create detailed execution plan with all decisions documented upfront
   - Present plan to user for approval
   - Wait for user confirmation before proceeding

4. **Zero-Ambiguity Execution**
   - Execute tasks with full context from questionnaire
   - No additional decision points (all decided in pre-flight)
   - Implement task and subtasks
   - Write tests; execute validations
   - Mark task `[x]` ONLY if ALL validations pass
   - Update story File List

5. **Completion**
   - Execute CodeRabbit Self-Healing Loop (included in execution plan)
   - Execute `.aiox-core/development/checklists/story-dod-checklist.md`
   - Present execution summary vs. pre-flight plan
   - Set story status: `Ready for Review`
   - HALT

**User prompts:** All upfront (questionnaire phase), then 0 during execution

---

## Common Workflow (All Modes)

### Order of Execution

For each task:

1. Read the task definition
2. Run **Code Intelligence Check** (IDS G4) — see below
3. Implement task and all its subtasks
4. Write tests
5. Execute validations
6. **Only if ALL pass:** mark task checkbox `[x]`
7. Update story File List (created/modified/deleted files)
8. Repeat until all tasks complete
9. Execute CodeRabbit Self-Healing Loop
10. Execute DOD checklist
11. Set status, HALT

### Code Intelligence Check (IDS G4) — AC-5

Before creating any new file or function:

1. Check if code intelligence is available:
   ```javascript
   const { isCodeIntelAvailable, checkBeforeWriting }
     = require('./.aiox-core/core/code-intel/helpers/dev-helper');
   ```
2. If available: call `checkBeforeWriting(fileName, description)`
3. If result is non-null: display as **"Code Intelligence Suggestion"** (non-blocking advisory)
4. In YOLO mode: log suggestion in decision log via `recordDecision()`
5. If unavailable: skip silently — zero impact on workflow

This implements IDS G4 (check before creating) without blocking execution.

### Story File Updates — Allowed vs Forbidden (AC-6)

**ALLOWED — only update these sections:**
- Tasks / Subtasks checkboxes (`[ ]` → `[x]`)
- Dev Agent Record section and ALL its subsections
- Agent Model Used
- Debug Log References
- Completion Notes List
- File List
- Change Log (add entry on completion)
- Status (set to `Ready for Review` when complete)

**FORBIDDEN — never modify these sections:**
- Story description / narrative
- Acceptance Criteria text
- Dev Notes
- Testing sections (test specs, test plans)

This restriction applies identically across all 3 modes.

### Blocking Conditions — 5 HALT Conditions (AC-7)

**HALT and ask user if ANY of the following occur:**

1. **Unapproved dependency needed** — a library or service not in the existing stack is required and not approved in the story
2. **Ambiguous requirements** — after reading the story and all context files, a requirement remains unclear and cannot be resolved autonomously
3. **3 consecutive failures** — 3 failed attempts to implement or fix the same thing (implementation or test)
4. **Missing configuration** — required environment variable, secret, or config file is absent and cannot be inferred
5. **Failing regression tests** — existing tests that were passing begin to fail due to the current implementation

In all HALT cases: state the issue clearly, ask for guidance, do NOT mark tasks complete, do NOT change status.

### Ready for Review Criteria (AC-8)

Before setting status to `Ready for Review`, ALL 4 must be true:

1. Code matches ALL story requirements and ACs
2. All validations pass (lint, typecheck, unit tests, integration tests)
3. Implementation follows project coding standards (absolute imports, no `any`, kebab-case files, PascalCase components)
4. File List in the story is complete and accurate (all created/modified/deleted files listed)

### Completion Checklist — 9 Steps (AC-9)

Execute in order before marking story complete:

1. All tasks and subtasks marked `[x]`
2. All implemented code has corresponding tests
3. All validations pass (lint + typecheck + tests)
4. Full regression test suite passes (no regressions introduced)
5. File List in story is complete and accurate
6. **CodeRabbit Self-Healing Loop executed** (see below)
7. **`.aiox-core/development/checklists/story-dod-checklist.md` executed**
8. Story status set to `Ready for Review`
9. **HALT** — do not proceed further (next: `@qa` runs `/review-story`)

---

## CodeRabbit Self-Healing (Inline Execution) — AC-3

**Execute AFTER all tasks complete, BEFORE DOD checklist.**

**MANDATORY:** This step MUST execute. `coderabbit_iterations` in the learning log MUST be >= 1.

1. **Run CodeRabbit directly via WSL (inline, NOT background):**
   ```bash
   PROJECT_WSL=$(wsl bash -c "wslpath -a '$(git rev-parse --show-toplevel)'" 2>/dev/null)
   wsl bash -c "cd '$PROJECT_WSL' && ~/.local/bin/coderabbit --prompt-only -t uncommitted 2>&1"
   ```
   **Timeout:** 900000ms (15 minutes). Use Bash tool with this timeout.

2. **Parse the output** for severity markers:
   - Count findings by type: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `potential_issue`, `improvement`
   - Map `potential_issue` → HIGH, `improvement` → MEDIUM if no explicit severity

3. **Self-healing loop (if CRITICAL or HIGH found):**
   ```
   iteration = 1
   max_iterations = 2

   WHILE iteration <= max_iterations AND critical_or_high_issues_remain:
     a. Attempt auto-fix for each CRITICAL/HIGH issue (read the file, apply the fix)
     b. Re-run CodeRabbit: same command as step 1
     c. iteration++

   Record final iteration count in learning log as coderabbit_iterations
   ```

4. **After loop completes:**
   - If **zero CRITICAL:** Log "CodeRabbit PASSED (N iterations)" in Dev Agent Record. Continue.
   - If **CRITICAL remains after max_iterations:** HALT. Do NOT set status to Ready for Review. Report remaining issues to user.
   - Log HIGH/MEDIUM issues in Dev Agent Record as recommendations.

5. **If CodeRabbit CLI is not found** (`command not found` or WSL unavailable):
   - Log warning: "CodeRabbit CLI not installed — requires WSL setup"
   - Set `coderabbit_iterations: 0` in learning log
   - Continue (do not HALT) — but the warning MUST be visible in Dev Agent Record
   - **This is the ONLY acceptable reason for coderabbit_iterations: 0**

**Why inline:** Background delegation via Agent tool was unreliable — sub-agents consistently skipped CodeRabbit execution, resulting in 0% execution rate across 34 stories. Inline execution guarantees the CLI runs.

---

## Decision Logging (YOLO Mode) — AC-4

**Infrastructure:**
```javascript
const {
  initializeDecisionLogging,
  recordDecision,
  trackFile,
  trackTest,
  completeDecisionLogging
} = require('./.aiox-core/development/scripts/decision-recorder');
```

**Log file location:** `.ai/decision-log-{story-id}.md`

**Format:** ADR-compliant (Architecture Decision Record)

**Sections generated automatically by `completeDecisionLogging()`:**

1. **Context** — story info, execution time, agent model, files modified, tests run
2. **Decisions Made** — all autonomous decisions with type/priority classification
3. **Rationale & Alternatives** — why each choice was made, what else was considered
4. **Implementation Changes** — files created/modified/deleted, test pass/fail results
5. **Consequences & Rollback** — git commit hash, rollback instructions, performance impact

**Decision types:** `architecture`, `library-choice`, `algorithm`, `testing-approach`, `security`

**Priority levels:** `high`, `medium`, `low`

In Interactive and Pre-Flight modes, decisions are discussed with the user rather than logged autonomously. The decision log is YOLO-only.

---

## Deploy Awareness — AC-10

After all story tasks complete, before the completion checklist:

1. Read story frontmatter `deploy_type` field
2. If `deploy_type` is `none` or absent: skip this section
3. If `deploy_type` is set, populate `e2e_verification.checks[]` in the story Dev Agent Record:

| deploy_type | Checks to populate |
|-------------|-------------------|
| `supabase_migration` | List migration files created: `packages/db/migrations/YYYYMMDD_*.sql` |
| `railway` | List API endpoint health check paths (e.g., `/health`, `/api/v1/ping`) |
| `vercel` | List Vercel config presence: `vercel.json`, build output directory |
| `hetzner_docker` | List Docker services and Dockerfile paths |
| `multi` | Apply all of the above that are relevant |

This pre-populates `e2e_verification` so `verify-deploy` (Story 102.3) and `po-close-story` pre-conditions can validate deployment state.

Applies identically across all 3 execution modes.

---

## Examples

### YOLO Mode
```
/develop docs/stories/epic-103/STORY-103.1-PORT-DEVELOP-STORY.md yolo

Output:
YOLO Mode — Autonomous Development
Story 103.1: Port develop-story Task to Skill
Executing autonomously with decision logging...

Task 1 complete (Decision: Rewrite SKILL.md from stub — rationale logged)
Task 2 complete (skill-registry.yaml version bumped to 2.0.0)
All validations pass

CodeRabbit self-healing: PASSED (0 CRITICAL, 2 HIGH documented)
Decision log: .ai/decision-log-103.1.md (2 decisions logged)
Story ready for review
```

### Interactive Mode (Default)
```
/develop docs/stories/epic-103/STORY-103.1-PORT-DEVELOP-STORY.md

Output:
Interactive Mode — Balanced Development
Story 103.1: Port develop-story Task to Skill

Story has 2 tasks, 11 ACs. Estimated: 4d effort.
Confirm understanding and proceed? [y/n]: _
```

### Pre-Flight Mode
```
/develop docs/stories/epic-103/STORY-103.1-PORT-DEVELOP-STORY.md preflight

Output:
Pre-Flight Planning Mode
Story 103.1: Port develop-story Task to Skill

Analyzing story for ambiguities...
Found 3 decisions needed.

Pre-Flight Questionnaire:
1. Should the skill include inline code examples or pseudocode?
2. Should decision logging apply to Interactive mode as well?
3. Should CodeRabbit be skipped if WSL is unavailable?

[Please answer all questions before proceeding]
```

---

## Dependencies

- `.aiox-core/development/checklists/story-dod-checklist.md` — Definition of Done checklist
- `.aiox-core/development/scripts/decision-recorder` — Decision logging infrastructure (YOLO mode)
- `.aiox-core/core/code-intel/helpers/dev-helper` — Code Intelligence Check (optional, graceful skip)
- `coderabbit` CLI via WSL — CodeRabbit self-healing loop (optional, graceful skip)

## Tools

- `git` — local operations only (add, commit, status, diff, log)
- File system — read/write story files and source files
- Testing frameworks — execute validation tests
- `npm run lint` + `npm run typecheck` — quality validation

## Notes

- **Backward compatibility:** `/develop {story-id}` without mode uses `interactive` (unchanged behavior)
- **Context field:** Remains `fork` — Story 103.4 will migrate to `inline`
- **YOLO decision logs:** Persisted at `.ai/decision-log-{story-id}.md` for future reference
- **CodeRabbit skip:** If WSL/CLI unavailable, skip silently and document in Dev Agent Record
- **Handoff:** After story is `Ready for Review`, next step is `@qa` running `/review-story {story-file-path}`

---

## Workflow Phases

### Phase 1: Constitutional Gates

- [ ] Story file exists at the path provided
- [ ] Story status is `Ready` or `InProgress` (not `Draft`)
- [ ] Acceptance criteria are defined (at least 1)
- [ ] At least one task/subtask is present
- [ ] CLI First check completed (WARN logged if UI precedes CLI)

> **STOP** — Do not proceed to Phase 2 until all Phase 1 items are checked. A story in Draft is not ready for development.

### Phase 2: Code Intelligence Check

- [ ] `isCodeIntelAvailable()` called before creating any new file or function
- [ ] If available: `checkBeforeWriting(fileName, description)` executed for each new artifact
- [ ] Advisory suggestions reviewed (non-blocking, but must be consciously accepted or dismissed)
- [ ] IDS G4 check logged in decision log (YOLO) or discussed with user (Interactive/Pre-Flight)

> **STOP** — Do not proceed to Phase 3 until Code Intelligence check has run (or confirmed unavailable and skipped). Skipping silently without confirming availability is not acceptable.

### Phase 3: Implementation

- [ ] Each task read fully before work begins
- [ ] Implementation follows project conventions (absolute imports, no `any`, kebab-case files, PascalCase components)
- [ ] Story File List updated after each file created/modified/deleted
- [ ] Only allowed sections of the story file modified (checkboxes, Dev Agent Record, File List, Status)
- [ ] Forbidden sections untouched (narrative, AC text, Dev Notes, Testing sections)

> **STOP** — Do not proceed to Phase 4 until all tasks are implemented and File List is current. Partially-implemented tasks must not be marked `[x]`.

### Phase 4: Tests

- [ ] Every implemented feature has corresponding tests
- [ ] Tests execute and pass
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] Regression suite passes (no existing tests broken)

> **STOP** — Do not proceed to Phase 5 until ALL validations pass. Tests added post-review are insufficient. Quality escapes found by @qa require a full loop back to this phase.

### Phase 5: CodeRabbit Self-Healing (MANDATORY)

- [ ] CodeRabbit CLI executed INLINE via WSL: `wsl bash -c "cd '$PROJECT_WSL' && ~/.local/bin/coderabbit --prompt-only -t uncommitted 2>&1"` (timeout: 900000ms)
- [ ] Output parsed for CRITICAL/HIGH/MEDIUM/LOW findings
- [ ] CRITICAL/HIGH issues auto-fixed (max 2 iterations with re-run)
- [ ] HIGH issues documented in Dev Agent Record Dev Notes
- [ ] If CodeRabbit CLI not found: warning logged in Dev Agent Record (ONLY valid reason for iterations=0)
- [ ] `coderabbit_iterations` recorded in learning log (MUST be >= 1 unless CLI not installed)

> **STOP** — Do not proceed to Phase 6 if CRITICAL issues remain after 2 iterations. HALT and report to user. Do not mark story complete with unresolved CRITICAL issues. `coderabbit_iterations: 0` with CLI installed is a process violation.

### Phase 6: DOD Checklist + Completion

- [ ] `.aiox-core/development/checklists/story-dod-checklist.md` executed in full
- [ ] Deploy awareness check complete (`deploy_type` read, `e2e_verification.checks[]` pre-populated if applicable)
- [ ] Decision log generated (YOLO mode): `.ai/decision-log-{story-id}.md`
- [ ] Story status set to `Ready for Review`
- [ ] HALT — do not proceed further (next: `@qa` runs `/review-story`)

> **STOP** — Story is not complete until all 9 completion checklist items pass. Setting status to `Ready for Review` before the DOD checklist runs is a process violation.

---

## Red Flags

| Rationalization | Why It Fails |
|----------------|--------------|
| "The story is simple, I'll skip Pre-Flight mode" | Complexity is assessed after reading the story, not before. Unresolved ambiguities discovered mid-implementation cost more than a Pre-Flight questionnaire. |
| "I'll commit first and add tests afterward" | Tests added post-commit have no coverage of the implementation path taken. The DOD checklist requires tests passing before status changes. |
| "I'll mark Done before CodeRabbit runs" | Self-healing exists because self-review has known blind spots. CRITICAL issues appear in stories that feel complete. |
| "I'll update the File List at the end" | Incremental updates prevent list drift. A stale File List means @qa reviews incorrect artifacts and the gate file references wrong files. |
| "This file path looks right, I won't verify it exists first" | Creating files in wrong directories is one of the most common sources of review failures. Read the project structure before writing. |
| "The ACs are clear enough, I don't need to read Dev Notes" | Dev Notes contain architectural decisions, constraints, and context that ACs summarize. Missing them produces implementations that satisfy the letter but not the intent. |
| "I'll skip Code Intelligence — it's optional" | Optional means graceful fallback when unavailable, not optional as a discipline. The check exists to prevent IDS violations and duplicated functionality. |
| "I'll fix the lint errors in the next story" | Lint errors are the developer's responsibility before handing off. The QA gate does not exist to clean up lint the developer could have caught in Phase 4. |

---

## Blocking Conditions

HALT execution and surface to user when:

1. **Unapproved dependency needed** — A library or service not in the existing stack is required and not approved in the story. Action: HALT. State the dependency, explain why it is needed, ask for approval. Resolution: User approves or suggests an in-stack alternative.

2. **Requirement remains ambiguous after full context read** — After reading the story, Dev Notes, epic file, and referenced architecture docs, a requirement cannot be resolved autonomously. Action: HALT. List the specific ambiguity, state what assumptions would be required to proceed. Resolution: User clarifies or story is updated.

3. **3 consecutive implementation or test failures on the same item** — 3 failed attempts signal a misunderstood requirement, broken environment, or architectural mismatch. Action: HALT. Report all 3 attempts with outcomes, ask for guidance. Do not mark task `[x]`. Resolution: User provides direction or context changes.

4. **CRITICAL CodeRabbit issues remain after 2 self-healing iterations** — The self-healing loop exhausted its budget. Action: HALT. Report all remaining CRITICAL issues with file references. Do not set status to `Ready for Review`. Resolution: Human resolves CRITICAL issues manually.

5. **Failing regression tests** — Tests that were passing before this story began now fail. Action: HALT. Report the failing tests and the likely cause. Do not proceed. Resolution: Revert the breaking change, or obtain explicit approval to update test expectations.

---

## Post-Execution Learning (MANDATORY — Write Log Before HALT)

> **This is an EXECUTABLE step.** You MUST use the Write tool to create the log file.

**BEFORE completing this skill, create the execution log:**

1. **File path:** `.aios/learning/logs/develop-story/develop-story-{story-id}-{YYYYMMDD}-{HHmmss}.yaml`
2. **Use Write tool** to create the file with this content:

```yaml
schema_version: "1.0"
skill_id: "develop-story"
timestamp: "{current ISO-8601}"
story_id: "{story-id from $ARGUMENTS}"
executor: "{agent who executed}"
duration_minutes: {estimate}
mode: "{mode used or null}"
files_modified: [{list of files you modified}]
decisions:
  - description: "{key decision made}"
    type: "{type}"
    alternatives: []
    rationale: "{why}"
errors: []
outcome: "{completed|halted|failed}"
coderabbit_iterations: 0
gate_result: "N/A"
epilogue:
  what_worked: "{specific patterns that worked}"
  what_failed: "{what was harder than expected, or null}"
  decision_drift: "{decisions that differed from plan, or null}"
  confidence: "{HIGH|MEDIUM|LOW}"
  source_type: "skill_execution"
```

3. **If Write fails:** Log warning in Dev Agent Record, do NOT halt skill.
4. **NEVER skip this step** — even on failure, write a log with `outcome: failed`.

> This log feeds `scripts/learning-digester.js` which generates observations for the unified learning system.
