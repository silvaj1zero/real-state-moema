# Workflow-to-Skill Transformation Guide

## Purpose

This guide documents how to transform ANY squad workflow into a set of Claude Code skills
with the same architecture as the SDC (Story Development Cycle) chain. The result is an
agnostic, reusable pattern applicable to any domain.

---

## 1. Architecture Pattern: Orchestrator + Sub-Skills

Every workflow transformation produces:

```
1 Master Orchestrator Skill (context: conversation)
  |
  +-- N Sub-Skills (context: inline or fork)
  |
  +-- M Agent Personas (.claude/agents/)
  |
  +-- Learning log directories
  |
  +-- Artifact contracts (input/output between skills)
```

### Why This Pattern Works

| Property | Mechanism |
|----------|-----------|
| **Composability** | Each sub-skill is standalone AND composable into the orchestrator |
| **Agent Isolation** | Each agent has a persona file — skills bind dynamically at runtime |
| **State Management** | A shared file (story, context doc) serves as the state machine |
| **Error Recovery** | HALT conditions escalate to user — team stays alive for recovery |
| **Learning** | Every skill writes execution logs — patterns emerge over time |
| **Visual Tracking** | TaskCreate/TaskUpdate show pipeline progress |

---

## 2. Transformation Algorithm (Step-by-Step)

### Input

```
squad_path: path to squad directory (e.g., "squads/clickup-ops-squad")
workflow_id: which workflow to transform (from workflows/*.yaml)
```

### Step 1: Extract Squad Metadata

```
READ {squad_path}/config.yaml
EXTRACT:
  - agents[]: id, methodology, specialty, description
  - capabilities[]: list
  - activation.shortcuts[]: list
  - artifact_contracts[]: id, template_path, lifecycle_states
```

### Step 2: Extract Workflow Definition

```
READ {squad_path}/workflows/{workflow_id}.yaml
EXTRACT:
  - steps[]: id, name, agent, task_ref, condition, on_fail, requires[]
  - dependencies: step ordering (which step requires which)
  - conditions: when to skip/include steps
```

### Step 3: Generate Sub-Skills (one per workflow step)

For each workflow step:

```
READ {squad_path}/tasks/{step.task_ref}.md
GENERATE .claude/skills/{workflow_id}-{step.id}/SKILL.md
```

#### Sub-Skill Template

```markdown
---
name: {workflow_id}-{step.id}
description: "{step.description from workflow}"
version: "1.0.0"
owner_squad: "{squad from config.yaml}"
sinkra_tier: Tier1
context: inline          # or fork if step runs in isolation
agent: {step.agent}
user-invocable: false    # sub-skills are NOT user-invocable
argument-hint: "[context-path]"
---

# {Step Name} -- {Agent Title} Protocol

## Dynamic Agent Binding

1. Read context file for agent assignment
2. Load agent persona from `.claude/agents/{agent-id}.md`
3. Adopt persona for this execution

## Purpose

{From task description}

## Pre-Execution Learning Check (Story 103.9)

> Standard block — identical across all skills.

1. Scan `.aiox/learning/entries/{skill-id}/` for `status: draft`
2. Filter by `promotion_score >= 3.5`
3. If none: proceed normally
4. If found: show promotion prompt

## Input

{From task entrada fields, mapped to context-path argument}

## Prerequisites

{From task pre-conditions, converted to checklist}
- [ ] {precondition 1}
- [ ] {precondition 2}

## Execution Protocol

{From task steps, rewritten as numbered protocol}

### Step 1: {action}
{Detailed instructions}

### Step N: {action}
{Detailed instructions}

## Workflow Phases

### Phase 1: Validation
- [ ] {from pre-conditions}
> **STOP** -- Do not proceed until validation passes.

### Phase 2: Execution
- [ ] {from task steps}
> **STOP** -- Do not proceed until execution complete.

### Phase 3: Recording
- [ ] Results recorded in context file
- [ ] Artifact contracts fulfilled
> **STOP** -- Execution is not complete until results are recorded.

## Red Flags

| Rationalization | Why It Fails |
|----------------|--------------|
| {derived from task error handling} | {explanation} |
| "I'll skip the validation phase" | Validation catches missing prerequisites. Skipping leads to execution on incomplete state. |
| "I'll update the record later" | The context file is the shared state. Unrecorded results are invisible to downstream skills. |

## Blocking Conditions

1. **Context file not found** -- HALT. Resolution: provide correct path.
2. **Prerequisites not met** -- HALT. Resolution: complete prerequisites first.
3. {from task error handling}

## Post-Execution Learning (MANDATORY)

Create log at: `.aiox/learning/logs/{skill-id}/{skill-id}-{context-id}-{YYYYMMDD}-{HHmmss}.yaml`

{Standard execution-log-schema v1.0 block}
```

