---
name: "roundtable"
description: "Orchestrates multi-agent consensus reviews with Agent Teams and fallback"
version: "2.1.0"
agent: "roundtable"
user-invocable: true
maxTurns: 25
---

# Roundtable v2.1 (Agent Teams — Colored Teammates)

## MANDATORY EXECUTION RULES (SWARM VS FALLBACK)

**STEP 0: FEATURE DETECTION (AC1)**
Before spawning any agents, you MUST read `.aiox-core/core/config/swarm-feature-flags.yaml` to check the `swarm_team_create` flag.

1. **If `swarm_team_create: true` → Use SWARM OS MODE (Parallel Teams)**
   - `TeamCreate(team_name: "roundtable-{id}")`
   - `Agent(name: "{agent}", team_name: "roundtable-{id}", subagent_type: "Explore")` — *Note: Explore mode is required for token efficiency (AC10)*.
   - Spawn ALL teammates simultaneously in ONE message.
   - Wait for their SendMessage replies.
   - IMPORTANT CONCURRENCY GUARD (AC12): If `TeamCreate` throws an error (e.g., only 1 team allowed at a time), DO NOT crash. Gracefully downgrade to FALLBACK MODE below.

2. **If `swarm_team_create: false` → Use FALLBACK MODE (Sequential Agents)**
   - You MUST run agents **SEQUENTIALLY** (AC7).
   - Use standard `Agent()` (no team_name).
   - Do not use `run_in_background`. Wait for one agent to finish and return its result before launching the next.

**GOLDEN RULE: Agentes analisam ISOLADAMENTE. O Moderador consolida. Nunca façam commits ou gerem handoffs dentro dos subagentes do roundtable.**

## CANONICAL INSTRUMENT REUSE (per AN005 — Citation Rule)

Personas DEVEM aplicar instrumentos canônicos já definidos no seu agent.md (heuristic_ids, veto_conditions, diagnostic_questions, core_principles, output_formats), NÃO inventar perguntas customizadas.

Toda pergunta/finding no roundtable DEVE ter `[SOURCE: agent.md "instrument_name"]` apontando para o heuristic_id, veto trigger, diagnostic question OU named principle específico que originou a contribuição.

Personas SEM heuristic_ids estruturados (a maioria dos AIOX agents) usam citation a nível de `core_principles` (ex: `[ARC: "Holistic System Thinking"]`). Personas COM heuristic_ids (PV/AN/TF mind-clones) usam IDs precisos (ex: `[PV004]`, `[AN014]`).

Findings sem traceable instrument = `[NO-CITE]` → re-investigate, não publish.

Reference example: `outputs/decoded/workflow/phase-6-synthesis/roundtable-review.md` (refactor 2026-04-18 — 22/22 findings cited).

Violação = roundtable é teatro, não governance (per `.claude/rules/kiss-no-overengineering.md`).

## Objective

Orquestrar revisões multi-agente com consenso. Analisa o contexto para selecionar agentes certos, executa análises individuais em paralelo, converge em rodadas de debate até veredito unificado. Suporta 6 modos de operação para diferentes cenários.

## SINKRA Process Architecture

