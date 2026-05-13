---
name: full-sdc
description: "Full Story Development Cycle — orchestrates validate → develop → review (QG loop) → deploy → close via Agent Teams with sequential handoffs and visual task tracking"
version: "1.0.0"
owner_squad: "sinkra-squad"
sinkra_tier: Tier2
context: conversation
agent: general-purpose
user-invocable: true
argument-hint: "[story-path] [mode: yolo|interactive]"
depends_on: ["/validate-story-draft", "/develop-story", "/review-story", "/apply-qa-fixes", "/deploy-story", "/verify-deploy", "/close-story"]
invokes: []
---

# Full SDC — Complete Story Development Cycle

Orchestrates the entire story lifecycle from validation through closure using Agent Teams.
Each phase is executed by the correct agent persona with full skill protocol.
QG loop is real — separate agents conversing until PASS or circuit breaker.

## Usage

```
/full-sdc docs/stories/epic-N/STORY-N.M-TITLE.md
/full-sdc docs/stories/epic-N/STORY-N.M-TITLE.md yolo
/full-sdc docs/stories/epic-N/STORY-N.M-TITLE.md interactive
```

## Architecture: Agent Teams + Tasks + Sequential Handoffs

Flow for team `sdc-{story-id}`: Task 1 Phase 0 Analysis runs inline; Task 2 Phase 1 Validate uses `@po`; Task 3 Phase 2 Develop uses `{executor}`; Task 4 Phase 3 Review/QG uses `{quality_gate}` and on FAIL sends fixes to `{executor}`, asks `{quality_gate}` to re-review, and loops max 3x; Task 5 Phase 4 Deploy plus Phase 4b Verify uses `{deploy_agent}` when `deploy_type != none`; Task 6 Phase 5 Close reuses `@po`.

## MANDATORY EXECUTION RULES

1. **Sequential execution** — each phase completes before the next starts
2. **Agents persist** — spawned teammates stay alive across phases (PO is reused for close)
3. **QG loop is real** — QG and Executor communicate via SendMessage, not re-spawned
4. **Tasks track progress** — TaskCreate for visual tracking, TaskUpdate on completion
5. **Deploy is conditional** — only spawn deploy agent if `deploy_type != none`
6. **Circuit breaker** — QG loop max 3 iterations, then escalate to user

---

## Phase 0: Story Analysis (team-lead, inline)

**Execute BEFORE creating the team.** This is lightweight analysis by the orchestrator.

### 0.1 — Read Story File

```
Read {story_path}
Extract:
  - story_id (from filename, e.g., "101.46")
  - title (from H1)
  - status (must be Ready or Draft — validate will fix Draft)
  - executor (e.g., "@dev", "@architect", "@db-sage")
  - quality_gate (e.g., "@qa", "@po", "@architect")
  - deploy_type (e.g., "none", "hetzner_docker", "vercel", "supabase_migration", "railway", "multi")
  - accountable (e.g., "pedro-valerio")
  - depends_on (list of dependency story IDs)
```

### 0.2 — Resolve Agent IDs

Map story fields to agent file paths:

| Field | Agent ID | Persona File |
|-------|----------|-------------|
| executor: @dev | dev | .claude/agents/dev.md |
| executor: @architect | architect | .claude/agents/architect.md |
| executor: @db-sage | db-sage | .claude/agents/db-sage.md |
| executor: @devops | devops | .claude/agents/devops.md |
| quality_gate: @qa | qa | .claude/agents/qa.md |
| quality_gate: @po | po | .claude/agents/po.md |
| quality_gate: @architect | architect | .claude/agents/architect.md |

### 0.3 — Resolve Deploy Agent

| deploy_type | Deploy Agent | Verify Agent |
|-------------|-------------|-------------|
| none | — (skip Phase 4) | — |
| hetzner_docker | @infra-chief | @infra-chief |
| supabase_migration | @db-sage | @db-sage |
| railway | @devops | @devops |
| vercel | @devops | @devops |
| multi | @devops (primary) | @devops |

### 0.4 — Determine Execution Mode

```
mode = argument[1] || "interactive"
Valid: "yolo" | "interactive" | "preflight"
```

### 0.5 — Dependency Check

For each story in `depends_on`:
- Read the dependency story file
- Check status is `Done`
- If any dependency is NOT Done → HALT with clear message listing blockers

