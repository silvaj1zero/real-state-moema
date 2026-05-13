---
name: "execute-epic"
description: "Executa epics por meio de uma orquestração multiagente com agentes AIOX."
version: "1.0.0"
agent: "execute-epic"
user-invocable: true
maxTurns: 25
---

# Execute Epic

Pipeline multi-agente para execução de epics usando agentes AIOX autônomos.

## Architecture: Direct AIOX Agents

```
Skill (this file)     → Orchestration only
  ↓ Task(subagent_type: "{role}")
AIOX Agent Wrapper    → .claude/agents/{role}.md
  ↓ Step 1: node agent-context-loader.js {role}
  ↓ Step 2: Read persona from agents/
  ↓ Step 3: Execute mission
Agent does actual work with full context already loaded
```

**KEY**: Os wrappers `.claude/agents/*.md` já carregam contexto via `agent-context-loader.js`.
Não é necessário incluir instruções de context loading nos prompts.

## AGENT_MAP

```yaml
# Mapeamento: executor ID → subagent_type
AGENT_MAP:
  dev: "aiox-dev"
  qa: "aiox-qa"
  architect: "aiox-architect"
  pm: "aiox-pm"
  po: "aiox-po"
  sm: "aiox-sm"
  devops: "aiox-devops"
  analyst: "aiox-analyst"
  ux: "aiox-ux"
  data-engineer: "aiox-data-engineer"
```

## Overview

```
/execute-epic "path/to/epic.md"

Phase 0: Setup & Route  → Read epic, classify scope, create team, create tasks
Phase 1: Backlog Review  → aiox-po validates, prioritizes, groups into waves
Phase 2: Dev Cycle       → Per wave, per story: aiox-sm → aiox-po → executor → aiox-qa
Phase 3: Retrospective   → aiox-po consolidates learnings
```

## Commands

### `*backlog` - Scan Available Epics (NO ELICITATION)

**ALWAYS run this first** to discover available epics:

```bash
# Scan all projects for epics
find docs/projects -name "epic-*.md" 2>/dev/null | head -20
```

**Output format (copy-paste ready):**

```
📋 AVAILABLE EPICS

1. epic-1-mmos-context-loader (mmos-context-parity)
   Path: docs/projects/mmos-context-parity/epics/epic-1-mmos-context-loader.md
   Stories: 7 | Done: 0 | Priority: P1
   → /execute-epic docs/projects/mmos-context-parity/epics/epic-1-mmos-context-loader.md

2. epic-2-skill-workflow (aiox-context-parity)
   Path: docs/projects/aiox-context-parity/epics/epic-2-skill-workflow.md
   Stories: 5 | Done: 3 | Priority: P2
   → /execute-epic docs/projects/aiox-context-parity/epics/epic-2-skill-workflow.md

---
To execute: /execute-epic {path-to-epic.md} [--from {story}]
```

### Direct Execution (NO MENU)

```bash
# Execute full epic
/execute-epic docs/projects/mmos-context-parity/epics/epic-1-mmos-context-loader.md

# Resume from specific story
/execute-epic docs/projects/mmos-context-parity/epics/epic-1-mmos-context-loader.md --from 1.4

# Execute single story
/execute-epic docs/projects/mmos-context-parity/epics/epic-1-mmos-context-loader.md --story 1.7
```

**Arguments:**
- `{path}`: Path to epic markdown file
- `--from {story}`: Resume from specific story (e.g., "1.4")
- `--story {N}`: Execute only this story
- `--scope`: all | single [default: all]

**NO ELICITATION** - If path provided, execute directly. If not, run `*backlog` automatically.

## Executor Competency Matrix

| Competency | Agent ID | subagent_type | Model |
|------------|----------|---------------|-------|
| backend, frontend, fullstack | `dev` | `aiox-dev` | opus |
| infrastructure, ci_cd | `devops` | `aiox-devops` | opus |
| architecture | `architect` | `aiox-architect` | opus |
| research, analysis | `analyst` | `aiox-analyst` | opus |
| strategic, prd | `pm` | `aiox-pm` | opus |
| ux_design, accessibility | `ux` | `aiox-ux` | opus |
| database, data_pipeline | `data-engineer` | `aiox-data-engineer` | opus |
| quality, review | `qa` | `aiox-qa` | opus |
| story expansion | `sm` | `aiox-sm` | sonnet |
| backlog, validation | `po` | `aiox-po` | opus |