```yaml
process:
  id: ARCH-ROUNDTABLE
  mode: VALIDAR  # default — varia por --mode
  sinkra_version: "1.2"
  organism: ORG-RT-001 (Roundtable Consensus Pipeline)
  molecules: [Context Analysis, Individual Analysis, Debate & Consensus, Verdict & Report]
  atoms: 9
  state_machine: "IDLE → ANALYZING → INDIVIDUAL → DEBATING → [LOOP?] → CONSOLIDATING → COMPLETE | ERROR | CANCELLED | ESCALATED"

# Tokens (TK-RT-001 through TK-RT-012)
tokens:
  # Identity
  - id: TK-RT-001
    family: Identity
    name: roundtable_id
    type: string
    description: "Unique roundtable instance ID (RT-{date}-{seq})"

  # Threshold
  - id: TK-RT-002
    family: Threshold
    name: min_agents
    type: integer
    default: 3
    description: "Minimum agents for standard roundtable (2 for --fast)"

  - id: TK-RT-003
    family: Threshold
    name: max_agents
    type: integer
    default: 7
    description: "Maximum agents standard (12 for --extended)"

  - id: TK-RT-004
    family: Threshold
    name: consensus_threshold
    type: float
    default: 0.6
    description: "Minimum ratio of APPROVE votes for APPROVE_WITH_CONDITIONS"

  - id: TK-RT-005
    family: Threshold
    name: quality_gate_score
    type: float
    default: 7.0
    description: "Minimum score /10 for PASS verdict"

  # Time
  - id: TK-RT-006
    family: Time
    name: max_debate_rounds
    type: integer
    default: 3
    description: "Circuit breaker — max loop iterations before escalation"

  - id: TK-RT-007
    family: Time
    name: report_ttl_days
    type: integer
    default: 90
    description: "TTL for roundtable reports before STALE status"

  # Capacity
  - id: TK-RT-008
    family: Capacity
    name: max_files_per_agent
    type: integer
    default: 30
    description: "Maximum files included in agent prompt"

  # Context
  - id: TK-RT-009
    family: Context
    name: mode
    type: enum
    values: [review, decision, gap_analysis, investigation, strategic, audit]
    default: review
    description: "Roundtable operating mode"

  - id: TK-RT-010
    family: Context
    name: directive
    type: string
    default: null
    description: "External constraint injected into all agent prompts (--directive)"

  # Executor
  - id: TK-RT-011
    family: Executor
    name: moderator
    type: string
    default: "Claude (AI)"
    description: "Roundtable moderator — consolidates, resolves, reports"

  - id: TK-RT-012
    family: Executor
    name: escalation_target
    type: string
    default: "user"
    description: "Who receives unresolved conflicts after circuit breaker"
```

## Input Sources (ordem de prioridade)

1. **Argumento direto:** `/roundtable path/to/file.yaml` ou `/roundtable path/to/epic.md`
2. **Flag --mode:** `/roundtable --mode decision docs/architecture/ADR-043.md`
3. **Flag --agents:** `/roundtable --agents @architect,@cso,@qa` (skip auto-selection)
4. **Flag --preset:** `/roundtable --preset epic_review path/to/files`
5. **Flag --fast:** `/roundtable --fast` (collapse debate when no conflicts, min 2 agents)
6. **Flag --extended:** `/roundtable --extended` (allow up to 12 agents)
7. **Flag --directive:** `/roundtable --directive "Hub MUST remain SOT" ...`
8. **Flag --no-confirm:** `/roundtable --no-confirm` (skip agent confirmation, CLI-first)
9. **Sessão atual:** Se nenhum argumento, analisa a conversação corrente

## Roundtable Modes (6 modes)

| Mode | SINKRA Mode | Purpose | Verdict Model | Agent Limit |
|------|------------|---------|---------------|-------------|
| `review` (default) | VALIDAR | Revisar artefato existente | APPROVE / APPROVE_WITH_CONDITIONS / REQUEST_CHANGES | 3-7 (12 extended) |
| `decision` | PLANEJAR | Comparar opções e votar decisões | DECIDED / SPLIT / ESCALATED | 3-7 |
| `gap_analysis` | EXPLORAR | Descobrir gaps num domínio | GAPS_IDENTIFIED / NO_GAPS / NEEDS_INVESTIGATION | 3-7 (12 extended) |
| `investigation` | ENTENDER | Mapear estado atual de algo | STATE_MAPPED / FURTHER_INVESTIGATION / READY_FOR_ACTION | 3-12 |
| `strategic` | PLANEJAR | Planejar execução (sprints, fases) | PLAN_APPROVED / PLAN_NEEDS_REVISION | 3-12 |
| `audit` | VALIDAR | Investigação multi-fase com diretivas | COMPLIANT / NON_COMPLIANT / PARTIAL | 3-12 (phased) |

Cada modo ajusta: o template de output do relatório, o modelo de veredito, e os presets de agentes sugeridos.

## Critical Constraints

### SEMPRE:
- @cso é auto-incluído em todo roundtable (pode ser removido com `-@cso` se contexto puramente técnico)
- @cso é OBRIGATÓRIO (não removível) em modos `audit` e `decision` com keywords de governança
- Agentes trabalham ISOLADAMENTE na fase individual (não veem outputs uns dos outros)
- Circuit breaker: máximo 3 rounds de loop debate↔individual
- Persistir relatório final em Markdown

