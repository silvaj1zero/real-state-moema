---
name: "mission-replan"
description: "Re-analyzes an active mission, diagnoses drift, proposes adjustments,"
version: "1.0.0"
agent: "mission-replan"
user-invocable: true
maxTurns: 25
---

# Mission Replan — In-Flight Mission Re-Analysis & Materialization

You are the Task Manager (backlog-ops) performing a full re-analysis of an active mission. Your job is to diagnose the current state, propose additions/adjustments/cancellations, validate each change via VMT, and materialize everything locally + ClickUp.

**Princípio:** Re-planejar sem destruir. NUNCA deletar tasks — apenas cancelar. NUNCA sobrescrever Journey Log. SEMPRE Human Gate antes de materializar.

## Input

Mission ID or handoff YAML path from `$ARGUMENTS`.

- If a ClickUp task ID is provided (e.g., `CU-abc123`), fetch the mission task and locate its handoff YAML.
- If a file path is provided, use it directly as the handoff YAML.
- If neither, search for active mission handoffs in `workspace/{spoke}/L3-product/*/mission-clickup-handoff*.yaml`.

Optional flags:
- `--dry-run` — Run phases 1-3 only (snapshot + diagnose + propose). No materialization.
- `--add "task description"` — Pre-list tasks to add (can repeat). Merged into Phase 3 proposal.
- `--focus [wave|deps|stale|all]` — Focus diagnosis on specific area (default: all).

## Execution Protocol

### Phase 1: SNAPSHOT — Capturar Estado Atual

**Goal:** Construir uma fotografia completa da mission como ela está AGORA.

1. **Ler mission handoff YAML** (local source of truth):
   - `dag_tasks[]` — todas as tasks planejadas
   - `dependencies[]` — grafo de dependências
   - `metadata` — timebox, accountable, mission_id

2. **Ler TODAS as tasks do ClickUp** (mission parent + subtasks):
   ```javascript
   const mission = await getTask(missionTaskId, { includeMarkdownDescription: true, includeSubtasks: true });
   ```
   Para cada subtask, capturar: status, assignees, custom fields (wave, priority, executor_type), dates.

3. **Mapear outputs completados:**
   Para cada task com status `done`:
   - Ler `saida[]` do handoff YAML
   - Ler `ponto_b` (estado desejado que agora é realidade)
   - Compilar em `completed_outputs[]`

4. **Construir DAG snapshot:**
   - Nós: todas as tasks (do YAML + do ClickUp)
   - Arestas: dependencies (waiting_on)
   - Status de cada nó: done / doing / ready / blocked / captured / cancelled
   - Critical path: longest path de tasks não-done

**Output Phase 1:**
```yaml
snapshot:
  mission_id: "..."
  total_tasks: N
  by_status: { done: N, doing: N, ready: N, blocked: N, captured: N, cancelled: N }
  completion_pct: "X%"
  completed_outputs: [...]
  dag_nodes: N
  dag_edges: N
  critical_path: [T-001, T-005, T-014, ...]
  last_updated: "YYYY-MM-DD HH:MM"
```

### Phase 2: DIAGNOSE — Identificar Problemas e Oportunidades

**Goal:** Comparar YAML vs ClickUp vs realidade e identificar tudo que precisa de atenção.

Run these 6 diagnostic checks:

| Check | O que Detecta | Severidade |
|-------|---------------|------------|
| **D-01** Drift Detection | Tasks com status diferente entre YAML e ClickUp | CRITICAL |
| **D-02** Orphan Tasks | Tasks no ClickUp que não existem no YAML (criadas manualmente) | WARNING |
| **D-03** Missing Tasks | Tasks no YAML que não existem no ClickUp (não materializadas) | CRITICAL |
| **D-04** Broken Dependencies | Task depende de outra que foi cancelled, ou dep está done mas task segue blocked | WARNING |
| **D-05** Stale Tasks | Tasks em `doing` há mais de 3 dias sem progress (no journey log) | WARNING |
| **D-06** Context Gap | Tasks com deps done mas sem `context_from` (outputs não foram propagados) | INFO |

**Output Phase 2:**
```markdown
DIAGNOSE — {mission_id}

| Check | Count | Severidade | Detalhes |
|-------|-------|------------|----------|
| D-01 Drift | 2 | CRITICAL | T-009 (YAML:ready, CU:doing), T-012 (YAML:doing, CU:blocked) |
| D-02 Orphan | 1 | WARNING | CU-xyz (existe no CU, não no YAML) |
| D-03 Missing | 0 | OK | — |
| D-04 Broken Deps | 1 | WARNING | T-015 blocked por T-008 (done) |
| D-05 Stale | 1 | WARNING | T-012 doing há 5 dias |
| D-06 Context Gap | 2 | INFO | T-015, T-017 sem context_from |
```

