---
name: "story-cycle"
description: "Orchestrates the full story lifecycle as a stateful, multi-phase execution"
version: "3.8.0"
agent: "story-cycle"
user-invocable: true
activation_type: "pipeline"
maxTurns: 25
---

# Story Development Cycle — Stateful Orchestrator

> **DEPRECATED (2026-04-14):** New story work should use `/full-sdc`. This skill is preserved
> only for workflows that explicitly depend on **main-context agent activation** (Synapse L0/L1/L2
> rules loaded, `.claude/rules/` conditional loading, IDS incremental context) — a design property
> `/full-sdc` does NOT provide because it uses Agent Teams (isolated subagents).
>
> **Trade-off if you migrate to `/full-sdc`:**
> - Gain: Agent Teams enforcement (TeamCreate+SendMessage QG loop)
> - Lose: Synapse L2 preservation across phases, stateful re-invocation, triage menu
>   (next-wave/epic/story/status modes)
>
> Do not delete references to this skill until dependent workflows are migrated.
> Tracked references: `.claude/rules/story-prototyping.md`, `squads/sinkra-squad/workflows/wf-sinkra-native-upgrade.yaml`.

Skill que orquestra o ciclo completo de desenvolvimento de stories, ativando agentes
no contexto principal da conversacao para preservar Synapse L2 rules e IDS context.

## Pre-Flight: Runtime Compatibility (INHERITED)

This skill does NOT invoke `TeamCreate`/`SendMessage`/`Agent(team_name=...)` directly —
by design it uses main-context agent activation (see "Architecture" section below) to
preserve Synapse L2 rules and IDS context. Runtime compatibility is inherited from
sub-skills (`/validate-story-draft`, `/develop-story`, `/review-story`, `/deploy-story`,
`/close-story`, `/push-story`) via their own Pre-Flight probes.

**Behavior by runtime:**
- `claude-opus-*` / `claude-sonnet-*` → all sub-skills proceed → orchestrator proceeds
- `claude-haiku-*` → sub-skills may ABORT (reasoning budget for QG reviews) → chain halts
- `gpt-5.*+xhigh` via `codex-tui` → main-context agent activation works; sub-skill probes apply
- `glm-*` → sub-skills that require TeamCreate (e.g., `/roundtable` invoked by `/review-story`)
  will ABORT at their own probe → orchestrator halts

**Reference:** `docs/compat/runtime-matrix.md`

No ABORT is issued from this skill directly. Chain failure propagates from the first
sub-skill that refuses to run on the current runtime — this is the correct behavior
(do NOT wrap sub-skill failures in silent retries or alternative paths).

---

## Architecture: Main-Context Agent Activation

**CRITICAL DESIGN DECISION:** Este skill NAO usa `Task(subagent_type: ...)` para as fases.
Subagents sao processos isolados que NAO recebem:
- Synapse L0/L1/L2 rules (Constitution, Global, Agent-specific)
- `.claude/rules/` conditional loading
- IDS incremental development context
- Handoff artifacts navigation

Em vez disso, este skill atua como **state machine** que:
1. Persiste estado em `state.json`
2. Ativa cada agente no contexto principal (preserva Synapse)
3. Cada invocacao avanca uma fase
4. Feedback loops com max_retries=3

Flow: `/story-cycle` first triages with AskUserQuestion into `next-wave`, `epic`,
`story`, or `status`. Wave/epic/story modes read or create `state.json`, determine
the current phase, then either show status/progress, activate the phase agent in
main context, or handle feedback retries/escalation. Each pass updates
`state.json`, writes the handoff artifact, and shows "Re-invoke /story-cycle".

## Commands

### /story-cycle (sem argumentos)

Apresenta menu interativo via AskUserQuestion com 4 opções:
- **next-wave** — Detecta próxima wave, abre terminais paralelos com story-cycle (100% fidelidade)
- **epic** — Pede epic ID, executa stories sequencialmente
- **story** — Pede story path, executa uma story específica
- **status** — Mostra progresso de workflows ativos

### /story-cycle {epic-id} [--story {N}] [--mode yolo|interactive|preflight]

Entrada direta (bypass do menu). Behavior depends on state:

- **No state.json:** Initialize workflow, start Phase 1
- **state.json exists:** Resume from current phase
- **Phase complete:** Advance to next phase
- **All phases complete:** Show summary, suggest next story

### /story-cycle status

Show current workflow progress without advancing.

### /story-cycle reset

Reset workflow state (requires confirmation).

---

## Phase Definitions (6 Phases)

| Phase | Agent | Command | Task File | Feedback Loop |
|-------|-------|---------|-----------|---------------|
| 1 | @sm | *draft | create-next-story.md | — |
| 2 | @po | *validate-story-draft {id} | validate-next-story.md | PO rejects → Phase 1 (max 3) |
| 3 | @dev | *develop {id} | dev-develop-story.md | — |
| 4 | @qa | *review {id} | qa-gate.md | QA fails → Phase 3 (max 3) |
| 5 | @devops | *push | github-devops-pre-push-quality-gate.md | — |
| 6 | @po | *close-story {id} | po-close-story.md | — |

## State File

Location: `{story_dir}/.sdc-state.json` (alongside the story file)

Alternative: `docs/projects/{project}/epics/{epic}/.progress/{story-id}/state.json`