### Limites de Agentes:
| Tipo | Min | Max | Flag |
|------|-----|-----|------|
| Standard | 3 | 7 | (default) |
| Fast | 2 | 5 | `--fast` |
| Extended | 5 | 12 | `--extended` |

### NUNCA:
- Mais de 3 rounds de loop sem escalar para o usuário
- Afirmar que agentes simulados constituem sign-off formal

---

## MOLECULE 1: Context Analysis & Agent Selection (MOL-RT-001)

**Pattern:** `ATM-001 → ATM-002 → [GATE: user confirms]`

### ATM-RT-001: Extract Context [Worker]

**Trigger:** Skill invocado pelo usuário
**Input:** Argumento da skill OU sessão atual
**On Failure:** Log error, apresentar contexto parcial ao usuário, pedir input manual

Analisa o input para entender O QUE está sendo revisado:

1. **Se argumento é um arquivo:**
   - Ler o arquivo completo
   - Identificar tipo: handoff (.yaml em .aiox/handoffs/), epic (EPIC-*.md), story (STORY-*.md), ADR, ou outro
   - Extrair: domínios envolvidos, escopo, artefatos, decisões pendentes, riscos
   - Auto-detect mode se não especificado (ADR → decision, EPIC → review, gap-analysis.yaml → gap_analysis)

2. **Se argumento é um diretório:**
   - Listar arquivos relevantes (EPIC-*.md, STORY-*.md, *.yaml)
   - Ler o EPIC principal se existir
   - Extrair escopo geral

3. **Se nenhum argumento (sessão atual):**
   - Analisar a conversação corrente
   - Identificar o tema principal sendo discutido
   - Listar arquivos já referenciados na sessão

**Output:** Resumo estruturado com domínios, escopo, artefatos, decisões pendentes, modo detectado.

**Logging:**
```yaml
log:
  atom: ATM-RT-001
  level: INFO
  on_success: "[MOL-RT-001/ATM-001] Context extracted: {domain_count} domains, {artifact_count} artifacts, scope: {scope_type}, mode: {mode}"
  on_error: "[MOL-RT-001/ATM-001] ERROR: Context extraction failed: {error}. Falling back to user input."
```

---

### ATM-RT-002: Select Agents [Worker]

**Input:** Contexto extraído em ATM-RT-001
**Gate:** Usuário confirma lista de agentes (skip com `--no-confirm`)
**On Failure:** Apresentar agent selection matrix, pedir input manual

Usa a **Agent Selection Matrix** para determinar participantes:

```yaml
# AGENT SELECTION MATRIX
domain_to_agents:

  governance:
    keywords: [registry, document-registry, file_entity_map, governance, compliance, CSO, "12 dimensões", SOT]
    agents: ["@cso"]
    auto_include: true  # auto-adicionado, removível com -@cso

  sinkra_framework:
    keywords: [SINKRA, composition-rules, token-registry, process, pipeline, "v3.1", "v3.2", organism, molecule, atom, flywheel, mission-pattern]
    agents: ["@sinkra-chief"]

  architecture:
    keywords: [architecture, ADR, package, monorepo, Hub, Spoke, migration, "@sinkra/core", dependency, exports, build]
    agents: ["@architect"]

  infrastructure:
    keywords: [deploy, CI/CD, Docker, Hetzner, Railway, Vercel, infra, devops, publish, workflow, GitHub Actions]
    agents: ["@devops", "@infra-chief"]

  database:
    keywords: [DB, schema, migration, pgvector, RLS, Supabase, tables, edge functions, memory system, embedding, vector]
    agents: ["@db-sage"]

  framework_compliance:
    keywords: [AIOX, Constitution, agent authority, CLI First, story-driven, template, handoff]
    agents: ["@aiox-master"]

  quality:
    keywords: [testing, QA, regression, e2e, quality gate, testability, rollback, CodeRabbit]
    agents: ["@qa"]

  product:
    keywords: [story, epic, AC, acceptance criteria, user story, validation, effort, depends_on]
    agents: ["@po"]

  project:
    keywords: [wave, sprint, backlog, execution order, timeline, dependency graph, critical path]
    agents: ["@pm"]

  c_level:
    keywords: [strategy, vision, OKR, valuation, roadmap, board, investor, revenue]
    agents: ["@vision-chief", "@coo-orchestrator"]
```