### 0.6 — Display Analysis Summary

```
╔══════════════════════════════════════════════════════════╗
║  Full SDC — Story {story_id}: {title}                    ║
╠══════════════════════════════════════════════════════════╣
║  Executor:     @{executor} ({persona_name})              ║
║  Quality Gate: @{quality_gate} ({persona_name})          ║
║  Deploy Type:  {deploy_type}                             ║
║  Deploy Agent: @{deploy_agent} (or "none — skip deploy") ║
║  Mode:         {mode}                                    ║
║  Accountable:  {accountable}                             ║
╠══════════════════════════════════════════════════════════╣
║  Pipeline:                                               ║
║    1. Validate (@po)                                     ║
║    2. Develop (@{executor})                              ║
║    3. Review (@{quality_gate}) + QG Loop                 ║
║    4. {Deploy (@{deploy_agent}) | SKIP}                  ║
║    5. Close (@po)                                        ║
╚══════════════════════════════════════════════════════════╝
Proceed? [y/n]
```

In YOLO mode: skip confirmation, proceed directly.

---

## Phase 0b: Create Team + Tasks

### Create Team

```
TeamCreate(
  team_name: "sdc-{story_id}",
  description: "Full SDC for Story {story_id}: {title}"
)
```

### Create Tasks (visual tracking)

```
TaskCreate(title: "Phase 1: Validate Story Draft (@po)", description: "PO validates story completeness, ACs, executor assignment, deploy_type")
TaskCreate(title: "Phase 2: Develop Story (@{executor})", description: "Executor implements all tasks, writes tests, updates File List")
TaskCreate(title: "Phase 3: Review + QG Loop (@{quality_gate})", description: "QG reviews code, CodeRabbit self-healing, AC validation. Loop with executor if FAIL.")
TaskCreate(title: "Phase 4: Deploy + Verify (@{deploy_agent})", description: "Deploy to {deploy_type} target, verify E2E. SKIP if deploy_type=none.")
TaskCreate(title: "Phase 5: Close Story (@po)", description: "PO closure: CHK-8/9/10 gates, status→Done, Epic update")
```

---

## Phase 1: Validate Story Draft

### Spawn PO Teammate

```
Agent(
  name: "po",
  team_name: "sdc-{story_id}",
  model: "sonnet",
  description: "SDC PO: validate story",
  prompt: "You are @po (Pax) executing the validate-story-draft protocol.

    FIRST: Read your persona from .claude/agents/po.md
    THEN: Read the full skill protocol from .claude/skills/validate-story-draft/SKILL.md
    THEN: Execute the COMPLETE validation protocol for:

    Story: {story_path}

    Follow ALL phases in the skill (Phase 0 Epic Context, Phase 0.5 D10,
    Steps 1-10, Report, Auto-Fix). Do NOT skip steps.

    When done, SendMessage to 'team-lead' with:
    - Verdict: GO | GO with Auto-Fix | GO Condicional | NO-GO
    - Score: X/10
    - Summary of findings and auto-fixes applied
    - Any conditions the executor must address"
)
```

### Wait for PO Result

PO sends verdict via SendMessage. Team-lead processes:

- **GO / GO with Auto-Fix:** TaskUpdate(task1, completed). Proceed to Phase 2.
- **GO Condicional:** TaskUpdate(task1, completed). Note conditions for executor. Proceed.
- **NO-GO:** TaskUpdate(task1, completed). **HALT pipeline.** Show NO-GO reasons to user. Ask user to fix story and retry.

---

## Phase 2: Develop Story

### Spawn Executor Teammate

```
Agent(
  name: "{executor_id}",
  team_name: "sdc-{story_id}",
  model: "sonnet",
  description: "SDC Executor: develop story",
  prompt: "You are @{executor_id} ({persona_name}) executing the develop-story protocol.

    FIRST: Read your persona from .claude/agents/{executor_id}.md
    THEN: Read the full skill protocol from .claude/skills/develop-story/SKILL.md
    THEN: Execute the COMPLETE development protocol for:

    Story: {story_path}
    Mode: {mode}

    {IF conditions from PO validation:}
    PO Conditions to address:
    {conditions_list}
    {ENDIF}

    Follow ALL phases: Constitutional Gates, Code Intelligence, Implementation,
    Tests, CodeRabbit Self-Healing, DOD Checklist.

    When done, SendMessage to 'team-lead' with:
    - Status: completed | halted | failed
    - Tasks completed: N/N
    - Tests passing: yes/no
    - CodeRabbit iterations: N
    - Files created/modified list
    - Any blockers encountered"
)
```