The state file tracks:
- Current phase (1-6, 0=complete)
- Phase results (completed, failed, pending)
- Retry counts for feedback loops
- Artifact paths
- Timestamps

---

## Execution Protocol

### On Each Invocation of /story-cycle

Execute these steps IN ORDER:

#### Step 1: Triage — Determine Execution Mode

```
IF arguments include {epic-id} [--story {N}]:
  → Skip triage, go directly to EPIC MODE or STORY MODE (Step 1B/1C)

IF argument is "status":
  → Go directly to STATUS MODE (Step 1D)

IF argument is "reset":
  → Go directly to RESET (Step 1E)

IF no arguments:
  1. Check for active workflows:
     - Scan .aiox/active-workflows/ directory for all *.json files
     - IF directory exists AND has 1+ files:
       → Parse each file to get story_id, current_phase, started_at
       → Show list: "Workflows ativos ({N} total):"
         | Story ID  | Phase | Agente | Iniciado |
         |-----------|-------|--------|----------|
         | {story_id}| {N}/6 | @{ag}  | {time}   |
       → Ask via AskUserQuestion:
         "Você tem {N} workflow(s) ativo(s). O que deseja fazer?"
         options:
           - "Retomar: {story_id}" (one option per active workflow, up to 3)
           - "Iniciar novo workflow"
         → IF "Retomar {story_id}" selected: load that workflow's progress_dir, go to Step 2
         → IF "Iniciar novo workflow": continue to triage menu below
     - IF no active workflows: continue to triage menu

  2. Show triage menu via AskUserQuestion:

     AskUserQuestion({
       questions: [{
         question: "Como deseja executar o story-cycle?",
         header: "Modo",
         options: [
           {
             label: "next-wave",
             description: "Lançar próxima wave em terminais paralelos (tmux no macOS/Linux). Cada sessão é 100% interativa com story-cycle."
           },
           {
             label: "epic",
             description: "Executar stories de um epic sequencialmente (pipeline completo por story)"
           },
           {
             label: "story",
             description: "Executar uma story específica (pipeline completo)"
           },
           {
             label: "status",
             description: "Ver progresso de workflows ativos e waves"
           }
         ],
         multiSelect: false
       }]
     })

  3. Route based on selection:
     - "next-wave" → Step 1A (Wave Mode)
     - "epic"      → Step 1B (Epic Mode)
     - "story"     → Step 1C (Story Mode)
     - "status"    → Step 1D (Status Mode)
```

#### Step 1A: Wave Mode (next-wave) — Multi-Terminal Launch (100% Fidelidade)

