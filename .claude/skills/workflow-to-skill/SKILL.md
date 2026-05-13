---
name: workflow-to-skill
description: "Transforms validated squad workflows into Claude Code skills with Agent Teams orchestration, learning integration, and artifact contracts."
version: "1.0.0"
owner_squad: "sinkra-squad"
sinkra_tier: Tier2
context: inline
agent: general-purpose
user-invocable: true
argument-hint: "[squad-path] [workflow-id]"
---

# Workflow-to-Skill Transformation

Transforms ANY squad workflow into a set of Claude Code skills with the same architecture as the Full SDC chain. Produces: N sub-skills + 1 master orchestrator + M agent personas + learning directories + artifact contracts.

## Usage

```
/workflow-to-skill squads/clickup-ops-squad materialization-pipeline
/workflow-to-skill squads/brand materialize-brand-audit
```

## Input

- `squad_path` — path to squad directory (e.g., `squads/clickup-ops-squad`)
- `workflow_id` — workflow filename without extension (e.g., `materialization-pipeline`)

If not provided, ask the user.

---

## Sequential Execution — Do Not Skip Steps

Execute ALL phases in order. Each phase has a STOP gate.

---

## Phase 1: Extract & Validate Squad Metadata

### 1.1 — Read Squad Config

```
READ {squad_path}/config.yaml
EXTRACT:
  - pack.name, pack.version, pack.description, pack.icon
  - agents[]: id, methodology, specialty
  - capabilities[]
  - artifact_contracts[]: artifact_id, template_path, lifecycle_states
  - bu_mapping (if present)
```

### 1.2 — Read Workflow Definition

```
READ {squad_path}/workflows/{workflow_id}.yaml
EXTRACT:
  - steps[]: id, name, agent, task_ref, requires[], condition, on_fail
  - Step ordering (dependency graph)
```

### 1.3 — Validate Inputs

- [ ] `config.yaml` exists and has `agents[]`
- [ ] Workflow file exists and has `steps[]`
- [ ] Every step references an agent that exists in `config.yaml`
- [ ] Every step references a task file that exists in `{squad_path}/tasks/`

> **STOP** — Do not proceed if validation fails. Report missing files/agents.

---

## Phase 2: Read All Task Files

For each step in the workflow:

### 2.1 — Read Task Definition

```
READ {squad_path}/tasks/{step.task_ref}.md
EXTRACT:
  - metadata (YAML frontmatter if present)
  - Description / Purpose
  - Entrada (inputs)
  - Saída (outputs)
  - Implementation steps
  - Error handling
  - Dependencies (templates, data files, checklists)
```

### 2.2 — Collect Dependencies

For each task, identify:
- Templates referenced → note paths for bundling
- Data files referenced → note paths for bundling
- Checklists referenced → note paths for bundling
- Other tasks referenced → note for artifact contracts

### 2.3 — Build Artifact Contract Map

```yaml
contracts:
  - from_step: {step_a.id}
    to_step: {step_b.id}
    artifact: {output of step_a that step_b consumes}
    required: true
```

> **STOP** — Do not proceed until all tasks are read and contracts mapped.

---

## Phase 3: Generate Sub-Skills

For each workflow step, generate a sub-skill file.

### 3.1 — Create Sub-Skill Directory + SKILL.md

Path: `.claude/skills/{workflow_id}-{step.id}/SKILL.md`

Use the template at `.claude/skills/workflow-to-skill/templates/sub-skill-tmpl.md`

**Substitution variables:**

| Variable | Source |
|----------|--------|
| `{skill_id}` | `{workflow_id}-{step.id}` |
| `{step_name}` | `step.name` from workflow |
| `{step_description}` | From task description |
| `{agent_id}` | `step.agent` from workflow |
| `{squad_name}` | `pack.name` from config.yaml |
| `{prerequisites}` | From task Entrada / pre-conditions |
| `{execution_steps}` | From task implementation steps (numbered protocol) |
| `{outputs}` | From task Saída section |
| `{error_handling}` | From task error handling |
| `{context_type}` | `inline` (default) or `fork` if step runs in isolation |

### 3.2 — Bundle Dependencies

If the task references templates, data, or checklists:
- Create `references/` directory inside the sub-skill
- Copy or symlink referenced files
- Update paths in the SKILL.md to point to `references/`

### 3.3 — Determine Context Type

| Condition | context |
|-----------|---------|
| Step needs session state (prior step outputs) | `inline` |
| Step is isolated (e.g., deploy, external call) | `fork` |
| Step uses Agent Teams internally | `conversation` |
| Default | `inline` |