### Wait for Executor Result

- **completed:** TaskUpdate(task2, completed). Proceed to Phase 3.
- **halted:** Show blocker to user. Wait for user input. SendMessage to executor with guidance. Resume.
- **failed:** TaskUpdate(task2, completed with note). **HALT pipeline.** Ask user.

---

## Phase 3: Review + QG Loop

### Spawn QG Teammate

```
Agent(
  name: "{qg_id}",
  team_name: "sdc-{story_id}",
  model: "sonnet",
  description: "SDC QG: review story",
  prompt: "You are @{qg_id} ({persona_name}) executing the review-story protocol.

    FIRST: Read your persona from .claude/agents/{qg_id}.md
    THEN: Read the full skill protocol from .claude/skills/review-story/SKILL.md
    THEN: Execute the COMPLETE review protocol for:

    Story: {story_path}

    Follow ALL phases: CodeRabbit Self-Healing, Code Intelligence, Risk Assessment,
    Comprehensive Analysis, Deploy Readiness, Active Refactoring, Standards,
    AC Validation, Gate File Creation.

    When done, SendMessage to 'team-lead' with:
    - Gate: PASS | CONCERNS | FAIL | WAIVED
    - Quality Score: N/100
    - Top issues (if any)
    - Gate file path"
)
```

### Process QG Result

**PASS or WAIVED:**
- TaskUpdate(task3, completed). Proceed to Phase 4.

**CONCERNS:**
- Show concerns to user. Ask: "Accept concerns and proceed? [y/n]"
- If yes → TaskUpdate(task3, completed). Proceed.
- If no → enter QG Loop (treat as FAIL).

**FAIL → QG Loop:**

```
qg_iteration = 1
max_qg_iterations = 3

WHILE qg_iteration <= max_qg_iterations AND gate == FAIL:

  # 1. Send fix request to Executor (STILL ALIVE from Phase 2)
  SendMessage(
    to: "{executor_id}",
    summary: "QG Fix Round {qg_iteration}",
    message: "Quality gate returned FAIL. Fix these issues:

      {top_issues from QG}

      Read the gate file at {gate_path} for full details.
      Read the QA Results section in the story file.

      Apply fixes following the apply-qa-fixes protocol:
      - Read .claude/skills/apply-qa-fixes/SKILL.md for the protocol
      - Fix each issue
      - Run tests to confirm no regressions
      - Update story File List if new files created

      When done, SendMessage to 'team-lead' with:
      - Fixes applied: list
      - Tests passing: yes/no"
  )

  # 2. Wait for Executor fix confirmation

  # 3. Send re-review request to QG (STILL ALIVE from Phase 3)
  SendMessage(
    to: "{qg_id}",
    summary: "Re-review after fixes Round {qg_iteration}",
    message: "Executor applied fixes for Round {qg_iteration}.
      Re-execute the review-story protocol for:
      Story: {story_path}

      Focus on the previously-failed items. Full re-review.

      SendMessage to 'team-lead' with updated gate verdict."
  )

  # 4. Wait for QG re-verdict
  qg_iteration++

END WHILE
```

**After loop:**
- If PASS → TaskUpdate(task3, completed). Proceed.
- If still FAIL after 3 rounds → **ESCALATE to user.** Show all 3 rounds of issues. HALT.

---

## Phase 4: Deploy + Verify (CONDITIONAL)

**IF `deploy_type == "none"` or absent:** Skip Phase 4 entirely. TaskUpdate(task4, completed, "Skipped — deploy_type: none"). Proceed to Phase 5.

**IF `deploy_type != "none"`:**

### Spawn Deploy Teammate