**Presets:**

| Preset | Agentes | Mode |
|--------|---------|------|
| `full_technical` | @architect, @cso, @qa, @db-sage, @aiox-master | review |
| `governance_review` | @cso, @aiox-master, @sinkra-chief | review |
| `architecture_review` | @architect, @devops, @infra-chief, @cso | review |
| `story_review` | @po, @qa, @cso | review |
| `epic_review` | @architect, @cso, @qa, @db-sage, @aiox-master | review |
| `final_approval` | @cso, @vision-chief, @coo, @cto, @sinkra-chief, @squad-chief, @architect, @devops, @infra-chief, @aiox-master | review (extended) |
| `architecture_decision` | @architect, @cso, @devops, @infra-chief, @sinkra-chief | decision |
| `gap_discovery` | @squad-chief, @sinkra-chief, @cso, @coo, @architect | gap_analysis |
| `state_investigation` | @cso, @architect, @qa, @db-sage, @aiox-master, @sinkra-chief | investigation |
| `strategic_planning` | @vision-chief, @cso, @coo, @cto, @pm, @architect | strategic |
| `quick_decision` | @cso, @architect | decision (fast) |

**Apresentar ao usuário (skip com --no-confirm):**
```
## Roundtable — Agent Selection

**Contexto:** {scope_description}
**Modo:** {mode}
**Domínios detectados:** {domains}

**Agentes selecionados ({count}):**
| # | Agent | Lente | Razão |
|---|-------|-------|-------|
| 1 | @cso | Governança | Auto-incluído |
| 2 | @architect | Arquitetura | keyword "Hub×Spoke" detectado |
| ... |

Confirmar? (y/n ou ajustar: +@agent / -@agent)
```

**Logging:**
```yaml
log:
  atom: ATM-RT-002
  level: INFO
  on_success: "[MOL-RT-001/ATM-002] Agents selected: {agent_list} ({count} agents, preset: {preset}, mode: {mode})"
  on_error: "[MOL-RT-001/ATM-002] ERROR: Agent selection failed. Falling back to preset: full_technical"
```

---

## MOLECULE 2: Individual Analysis (MOL-RT-002)

**Pattern:** `ATM-003 (parallel fan-out, all agents simultaneously)`

### ATM-RT-003: Launch Individual Agents

**Input:** Lista de agentes confirmada + contexto + mode + directive
**On Failure:** Se agente falhar/timeout, skip e registrar exclusion. Prosseguir com agentes válidos. (BR-SWARM-031: um não derruba os demais).

**EXECUTION PROTOCOL:**

**If SWARM OS MODE (parallel team):**
1. `TeamCreate(team_name: "roundtable-{id}")`
2. Create tasks with `TaskCreate`
3. Launch ALL agents in a SINGLE message using `subagent_type: "Explore"`:

```
Agent(
  description: "RT {agent_name}: {lens}",
  name: "{agent_name}",
  team_name: "roundtable-{id}",
  subagent_type: "Explore",
  model: "sonnet",
  prompt: "You are {agent_name} in a Roundtable {mode_upper} of {subject}. Read your persona. Analyze files: {file_list}. Output: Findings, Risks, Verdict, Score. SendMessage to 'team-lead' when done."
)
```
4. Assign tasks and wait for SendMessage replies.

**If FALLBACK MODE (sequential):**
Do NOT use TeamCreate. Launch agents ONE BY ONE, waiting for each to complete before launching the next.

```
Agent(
  description: "RT {agent_name}: {lens}",
  name: "{agent_name}",
  model: "sonnet",
  prompt: "You are {agent_name} in a Roundtable {mode_upper} of {subject}. Read your persona. Analyze files: {file_list}. Output: Findings, Risks, Verdict, Score. End your turn when done."
)
```

**Step 3d — Assign Tasks:**

After spawning, use TaskUpdate to assign each task to the corresponding teammate by name.

**Step 3e — Wait for Analyses:**

Teammates automatically send their analyses via SendMessage. Messages arrive automatically — do NOT poll. Wait for all teammates to report back.

**Mode-specific instruction blocks to inject in prompt:**

**mode=review:**
```
Review ALL content from YOUR perspective. Look for: {checklist_items}
Verdict options: APPROVE / APPROVE_WITH_CONDITIONS / REQUEST_CHANGES
```

