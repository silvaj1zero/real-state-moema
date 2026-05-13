---
name: slide-creator
description: "Consulting-grade deck pipeline (briefing → narrative → design → QA → release) with D01/D02/D03 gates and Pyramid/MECE/SCQA/APA validation."
---

# Slide Creator — End-to-End Consulting-Grade Deck Pipeline

Orchestrates the full narrative + design + specification + QA + release pipeline for
consulting-grade decks. Every atom is executed via SINKRA tasks carrying the 8-field
anatomy — the skill never invents behavior; it composes existing tasks into a DAG
gated by D01/D02/D03 and validated against the 7 Princípios Invioláveis.

**Source of truth:** `squads/slides-creator/workflows/generate-presentation.yaml` v2
**Squad:** `squads/slides-creator/` (existing, v8.0.0 + narrative absorption)
**Related skills:** `/sinkra-map-process` (process mapping sibling), `/full-sdc` (story SDC sibling), `/design-system` (conversational design)

## Usage

```
/slide-creator "Presentation title or briefing summary"
/slide-creator "Deck Flash 2026" --brief /path/to/brief.md --mode interactive
/slide-creator "Deck Y" --source /path/to/enterprise_slides/ --yolo
/slide-creator "Deck Z" --skip-narrative     # legacy mode (pre-absorption)
/slide-creator "Deck W" --gate-mode advisory # downgrade D-gates (requires deviation)
```

Flags:
- `--brief <path>` — path to briefing material (PDF/MD/YAML).
- `--source <path>` — path to reference artifacts (prior decks, KBs, style guides).
- `--mode interactive|yolo` — interactive is default; yolo bypasses non-critical confirmations.
- `--skip-narrative` — bypass P01/P02 narrative phases (back-compat with v1.5 workflow).
- `--gate-mode hard|advisory` — D-gates default to hard; advisory requires `deviations.yaml` entry.

## Execution Model — Sequential Phases, Existing Agents

Unlike `/sinkra-map-process` (which spawns specialists per phase), `/slide-creator` reuses
the **6 existing slides-creator agents** sequentially. Each phase invokes a bounded set
of pre-defined tasks on the agent already responsible for that layer.

| Phase | Bounded context | Primary agent(s) | Tasks invoked |
|-------|-----------------|------------------|---------------|
| P00 Intake | briefing | slide-chief | `normalize-briefing` (existing) |
| P01 Narrative | BC-01, BC-04 | content-architect | `distill-governing-thought`, `catalog-sources-apa`, `build-pyramid`, `apply-scqa` |
| P02 Structure | BC-01 | content-architect + qa-inspector | `write-action-titles`, `run-vertical-test` |
| P03 Design | BC-02, BC-05 | template-curator + design-renderer + slide-chief | `classify-slide-type`, `select-chart-type`, `compose-grid-layout`, `register-palette-override`, `resolve-active-palette` |
| P04 Specification | BC-03 | content-architect + design-renderer + visual-scout | existing `create-presentation` steps + `emit-deck-spec` |
| P05 QA | BC-06 | qa-inspector | `validate-pyramid`, `validate-vertical-flow`, `validate-enumeration-universal`, `validate-fontes-apa`, `validate-action-title`, `p1-fidelity-sampling` (optional) |
| P06 Release | BC-07, BC-08 | slide-chief | `emit-deck-spec`, `handoff-render-request` (BC-08 seam) |

**Hard gates** between phases (materialized as YAML artifacts):
- **D01** after P01 — client approves analysis
- **D02** after P02 — vertical test passes AND client approves structure
- **D03** after P03 — client approves design overview
- QA verdict after P05 gates entry into P06

## MANDATORY EXECUTION RULES