```
DESIGN DECISION: Wave mode NÃO usa Task(subagent_type) porque subagents
perdem ~30% da fidelidade (skills não invocam nativamente, agentes não ativam
via @agent-name, hooks não disparam, AskUserQuestion bypassed).

Em vez disso, Wave mode PRE-CRIA worktrees via `git worktree add` e lança
sessões Claude Code HEADLESS (`claude -p`) em cada worktree. Cada sessão
recebe `/story-cycle --mode yolo` como prompt. Output visível via tmux panes
e logs salvos em `logs/wave-{N}/`.

Script: .claude/skills/story-cycle/scripts/wave-launch.sh
Params: -Wave N [-Batch A|B|ALL] [-DryRun] [-Status] [-Clean]

1. DETECT NEXT WAVE:
   a. Read docs/stories/WAVE-TRACKER.md
      - Parse wave definitions (stories, dependencies, status)
      - IF file not found: HALT with "WAVE-TRACKER.md não encontrado."
   b. For each wave (starting from Wave 1):
      - Check all dependency stories' status (read each story file)
      - Check stories IN this wave for Done/InProgress/Pending
   c. Determine next available wave:
      - Wave N is "available" if ALL dependency stories are Done
        AND at least one story in Wave N is NOT Done
      - If ALL waves Done: show completion message, HALT

2. SHOW WAVE INFO AND CONFIRM:

   ## Wave {N} — {count} stories paralelas

   | Story | Título | Tipo | Status | Worktree |
   |-------|--------|------|--------|----------|
   | SINKRA-{id} | {title} | {type} | {status} | sinkra-{id} |

   **Como funciona:** Cada story abre em uma sessão Claude Code separada,
   em worktree isolado. A sessão já inicia com `/story-cycle` invocado
   automaticamente. Você acompanha o progresso em cada terminal.

   AskUserQuestion({
     questions: [{
       question: "Lançar Wave {N}? ({count} sessões paralelas headless)",
       header: "Wave",
       options: [
        { label: "Lançar todas (Recomendado)",
          description: "Abre {count} panes no tmux. Cada pane roda claude -p (headless) em worktree isolado com /story-cycle --mode yolo." },
         { label: "Batch A (metade)",
           description: "Lança apenas a primeira metade das stories ({half} sessões)." },
         { label: "Preview (dry-run)",
           description: "Mostra os comandos que seriam executados sem abrir terminais." },
         { label: "Cancelar",
           description: "Voltar ao menu principal." }
       ],
       multiSelect: false
     }]
   })

   IF "Cancelar":
     → Return to Step 1 triage
   IF "Preview (dry-run)":
     → Execute: Bash("bash .claude/skills/story-cycle/scripts/wave-launch.sh -Wave {N} -DryRun")
     → Show output and HALT
   IF "Lançar todas (Recomendado)":
     → set BATCH_FLAG = ""
   IF "Batch A (metade)":
     → set BATCH_FLAG = "-Batch A"

3. LAUNCH PARALLEL SESSIONS:
   Execute via Bash tool:

   Bash("bash .claude/skills/story-cycle/scripts/wave-launch.sh -Wave {N} {BATCH_FLAG}")

   The script:
   a. Pre-creates git worktrees via `git worktree add` for each story
   b. Generates runner scripts that run `claude -p` inside each worktree
   c. Opens tmux panes showing output
   d. Saves logs to `logs/wave-{N}/sinkra-{id}.log`

   Each pane runs Claude Code in headless mode (-p) with:
   - Pre-created worktree (code already present)
   - --dangerously-skip-permissions (autonomous)
   - --model sonnet (faster for parallel execution)
   - /story-cycle --mode yolo (full 6-phase pipeline)
   - Output visible in terminal AND saved to log file

4. SHOW MONITORING INSTRUCTIONS:

   ## Wave {N} Lançada — {count} sessões headless

   Cada pane do tmux mostra o output do Claude Code em tempo real.
   Logs também salvos em `logs/wave-{N}/`.

   ### Comandos úteis

   | Comando | Descrição |
   |---------|-----------|
   | `bash .claude/skills/story-cycle/scripts/wave-launch.sh -Wave {N} -Status` | Ver status |
   | `bash .claude/skills/story-cycle/scripts/wave-launch.sh -Wave {N} -Clean` | Limpar worktrees |
   | `git worktree list` | Listar todos os worktrees ativos |
   | `ls logs/wave-{N}/` | Ver logs de cada sessão |

   ### Quando todas as sessões completarem

   Re-invoke `/story-cycle` e selecione `status` para ver o progresso,
   ou execute o merge manualmente:

   ```bash
   git checkout main
   git merge worktree-sinkra-{story_id}  # para cada story
   ```

   HALT — aguardar usuário completar as sessões e retornar.

5. POST-WAVE MERGE (quando usuário retorna):
   IF user re-invokes /story-cycle after wave sessions complete:
     a. Check worktree status via: Bash("bash .claude/skills/story-cycle/scripts/wave-launch.sh -Wave {N} -Status")
     b. For each story in the wave, check if story file has Status: "Done"
        (check inside worktree: .claude/worktrees/sinkra-{id}/docs/stories/...)
     c. Show summary:

     ## Wave {N} — Resultados

     | Story | Status | Branch | Log | Pode Mergear? |
     |-------|--------|--------|-----|---------------|
     | SINKRA-{id} | Done | worktree-sinkra-{id} | logs/wave-{N}/sinkra-{id}.log | Sim |
     | SINKRA-{id} | InProgress | worktree-sinkra-{id} | logs/wave-{N}/sinkra-{id}.log | Não |

     d. AskUserQuestion: "Mergear stories completas no main?"
        IF confirmed:
          For each completed story (sequentially):
            - Bash("git checkout main && git merge worktree-sinkra-{story_id}")
            - IF conflict: HALT with conflict details
          After all merges:
            - Bash("bash .claude/skills/story-cycle/scripts/wave-launch.sh -Wave {N} -Clean")
            - Update WAVE-TRACKER.md status
            - Show: "Wave {N} completa. Re-invoke /story-cycle para próxima wave."

     e. For incomplete stories:
        - Show: "Stories incompletas podem ser retomadas individualmente."
        - Suggest: "/story-cycle story" para retomar cada uma
```

#### Step 1B: Epic Mode

```
1. IF epic-id provided as argument: use it
   ELSE: Ask via AskUserQuestion:
     "Qual epic deseja executar?"
     - List available epics from docs/stories/epic-*/

2. Resolve epic path: docs/stories/epic-{N}/
3. Scan story files in epic, sorted by story number
4. Find next pending story (Status != "Done")

5. IF --story provided: use that specific story instead

6. Set progress_dir = {story_dir}/ (alongside story file)
7. IF {progress_dir}/.sdc-state.json exists:
   → Read state, go to Step 2
8. ELSE:
   → Initialize state.json using state-manager.cjs
   → Set current_phase = 1
   → Go to Step 3
```

#### Step 1C: Story Mode

```
1. IF story path provided as argument: use it
   ELSE: Ask via AskUserQuestion:
     "Qual story deseja executar?"
     - Scan docs/stories/epic-*/*.story.md for non-Done stories
     - Show as options with story ID + title

2. Resolve story file path
3. Set progress_dir = {story_dir}/ (alongside story file)
4. IF {progress_dir}/.sdc-state.json exists:
   → Read state, go to Step 2
5. ELSE:
   → Initialize state.json using state-manager.cjs
   → Set current_phase = 1
   → Go to Step 3
```

#### Step 1D: Status Mode