**mode=decision:**
```
Options: {options_list}. Evaluate each: | Option | Pros | Cons | Risk | Vote |
Verdict options: OPTION_A / OPTION_B / OPTION_C / ABSTAIN
```

**mode=gap_analysis:**
```
Identify GAPS: | # | Gap | Severity | Current State | Desired State | Recommendation |
Verdict options: GAPS_IDENTIFIED / NO_GAPS / NEEDS_INVESTIGATION
```

**mode=investigation:**
```
Map STATE: | Component | Status | Health | Notes |
Verdict options: STATE_MAPPED / FURTHER_INVESTIGATION / READY_FOR_ACTION
```

**mode=audit:**
```
Audit compliance: | # | Dimension | Status | Evidence | Gap |
Verdict options: COMPLIANT / NON_COMPLIANT / PARTIAL
```

**Agent Lenses & Checklists:**

| Agent | Persona | Lens | Checklist |
|-------|---------|------|-----------|
| @cso | Chief Standards Officer | Governança, compliance, SOT, registries | 12 dimensões CSO, registry gaps, SOT conflicts, agent authority, data governance, layer hierarchy |
| @architect | Aria | Arquitetura, dependências, packages, breaking changes | Dependency graph, package boundaries, cross-repo coherence, breaking changes, migration path, wave gates |
| @qa | Quinn | Testabilidade, regressão, cobertura | AC testability, testing gaps, regression risk, integration tests, e2e coverage, CodeRabbit config |
| @db-sage | Database Sage | Schema, pgvector, RLS, data integrity | Migration safety, HNSW params, RLS isolation, edge functions, data integrity, rollback procedures |
| @aiox-master | AIOX Master | Framework compliance, Constitution | Story template, agent assignments, SINKRA v3.1/v3.2, Hub×Spoke compliance, Constitution, missing stories |
| @sinkra-chief | SINKRA Chief | Composition rules, tokens, processes | Composition rules, token families, process mapping, organism patterns, flywheel/mission alignment |
| @po | Pax | Stories, ACs, effort, dependencies | 10-point validation, effort realism, dependency correctness, executor/QG assignments |
| @devops | Gage | CI/CD, deploy, security | Pipeline integrity, deploy strategy, infra provisioning, security, publish workflows |
| @infra-chief | Infra Chief | Servers, Docker, monitoring | Service catalog, infra provisioning, container orchestration, monitoring, networking |
| @pm | Morgan | Planning, waves, timeline | Wave structure, timeline realism, resource allocation, risk management, dependency graph |
| @vision-chief | Vision Chief | Estratégia, visão, mercado | Strategic alignment, market opportunity, competitive positioning |
| @coo-orchestrator | COO | Operações, processos, equipe | Operational feasibility, resource availability, process efficiency |

**IMPORTANTE:** Cada agente trabalha ISOLADAMENTE. Nenhum agente vê o output dos outros.

**Logging:**
```yaml
log:
  atom: ATM-RT-003
  level: INFO
  on_success: "[MOL-RT-002/ATM-003] Launched {count} agents. All completed in {duration}s."
  on_error: "[MOL-RT-002/ATM-003] WARNING: {timed_out_count} agents timed out. Proceeding with {completed_count} results."
```

---

## MOLECULE 3: Debate & Consensus (MOL-RT-003)

**Pattern:** `ATM-004 → ATM-005 → [ATM-006 loop → ATM-005] (max 3 iterations)`
**Fast Path:** Se `--fast` e zero conflitos em ATM-004, skip direto para MOL-RT-004.

### ATM-RT-004: Consolidate Individual Reviews [Worker]

**Input:** Todos os outputs individuais dos agentes
**Trigger:** Todos os agentes completaram (ou timeout)

Processo de consolidação:

1. **Ler TODOS** os outputs individuais
2. **Contabilizar verdicts:** quantos APPROVE, APPROVE_WITH_CONDITIONS, REQUEST_CHANGES (ou equivalente por mode)
3. **Identificar CONSENSOS:** findings mencionados por 2+ agentes
4. **Identificar CONFLITOS:** findings onde agentes divergem
5. **Identificar ÚNICOS:** findings levantados por apenas 1 agente
6. **Agrupar por severidade:** BLOCKER > CRITICAL > HIGH > MEDIUM > LOW
7. **Deduplicar:** manter o mais detalhado quando 2+ reportam o mesmo