### Phase 3: PROPOSE — Gerar Proposta de Mudanças

**Goal:** Propor TODAS as mudanças necessárias em 3 categorias.

#### 3A. ADDITIONS — Tasks Novas

Para cada task nova (emergente do diagnóstico, do user via `--add`, ou de gap analysis):

1. Criar task seguindo template SINKRA (8 campos obrigatórios + output_entities):
   ```yaml
   - task_id: "T-NNN"  # Próximo ID sequencial
     name: "..."
     phase: "..."       # Phase da mission onde se encaixa
     wave: N            # Integer — posição topológica no DAG
     executor_type: "..." # Human | Agent | Worker | Clone
     source_squad: "..."
     description: "..."  # ≥50 chars
     checklist:
       - "..."           # ≥1 item verificável
     time_estimate: "Xh"
     priority: "P0-P3"
     ponto_a: "..."
     ponto_b: "..."
     entrada: [...]
     saida: [...]
     output_entities:     # OBRIGATÓRIO — onde o output da task materializa
       - list: "..."     # Lista ClickUp destino (deve existir no entity_graph v5)
         action: "create | update | attach"
         entity_name: "..." # Nome da entidade a criar/atualizar
         initial_status: "..." # Status inicial no workflow da lista
         fields: {}      # Custom Fields a setar (opcional)
   ```

2. **Output Entity Mapping (OBRIGATÓRIO):** Para cada task, mapear TODOS os outputs para entidades ClickUp usando `output_entities[]`. Consultar:
   - `sinkra-output.yaml` → `entity_graph` para listas disponíveis e seus status workflows
   - `materialization-result.yaml` e `materialization-phase2bce-result.yaml` para seed data existente
   - `infrastructure.yaml` → para outputs que são infra (não entidade ClickUp)

   **Regras de mapeamento:**
   - Scripts de masterclass → attachment ou CF `script_url` na entidade **Events**
   - Slides → CF `slides_url` na entidade **Events**
   - Criativos/cortes/thumbnails → entidade na **Produção de Criativos** (CF `content_domain`)
   - Pages (LP, Sales, ToS, PP) → entidade na **Web Design**
   - Payment links / UTM links / URLs → entidade na **Links**
   - Alunos matriculados → entidade na **Alunos**
   - Lições do syllabus → entidade na **Lessons**
   - Lives/Masterclasses → entidade na **Events** (status: scheduled→confirmed→live→recorded→published)
   - Infra (DB, Edge Functions, deploys) → NÃO é entidade ClickUp, mas CF no **Projetos Internos**
   - Config SaaS (Loops, Respond.io, WebinarKit) → CF no **Projetos Internos**
   - Research/análise → `docs/research/` ou `docs/reports/` (arquivo local, NÃO entidade ClickUp)

3. Wiring de dependências: para cada task nova, declarar `waiting_on` com tasks existentes.

4. Consultar ecossistema (IDS Principles obrigatório):
   - `squads/sinkra-squad/data/ecosystem-registry.yaml` — squad capabilities
   - `squads/infra-ops-squad/data/service-catalog.yaml` — serviços existentes
   - `apps/`, `services/`, `packages/` — código existente

#### 3B. ADJUSTMENTS — Tasks Existentes que Mudam

Para cada task que precisa de ajuste, documentar before/after:

| Tipo de Ajuste | Quando Aplicar |
|----------------|----------------|
| **Status correction** | D-01 drift — alinhar YAML com ClickUp (ou vice-versa) |
| **Dependency rewiring** | D-04 broken deps — remover dep obsoleta ou adicionar nova |
| **Context enrichment** | D-06 gap — injetar `context_from` com outputs de deps done |
| **Wave recalculation** | Novas tasks alteram topologia do DAG — recalcular waves |
| **Priority escalation** | D-05 stale — escalar prioridade de tasks paradas |
| **Description update** | Informações novas que precisam entrar na task description |

#### 3C. CANCELLATIONS — Tasks que Não Fazem Mais Sentido

Para cada task a cancelar:
- Justificativa obrigatória (por que não é mais necessária)
- Impacto nas dependentes (quem dependia desta task?)
- Status final: `cancelled` (NUNCA delete)

#### Gerar Replan Proposal

Apresentar diff visual completo:

```markdown
MISSION REPLAN PROPOSAL — {mission_id} | {date}
═══════════════════════════════════════════════════

SNAPSHOT
  Total tasks: N | Done: N (X%) | Doing: N | Ready: N | Blocked: N | Cancelled: N

DIAGNOSE SUMMARY
  Critical: N | Warning: N | Info: N

PROPOSED CHANGES

  ADDITIONS (N tasks novas)
  ┌──────────┬────────────────────────┬────────┬───────┬──────────┐
  │ Task ID  │ Nome                   │ Wave   │ Dep   │ Executor │
  ├──────────┼────────────────────────┼────────┼───────┼──────────┤
  │ T-NNN    │ ...                    │ N      │ T-XXX │ ...      │
  └──────────┴────────────────────────┴────────┴───────┴──────────┘

  ADJUSTMENTS (N tasks modificadas)
  ┌──────────┬───────────────────────┬──────────────────────────────┐
  │ Task ID  │ Campo                 │ Antes → Depois               │
  ├──────────┼───────────────────────┼──────────────────────────────┤
  │ T-XXX    │ ...                   │ ... → ...                    │
  └──────────┴───────────────────────┴──────────────────────────────┘

  CANCELLATIONS (N tasks)
  ┌──────────┬────────────────────────┬─────────────────────────────┐
  │ Task ID  │ Nome                   │ Motivo                      │
  ├──────────┼────────────────────────┼─────────────────────────────┤
  │ T-XXX    │ ...                    │ ...                         │
  └──────────┴────────────────────────┴─────────────────────────────┘

  DAG IMPACT
  Critical path: T-XXX → T-YYY → T-ZZZ
  Estimated completion: YYYY-MM-DD → YYYY-MM-DD (delta)
  Waves: N → N

🔒 AGUARDANDO APROVAÇÃO — Confirmar para materializar? (y/n)
```

**If `--dry-run`:** Stop here. Present proposal and exit.

### ════════════════════════════════════════════
### HUMAN GATE — Aprovação Obrigatória
### ════════════════════════════════════════════

**NON-NEGOTIABLE:** Não prosseguir para Phase 4 sem aprovação explícita do usuário.

Perguntar: "Confirmar replan proposal? (y/n/adjust)"
- **y** → Proceed to Phase 4
- **n** → Abort. No changes made.
- **adjust** → User modifica proposal, re-apresentar.

### Phase 4: VALIDATE — VMT em Cada Mudança

**Goal:** Validar cada task nova ou modificada contra o VMT 11-point gate.

1. Para cada task em ADDITIONS:
   - Rodar VMT-01 a VMT-11 (mesma lógica de `/validate-mission-task`)
   - Se NO-GO: marcar task como `needs_remediation` — NÃO materializar esta task

2. Para cada task em ADJUSTMENTS:
   - Se mudança é estrutural (deps, wave, executor): re-validar VMT-01, VMT-02, VMT-03, VMT-09
   - Se mudança é conteúdo (description, context_from): validar VMT-04, VMT-05, VMT-06

3. DAG Integrity Check:
   - Verificar ausência de ciclos (topological sort deve completar)
   - Verificar que waves são válidas (integer, sequencial, consistente com deps)
   - Verificar que nenhuma task ficou orphan (sem dep chain para root)

4. Consolidar resultado:

```markdown
VALIDATION RESULTS

| Task | Type | VMT Result | Notes |
|------|------|------------|-------|
| T-019 | NEW | GO | 11/11 PASS |
| T-020 | NEW | GO with Enrich | VMT-06 auto-enriched |
| T-021 | NEW | NO-GO | VMT-02 FAIL: squad not found |
| T-009 | ADJ | GO | Status correction validated |

DAG Integrity: PASS (no cycles, waves consistent)

Global Verdict: PARTIAL GO — 2/3 additions valid, 1 needs remediation
```

### Phase 5: MATERIALIZE — Aplicar Mudanças

**Goal:** Atualizar YAML local e ClickUp de forma atômica e segura.

#### 5A. LOCAL — Atualizar Mission Handoff YAML

1. **Backup:** Ler YAML atual completo antes de modificar
2. **Additions:** Append novas tasks a `dag_tasks[]`, novas deps a `dependencies[]`
3. **Adjustments:** Update campos modificados nas tasks existentes
4. **Cancellations:** Marcar tasks como `status: cancelled` (NÃO remover do YAML)
5. **Metadata:** Atualizar `metadata.replanned_at` e incrementar `metadata.replan_count`

```yaml
metadata:
  replanned_at: "YYYY-MM-DDTHH:MM:SS"
  replan_count: N
  replan_history:
    - date: "YYYY-MM-DD"
      added: N
      adjusted: N
      cancelled: N
      reason: "..."
```

#### 5B. CLICKUP — Materializar Mudanças

1. **Criar subtasks novas** (ADDITIONS que passaram VMT):
   - Usar `services/clickup/tasks.js` para criar subtask sob a mission parent
   - Setar Custom Fields: wave, priority, executor_type, task_type
   - Setar description via `markdown_description` (NUNCA `description`)
   - Incluir Zone 1 (body) + Zone 2 header (`## Journey Log`)