## Model Hierarchy

| Model | Criteria | Agents |
|-------|----------|--------|
| **opus** | Analysis, decisions, development, review | aiox-dev, aiox-qa, aiox-po, aiox-architect, aiox-pm, aiox-data-engineer, aiox-devops, aiox-ux, aiox-analyst |
| **sonnet** | Mechanical expansion, formatting | aiox-sm |

## IDS Protocol

Every executor MUST follow: **REUSE > ADAPT > CREATE**. Target: CREATE rate < 30%.

---

## Phase 0: Setup & Scope Route

### 0.1 Read Epic

Read the epic file. Extract:
- Epic title, ID, total stories, total story points
- Per story: ID, title, executor, competency, dependencies, story points, phase
- Dependency graph

### 0.2 Locate Enhancement Context

Check for sibling files from `/enhance-workflow`:
```
{epic_dir}/01-discovery.md, 02-research.md, 03-roundtable.md
```

### 0.3 Scope Classification

| Size | Stories | Route |
|------|---------|-------|
| SINGLE | 1-2 | Skip PO, direct execution |
| SMALL | 3-6 | Sequential, simplified PO |
| STANDARD | 7-15 | Full pipeline with waves |
| LARGE | 16+ | Phase-by-phase with checkpoints |

### 0.4 Create Artifact Directory

```
outputs/execute/{epic_slug}/
├── backlog/execution-plan.md, accumulated-context.md
├── stories/{story_id}/expanded.md, validation.md, implementation-log.md, review.md
├── retro/retrospective.md
└── execution-report.md
```

### 0.5 Create Team

```
TeamCreate(team_name: "execute-{epic_slug}")
```

### 0.6 Create Tasks

One TaskCreate per story + Phase 1 + Phase 3, with correct blockedBy chains.

### 0.7 Initialize Accumulated Context

Create `accumulated-context.md` with empty sections: Completed Stories, Files Modified, Decisions Made, Known Issues.

---

## Phase 1: Backlog Review

```yaml
Task:
  subagent_type: "po"  # DIRECT - wrapper loads context automatically
  model: "opus"
  team_name: "execute-{epic_slug}"
  name: "po-backlog"
  mode: "bypassPermissions"
  prompt: |
    ## Mission: backlog-review

    ## Epic to Execute
    Read: {epic_file_path}

    ## Enhancement Context (if available)
    Read if they exist:
    - {epic_dir}/03-roundtable.md
    - {epic_dir}/01-discovery.md

    ## Specific Instructions
    1. Validate executor assignments match competency per story
    2. Validate dependency chain (flag circular deps)
    3. Group stories into execution waves (parallel when no deps between them)
    4. Risk assessment per story
    5. Create execution plan

    ## Output
    Save to: outputs/execute/{epic_slug}/backlog/execution-plan.md
```

**After aiox-po completes:**
1. TaskUpdate phase-1 → completed
2. Read execution plan
3. Present wave structure to user for approval (Gate 1)
4. After approval → execute until done

---

## Phase 2: Development Cycle

Status Flow: `DRAFT → APPROVED → IN_PROGRESS → REVIEW → DONE`

### Wave Execution Logic

- **1 story in wave**: Sequential (expand → validate → implement → review)
- **2+ stories**: Expand+validate per story, then implement in parallel (run_in_background)

### Step 2.1: Expand Story (aiox-sm)

```yaml
Task:
  subagent_type: "sm"  # DIRECT - sonnet model, mechanical expansion
  model: "sonnet"
  team_name: "execute-{epic_slug}"
  name: "sm-{story_id}"
  mode: "bypassPermissions"
  prompt: |
    ## Mission: expand-story

    ## Epic Story Definition
    Read: {epic_file_path}
    Extract story: {story_id}

    ## Accumulated Context
    Read: outputs/execute/{epic_slug}/backlog/accumulated-context.md

    ## Specific Instructions
    EXPAND the epic story into implementation-ready detail. Do NOT rewrite — add:
    1. YAML frontmatter (id, title, status:DRAFT, executor, competency, quality_gate, story_points, dependencies)
    2. Acceptance Criteria (copy exact wording from epic as checkboxes)
    3. Implementation Roadmap (step-by-step order, predicted file paths, files to read first)
    4. IDS Pre-Assessment (REUSE/ADAPT/CREATE per predicted file)
    5. Dependencies on previous stories (files, context from accumulated-context.md)

    ## Output
    Save to: outputs/execute/{epic_slug}/stories/{story_id}/expanded.md
```

