---
name: "{workflow_id}"
description: "Orchestrates {workflow_description} via Agent Teams"
version: "1.0.0"
owner_squad: "{squad_name}"
sinkra_tier: Tier2
context: conversation
agent: {chief_agent_id}
user-invocable: true
argument-hint: "[context-path]"
depends_on: [{sub_skill_ids}]
---

# {workflow_name} — Complete Pipeline

Orchestrates the {workflow_description} using Agent Teams.
Each phase is executed by the correct agent with full skill protocol.
{chief_agent_id} acts as team-lead.

## Usage

```
/{workflow_id} [context-path]
/{workflow_id} [context-path] yolo
```

## Architecture

```
Team: {workflow_id}-{{context-id}}
  │
{phase_diagram}
```

## Phase 0: Analysis (team-lead, inline)

### 0.1 — Read Context File

```
Read {{context_path}}
Extract:
  - context_id
  - agent assignments (if dynamic)
  - prerequisites status
  - conditional flags
```

### 0.2 — Resolve Agent IDs

{agent_resolution_table}

### 0.3 — Display Analysis Summary

```
╔══════════════════════════════════════════════════════════╗
║  {workflow_name} — {{context_id}}                        ║
╠══════════════════════════════════════════════════════════╣
{phase_summary_lines}
╚══════════════════════════════════════════════════════════╝
Proceed? [y/n]
```

In YOLO mode: skip confirmation, proceed directly.

## Phase 0b: Create Team + Tasks

```
TeamCreate(
  team_name: "{workflow_id}-{{context-id}}",
  description: "{workflow_description}"
)

{task_create_blocks}
```

{phase_blocks}

## Shutdown + Summary

### Shutdown All Teammates

```
{shutdown_blocks}
TeamDelete()
```

### Display Final Summary

```
╔══════════════════════════════════════════════════════════╗
║  {workflow_name} Complete                                ║
╠══════════════════════════════════════════════════════════╣
{result_summary_lines}
╚══════════════════════════════════════════════════════════╝
```

## Error Handling

### HALT Conditions

| Condition | Phase | Action |
|-----------|-------|--------|
{halt_conditions}

### Circuit Breakers

| Breaker | Limit | Action |
|---------|-------|--------|
{circuit_breakers}

## Agent Persistence Map

```
{agent_persistence_diagram}
```

## Post-Execution Learning (MANDATORY)

Create log at: `.aios/learning/logs/{workflow_id}/{workflow_id}-{{context-id}}-{{YYYYMMDD}}-{{HHmmss}}.yaml`

```yaml
schema_version: "1.0"
skill_id: "{workflow_id}"
timestamp: "{{ISO-8601}}"
context_id: "{{context-id}}"
executor: "{chief_agent_id}"
duration_minutes: {{estimate}}
mode: "{{yolo|interactive}}"
phases:
{phase_results_schema}
files_modified: []
errors: []
outcome: "{{completed|halted|failed|escalated}}"
epilogue:
  what_worked: ""
  what_failed: ""
  confidence: "HIGH|MEDIUM|LOW"
  source_type: "skill_execution"
```