```
1. Check .aiox/active-workflows/ directory:
   - Scan for all *.json files
   - IF directory has 1+ files:
     Show table of ALL active workflows:

     ## Workflows Ativos ({N} total)

     | Story ID  | Epic  | Fase  | Agente   | Iniciado          |
     |-----------|-------|-------|----------|-------------------|
     | {story_id}| {epic}| {N}/6 | @{agent} | {started_at}      |

   - ELSE: show "Nenhum workflow ativo."

2. Read docs/stories/WAVE-TRACKER.md:
   - Parse wave status
   - For each wave, count Done/InProgress/Pending stories
   - Show summary:

   ## Progresso Geral

   | Wave | Total | Done | Em Progresso | Pendente | Status |
   |------|-------|------|-------------|----------|--------|
   | 0    | 3     | 3    | 0           | 0        | Done   |
   | 1    | 3     | 0    | 0           | 3        | Próxima|
   | ...  | ...   | ...  | ...         | ...      | ...    |

   **Caminho Crítico:** 1.1→1.2→1.3→1.4→3.1→3.4→3.5→3.3→3.6

3. HALT
```

#### Step 1E: Reset

```
1. Scan .aiox/active-workflows/ for all *.json files
2. IF no files: "Nenhum workflow para resetar."
3. IF 1 file: show workflow details and ask for confirmation
   IF 2+ files: show list and ask WHICH workflow to reset (or "Resetar todos")
4. IF confirmed:
   - Delete the selected workflow's file(s) from .aiox/active-workflows/
   - Optionally delete that workflow's state.json (ask user)
5. Show: "Workflow(s) resetado(s). Re-invoke /story-cycle para começar."
```

#### Step 2: Read State and Show Progress

```
Read {progress_dir}/state.json

Show progress bar:
  ┌──────────────────────────────────────────────────────────┐
  │ Story Development Cycle: {story_id}                      │
  │ Phase {current_phase}/6: {phase_label}                   │
  │ [████████░░░░░░░░] {percentage}%                         │
  │                                                           │
  │ 1.Create  2.Validate  3.Develop  4.QA  5.Push  6.Close  │
  │    ✅        ✅         🔄       ⬜    ⬜      ⬜       │
  └──────────────────────────────────────────────────────────┘

Determine action:
  IF current phase status == "in_progress":
    → Phase was started but not completed
    → Show: "Phase {N} is in progress with @{agent}."
    → Show: "If the agent has completed its task, confirm to advance."
    → Ask: "Has @{agent} completed {command}? [yes/no]"
      - If yes: advance phase, go to Step 3 for next
      - If no: show agent's command reminder

  IF current phase status == "ready" or "pending":
    → Go to Step 3 to start this phase

  IF phase_status == "completed" (all 6 done):
    → Show completion summary
    → Suggest next story
    → HALT
```

#### Step 3: Activate Phase Agent

THIS IS THE CRITICAL STEP. Activate the agent in the MAIN CONTEXT:

```
phase = PHASES[current_phase]

1. Update state.json: phase status = "in_progress", started_at = now
2. Save active workflow reference: .aiox/active-workflows/{story_id}.json
3. Write handoff artifact to .aiox/handoffs/ with:
   - from_agent: previous phase's agent (or "orchestrator")
   - to_agent: current phase's agent
   - story_context: story_id, story_path, branch, status
   - next_action: phase.command + story_id

4. DISPLAY to user:

   ## Phase {N}/6: {phase.label}

   **Agent:** @{phase.agent}
   **Command:** {phase.command} {story_id}
   **Task:** {phase.task_file}

   ### Instructions

   Activate the agent and execute:

   ```
   @{phase.agent}
   ```

   Then run:
   ```
   {phase.command} {story_id}
   ```

   The agent's greeting will show the suggested next command from the
   handoff artifact (Step 5.5 in activation-instructions).

   **When the agent completes**, re-invoke `/story-cycle` to advance.

5. HALT and wait for user
```

#### Step 4: Handle Phase Completion (on re-invocation)

When user re-invokes `/story-cycle` after a phase:

```
1. Read state.json
2. Check current phase result:

   Phase 2 (Validate):
     - Read story file for status field
     - IF status == "Ready" or GO verdict found:
       → Phase 2 = completed, reset validate retries
       → Advance to Phase 3
     - IF status still "Draft" or NO-GO:
       → Increment validate retry count
       → IF retries >= 3: HALT with escalation message
       → ELSE: Set phase back to 1 (return to @sm)
       → Show: "Validation failed ({count}/3). Returning to @sm for fixes."

   Phase 4 (QA):
     - Check for QA gate file or story status
     - IF PASS or CONCERNS or WAIVED:
       → Phase 4 = completed, reset qa retries
       → Advance to Phase 5
     - IF FAIL:
       → Increment qa retry count
       → IF retries >= 3: HALT with escalation message
       → ELSE: Set phase back to 3 (return to @dev)
       → Show: "QA failed ({count}/3). Returning to @dev for fixes."

   All other phases:
     → Mark as completed
     → Advance to next phase

3. Update state.json
4. Go to Step 3 for next phase (or Step 2 if feedback loop)
```

---

## Feedback Loops

### PO Rejection (Phase 2 → Phase 1)

```
max_retries = 3

When @po verdict is NO-GO:
  1. Record retry: node state-manager.cjs retry {dir} validate "NO-GO: {reason}"
  2. If canRetry:
     - Set current_phase = 1
     - Show: "Validation NO-GO ({count}/3). @sm will address feedback."
     - Next invocation activates @sm
  3. If !canRetry:
     - HALT: "3 consecutive PO rejections. Human escalation required."
     - Show: "Review the story requirements and validation feedback."
     - Do NOT auto-advance
```