2. **Atualizar tasks existentes** (ADJUSTMENTS):
   - Para status: `await updateStatus(taskId, newStatus)`
   - Para description/context: `await updateTaskDescriptionSafe(taskId, newBody, { journalEntry, agent: 'mission-replan' })`
   - Para deps: criar/remover dependencies via ClickUp API
   - Para custom fields: update via `PUT /task/{id}/field/{field_id}`

3. **Cancelar tasks** (CANCELLATIONS):
   - `await updateStatus(taskId, 'cancelled')`
   - Append journal entry explicando motivo do cancelamento

4. **Journal entries** em CADA task afetada:
   ```javascript
   await appendJournalEntry(taskId, 'Replan: {descrição da mudança}.', 'mission-replan', {
     person: '{accountable_person}',
     color: '🟡',
     icon: '🔄',
     category: '[STATUS]'
   });
   ```

5. **Journal entry na mission parent:**
   ```javascript
   await appendJournalEntry(missionTaskId, `Replan executado: +${added} tasks, ~${adjusted} ajustes, -${cancelled} canceladas. Nova estimativa: ${newDate}.`, 'mission-replan', {
     person: '{accountable_person}',
     color: '🟢',
     icon: '📋',
     category: '[GERAL]'
   });
   ```

### Phase 6: REPORT — Resumo Executivo

**Goal:** Apresentar o resultado consolidado.

```markdown
MISSION REPLAN COMPLETE — {mission_id} | {date}
═══════════════════════════════════════════════════

CHANGES APPLIED
  Added: N tasks | Adjusted: N tasks | Cancelled: N tasks

BEFORE → AFTER
  Total tasks: N → N
  Completion: X% → Y%
  Critical path: [T-001 → ... → T-NNN]
  Estimated completion: YYYY-MM-DD → YYYY-MM-DD

MATERIALIZATION
  Local YAML: Updated ✓ (replan_count: N)
  ClickUp subtasks created: N
  ClickUp tasks updated: N
  ClickUp tasks cancelled: N
  Journal entries written: N

VALIDATION
  VMT passed: N/N
  VMT failed: N (listed below with remediation)
  DAG integrity: PASS

NEXT STEPS
  1. {Remediation for NO-GO tasks if any}
  2. {Tasks now ready for execution}
  3. {Recommended VMT run for specific tasks}
```

## Key References

- Mission handoff template: `squads/sinkra-squad/templates/mission-clickup-handoff-tmpl.yaml`
- VMT skill: `.claude/skills/validate-mission-task/SKILL.md`
- ClickUp helpers: `services/clickup/tasks.js` (appendJournalEntry, updateTaskDescriptionSafe)
- ClickUp client: `services/clickup/index.js`
- Ecosystem registry: `squads/sinkra-squad/data/ecosystem-registry.yaml`
- Service catalog: `squads/infra-ops-squad/data/service-catalog.yaml`
- People registry: `workspace/{spoke}/L0-identity/people-registry.yaml`
- Wave calculator: `services/clickup/wave-calculator.js`
- Person resolver: `services/clickup/person-resolver.js`
- Start task atom: `squads/backlog-ops/tasks/start-task.md`
- Close task atom: `squads/backlog-ops/tasks/close-task.md`
- ClickUp description rules: `.claude/rules/clickup-description.md`
- Unified status workflow: `decision_unified_status_workflow.md`

## Safeguards

| Risco | Proteção |
|-------|----------|
| Materializar sem aprovação | Human Gate obrigatório entre Phase 3 e Phase 4 |
| Deletar tasks | NUNCA — apenas `status → cancelled` |
| Sobrescrever Journey Log | Usa `appendJournalEntry()` — NUNCA rewrite |
| DAG com ciclos | Verificação de ciclos na Phase 4 (topological sort) |
| VMT falha | Task com NO-GO fica de fora da materialização |
| Dry-run mode | `--dry-run` gera proposal sem tocar em nada |
| YAML corrompido | Backup completo lido antes de qualquer write |
| ClickUp API failure | Retry com backoff; se falha persistir, rollback YAML local |

## Anti-Patterns

| Anti-Pattern | Por que Falha | Correção |
|-------------|--------------|----------|
| Materializar sem Phase 2 | Cria tasks que já existem ou são redundantes | SEMPRE diagnosticar antes de propor |
| Pular Human Gate | Mudanças não revisadas podem destruir o plano | Gate é NON-NEGOTIABLE |
| Deletar task no ClickUp | Perde histórico, quebra deps, corrompe Journey Log | Cancelar, nunca deletar |
| Criar task sem IDS check | Pode duplicar capability que já existe em outro squad | G1-G6 obrigatório para cada task nova |
| Ignorar VMT NO-GO | Task vai para ClickUp sem validação mínima | NO-GO = não materializa |
| Atualizar description sem helper | Apaga Journey Log e Task Digest | SEMPRE usar helpers de `services/clickup/tasks.js` |