```
Agent(
  name: "{deploy_agent_id}",
  team_name: "sdc-{story_id}",
  model: "sonnet",
  description: "SDC Deploy: {deploy_type}",
  prompt: "You are @{deploy_agent_id} executing TWO skills sequentially:

    === SKILL 1: deploy-story ===
    FIRST: Read .claude/skills/deploy-story/SKILL.md
    Execute the deploy protocol for:
    Story: {story_path}
    deploy_type: {deploy_type}

    === SKILL 2: verify-deploy ===
    AFTER deploy completes successfully:
    Read .claude/skills/verify-deploy/SKILL.md
    Execute the verify protocol for the same story.

    When done, SendMessage to 'team-lead' with:
    - Deploy status: success | failed
    - Verify status: PASS | FAIL | PARTIAL
    - e2e_verification summary
    - Any issues"
)
```

### Process Deploy Result

- **Deploy success + Verify PASS:** TaskUpdate(task4, completed). Proceed to Phase 5.
- **Deploy failed:** HALT. Show error. Ask user.
- **Verify FAIL/PARTIAL:** HALT. Show failing checks. Ask user to resolve and retry.

---

## Phase 5: Close Story

### Reuse PO Teammate

PO was spawned in Phase 1 and is **still alive** (idle). Wake it with SendMessage:

```
SendMessage(
  to: "po",
  summary: "Close story — final phase",
  message: "All phases complete. Execute the close-story protocol.

    Read .claude/skills/close-story/SKILL.md
    Execute the COMPLETE closure protocol for:
    Story: {story_path}

    This includes:
    - CHK-8: Deploy verification gate (deploy_type: {deploy_type})
    - CHK-9: Registry governance (advisory)
    - CHK-10: IDS post-check (advisory)
    - Status → Done
    - Epic file update
    - Development Log entry
    - Closure summary

    When done, SendMessage to 'team-lead' with:
    - Closure status: completed | blocked
    - CHK results
    - Epic progress
    - Next story recommendation"
)
```

### Process Close Result

- **completed:** TaskUpdate(task5, completed). Proceed to Shutdown.
- **blocked:** Show CHK block reason. Ask user. (Most likely CHK-8 if deploy verify failed.)

---

## Phase 6: Shutdown + Summary

### Shutdown All Teammates

```
SendMessage(to: "po", message: {type: "shutdown_request", reason: "SDC complete"})
SendMessage(to: "{executor_id}", message: {type: "shutdown_request", reason: "SDC complete"})
SendMessage(to: "{qg_id}", message: {type: "shutdown_request", reason: "SDC complete"})
IF deploy_agent spawned:
  SendMessage(to: "{deploy_agent_id}", message: {type: "shutdown_request", reason: "SDC complete"})
TeamDelete()
```

### Display Final Summary

```
╔══════════════════════════════════════════════════════════╗
║  Full SDC Complete — Story {story_id}: {title}           ║
╠══════════════════════════════════════════════════════════╣
║  Phase 1: Validate  ✅ {verdict} ({score}/10)            ║
║  Phase 2: Develop   ✅ {tasks_completed} tasks           ║
║  Phase 3: Review    ✅ Gate: {gate} ({quality_score}/100) ║
║           QG Loops: {qg_iterations}                      ║
║  Phase 4: Deploy    ✅ {deploy_status} | ⏭ Skipped       ║
║  Phase 5: Close     ✅ Status → Done                     ║
╠══════════════════════════════════════════════════════════╣
║  Epic Progress: {done}/{total} ({percentage}%)           ║
║  Next: Story {next_id} — {next_title}                    ║
║  Command: /full-sdc {next_story_path}                    ║
╚══════════════════════════════════════════════════════════╝
```

---

## Error Handling

### HALT Conditions (pipeline stops, user decides)

| Condition | Phase | Action |
|-----------|-------|--------|
| Dependency not Done | 0 | HALT before team creation |
| PO verdict: NO-GO | 1 | HALT, show issues |
| Executor halted (blocker) | 2 | HALT, show blocker, wait for user |
| QG FAIL after 3 loops | 3 | ESCALATE to user |
| Deploy failed | 4 | HALT, show error |
| Verify FAIL/PARTIAL | 4 | HALT, show checks |
| CHK-8 blocked | 5 | HALT, run verify-deploy first |

### Recovery

On any HALT:
1. Tasks show partial progress (completed phases visible)
2. Team stays alive — user can SendMessage to any agent
3. User resolves issue → SendMessage to team-lead → pipeline resumes
4. If user wants to abort → team-lead shuts down all agents