### Step 2.2: Validate Story (aiox-po)

```yaml
Task:
  subagent_type: "po"  # DIRECT
  model: "opus"
  team_name: "execute-{epic_slug}"
  name: "po-{story_id}"
  mode: "bypassPermissions"
  prompt: |
    ## Mission: validate-story

    ## Story to Validate
    Read: outputs/execute/{epic_slug}/stories/{story_id}/expanded.md

    ## Epic Context
    Read: {epic_file_path}

    ## Accumulated Context
    Read: outputs/execute/{epic_slug}/backlog/accumulated-context.md

    ## Specific Instructions
    5-Point Contextual Validation:
    1. Sequence: Dependencies implemented? Order correct?
    2. File Overlap: Files touched by previous stories? Handoff noted?
    3. Schema/API Continuity: Compatible with previous changes?
    4. Executor Coherence: Right competency for these files?
    5. IDS Compliance: REUSE/ADAPT decisions reasonable?

    Decision: APPROVED or NEEDS_WORK (with specific issues).

    ## Output
    Save to: outputs/execute/{epic_slug}/stories/{story_id}/validation.md
```

**If NEEDS_WORK:** Re-spawn aiox-sm with PO feedback appended. Max 2 cycles.

### Step 2.3: Implement (Dynamic Executor)

Use AGENT_MAP to resolve executor:
```
executor_subagent = AGENT_MAP[story.executor]
# e.g., "dev" → "aiox-dev", "data-engineer" → "aiox-data-engineer"
```

```yaml
Task:
  subagent_type: executor_subagent  # DYNAMIC from AGENT_MAP
  model: "opus"
  team_name: "execute-{epic_slug}"
  name: "exec-{story_id}"
  mode: "bypassPermissions"
  prompt: |
    ## Mission: develop-story

    ## Story to Implement
    Read: outputs/execute/{epic_slug}/stories/{story_id}/expanded.md (status: APPROVED)

    ## Accumulated Context
    Read: outputs/execute/{epic_slug}/backlog/accumulated-context.md

    ## Enhancement Context (ADRs)
    Read if exists: {epic_dir}/03-roundtable.md

    ## Specific Instructions
    1. Read the expanded story completely
    2. Follow Implementation Roadmap step by step
    3. Apply IDS protocol for EVERY file operation
    4. Mark [x] for each completed AC in expanded.md
    5. Run tests: npm run lint, npm run typecheck
    6. Update File List in expanded.md
    7. Do NOT commit — the lead handles git

    ## Output
    Save to: outputs/execute/{epic_slug}/stories/{story_id}/implementation-log.md
    Set story status: REVIEW
```

### Step 2.4: Review (aiox-qa)

```yaml
Task:
  subagent_type: "qa"  # DIRECT
  model: "opus"
  team_name: "execute-{epic_slug}"
  name: "qa-{story_id}"
  mode: "bypassPermissions"
  prompt: |
    ## Mission: review-story

    ## Story Under Review
    Read: outputs/execute/{epic_slug}/stories/{story_id}/expanded.md

    ## Implementation Log
    Read: outputs/execute/{epic_slug}/stories/{story_id}/implementation-log.md

    ## Specific Instructions
    1. Verify every AC checkbox is [x] and implementation matches
    2. Verify code: git diff --stat, npm run lint, npm run typecheck
    3. IDS compliance: CREATE rate < 30%
    4. Scope check: no out-of-scope files, no bonus features
    5. Decision: APPROVED or NEEDS_WORK (with specific fix instructions)

    ## Output
    Save to: outputs/execute/{epic_slug}/stories/{story_id}/review.md
```

**If NEEDS_WORK:** Re-spawn executor with QA feedback. Max 2 cycles.
After 2 fails → present to user: 1. Force approve, 2. Skip, 3. Abort.

