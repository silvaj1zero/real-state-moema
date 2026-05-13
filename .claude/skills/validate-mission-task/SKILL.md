---
name: "validate-mission-task"
description: "Validates a mission task through the 11-point VMT pre-execution gate"
version: "1.0.0"
agent: "validate-mission-task"
user-invocable: true
maxTurns: 25
---

# Validate Mission Task — Pre-Execution Quality Gate

You are the Task Manager (backlog-ops) validating a mission task before an executor (Human/Agent/Worker/Clone) starts working on it. This is the mission equivalent of validate-story-draft.

## Input

Task ID from `$ARGUMENTS` (e.g., `T-001`). If a file path is provided, use it as the handoff. Otherwise, search for the active mission handoff in `workspace/{spoke}/L3-product/*/mission-clickup-handoff*.yaml`.

## Execution Protocol

### Step 0: Locate Task

1. Find the active mission handoff YAML
2. Find the task in `dag_tasks[]` by `task_id`
3. Load the mission context (mission.id, mission.accountable, timebox)
4. Load `dependencies[]` to understand the task's predecessors

### Step 1: Run 11-Point Validation (VMT-01 to VMT-11)

| Check | What to Validate | PASS Criteria |
|-------|-----------------|---------------|
| **VMT-01** Estrutura completa | 8 campos SINKRA: task_id, name, phase, executor_type, description (≥50 chars), checklist (≥1 item), time_estimate, wave | All 8 present and valid |
| **VMT-02** Executor resolvível | `source_squad` exists in `squads/` filesystem AND in ecosystem-registry. If executor_type=Human, `executor_person` resolves in people-registry.yaml | Squad dir exists OR person found |
| **VMT-03** Dependencies satisfeitas | All task_ids in the task's dependencies (from `dependencies[]` where this task is `waiting_on`) are either: done in ClickUp, or gate passed, or not yet started (WARN) | No BLOCKED deps |
| **VMT-04** Entradas disponíveis | Each item in `entrada[]` (if present) has a resolvable origin — file exists in codebase, or is output of a completed dependency | All inputs traceable |
| **VMT-05** Saídas mensuráveis | Each item in `saida[]` (if present) can be verified by `post_conditions` or `checklist` items | Outputs → checklist mapping exists |
| **VMT-06** Context enrichment | Inject outputs of completed dependency tasks into a `context_from` section. Read completed deps' `saida[]` and `ponto_b` to build context. | Context populated (auto-enrich) |
| **VMT-07** SLA realista | `time_estimate` (ms) aligns with executor capability. Agent tasks > 1 day = WARN. Human tasks without calendar check = WARN. | No impossible SLAs |
| **VMT-08** QG definido | `quality_gate_person` or `quality_gate_type` present. Rule: If output is external/irreversible → QG Human required. If deterministic check → QG Agent OK. | QG declared |
| **VMT-09** Tokens declarados | Priority present (P0-P3). Wave present as **integer 1-N** (topological sort level from wave-calculator.js). Wave MUST NOT use phase.sub-wave format (e.g., "0.1", "1.2" are INVALID — only "1", "2", "3"... are valid). | Both present, wave is integer |
| **VMT-10** Anti-patterns | Task is not a story in disguise (scope too large). No scope creep vs original spec. Done criteria are verifiable, not vague. | No anti-patterns |
| **VMT-11** Veredito | All 10 checks pass → GO. Any FAIL → NO-GO. Only WARNs → GO with Auto-Enrich. | Final verdict |

### Step 2: Context Enrichment (VMT-06 detail)

For each dependency that is marked as completed:
1. Read the dependency task's `ponto_b` (desired state — now achieved)
2. Read the dependency task's `saida[]` outputs
3. Compile as `context_from[]`:

```yaml
context_from:
  - task_id: "T-005"
    status: done
    output: "10 tabelas cohort live com RLS no Supabase"
  - gate_id: "GATE-LEGAL"
    status: passed
    output: "Privacy Policy + ToS publicados, CMP funcional"
```

4. If the task description in ClickUp needs updating with this context, note it in the output.

### Step 3: ClickUp Task Description Template

If the task passes validation, propose the enriched ClickUp description:

```markdown
## [T-XXX] {nome da task}

**Phase:** {phase} | **Wave:** {wave} | **Priority:** {priority} | **SLA:** {sla}
**Executor:** {executor} | **QG:** {qg} | **Accountable:** {accountable}

---

### O que fazer
{checklist items como bullet list}

### Entradas necessárias
| Campo | Origem | Status |
|-------|--------|--------|
{entrada[] items}

### Contexto de tasks anteriores
{context_from[] — outputs das dependencies concluídas}

### Ponto A (Estado Atual)
{ponto_a}

### Ponto B (Estado Desejado)
{ponto_b}

### Critérios de Done
- [ ] {checklist item 1}
- [ ] {checklist item 2}

### Referências
- Decision Log: {decision_ref[]}
- Mission: {mission_id}
```

### Step 4: Auto-Move to Ready (post-validation)

**When verdict is GO or GO with Auto-Enrich:**

1. Move the task to status `ready` in ClickUp:
   ```javascript
   await updateStatus(clickupTaskId, 'ready');
   ```
2. Add Journey Log entry:
   ```javascript
   await appendJournalEntry(clickupTaskId, 'VMT validação PASS — task movida para ready.', 'validate-mission-task', {
     person: '{accountable_person}',
     color: '🟢', icon: '✅', category: '[STATUS]'
   });
   ```

**When verdict is NO-GO:**
- Task stays in current status (`qualified` or `captured`)
- List remediation actions required
- Re-run VMT after fixes are applied

**Rationale:** VMT is the formal gate between `qualified → ready` in the unified status workflow. A task cannot be `ready` (available for executor pull) without passing validation. See: `.claude/rules/clickup-description.md` v3.1, `decision_unified_status_workflow.md`.

**Next Step — ATM-TM-START:** After VMT GO moves the task to `ready`, the next atom in the lifecycle is `ATM-TM-START` (`*start-task` command / `squads/backlog-ops/tasks/start-task.md`). ATM-TM-START performs WIP check, moves to `doing`, and prepares executor context. The full lifecycle molecule is: `VMT → ATM-TM-START → ATM-TM-EXECUTE → ATM-TM-CLOSE`.

## Output

Present results as:

```markdown
## Validate Mission Task — {task_id}

**Mission:** {mission_id} | **Task:** {task_name}
**Phase:** {phase} | **Wave:** {wave}

### Checklist Results
| # | Check | Result | Notes |
|---|-------|--------|-------|
| VMT-01 | Estrutura completa | PASS | 8/8 campos |
| VMT-02 | Executor resolvível | PASS | squad exists |
| ... | ... | ... | ... |

### Context Enrichment
{context_from if applicable}

### Verdict: {GO / GO with Auto-Enrich / NO-GO}
{summary with remediation if NO-GO}
```

## Key References

- Mission handoff template: `squads/sinkra-squad/templates/mission-clickup-handoff-tmpl.yaml`
- People registry: `workspace/{spoke}/L0-identity/people-registry.yaml`
- Ecosystem registry: `squads/sinkra-squad/data/ecosystem-registry.yaml`
- Wave calculator: `services/clickup/wave-calculator.js`
- Person resolver: `services/clickup/person-resolver.js`
- Next atom (ATM-TM-START): `squads/backlog-ops/tasks/start-task.md`
- Close atom (ATM-TM-CLOSE): `squads/backlog-ops/tasks/close-task.md`