### Step 4: Generate Master Orchestrator

```
GENERATE .claude/skills/{workflow_id}/SKILL.md
```

#### Orchestrator Template

```markdown
---
name: {workflow_id}
description: "Orchestrates {workflow description} via Agent Teams"
version: "1.0.0"
owner_squad: "{squad from config.yaml}"
sinkra_tier: Tier2
context: conversation
agent: general-purpose
user-invocable: true
argument-hint: "[context-path]"
depends_on: [{list of sub-skill names}]
---

# {Workflow Name} -- Complete Pipeline

Orchestrates the {workflow description} using Agent Teams.
Each phase is executed by the correct agent with full skill protocol.

## Architecture

{Generated flow diagram from workflow steps}

## Phase 0: Analysis (team-lead, inline)

1. Read context at provided path
2. Extract agent assignments
3. Resolve agent IDs to .claude/agents/{id}.md
4. Dependency check (if applicable)
5. Display analysis summary
6. Wait for confirmation (skip in YOLO mode if applicable)

## Phase 0b: Create Team + Tasks

TeamCreate("{workflow_id}-{context-id}")
{TaskCreate for each workflow step — visual tracking}

## Phase N: {Step Name}

### Spawn {Agent} Teammate

Agent(
  name: "{agent-id}",
  team_name: "{workflow_id}-{context-id}",
  model: "sonnet",
  prompt: "You are @{agent-id}.
    FIRST: Read .claude/agents/{agent-id}.md
    THEN: Read .claude/skills/{workflow_id}-{step-id}/SKILL.md
    THEN: Execute for context: {context-path}
    When done, SendMessage to 'team-lead' with results."
)

### Process Result
{success -> proceed | failure -> HALT}

{Conditional logic if step has conditions}
{Loop logic if step has retry/on_fail}

## Shutdown + Summary

{Shutdown all teammates + TeamDelete + display summary}

## Post-Execution Learning (MANDATORY)

{Standard block with per-phase results}
```

### Step 5: Generate Agent Personas

For each unique agent in workflow steps:

```
READ {squad_path}/agents/{agent-id}.md
GENERATE .claude/agents/{agent-id}.md
```

#### Agent Persona Template

```markdown
---
name: {agent-id}
description: "{role from squad config}"
model: sonnet
tools:
  - Read
  - Edit
  - Write
  - Bash
  - Grep
  - Glob
skills:
  - {workflow_id}
  - {sub-skills where this agent is primary}
---

# {Title} -- {Name} the {Archetype}

You are **{Name}**, the {role}.

## Persona

- **Archetype:** {from squad config}
- **Style:** {from agent description}
- **Focus:** {from capabilities}

## Core Responsibilities

{From squad config agent description + capabilities}

## Delegation

{From workflow — which agents handle which steps}

## Task Files

{From squad tasks/ directory}
```

### Step 6: Generate Artifact Contracts

```yaml
artifact_contracts:
  - from: {step_a}
    to: {step_b}
    artifact: {output of step_a consumed by step_b}
    required: true|false
```

### Step 7: Create Learning Directories