### QA Rejection (Phase 4 → Phase 3)

```
max_retries = 3

When @qa verdict is FAIL:
  1. Record retry: node state-manager.cjs retry {dir} qa "FAIL: {reason}"
  2. If canRetry:
     - Set current_phase = 3
     - Show: "QA FAIL ({count}/3). @dev will apply fixes."
     - Next invocation activates @dev
  3. If !canRetry:
     - HALT: "3 consecutive QA failures. Human escalation required."
     - Show: "Review the QA feedback and implementation approach."
     - Do NOT auto-advance
```

---

## Active Workflow Tracking

Suporta múltiplos workflows concorrentes. Um arquivo por story, em diretório dedicado.

Directory: `.aiox/active-workflows/`
File per story: `.aiox/active-workflows/{story-id}.json`

```json
{
  "workflow": "story-development-cycle",
  "epic_id": "E3",
  "story_id": "3.2",
  "progress_dir": "docs/stories/epic-3/",
  "started_at": "2026-03-01T10:00:00Z"
}
```

**Criado:** Fase 1 start → `.aiox/active-workflows/{story_id}.json`
**Deletado:** Fase 6 completion → remove apenas o arquivo desta story
**Multi-workflow:** Cada story tem seu próprio arquivo — N workflows podem coexistir
**Triage:** `/story-cycle` sem args lê todos os arquivos do diretório e lista ativos

---

## Handoff Artifact Integration

Each phase transition writes a handoff artifact to `.aiox/handoffs/`:

```yaml
handoff:
  version: "1.0"
  timestamp: "2026-03-01T10:30:00Z"
  from_agent: "sm"
  to_agent: "po"
  last_command: "*draft"
  story_context:
    story_id: "3.2"
    story_path: "docs/stories/3.2.story.md"
    story_status: "Draft"
    current_task: "validate-story-draft"
    branch: "feat/story-3.2"
  decisions:
    - "Story created from epic-3 PRD shard"
  files_modified:
    - "docs/stories/3.2.story.md"
  blockers: []
  next_action: "*validate-story-draft 3.2"
  consumed: false
```

The incoming agent's greeting (Step 5.5) reads this artifact and shows:
"Suggested: `*validate-story-draft 3.2`"

This provides seamless workflow navigation.

---

## Completion Summary

After Phase 6 completes:

```markdown
## Story Development Cycle Complete: {story_id}

### Progress
| Phase | Agent | Status | Duration |
|-------|-------|--------|----------|
| 1. Create | @sm | ✅ Done | {duration} |
| 2. Validate | @po | ✅ Done | {duration} |
| 3. Develop | @dev | ✅ Done | {duration} |
| 4. QA Review | @qa | ✅ Done | {duration} |
| 5. Push | @devops | ✅ Done | {duration} |
| 6. Close | @po | ✅ Done | {duration} |

### Stats
- **Mode:** {mode}
- **PO Retries:** {validate_retries}/3
- **QA Retries:** {qa_retries}/3
- **Total Duration:** {total_duration}

### Next Steps
- Next story in epic: {next_story_id} — {next_story_title}
- Re-invoke `/story-cycle` to start next story
- Or `*backlog-review` for sprint planning

### Next Session Command (MANDATORY)

ALWAYS end with the exact command the user should run in the next session:

```
/story-cycle {epic_id} --mode {mode}
```

Example:
```
/story-cycle epic-site-aiox-landing-pages --mode yolo
```

This is a copy-paste-ready command. Include the epic ID and mode used.
```

Clean up:
- Delete `.aiox/active-workflows/{story_id}.json` (apenas desta story)
- Keep state.json as historical record
- Other active workflows in `.aiox/active-workflows/` are NOT affected

---

## Yolo Mode Protocol (Autonomous Execution)

When `mode == "yolo"` (used by wave agents and direct `--mode yolo` invocations),
the story-cycle executes ALL 6 phases autonomously without human interaction.

### Yolo Execution Flow

```
FOR each phase (1 through 6):

  1. READ phase definition:
     - Use references/phase-definitions.yaml for agent, command, task_file, preconditions

  2. ADOPT agent behavior:
     - Read the agent persona file: .claude/agents/{agent}.md
       (e.g., .claude/agents/dev.md for Phase 3)
     - Follow the agent's persona.role, persona.style, persona.core_principles
     - DO NOT invoke interactive agent shortcuts in yolo mode

  3. READ task instructions:
     - Read .aiox-core/development/tasks/{task_file}
     - Follow the task workflow EXACTLY as written

  4. EXECUTE the phase:

     CRITICAL: Follow the task file read in Step 3 EXACTLY. Do NOT skip any
     section, checklist, or sub-workflow defined in the task file. The task file
     is the SINGLE SOURCE OF TRUTH for what each phase does. The only
     worktree-specific overrides are listed below.

     WORKTREE-MODE OVERRIDES (apply on top of task file instructions):

     Phase 1 — Create (@sm):
       - IF story file already exists with Status: Draft or higher → SKIP phase
       - Follow create-next-story.md for everything else

     Phase 3 — Develop (@dev):
       - Follow dev-develop-story.md COMPLETELY, INCLUDING:
         * CodeRabbit self-healing loop (Section 7 of the task file)
         * DOD checklist verification
         * Story checkbox updates
       - Use YOLO mode section of the task file (it explicitly includes CodeRabbit)

     Phase 4 — QA Review (@qa):
       - Follow qa-gate.md COMPLETELY, INCLUDING:
         * Full qa-master-checklist.md execution
         * Gate file creation with YAML schema
         * Story QA Results section update

     Phase 5 — Push (@devops):
       - Follow github-devops-pre-push-quality-gate.md for LOCAL validation
         (lint, test, typecheck, build, CodeRabbit CLI, security scan)
       - WORKTREE OVERRIDE: After local gate passes, do git add + git commit
         with conventional commit message. Do NOT git push or create PR.
         The lead session will merge the worktree branch later.

     All other phases (2, 6):
       - Follow the respective task file with NO modifications

  5. HANDLE feedback loops automatically:
     - PO rejection (phase 2): retry up to 3x, then STOP with error
     - QA failure (phase 4): retry up to 3x, then STOP with error
     - Use state-manager.cjs retry command to track

  6. ON COMPLETION:
     Return a structured report (displayed to lead or returned to Task caller):

     COMPLETION_REPORT:
       story_id: {story_id}
       status: "SUCCESS" | "PARTIAL" | "FAILED"
       phases_completed: {count}/6
       retries: { validate: N, qa: N }
       files_modified: [list of files]
       commit_sha: {sha}
       errors: [list of errors if any]
```