> **STOP** — Do not proceed until all sub-skills are generated and written to disk.

---

## Phase 4: Generate Agent Personas

For each unique agent referenced in workflow steps:

### 4.1 — Read Squad Agent Definition

```
READ {squad_path}/agents/{agent_id}.md
```

### 4.2 — Generate Claude Agent Files

**For the Chief agent (tier 0 / orchestrator):**

Path: `.claude/agents/{chief_agent_id}.md`

Use the template at `.claude/skills/workflow-to-skill/templates/chief-agent-tmpl.md`

The chief gets Agent Teams tools (Agent, SendMessage, TeamCreate, TeamDelete, TaskCreate, TaskUpdate, TaskList) because it acts as team-lead for the orchestrator skill. This is the equivalent of the user session in the SDC — the chief IS the orchestrator.

**For all other agents (tier 1+ / executors):**

Path: `.claude/agents/{agent_id}.md`

Use the template at `.claude/skills/workflow-to-skill/templates/agent-tmpl.md`

**Key transformations from squad agent → Claude agent:**

| Squad Agent Section | Claude Agent Equivalent |
|--------------------|------------------------|
| YAML `activation-instructions` | REMOVED — Claude agents don't self-activate |
| YAML `commands[]` | REMOVED — replaced by `skills:` frontmatter |
| YAML `dependencies.tasks[]` | Mapped to `skills:` list in frontmatter |
| YAML `dependencies.tools[]` | Mapped to `tools:` list in frontmatter |
| YAML `persona` section | Kept as markdown body |
| YAML `persona_profile` | Condensed into persona body |
| YAML `agent.customization` | Inlined into persona body as rules |
| Markdown Quick Commands | REMOVED |
| Markdown Agent Collaboration | Kept as Delegation section |

### 4.3 — Check for Conflicts

- If `.claude/agents/{agent_id}.md` already exists, check if it's the same agent
- If different agent: rename new one to `{squad_name}-{agent_id}.md`
- If same agent (same squad): update in place

> **STOP** — Do not proceed until all agent personas are generated.

---

## Phase 5: Generate Master Orchestrator

### 5.1 — Create Orchestrator Skill

Path: `.claude/skills/{workflow_id}/SKILL.md`

Use the template at `.claude/skills/workflow-to-skill/templates/orchestrator-tmpl.md`

**Key sections to generate:**

1. **Phase 0: Analysis** — Read context file, resolve agents, display summary
2. **Phase 0b: Create Team + Tasks** — TeamCreate + TaskCreate for each step
3. **Phase N (per step):** Spawn agent → execute sub-skill → process result
4. **Loop Logic:** If workflow has retry/on_fail → QG Loop pattern (circuit breaker max 3)
5. **Conditional Phases:** If step has `condition` → skip logic
6. **Shutdown + Summary:** Shutdown all teammates, TeamDelete, display results
7. **Post-Execution Learning:** Create orchestrator-level log

### 5.2 — Generate Flow Diagram

Create ASCII or Mermaid diagram of the workflow:

```
Team: {workflow_id}-{context-id}
  │
  ├── [Task 1] Phase 1: {step_1.name} ── @{agent_1} teammate
  ├── [Task 2] Phase 2: {step_2.name} ── @{agent_2} teammate
  │                      └── FAIL? ──── retry/escalate
  ...
  └── [Task N] Phase N: {step_n.name} ── @{agent_n} teammate
```

### 5.3 — Agent Persistence Map

Identify agents used in multiple phases → spawn once, reuse via SendMessage.

```
Phase 1:  [{agent_a} spawned] ─── [reused Phase 4] ── [shutdown]
Phase 2:  [{agent_b} spawned] ─── [shutdown after Phase 2]
```

> **STOP** — Do not proceed until orchestrator is generated and written.

---

## Phase 6: Create Learning Infrastructure

### 6.1 — Create Directories

For each generated skill (sub-skills + orchestrator):

```bash
mkdir -p .aios/learning/logs/{skill_id}/
mkdir -p .aios/learning/entries/{skill_id}/
```

### 6.2 — Verify Schema

Check that `.aios/learning/schemas/execution-log-schema.yaml` exists. If not, create from canonical template.

> **STOP** — Do not proceed until all learning directories exist.

---

## Phase 7: Validate Transformation

Run the validation checklist:

- [ ] Every sub-skill has YAML frontmatter with all required fields (name, description, version, owner_squad, sinkra_tier, context, agent, user-invocable)
- [ ] Every sub-skill has sections: Purpose, Pre-Execution Learning Check, Input, Prerequisites, Execution Protocol, Workflow Phases with STOP gates, Red Flags, Blocking Conditions, Post-Execution Learning
- [ ] Master orchestrator has `context: conversation`
- [ ] Master orchestrator creates Team, Tasks, spawns agents, processes results
- [ ] Every agent has a persona file in `.claude/agents/` with `skills:` list
- [ ] Artifact contracts match step inputs/outputs (from → to verified)
- [ ] Learning directories exist with `.gitkeep`
- [ ] Circuit breakers defined for any retry/on_fail loops (max 3)
- [ ] Conditional phases have skip logic with TaskUpdate("Skipped")
- [ ] No sub-skill has `user-invocable: true` (only orchestrator is user-invocable)

### 7.1 — Generate Transformation Report

Display:

```
╔══════════════════════════════════════════════════════════╗
║  Workflow-to-Skill Transformation Complete               ║
╠══════════════════════════════════════════════════════════╣
║  Squad:          {squad_name}                            ║
║  Workflow:       {workflow_id}                           ║
║  Sub-Skills:     {N} generated                           ║
║  Orchestrator:   .claude/skills/{workflow_id}/SKILL.md   ║
║  Agents:         {M} persona files                       ║
║  Contracts:      {K} artifact contracts                  ║
║  Learning dirs:  {N+1} created                           ║
╠══════════════════════════════════════════════════════════╣
║  Invocation: /{workflow_id} [context-path]               ║
║  Team Lead:  @{chief_agent_id}                           ║
╚══════════════════════════════════════════════════════════╝
```

> **STOP** — Transformation is not complete until report is displayed.

---

## Phase 8: Register Skills

### 8.1 — Update Skill Registry

Add all generated skills to `.claude/skills/skill-registry.yaml`:
- Orchestrator: `user-invocable: true`
- Sub-skills: `user-invocable: false`

### 8.2 — Update Service Catalog (if applicable)

If the workflow represents a new service capability, add entry to `squads/infra-ops-squad/data/service-catalog.yaml`.

---

## Red Flags

| Rationalization | Why It Fails |
|----------------|--------------|
| "The workflow is too simple for sub-skills" | Even 2-step workflows benefit from composability. A sub-skill can be reused in other orchestrators. |
| "I'll skip the agent persona — the skill has enough context" | Agent personas enable Dynamic Agent Binding. Without them, skills are hardcoded to a single agent. |
| "Learning logs are overhead for simple workflows" | Learning logs are the ONLY mechanism for pattern emergence across executions. Skipping them makes the system blind. |
| "I'll generate all files then validate at the end" | Each phase has a STOP gate because downstream phases depend on upstream output. Validating late catches errors late. |

---

## Blocking Conditions

1. **Squad path not found** — HALT. Resolution: provide correct squad path.
2. **Workflow file not found** — HALT. Resolution: check `{squad_path}/workflows/` for available workflows.
3. **Task file missing for workflow step** — HALT. Resolution: create the missing task file first.
4. **Agent definition missing** — HALT. Resolution: create agent file in `{squad_path}/agents/`.
5. **Agent conflict in .claude/agents/** — WARN. Resolution: rename with squad prefix.

---

## Post-Execution Learning (MANDATORY)

Create log at: `.aios/learning/logs/workflow-to-skill/workflow-to-skill-{squad}-{workflow}-{YYYYMMDD}-{HHmmss}.yaml`

```yaml
schema_version: "1.0"
skill_id: "workflow-to-skill"
timestamp: "{ISO-8601}"
squad: "{squad_name}"
workflow: "{workflow_id}"
executor: "@architect"
duration_minutes: {estimate}
mode: null
files_modified: [{list of all generated files}]
decisions:
  - description: "{key decision made during transformation}"
    type: "{context_selection|agent_conflict|contract_inference}"
    rationale: "{why}"
errors: []
outcome: "{completed|halted|failed}"
transformation_stats:
  sub_skills_generated: {N}
  orchestrator_generated: 1
  agents_generated: {M}
  agents_reused: {R}
  artifact_contracts: {K}
  learning_dirs_created: {N+1}
  validation_issues: {count}
epilogue:
  what_worked: ""
  what_failed: ""
  confidence: "HIGH|MEDIUM|LOW"
  source_type: "skill_execution"
```