```bash
mkdir -p .aiox/learning/logs/{skill-id}/
mkdir -p .aiox/learning/entries/{skill-id}/
touch .aiox/learning/logs/{skill-id}/.gitkeep
touch .aiox/learning/entries/{skill-id}/.gitkeep
```

### Step 8: Generate Summary

```
Skills created: N sub-skills + 1 orchestrator
Agents created: M persona files
Artifact contracts: K
Learning directories: N+1
```

---

## 3. Key Patterns to Preserve

These patterns from the SDC system MUST be replicated in every transformation:

### 3.1 Agent Spawn Pattern

Every agent spawn in the orchestrator follows this exact structure:

```
Agent(
  name: "{agent-id}",
  team_name: "{workflow}-{context-id}",
  model: "sonnet",
  prompt: "You are @{agent-id}.
    FIRST: Read .claude/agents/{agent-id}.md          <-- persona
    THEN: Read .claude/skills/{skill}/SKILL.md         <-- protocol
    THEN: Execute for context: {context-path}          <-- input
    When done, SendMessage to 'team-lead' with results."  <-- output
)
```

### 3.2 SendMessage Result Processing

Every phase result from a teammate must be processed:

```
success/completed -> TaskUpdate(completed). Proceed.
halted (blocker)  -> Show to user. Wait. Resume.
failed            -> TaskUpdate(note). HALT.
```

### 3.3 Agent Persistence

Agents that are needed in multiple phases are spawned ONCE and reused via SendMessage:

```
Phase 1: Agent spawned
Phase 2-3: Agent idle
Phase 4: SendMessage wakes agent for new work
```

### 3.4 Circuit Breaker

Any loop MUST have a maximum iteration count:

```
max_iterations = 3
WHILE condition AND iteration <= max:
  ... attempt ...
  iteration++
AFTER: ESCALATE to user if still failing
```

### 3.5 Conditional Phase

Phases that depend on a condition:

```
IF condition:
  Spawn agent, execute
ELSE:
  TaskUpdate(completed, "Skipped -- {reason}"). Proceed.
```

### 3.6 STOP Gates in Sub-Skills

Every skill must have workflow phases with explicit STOP gates:

```markdown
### Phase N: {Name}
- [ ] {checkpoint}
> **STOP** -- {why you must not proceed without this}
```

### 3.7 Mandatory Learning

Every skill creates a learning log. This is non-negotiable:

```
Post-Execution: Write log even on failure (outcome: failed)
Pre-Execution: Check for promotion candidates (score >= 3.5)
```

---

## 4. Infrastructure Requirements

To run any transformed workflow, the target repo needs:

| Component | File | Purpose |
|-----------|------|---------|
| Agent Teams flag | `.claude/settings.json` env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 | Enable Agent Teams API |
| Permissions | `.claude/settings.json` permissions | Allow/deny patterns for bash commands |
| Learning schemas | `.aiox/learning/schemas/execution-log-schema.yaml` | Log format definition |
| Learning dirs | `.aiox/learning/logs/{skill}/` + `.aiox/learning/entries/{skill}/` | Runtime storage |
| Gitignore | `.gitignore` entries for .aiox/learning/logs/ and entries/ | Keep runtime data local |

---

## 5. Validation Checklist

After transformation, verify:

- [ ] Every sub-skill has YAML frontmatter with all required fields
- [ ] Every sub-skill has: Dynamic Agent Binding, Pre-Execution Learning, Workflow Phases, Red Flags, Blocking Conditions, Post-Execution Learning
- [ ] Master orchestrator uses context: conversation
- [ ] Master orchestrator creates team, tasks, spawns agents, processes results
- [ ] Every agent has a persona file with skills list
- [ ] Artifact contracts match step inputs/outputs
- [ ] Learning directories exist with .gitkeep
- [ ] Circuit breakers defined for any loops
- [ ] Conditional phases have skip logic
- [ ] Settings.json has CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