### Yolo Mode Differences vs Interactive

| Aspect | Interactive | Yolo |
|--------|------------|------|
| Phase transitions | Human re-invokes `/story-cycle` | Automatic, continuous |
| Agent activation | Human types `@dev` | Agent persona read from file |
| Task file execution | Same task file, same steps | Same task file, same steps (IDENTICAL quality) |
| CodeRabbit self-healing | Runs in dev-develop-story.md | Runs in dev-develop-story.md (SAME) |
| QA gate | Full qa-gate.md + checklist | Full qa-gate.md + checklist (SAME) |
| AskUserQuestion | Used between phases | NEVER used |
| Handoff artifacts | Written to .aiox/handoffs/ | Skipped (same context) |
| Phase 5 (Push) | @devops does full PR flow | Only `git add + commit` (no push, lead merges) |
| Feedback loops | Human confirms retry | Automatic retry up to max |
| Completion | Human sees summary | Returns structured report |

---

## Wave Session Command Reference

Each wave session runs Claude Code in HEADLESS mode (`claude -p`) inside a
pre-created git worktree. The script `wave-launch.sh` orchestrates everything.

### How It Works

1. **Pre-creation:** `git worktree add .claude/worktrees/sinkra-{id} -b worktree-sinkra-{id}`
2. **Runner script:** Generated bash script that `cd`s into worktree and runs:
   ```bash
   unset CLAUDECODE
   cd $WORKTREE_DIR
   claude -p --dangerously-skip-permissions --model sonnet \
     '/story-cycle epic-{N} --story {id} --mode yolo' \
     2>&1 | tee $LOG_FILE
   ```
3. **tmux panes:** Each runner script runs in a pane for visual monitoring

### What Each Session Does

Each headless session runs the FULL story-cycle in yolo mode:
1. `/story-cycle --mode yolo` is the prompt sent to `claude -p`
2. All 6 phases execute autonomously (no human interaction)
3. Agent personas are read from files (not activated interactively)
4. Output streams to both terminal pane and log file
5. On completion, pane shows "COMPLETO" and waits for Enter

### Wave Mode Architecture

| Aspect | Wave (Headless -p) | Single Story (Interactive) |
|--------|-------------------|---------------------------|
| Session type | `claude -p` (headless) | `claude` (TUI) |
| Mode | yolo (autonomous) | interactive |
| Skills | Via prompt text | Natively invocable |
| Agent activation | File read emulation | @agent-name nativo |
| User interaction | Zero (autonomous) | Full |
| Worktree | Pre-created via git | Created by claude -w |
| Monitoramento | Terminal pane + log file | Terminal direto |
| Model | sonnet (faster, cheaper) | opus (default) |

---

## Anti-Patterns (NEVER DO)

1. **NEVER allow infinite feedback loops.** Hard limit: max_retries=3 per loop.
2. **NEVER advance phase without verifying previous phase completion.**
3. **NEVER hardcode story paths.** Always resolve from epic context.
4. **NEVER delete state.json during workflow.** It enables resume after interruption.
5. **NEVER git push from yolo/worktree mode.** Only commit. Lead merges.
6. **NEVER skip reading agent persona files in yolo mode.** Quality depends on persona adoption.
7. **NEVER merge worktrees without validating completion reports.** Check all 6 phases passed.
8. **NEVER write simplified phase descriptions that compete with task files.** The task file is the SINGLE SOURCE OF TRUTH. Yolo mode only adds worktree-specific OVERRIDES (e.g., no git push), never replaces or abbreviates task file steps (e.g., never omit CodeRabbit, QA checklist, or pre-push gate).

---

## IDS Philosophy (inherited)

```
REUSE > ADAPT > CREATE

Before writing ANY new code in Phase 3:
1. Search existing code
2. If similar exists → REUSE
3. If close match → ADAPT
4. Only if nothing suitable → CREATE

Target: CREATE rate < 30%
```

This is enforced by the `ids-check.md` VETO in `dev-develop-story.md`.

---

## State Contract (`.sdc-state.json`)