1. **Sequential phases** — no cross-phase parallelism.
2. **Task first, agent second** — every capability is invoked by task_id (e.g. `*distill-governing-thought`), never by raw agent prompt. Task carries the 8-field contract.
3. **Session isolation** — SESSION-NARR (content-architect for P01/P02), SESSION-SPEC (design-renderer for P03/P04), SESSION-QA (qa-inspector for P05) MUST be distinct LLM contexts. Enforced by `workflow.global.isolation`.
4. **Hard gates** — D01/D02/D03 are blocking. Status ≠ approved → pipeline halts and waits for approval artifact.
5. **7 Princípios Invioláveis** — P1 data fidelity, P2 obsessive spec, P3 Pyramid, P4 action titles, P5 enumeration, P6 APA citations, P7 10-component AI prompts. Enforced via schema + semantic validators in P05.
6. **No invention** — gaps marked `[VALIDAR COM CLIENTE]` are surfaced, never filled with hallucinated data (P1 enforcement).
7. **Output directory** — `outputs/slides-creator/{deck-slug}/` (per `artifact-classification.md`). `checkpoints/` subdir holds D0X.yaml artifacts.
8. **Back-compat** — `--skip-narrative` skips P01/P02/P03 narrative gates and runs the legacy v1.5 pipeline directly.

---

## Phase 00: Parse Args + Intake (slide-chief, inline)

### 0.1 — Extract Arguments

```
deck_title  = argument[0]             # required
brief_path  = argument[--brief]       # optional
source_path = argument[--source]      # optional (reference decks/KBs)
mode        = argument[--mode]        # interactive (default) | yolo
skip_narr   = argument[--skip-narrative]
gate_mode   = argument[--gate-mode]   # hard (default) | advisory
deck_slug   = kebab-case(deck_title)
output_dir  = outputs/slides-creator/{deck_slug}/
```

### 0.2 — Pre-Flight Checks

- Halt if `deck_title` missing → ask user.
- Halt if `output_dir` exists AND not `--resume` → confirm overwrite/resume.
- Verify `squads/slides-creator/workflows/generate-presentation.yaml` exists and is v2.
- Verify 23 new tasks in `squads/slides-creator/tasks/` (run `ls squads/slides-creator/tasks/ | wc -l`).
- Verify 4 data artifacts present in `squads/slides-creator/data/` (kb-loading-matrix, palette-registry, chart-selection-matrix, checkpoint-schema).
- Verify `data/principios-invioláveis.md` exists.

### 0.3 — Normalize Briefing

Run existing task: `squads/slides-creator/tasks/normalize-briefing.md`.
Consumes `brief_path` + `source_path` → emits `{output_dir}/briefing.normalized.json`.

### 0.4 — Display Plan

```
╔══════════════════════════════════════════════════════════════════════╗
║  Slide Creator — {deck_title}                                        ║
╠══════════════════════════════════════════════════════════════════════╣
║  Slug:         {deck_slug}                                           ║
║  Mode:         {mode}  ·  Gates: {gate_mode}  ·  Skip-narr: {bool}   ║
║  Output Dir:   outputs/slides-creator/{deck_slug}/                   ║
╠══════════════════════════════════════════════════════════════════════╣
║  Pipeline (6 phases + intake):                                       ║
║    P00. Intake              (slide-chief, inline)                    ║
║    P01. Narrative           (content-architect)           [D01 gate] ║
║    P02. Structure           (content-architect + qa)      [D02 gate] ║
║    P03. Design              (template-curator + renderer) [D03 gate] ║
║    P04. Specification       (content-architect + renderer)           ║
║    P05. QA                  (qa-inspector) [P1-P7 validators]        ║
║    P06. Release             (slide-chief) [BC-08 render seam]        ║
╚══════════════════════════════════════════════════════════════════════╝
```

Proceed directly in yolo. Only surface HALT conditions.

---

## Phase 00b: Create Team + Tasks

```
TeamCreate(
  team_name: "slide-creator-{deck_slug}",
  description: "Slide Creator pipeline — {deck_title}"
)
```

### Visual task tracking