**Fast Path Check:** Se zero conflitos E `--fast` → skip MOL-RT-003 remainder, go to MOL-RT-004.

**Output:**
```yaml
consensus:      # 2+ agentes concordam
  - { finding, agents, severity, recommendation }
conflicts:      # agentes divergem
  - { topic, agent_a: {position}, agent_b: {position}, severity }
unique:         # apenas 1 agente levantou
  - { finding, agent, severity, recommendation }
```

**Logging:**
```yaml
log:
  atom: ATM-RT-004
  level: INFO
  on_success: "[MOL-RT-003/ATM-004] Consolidated: {consensus_count} consensus, {conflict_count} conflicts, {unique_count} unique"
```

---

### ATM-RT-005: Debate Round [Worker]

**Input:** Consolidated findings
**Gate:** Zero conflitos não resolvidos

**Se NÃO há conflitos:** Skip para MOL-RT-004.

**Se há CONFLITOS:**

Para cada conflito:
1. **Apresentar ambas posições** com evidências
2. **Analisar à luz de:** Constitution, SINKRA composition rules, ADRs existentes, precedentes, epistemic standards
3. **Propor resolução** com justificativa
4. Se resolução clara → resolver, registrar
5. Se resolução NÃO clara → ATM-RT-006

**Logging:**
```yaml
log:
  atom: ATM-RT-005
  level: INFO
  on_success: "[MOL-RT-003/ATM-005] Debate round {N}: {resolved} resolved, {unresolved} unresolved"
```

---

### ATM-RT-006: Loop — Message Conflicting Teammates [AGENT TEAMS — SendMessage]

**Trigger:** ATM-RT-005 não resolveu todos os conflitos
**CIRCUIT BREAKER:** Máximo 3 rounds (TK-RT-006)
**Execution:** SendMessage to existing teammates — they are still alive and idle
**On Max Iterations:** Escalar para usuário → state machine → ESCALATED

**IMPORTANT:** Teammates from Step 3c are STILL ALIVE (idle). Do NOT re-spawn them.
Use SendMessage to wake them with the focused debate prompt:

```
SendMessage(
  to: "{agent_name}",
  summary: "Debate round {round}: re-evaluate {topic}",
  message: "Round {round} debate on: {conflict_description}

    YOUR POSITION (Round {round-1}): {your_previous_position}
    OPPOSING POSITION ({opposing_agent}): {their_position}
    MODERATOR ANALYSIS: {moderator_notes}

    Re-evaluate your position. You may:
    - MAINTAIN (with stronger evidence)
    - REVISE (partially agree)
    - CONCEDE

    Reply with:
    ## {agent_name} — Round {round}
    ### Decision: MAINTAIN / REVISE / CONCEDE
    ### Updated Position: ...
    ### Evidence: ...
    ### Compromise (if REVISE): ...

    Use SendMessage to send your response to 'team-lead'."
)
```

Send to ALL conflicting teammates. Their responses arrive automatically via SendMessage.
Collect → back to ATM-RT-005 for re-evaluation.

**Se após 3 rounds:** Escalar para usuário. Registrar como "Escalated — User Decision".

**Step 6-FINAL — Shutdown Team (SWARM MODE ONLY):**

After all debate rounds complete, shut down the team:

**IMPORTANTE:** Structured messages (objeto com `type`) nao podem ser broadcast (`to: "*"`).
Enviar `shutdown_request` individualmente para cada teammate ativo:
```
// Para cada teammate que ainda esta ativo:
SendMessage(to: "{agent_name_1}", message: { type: "shutdown_request", reason: "roundtable complete" })
SendMessage(to: "{agent_name_2}", message: { type: "shutdown_request", reason: "roundtable complete" })
// ... repeat for each active teammate

// Aguardar shutdown_response de cada um, entao:
TeamDelete()
```
**Notas da API real:**
- `TeamDelete()` nao aceita parametros — usa o contexto da sessao automaticamente
- `TeamDelete` falha se houver membros ativos — os shutdowns DEVEM completar antes
- `summary` e obrigatorio apenas para mensagens de texto plano, nao para structured messages
- Se o teammate ja completou e esta idle (isActive=false), nao bloqueia TeamDelete