Schema formal do arquivo de estado persistido por story:

```json
{
  "workflow": "story-development-cycle",
  "version": "1.0",
  "epic_id": "string",
  "story_id": "string",
  "story_path": "string",
  "mode": "interactive | yolo | wave",
  "current_phase": 1,
  "started_at": "ISO8601",
  "updated_at": "ISO8601",
  "phases": {
    "1": { "status": "pending | in_progress | completed | failed", "started_at": null, "completed_at": null, "result": null },
    "2": { "status": "pending", "started_at": null, "completed_at": null, "result": null, "retries": 0 },
    "3": { "status": "pending", "started_at": null, "completed_at": null, "result": null },
    "4": { "status": "pending", "started_at": null, "completed_at": null, "result": null, "retries": 0 },
    "5": { "status": "pending", "started_at": null, "completed_at": null, "result": null },
    "6": { "status": "pending", "started_at": null, "completed_at": null, "result": null }
  },
  "feedback_loops": {
    "validate": { "count": 0, "max": 3, "last_reason": null },
    "qa": { "count": 0, "max": 3, "last_reason": null }
  },
  "artifacts": {
    "story_file": "string",
    "handoff_file": "string | null",
    "gate_file": "string | null",
    "commit_sha": "string | null"
  }
}
```

### Lifecycle do state.json

| Evento | Ação |
|--------|------|
| Fase 1 inicia | `init` — cria `.sdc-state.json` com `current_phase: 1` |
| Fase avança | `advance` — atualiza `current_phase`, timestamps |
| Retry ocorre | `retry` — incrementa `feedback_loops.{loop}.count` |
| Fase 6 completa | `complete` — marca `current_phase: 0`, registra `completed_at` |
| Reset manual | `reset` — deleta o arquivo (usuário confirma) |

### Limpeza

- **Não deletar** durante o workflow — habilita resume após interrupção
- **Manter como histórico** após conclusão (não deletar automaticamente)
- **Arquivo por story** — múltiplas stories têm arquivos independentes
- **Cleanup de worktrees:** `wave-launch.sh -Clean` remove worktrees mas preserva state.json no dir original

### Tratamento de Versões

`version: "1.0"` — campo reservado para futuras migrações de schema. Se o arquivo lido tem versão diferente da esperada pelo state-manager.cjs, o state-manager emite warning e procede com backward compatibility.

---

## Exemplos de Uso por Modo

### Modo: `story` (interativo — uma story específica)

```
/story-cycle
→ Menu aparece → selecione "story"
→ AskUserQuestion: "Qual story?"
→ Selecione: "STORY-3.2-feature-name"
→ Phase 1/6 ativa @sm → *draft
→ Re-invoke /story-cycle após cada fase
```

Ou com argumento direto:
```
/story-cycle epic-3 --story 3.2
```

### Modo: `epic` (sequencial — todas as stories de um epic)

```
/story-cycle
→ Menu → "epic"
→ AskUserQuestion: "Qual epic?" → epic-3
→ Detecta próxima story pendente em epic-3
→ Executa pipeline completo (6 fases)
→ Ao completar, sugere próxima story do epic
```

Ou direto:
```
/story-cycle epic-3
```

### Modo: `next-wave` (paralelo — múltiplos worktrees headless)

```
/story-cycle
→ Menu → "next-wave"
→ Detecta Wave 2 (Wave 1 = Done)
→ Mostra: 6 stories paralelas disponíveis
→ Confirma lançamento
→ Executa: bash .claude/skills/story-cycle/scripts/wave-launch.sh -Wave 2
→ 6 panes tmux abrem com claude -p em cada worktree
→ HALT — aguardar sessões completarem
→ Re-invocar /story-cycle → status → merge
```

### Modo: `yolo` (autônomo — usado internamente por wave agents)

Ativado automaticamente pelo wave-launch.sh via:
```bash
claude -p --dangerously-skip-permissions --model sonnet \
  '/story-cycle epic-3 --story 3.2 --mode yolo'
```

Executa todas as 6 fases sem interação humana. Retorna `COMPLETION_REPORT` estruturado.

### Modo: `status` (leitura — sem avançar fases)

```
/story-cycle status
```
Exibe tabela de todos os workflows ativos em `.aiox/active-workflows/` + progresso geral por wave.

---

## State Manager Utility

`scripts/state-manager.cjs` provides CLI operations for state management:

```bash
# Initialize new state
node scripts/state-manager.cjs init {dir} {epic_id} {story_id} [mode]

# Read current state
node scripts/state-manager.cjs read {dir}

# Start a phase
node scripts/state-manager.cjs start {dir} {phase_number}

# Complete a phase
node scripts/state-manager.cjs advance {dir} {phase_number} [result]

# Record retry
node scripts/state-manager.cjs retry {dir} {loop_name} {reason}

# Reset retry counter
node scripts/state-manager.cjs reset-retry {dir} {loop_name}

# Register artifact
node scripts/state-manager.cjs artifact {dir} {key} {path}

# Get progress summary
node scripts/state-manager.cjs status {dir}
```

---

## Phase Reference Files

- Phase definitions: `references/phase-definitions.yaml`
- State schema: `scripts/state-manager.cjs` (canonical)
- Workflow chains: `.aiox-core/data/workflow-chains.yaml`
- Handoff template: `.aiox-core/development/templates/agent-handoff-tmpl.yaml`