```
TaskCreate(title: "P00: Intake", description: "Normalize briefing, resolve references")
TaskCreate(title: "P01: Narrative (BC-01/BC-04) [D01 gate]", description: "Governing thought + sources + pyramid + SCQA")
TaskCreate(title: "P02: Structure (BC-01) [D02 gate]", description: "Action titles + vertical test")
TaskCreate(title: "P03: Design (BC-02/BC-05) [D03 gate]", description: "Slide types + charts + grid + palette")
TaskCreate(title: "P04: Specification (BC-03)", description: "Pixel-perfect slide specs, DeckSpec emission")
TaskCreate(title: "P05: QA (BC-06)", description: "7 Princípios + macro/micro validators")
TaskCreate(title: "P06: Release (BC-07/BC-08)", description: "Package + render handoff")
```

---

## Phase 01: Narrative Analysis — Gate D01

### Spawn content-architect

```
Agent(
  subagent_type: "slides-creator--content-architect",
  name: "content-architect",
  team_name: "slide-creator-{deck_slug}",
  model: "sonnet",
  description: "P01: Narrative analysis",
  prompt: "You are @content-architect executing P01 of /slide-creator.

    FIRST: Read persona squads/slides-creator/agents/content-architect.md
    THEN: Load KB bundle via `load-kb-bundle` worker task (reads
          squads/slides-creator/data/kb-loading-matrix.yaml) for this deck.

    Execute the following SINKRA tasks sequentially, using SESSION-NARR isolation:
      1. squads/slides-creator/tasks/catalog-sources-apa.md
      2. squads/slides-creator/tasks/distill-governing-thought.md
      3. squads/slides-creator/tasks/build-pyramid.md
      4. squads/slides-creator/tasks/apply-scqa.md

    Produce:
      - {output_dir}/sources-apa.yaml         (APA business schema + [VALIDAR COM CLIENTE] gaps)
      - {output_dir}/governing-thought.yaml   (single sentence ≤ 35 words — P4 precursor)
      - {output_dir}/pyramid-tree.yaml        (Minto 3 levels, MECE validated — P3)
      - {output_dir}/scqa-map.yaml            (% allocation: Situation 10-20, Complication 5-10, Question ≤1 slide, Answer 70-80)

    Completion criteria:
      - governing thought is ONE sentence
      - pyramid has ≥3 pillars, MECE check passes
      - scqa_map allocations sum to 100%
      - all extracted data points have source_ref (P1 fidelity)
      - gaps are explicit, not hallucinated (P1 no-invention)

    When done, SendMessage to 'team-lead' with:
      - Status, files produced, MECE verdict, gap count, ready for D01"
)
```

### Gate D01 (hard)

After content-architect reports completion:

1. Generate draft approval artifact at `{output_dir}/checkpoints/D01.yaml` with `status: pending, approver: {client-team-ref}, prompt: "Cliente aprova análise?"`.
2. In `--mode interactive`: use AskUserQuestion to request approval (stand-in for client sign-off) OR pause with message "Aguardando aprovação D01 — cliente deve editar checkpoints/D01.yaml para status: approved".
3. In `--mode yolo` + `--gate-mode advisory`: log deviation, auto-approve, continue.
4. On `approved` → proceed to P02. On `rejected` → HALT, surface reviewer notes, allow re-dispatch of content-architect with feedback.

TaskUpdate(P01, completed) on approved.

---

## Phase 02: Narrative Structure — Gate D02

### Reuse content-architect + invoke qa-inspector for vertical test

```
SendMessage(
  to: "content-architect",
  summary: "P02: Action titles + vertical test (SESSION-NARR)",
  message: "Execute squads/slides-creator/tasks/write-action-titles.md.

    Input: pyramid-tree.yaml + scqa-map.yaml + governing-thought.yaml
    Output: updated {output_dir}/deck-manifest.json (add slide_type + action_title + slide sequence).

    P4 compliance: every action_title must match regex {what happened}+{magnitude}+{implication}.
    Use cross-instance QA: after titles emitted, spawn qa-inspector in SESSION-QA to run
    squads/slides-creator/tasks/run-vertical-test.md against titles-only projection."
)
```