*(Skip this step if running in Fallback Mode)*

**Logging:**
```yaml
log:
  atom: ATM-RT-006
  level: WARN
  on_success: "[MOL-RT-003/ATM-006] Loop {N}/3: {agent_count} agents re-analyzed {conflict_count} conflicts"
  on_max: "[MOL-RT-003/ATM-006] CIRCUIT BREAKER: {conflict_count} conflicts unresolved after 3 rounds. Escalating to user."
```

---

## MOLECULE 4: Verdict & Report (MOL-RT-004)

**Pattern:** `ATM-007 → ATM-008 → ATM-009`

### ATM-RT-007: Generate Verdict [Worker]

**Input:** Consolidated findings (com conflitos resolvidos)

**Para mode=review:**
- UNANIMOUS APPROVE: todos aprovam sem condições
- APPROVE_WITH_CONDITIONS: maioria aprova, condições listadas
- REQUEST_CHANGES: qualquer BLOCKER/CRITICAL não resolvido

**Para mode=decision:**
- DECIDED: maioria converge numa opção
- SPLIT: sem maioria clara
- ESCALATED: após 3 rounds sem convergência

**Para mode=gap_analysis:**
- GAPS_IDENTIFIED: gaps encontrados com recomendações
- NO_GAPS: nenhum gap significativo
- NEEDS_INVESTIGATION: dados insuficientes

**Para mode=investigation:**
- STATE_MAPPED: estado mapeado completamente
- FURTHER_INVESTIGATION: áreas não cobertas
- READY_FOR_ACTION: estado claro, pronto para agir

**Para mode=strategic:**
- PLAN_APPROVED: plano aceito
- PLAN_NEEDS_REVISION: ajustes necessários

**Para mode=audit:**
- COMPLIANT: todas dimensões passam
- NON_COMPLIANT: dimensões críticas falham
- PARTIAL: compliance parcial com remediation plan

**Score:** Média ponderada (APPROVE=10, WITH_CONDITIONS=7.5, REQUEST_CHANGES=4)

**Logging:**
```yaml
log:
  atom: ATM-RT-007
  level: INFO
  on_success: "[MOL-RT-004/ATM-007] Verdict: {verdict} ({score}/10). Actions: {blocker}B {critical}C {high}H {medium}M {low}L"
```

---

### ATM-RT-008: Generate Report [Worker]

**Input:** Verdict + all consolidated findings
**On Failure:** Gerar relatório mínimo com verdict + action plan. Log error.

Gera relatório adaptado ao mode. Template base (mode=review):

```markdown
# Roundtable Review — {subject}

> **Date:** {date}
> **Mode:** {mode}
> **Participants:** {agent_list}
> **Verdict:** {verdict} ({score}/10)
> **Debate Rounds:** {round_count}

---

## Verdicts Summary
| Agent | Verdict | Score | Key Finding |

## Consolidated Findings (Deduplicated)
### BLOCKER
### CRITICAL
### HIGH
### MEDIUM
### LOW

## Consensus Points (agreed by 2+ agents)

## Decisions (mode=decision only)
| # | Decision | Options | Votes | Result | Confidence |

## Gaps Identified (mode=gap_analysis only)
| # | Gap | Current State | Desired State | Severity |

## Metrics Dashboard (mode=review, epic subject)
| Metric | Value | Target | Status |

## Resolved Conflicts
| Conflict | Agent A | Agent B | Resolution | Basis |

## Unresolved (Escalated to User)

## Extracted Stories (if BLOCKER/CRITICAL represent new work)
| # | Story Title | Source Finding | Suggested Epic | Severity |

## Action Plan
| # | Action | Severity | Applies To | Owner |

## Final Verdict
**Score:** {score}/10 | **Status:** {verdict} | **Rounds:** {round_count}
```

**Artifact lifecycle:** `draft → validated → approved → stale (after TK-RT-007 = 90 days) → archived`

**Logging:**
```yaml
log:
  atom: ATM-RT-008
  level: INFO
  on_success: "[MOL-RT-004/ATM-008] Report generated: {word_count} words, {finding_count} findings, mode: {mode}"
  on_error: "[MOL-RT-004/ATM-008] ERROR: Report generation failed. Minimal report created with verdict only."
```

---

### ATM-RT-009: Persist & Notify [Worker]