### Circuit Breakers

| Breaker | Limit | Action |
|---------|-------|--------|
| QG loop | 3 iterations | Escalate to user |
| CodeRabbit (in develop) | 2 iterations | Continue with warning |
| CodeRabbit (in review) | 3 iterations | Gate FAIL |
| Executor consecutive failures | 3 | HALT develop phase |

---

## Agent Spawn Specifications

### Model Selection

| Agent | Default Model | YOLO Mode | Rationale |
|-------|-------------|-----------|-----------|
| PO (validate) | sonnet | sonnet | Needs judgment for D10 analysis |
| Executor | sonnet | sonnet | Code generation quality |
| QG (review) | sonnet | sonnet | Needs judgment for risk assessment |
| Deploy agent | sonnet | haiku | Deploy is deterministic |
| PO (close) | — (reused) | — | Same instance from Phase 1 |

### Agent Persistence Map

```
Phase 1:  [PO spawned] ────────────────────────────────── [PO reused Phase 5]
Phase 2:  [Executor spawned] ──── [Executor fixes Phase 3 QG loop] ── [shutdown]
Phase 3:  [QG spawned] ─────────── [QG re-reviews Phase 3 loop] ──── [shutdown]
Phase 4:  [Deploy spawned if needed] ──────────────────────────────── [shutdown]
```

Key: PO lives from Phase 1 to Phase 5. Executor lives from Phase 2 through QG loop. QG lives for Phase 3 only. Deploy lives for Phase 4 only.

---

## Comparison with Existing Skills

| Existing Skill | What It Does | What /full-sdc Adds |
|---------------|-------------|-------------------|
| /story-executor | PO + Executor + QG via Agent Teams | + validate-story-draft, + deploy, + verify, + close |
| /validate-story-draft | PO validates story | Embedded as Phase 1 |
| /develop-story | Executor implements | Embedded as Phase 2 |
| /review-story | QG reviews | Embedded as Phase 3 |
| /apply-qa-fixes | Fix QG findings | Embedded in QG loop |
| /deploy-story | Deploy artifacts | Embedded as Phase 4a |
| /verify-deploy | Verify deployment | Embedded as Phase 4b |
| /close-story | PO closes | Embedded as Phase 5 |

**/full-sdc is the composition of all 7 skills into a single orchestrated pipeline.**

---

## Blocking Conditions

HALT and surface to user when:

1. **Story file not found** — Cannot start pipeline. Resolution: provide correct path.
2. **Dependencies not Done** — Upstream stories incomplete. Resolution: complete dependencies first.
3. **PO verdict NO-GO** — Story has blocking issues. Resolution: fix story, retry.
4. **Executor halted** — Implementation blocker. Resolution: user provides guidance.
5. **QG FAIL after 3 loops** — Quality issues unresolvable by agents. Resolution: human intervention.
6. **Deploy failed** — Deployment error. Resolution: fix and retry deploy.
7. **User cancellation** — User types "abort" or denies any confirmation. Resolution: graceful shutdown of all agents.

---

## Post-Execution Learning (MANDATORY)

Create learning log at: `.aios/learning/logs/full-sdc/full-sdc-{story-id}-{YYYYMMDD}-{HHmmss}.yaml`

```yaml
schema_version: "1.0"
skill_id: "full-sdc"
timestamp: "{ISO-8601}"
story_id: "{story-id}"
executor_agent: "{executor from story}"
quality_gate_agent: "{qg from story}"
deploy_agent: "{deploy agent or null}"
deploy_type: "{deploy_type}"
duration_minutes: {estimate}
mode: "{yolo|interactive}"
phases:
  validate: {verdict: "GO", score: 8}
  develop: {status: "completed", tasks: "8/8"}
  review: {gate: "PASS", score: 85, qg_loops: 0}
  deploy: {status: "completed|skipped", verify: "PASS|skipped"}
  close: {status: "completed", chk8: "PASS|SKIP", chk9: "advisory", chk10: "advisory"}
files_modified: []
errors: []
outcome: "{completed|halted|failed|escalated}"
epilogue:
  what_worked: ""
  what_failed: ""
  qg_loop_count: 0
  total_agents_spawned: 0
  confidence: "HIGH|MEDIUM|LOW"
  source_type: "skill_execution"
```
