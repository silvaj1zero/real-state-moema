---
name: "{skill_id}"
description: "{step_description}"
version: "1.0.0"
owner_squad: "{squad_name}"
sinkra_tier: Tier1
context: {context_type}
agent: {agent_id}
user-invocable: false
argument-hint: "[context-path]"
---

# {step_name} — {agent_title} Protocol

## Dynamic Agent Binding

1. Read context file at provided path for agent assignment
2. Load agent persona from `.claude/agents/{agent_id}.md`
3. Adopt persona for this execution

## Purpose

{step_description}

## Pre-Execution Learning Check (Story 103.9 — Lazy Promotion)

> Runs BEFORE execution. Zero-overhead if no candidates exist.

1. Scan `.aios/learning/entries/{skill_id}/` for `status: draft`
2. Filter entries with `promotion_score >= 3.5`
3. If none: proceed normally
4. If found: show promotion prompt before execution

## Input

{prerequisites_and_inputs}

## Prerequisites

- [ ] Context file exists and is readable
- [ ] Agent persona file exists at `.claude/agents/{agent_id}.md`
{additional_prerequisites}

## Execution Protocol

{execution_steps}

## Workflow Phases

### Phase 1: Validation

- [ ] Context file loaded
- [ ] Prerequisites verified
- [ ] Input artifacts from upstream steps available

> **STOP** — Do not proceed until validation passes. Missing prerequisites cause execution on incomplete state.

### Phase 2: Execution

- [ ] Step 1 complete
- [ ] Step N complete
- [ ] Output artifacts generated

> **STOP** — Do not proceed until all execution steps are complete.

### Phase 3: Recording

- [ ] Results recorded in context file
- [ ] Output artifacts match contract: {output_artifacts}
- [ ] Learning log created

> **STOP** — Execution is not complete until results are recorded. Unrecorded results are invisible to downstream skills.

## Output

{outputs_description}

## Red Flags

| Rationalization | Why It Fails |
|----------------|--------------|
| "I'll skip the validation phase" | Validation catches missing prerequisites. Skipping leads to execution on incomplete state. |
| "I'll update the record later" | The context file is shared state. Unrecorded results are invisible to downstream skills. |
{additional_red_flags}

## Blocking Conditions

1. **Context file not found** — HALT. Resolution: provide correct path.
2. **Prerequisites not met** — HALT. Resolution: complete upstream steps first.
{additional_blocking_conditions}

## Post-Execution Learning (MANDATORY)

Create log at: `.aios/learning/logs/{skill_id}/{skill_id}-{context_id}-{YYYYMMDD}-{HHmmss}.yaml`

```yaml
schema_version: "1.0"
skill_id: "{skill_id}"
timestamp: "{ISO-8601}"
context_id: "{context_id}"
executor: "{agent_id}"
duration_minutes: {estimate}
mode: null
files_modified: []
decisions: []
errors: []
outcome: "{completed|halted|failed}"
epilogue:
  what_worked: ""
  what_failed: ""
  confidence: "HIGH|MEDIUM|LOW"
  source_type: "skill_execution"
```