## Task Files (DO NOT MODIFY)

- `.aiox-core/development/tasks/create-next-story.md` — Phase 1
- `.aiox-core/development/tasks/validate-next-story.md` — Phase 2
- `.aiox-core/development/tasks/dev-develop-story.md` — Phase 3
- `.aiox-core/development/tasks/qa-gate.md` — Phase 4
- `.aiox-core/development/tasks/github-devops-pre-push-quality-gate.md` — Phase 5
- `.aiox-core/development/tasks/po-close-story.md` — Phase 6

## Agent Files (DO NOT MODIFY)

- `.claude/agents/sm.md` — River (Scrum Master)
- `.claude/agents/po.md` — Pax (Product Owner)
- `.claude/agents/dev.md` — Dex (Developer)
- `.claude/agents/qa.md` — Quinn (QA)
- `.claude/agents/devops.md` — Gage (DevOps)

---

## Wave Execution (Parallel Story Development)

O story-cycle suporta execução paralela via `claude -p` (headless) em worktrees pré-criados.

### Como Funciona

Invoque `/story-cycle` → selecione `next-wave` → confirme lançamento.

O skill:
1. Detecta próxima wave disponível (lê WAVE-TRACKER.md)
2. Mostra stories da wave com status
3. Pergunta confirmação e batch (todas ou metade)
4. Executa `bash .claude/skills/story-cycle/scripts/wave-launch.sh -Wave {N}` via Bash tool
5. O script pré-cria worktrees via `git worktree add`
6. Gera runner scripts com `claude -p --dangerously-skip-permissions --mode yolo`
7. Abre `tmux` com panes mostrando output
8. Logs salvos em `logs/wave-{N}/sinkra-{id}.log`
9. Ao finalizar, re-invoca `/story-cycle` para merge

### Comandos

| Comando | Descrição |
|---------|-----------|
| `bash .claude/skills/story-cycle/scripts/wave-launch.sh -Wave {N}` | Lançar wave |
| `bash .claude/skills/story-cycle/scripts/wave-launch.sh -Wave {N} -Batch A` | Só primeira metade |
| `bash .claude/skills/story-cycle/scripts/wave-launch.sh -Wave {N} -DryRun` | Preview |
| `bash .claude/skills/story-cycle/scripts/wave-launch.sh -Wave {N} -Status` | Ver status |
| `bash .claude/skills/story-cycle/scripts/wave-launch.sh -Wave {N} -Clean` | Limpar worktrees |
| `git worktree list` | Listar worktrees ativos |

### Arquitetura Headless

| Aspecto | Detalhe |
|---------|---------|
| Modo Claude | `claude -p` (print/headless, sem TUI) |
| Modelo | `--model sonnet` (mais rápido para execução paralela) |
| Permissões | `--dangerously-skip-permissions` |
| Worktrees | Pré-criados com `git worktree add` |
| Prompt | `/story-cycle epic-{N} --story {id} --mode yolo` |
| Output | Terminal pane + log file via `tee` |
| Env | `unset CLAUDECODE` (evita erro de sessão aninhada) |

### Wave Definitions

| Wave | Stories | Paralelo |
|------|---------|----------|
| 1 | 1.4, 1.5, 7.1 | 3 |
| 2 | 1.6, 1.7, 2.1, 3.1, 7.2, 7.3 | 6 |
| 3 | 2.2, 3.2, 3.4, 7.4 | 4 |
| 4 | 2.3, 3.5, 7.5, 7.6, 7.8 | 5 |
| 5 | 2.4, 2.5, 3.3, 7.7, 7.9 | 5 |
| 6 | 2.6, 3.6, 7.10 | 3 |

### Pré-requisitos

- **macOS/Linux:** terminal com `bash` e `tmux` disponíveis
- **Claude CLI:** `claude` acessível no PATH (suporta `-p` flag)
- **Git:** suporte a `git worktree`

---

Story Development Cycle SKILL.md v3.7
Updated: 2026-03-03 — Added macOS/Linux wave launcher (`.claude/skills/story-cycle/scripts/wave-launch.sh`) and replaced PowerShell-only next-wave commands with bash+tmux flow.
Previous: v3.6 (2026-03-02) — Fix yolo mode: remove simplified phase descriptions that overrode task files. Yolo now follows task files EXACTLY with only worktree-specific overrides. Ensures CodeRabbit, full QA gate, and pre-push quality gate run in yolo mode.
Previous: v3.5 (2026-03-02) — Wave mode via claude -p (headless) + worktrees pre-criados + wave-launch-wt.ps1
Previous: v3.4 (2026-03-02) — Wave mode via terminais reais (100% fidelidade), wave-launch.sh integration
Previous: v3.3 (2026-03-02) — Yolo mode, automated wave orchestration via Task(worktree) (deprecated)
Previous: v3.2 (2026-03-02) — Interactive triage menu (AskUserQuestion), next-wave/epic/story/status modes
Previous: v3.1 (2026-03-02) — Added Wave Execution section (multi-session parallelism)
Previous: v3.0 (2026-03-01) — Stateful orchestrator with main-context agent activation
Based on: story-development-cycle-workflow.md v1.0 + parallel-agent-orchestration research + claude-code-parallel-worktrees research