Then spawn `qa-inspector` for `run-vertical-test` in SESSION-QA (distinct from content-architect's SESSION-NARR):

```
Agent(
  subagent_type: "slides-creator--qa-inspector",
  name: "qa-inspector",
  team_name: "slide-creator-{deck_slug}",
  model: "sonnet",
  description: "P02 vertical test (SESSION-QA)",
  prompt: "Execute squads/slides-creator/tasks/run-vertical-test.md.

    Input: {output_dir}/deck-manifest.json (slide[].action_title)
    Output: {output_dir}/vertical-test-result.yaml (verdict PASS|REVIEW|FAIL + rationale)

    Judgement: can a reader understand the full narrative in 2 minutes by reading only
    the action titles in order? If yes → PASS.

    When done, SendMessage to 'team-lead' with verdict + rationale."
)
```

### Gate D02 (hard)

Requires BOTH vertical test PASS AND client approval at `{output_dir}/checkpoints/D02.yaml`.
Same enforcement protocol as D01.

---

## Phase 03: Design — Gate D03

### Invoke template-curator + design-renderer + slide-chief sequentially

1. **template-curator** (SESSION-SPEC): `classify-slide-type` + `select-chart-type`
   → emits `{output_dir}/design-overview.md` (per-slide type + chart assignments)
2. **design-renderer** (SESSION-SPEC): `compose-grid-layout` + `resolve-active-palette`
   → emits `{output_dir}/grid-layouts.yaml` + `{output_dir}/active-palette.yaml`
3. **slide-chief** (Human executor): `register-palette-override` ONLY IF brand override detected
   → writes entry into `squads/slides-creator/data/palette-registry.yaml` (overrides[])

Each agent invocation uses the Agent() pattern from P01, referencing the task file explicitly.

### Gate D03 (hard)

Client approves `design-overview.md` → `{output_dir}/checkpoints/D03.yaml` status: approved → proceed.

---

## Phase 04: Detailed Specification

### Reuse design-renderer (SESSION-SPEC) + visual-scout

Execute existing task `squads/slides-creator/tasks/create-presentation.md` steps for per-slide
detailed spec (10-component contract: metadata, action title, layout, visuals, callouts,
footer/sources, AI prompts, speaker notes, QA checklist, enumeration).

Per-slide validators run inline (P2/P4/P5/P7 schema checks on each SlideSpec).

Emit `{output_dir}/deck-spec.yaml` via task `emit-deck-spec` (canonical DeckSpec contract —
aka the machine-readable handoff).

**No human gate** — per-slide QA is automated (micro checklist). Macro QA runs in P05.

---

## Phase 05: Quality Assurance

### Spawn qa-inspector (SESSION-QA, fresh instance)

```
Agent(
  subagent_type: "slides-creator--qa-inspector",
  name: "qa-inspector-final",
  team_name: "slide-creator-{deck_slug}",
  model: "sonnet",
  description: "P05 QA macro validators",
  prompt: "You are @qa-inspector executing P05 QA of /slide-creator in SESSION-QA.

    Execute sequentially (all against {output_dir}/deck-spec.yaml):
      1. squads/slides-creator/tasks/validate-pyramid.md             (P3)
      2. squads/slides-creator/tasks/validate-vertical-flow.md       (P3/P4)
      3. squads/slides-creator/tasks/validate-enumeration-universal.md (P5)
      4. squads/slides-creator/tasks/validate-fontes-apa.md          (P6)
      5. squads/slides-creator/tasks/validate-action-title.md        (P4)
      6. (optional, flag ENABLE_P1_SAMPLING) squads/slides-creator/tasks/p1-fidelity-sampling.md (P1)

    Plus the existing PPTEval macro review via squads/slides-creator/tasks/review-presentation.md.

    Emit {output_dir}/qa-report.json v2 with narrative_dim scores (0-10) in addition to
    the existing PPTEval dimensions (Design, Content, Coherence, GAD).

    Verdict = PASS|REVIEW|FAIL.

    When done, SendMessage to 'team-lead' with verdict + killer items list + narrative_dim."
)
```

### QA Gate

- PASS → proceed to P06.
- REVIEW → surface to user; allow manual ack + deviation OR re-dispatch to upstream phase.
- FAIL → HALT. Return to the phase responsible for the failing dimension (narrative → P01/P02; design → P03; spec → P04).

---

## Phase 06: Release — BC-07 packaging + BC-08 render handoff

### Reuse slide-chief

```
Agent(
  subagent_type: "slides-creator--slide-chief",
  name: "slide-chief",
  team_name: "slide-creator-{deck_slug}",
  model: "sonnet",
  description: "P06 Release",
  prompt: "Execute sequentially:
    1. squads/slides-creator/tasks/emit-deck-spec.md        — final DeckSpec YAML (canonical)
    2. Existing task create-presentation.md (packaging steps) — 5 markdown deliverables
       (Slide_Specifications.md, Design_System.md, References_Bibliography.md, AI_Image_Prompts.md, Version_History.md)
    3. squads/slides-creator/tasks/handoff-render-request.md — emit render-request.yaml (BC-08 seam)

    Output directory: {output_dir}/deliverables/
    BC-08 contract: if apps/ds runtime is available, handoff to design-renderer for TSX materialization;
    otherwise stop at handoff_only state (render-request.yaml written, not consumed).

    When done, SendMessage to 'team-lead' with deliverables list + render_state."
)
```

TaskUpdate(P06, completed). Proceed to Shutdown.

---

## Phase 07: Shutdown + Summary

### Shutdown spawned teammates

```
For each spawned agent (content-architect, qa-inspector, qa-inspector-final, template-curator,
                       design-renderer, slide-chief, any others):
  SendMessage(to: agent, message: {type: "shutdown_request", reason: "Pipeline complete"})
TeamDelete()
```

### Display Final Summary

```
╔══════════════════════════════════════════════════════════════════════╗
║  /slide-creator complete — {deck_title}                              ║
╠══════════════════════════════════════════════════════════════════════╣
║  P00 Intake          ✅  briefing normalized                         ║
║  P01 Narrative       ✅  D01: approved   ({gov-thought excerpt})     ║
║  P02 Structure       ✅  D02: approved   (vertical test: PASS)       ║
║  P03 Design          ✅  D03: approved   (palette: {canonical|override}) ║
║  P04 Specification   ✅  {N} slides, 10-component spec                ║
║  P05 QA              ✅  narrative_dim: {score}/10, PPTEval: {score} ║
║  P06 Release         ✅  deliverables: 5 .md + 1 deck-spec.yaml      ║
║                          render_state: {materialized|handoff_only}   ║
╠══════════════════════════════════════════════════════════════════════╣
║  Output: outputs/slides-creator/{deck-slug}/                         ║
║  Princípios enforced: P1-P7 (all validators PASS)                    ║
║  Next step: review deliverables + optional downstream render         ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## Error Handling

### HALT Conditions

| Condition | Phase | Action |
|-----------|-------|--------|
| Missing `deck_title` | P00 | HALT — ask user |
| Output dir conflict | P00 | HALT — ask resume/overwrite |
| Missing 23 tasks | P00 | HALT — advise user to ship EPIC-SC-NARR first |
| D01/D02/D03 rejected | P01/P02/P03 | HALT — re-dispatch upstream agent with reviewer feedback |
| Vertical test FAIL | P02 | REVIEW — user decides: iterate P01 or relax D02 (deviation) |
| QA FAIL with narrative_dim < 7 | P05 | HALT — return to P01/P02 |
| QA FAIL with design_dim < 7 | P05 | HALT — return to P03/P04 |
| apps/ds runtime missing | P06 | WARN — emit render-request.yaml anyway, mark render_state=handoff_only |

### Recovery

On any HALT:
1. Tasks show partial progress.
2. Team stays alive — user can SendMessage any agent directly.
3. User resolves → SendMessage team-lead → pipeline resumes.
4. User aborts → graceful shutdown of all agents + TeamDelete.

---

## Agent Persistence Map

```
P00:  [slide-chief inline] ──────── [reused P06]
P01:  [content-architect spawned] ── [reused P02] ──── shutdown after P02
P02:  [qa-inspector for vertical test spawned] ─── shutdown after P02
P03:  [template-curator spawned] ─── shutdown after P03
      [design-renderer spawned] ──── [reused P04] ─── shutdown after P04
      [slide-chief for override] ─── inline (Human task)
P04:  [visual-scout spawned IF image generation needed] ─── shutdown
P05:  [qa-inspector-final spawned fresh] ─── shutdown after P05
P06:  [slide-chief spawned] ──────── shutdown after P06
```

Cross-session isolation: content-architect runs in SESSION-NARR context; design-renderer
runs in SESSION-SPEC; qa-inspector runs in SESSION-QA. No context shared across sessions.
qa-inspector-final (P05) is a FRESH instance to avoid self-validation blindspot on work
done by SESSION-SPEC agents.

---

## Output Artifacts (canonical)

All under `outputs/slides-creator/{deck-slug}/`:

| Phase | Artifact |
|-------|----------|
| P00 | briefing.normalized.json |
| P01 | sources-apa.yaml, governing-thought.yaml, pyramid-tree.yaml, scqa-map.yaml, checkpoints/D01.yaml |
| P02 | deck-manifest.json v2 (partial — action_titles), vertical-test-result.yaml, checkpoints/D02.yaml |
| P03 | design-overview.md, grid-layouts.yaml, active-palette.yaml, checkpoints/D03.yaml |
| P04 | deck-manifest.json v2 (full), deck-spec.yaml (canonical), per-slide spec blocks |
| P05 | qa-report.json v2 (incl. narrative_dim), validator-reports/*.yaml |
| P06 | deliverables/Slide_Specifications.md + Design_System.md + References_Bibliography.md + AI_Image_Prompts.md + Version_History.md, render-request.yaml |

Path convention per `.claude/rules/artifact-classification.md` (outputs = transitional squad outputs).

---

## Comparison with Sibling Skills

| Skill | Purpose | Relation |
|-------|---------|----------|
| `/slide-creator` (this) | End-to-end deck creation with narrative discipline | Entry point |
| `/sinkra-map-process` | Maps a process into a SINKRA squad | Upstream — produced this skill's foundation |
| `/full-sdc` | Story development cycle (validate → develop → review → deploy → close) | Sibling pattern — sequential agent pipeline |
| `/design-system` | Conversational design assistant | Adjacent — P03 design phase may delegate palette discussion here |
| `/slides-chief` (legacy) | Pre-absorption slides orchestrator | **Deprecated** — `/slide-creator` replaces it. 1-release deprecation alias with warning |

---

## Blocking Conditions

HALT and surface to user when:

1. **Workflow source missing** — `squads/slides-creator/workflows/generate-presentation.yaml` v2 not found.
2. **Task file(s) missing** — any of the 23 new tasks absent → advise user to ship EPIC-SC-NARR first.
3. **Data artifact missing** — any of kb-loading-matrix.yaml / palette-registry.yaml / chart-selection-matrix.yaml / checkpoint-schema.yaml absent.
4. **D-gate rejected after 3 retries** — escalate to user.
5. **QA FAIL loop after 2 refinement cycles** — escalate.

---

## Post-Execution Learning (MANDATORY)

Use `templates/post-execution-learning.md` for the required learning log path and YAML schema.

---

*slide-creator v1.0 — end-to-end consulting-grade deck pipeline.*
*Pattern parity: `.agents/skills/sinkra-map-process/SKILL.md` and `.agents/skills/full-sdc/SKILL.md`.*
*Source of truth: `squads/slides-creator/workflows/generate-presentation.yaml` v2 + 23 tasks in `squads/slides-creator/tasks/`.*
*ADR: docs/adrs/ADR-021-absorb-narrative-discipline-into-slides-creator.md (pending).*