### Step 2.5: Story Complete

After aiox-qa approves:

1. **Update accumulated-context.md** (lead appends story summary)
2. **Git commit** (lead only): `git add {files} && git commit -m "feat: {story_id} - {desc}"`
3. **Report progress**: Story N/total, Wave status, IDS running average
4. **TaskUpdate** story task → completed
5. **Check wave**: more stories? → next story. Wave done? → next wave. All done? → Phase 3.

---

## Phase 3: Retrospective

```yaml
Task:
  subagent_type: "po"  # DIRECT
  model: "opus"
  team_name: "execute-{epic_slug}"
  name: "po-retro"
  mode: "bypassPermissions"
  prompt: |
    ## Mission: retrospective

    ## Epic Executed
    Read: {epic_file_path}

    ## Accumulated Context (full execution history)
    Read: outputs/execute/{epic_slug}/backlog/accumulated-context.md

    ## All Story Artifacts
    For each completed story, read: outputs/execute/{epic_slug}/stories/{id}/
    - expanded.md, implementation-log.md, review.md

    ## Specific Instructions
    1. Execution summary: stories done, SP delivered, IDS aggregate, avg review cycles
    2. What went well: patterns that worked
    3. What needs improvement: multiple revision cycles, gate failures
    4. Technical debt identified: deferred issues
    5. Recommendations: process improvements, new gotchas

    ## Output
    Save to: outputs/execute/{epic_slug}/retro/retrospective.md
```

---

## Finalization

1. **Generate execution-report.md** (lead writes: stories table, IDS metrics, quality metrics, files modified, retro summary)
2. **Present summary** to user (stories done, waves, IDS percentages, quality rate, artifact paths)
3. **Next epic command** (see below)
4. **Session handoff** → `docs/sessions/{YYYY-MM}/{date}-execute-epic.md`
5. **Cleanup**: Send structured `shutdown_request` individually to each active teammate (NOT broadcast to "*"), wait for responses, then `TeamDelete()` (no params — uses session context; fails if active members remain)

### Next Epic Command (MANDATORY)

After every epic execution, the lead MUST:

1. Read the project's PRD or epic directory to find the next epic in sequence
2. Determine the next epic path based on dependency graph and completion status
3. Present the copy-paste ready command to the user

**Format (always at the end of the summary):**

```
## Next Epic

/execute-epic {path-to-next-epic/README.md}
```

**Discovery logic:**
- Look at sibling directories in the same project's `epics/` folder
- Check the PRD's epic dependency graph for the next unblocked epic
- If multiple epics are unblocked (parallel), list all with a note
- If all epics are done, state "All epics in this project are complete"

**Example output:**
```
## Next Epic

/execute-epic docs/projects/photo-lab/epics/epic-2-scanner-ingestion/README.md

(Epics 3, 4, 5 can be parallelized after Epic 2)
```

---

## Key Rules

- **Direct agent spawning**: Use `subagent_type: "{role}"` directly — wrappers handle context loading
- **AGENT_MAP for executors**: Resolve `story.executor` → `aiox-{executor}` dynamically
- **No Read instructions for context**: Wrappers already load git status, permissions, gotchas via `agent-context-loader.js`
- **Communication via FILES**: accumulated-context.md + per-story artifacts
- **Lead handles git**: Subagents never commit
- **Max 1 approval gate**: execution plan. After approval = execute until done
- **Failure handling**: 1. Retry, 2. Skip, 3. Abort (progress saved)
- **Model selection**: opus for decision-making, sonnet for SM (mechanical expansion)

---

## Context Loading (Automatic)

Each AIOX agent wrapper (`.claude/agents/*.md`) includes:

```markdown
## Step 1: Load Context (FIRST tool call)
node .aiox-core/development/scripts/agent-context-loader.js {role} 2>/dev/null

## Step 2: Load Persona (SECOND tool call)
Read .claude/agents/{role}.md
```

This means:
- ✅ Git status, branch, permissions loaded automatically
- ✅ Gotchas filtered by domain loaded automatically
- ✅ Tech preferences loaded automatically
- ✅ Project status loaded automatically

**No need to include context loading instructions in prompts** — the wrappers handle it.