**Input:** Report markdown + verdict
**On Failure:** Apresentar relatório inline (não persistido). Log error com path tentado.

1. **Salvar relatório:**
   - Epic review: `docs/stories/{epic}/ROUNDTABLE-REPORT-{date}.md`
   - Story review: mesmo path do epic
   - Architecture decision: `docs/architecture/roundtable-{subject}-{date}.md`
   - Audit: `docs/audits/roundtable-{subject}-{date}.md`
   - Sessão genérica: `docs/sessions/{YYYY-MM}/{date}-roundtable.md`

2. **Apresentar ao usuário:**
   - Se BLOCKER/CRITICAL: ações imediatamente com destaque
   - Se APPROVE: resumo conciso com score
   - Se APPROVE_WITH_CONDITIONS: resumo + lista de condições

3. **Atualizar artefatos (se aplicável):**
   - Stories revisadas → referência no Change Log
   - Epic revisado → seção "Roundtable Review Summary"

**Logging:**
```yaml
log:
  atom: ATM-RT-009
  level: INFO
  on_success: "[MOL-RT-004/ATM-009] Persisted: {path}. Verdict: {verdict} ({score}/10). TTL: {ttl_days}d"
  on_error: "[MOL-RT-004/ATM-009] ERROR: Persistence failed for {path}. Report shown inline only."
```

---

## Usage Examples

```bash
# Auto-detect context da sessão atual
/roundtable

# Revisar um epic
/roundtable docs/stories/epic-68/EPIC-68.md

# Decisão arquitetural (3 opções)
/roundtable --mode decision docs/architecture/ADR-043.md

# Gap analysis de produto
/roundtable --mode gap_analysis --preset gap_discovery

# Investigação de estado do memory system
/roundtable --mode investigation --agents @architect,@db-sage,@cso

# Aprovação final de epic (10 agentes)
/roundtable --mode review --preset final_approval --extended docs/stories/epic-68/

# Decisão rápida (2 agentes, sem debate)
/roundtable --mode decision --fast --preset quick_decision

# Audit multi-fase com diretiva do founder
/roundtable --mode audit --extended --directive "Hub MUST remain SOT for all framework artifacts"

# CLI-first (sem confirmação interativa)
/roundtable --no-confirm --preset epic_review docs/stories/epic-68/
```

## Presets

| Preset | Agentes | Mode Sugerido |
|--------|---------|---------------|
| `full_technical` | @architect, @cso, @qa, @db-sage, @aiox-master | review |
| `governance_review` | @cso, @aiox-master, @sinkra-chief | review |
| `architecture_review` | @architect, @devops, @infra-chief, @cso | review |
| `story_review` | @po, @qa, @cso | review |
| `epic_review` | @architect, @cso, @qa, @db-sage, @aiox-master | review |
| `final_approval` | @cso, @vision-chief, @coo, @cto, @sinkra-chief, @squad-chief, @architect, @devops, @infra-chief, @aiox-master | review (extended) |
| `architecture_decision` | @architect, @cso, @devops, @infra-chief, @sinkra-chief | decision |
| `gap_discovery` | @squad-chief, @sinkra-chief, @cso, @coo, @architect | gap_analysis |
| `state_investigation` | @cso, @architect, @qa, @db-sage, @aiox-master, @sinkra-chief | investigation |
| `strategic_planning` | @vision-chief, @cso, @coo, @cto, @pm, @architect | strategic |
| `quick_decision` | @cso, @architect | decision (fast) |

---

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 2026-03-28 | Initial release — review mode only, 9 atoms, 5 presets |
| v1.1 | 2026-03-28 | Gap analysis + meta-roundtable findings: +6 modes, +12 tokens, +6 presets, +tiered limits, +flags, +logging, +state machine, +artifact lifecycle |
| v2.0 | 2026-03-28 | **REAL AGENTS:** Agent tool with run_in_background. context: conversation. Personas from .claude/agents/. |
| v2.1 | 2026-03-28 | **AGENT TEAMS:** Upgraded from Agent(run_in_background) to TeamCreate + Agent(team_name) + SendMessage. Teammates persist, communicate bidirectionally, show colored names. ATM-RT-006 uses SendMessage to wake idle teammates instead of re-spawning. Shutdown + TeamDelete on completion. |
