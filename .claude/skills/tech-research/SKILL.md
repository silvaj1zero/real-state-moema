---
name: tech-research
description: "Deep technical research pipeline (7 molecules, 11 atoms) with multi-wave search, coverage scoring, multi-LLM cross-reference, citation verification, and incremental learning log. Phase 3 routes academic queries to scholarly databases (arXiv, PubMed, Semantic Scholar via research-adapters) before generic WebSearch. Produces evidence-graded research dossiers under docs/research/. Optional product-discovery mode feeds the research-chief validate-product-idea molecule."
version: "2.0.0"
user-invocable: true
argument-hint: "<query> [--product-discovery|--pd] [--deep] [--yolo|--interactive]"
depends_on: []
invokes: ["/research-chief"]
---

# Tech Research — SINKRA-Native Deep Research Pipeline v2.0.0

Orchestrates the complete tech-research EXPLORAR-mode pipeline from Auto-Clarify through
Document using **inline persona-fidelity** (each phase loads a persona + workflow YAML
and executes in main context). Visual task tracking via TeamCreate + TaskCreate.
Checkpoint gates (COVERAGE_GATE, CITATION_GATE) are real — VETO halts, REVIEW requires
explicit caveat documentation.

Source of truth: `squads/research/workflows/tech-research/tech-research-pipeline.yaml`
Pattern: aligned with `/sinkra-map-process`, `/sinkra-validate-squad`, `/full-sdc`.

## Usage

```
/tech-research "como melhorar performance de queries SQL"
/tech-research "comparar Postgres vs MySQL vs MongoDB" --deep
/tech-research "validar ideia: plataforma de PromptOps empresarial" --product-discovery
/tech-research "validar JTBD para meeting AI" --pd
/tech-research "follow-up: como o pgvector se compara com pinecone" --yolo
```

### Product Discovery Mode

When `--product-discovery` (alias `--pd`) is set, OR auto-clarify detects the
`product_validation` pattern (JTBD, Mom Test, smoke test, MVP keywords), Phase 1.5
decomposition uses **product-validation sub-queries** (JTBD framing + Villain OSINT +
WTP signals + blue ocean + validation case studies). Output dossier feeds the
`/research-chief` validate-product-idea molecule (Wave 0). See
`squads/research/data/product-discovery-framework.md`.

Cross-link: this skill is the **research helper**; the spy molecule is the
**decision engine** (GO/NO-GO gates).

---

## Execution Model — Inline Persona-Fidelity + Visual Tracking

This skill does **NOT** spawn specialist subagents per phase (unlike `/sinkra-map-process`
which spawns `@process-discoverer`, `@architecture-designer`, etc.). Instead, each phase
loads:

1. The corresponding **workflow YAML** (`workflows/phase-*.yaml`) for protocol
2. The corresponding **prompt** (`prompts/*.md`) when present
3. The **persona name** declared in `workflows/tech-research-pipeline.yaml`

and executes inline in main context with persona fidelity. `TeamCreate` is used for
**visual progress tracking only** (the team has a single team-lead participant).

### Why inline (not spawn)?

The research personas (decomposer, executor, evaluator, synthesizer, citation-verifier,
documenter) are **roles**, not full SINKRA agents. Each is ~5-10 specific behaviors
loaded from the corresponding workflow file. Spawning subagents per phase would:
- Pay context-cold cost 7+ times (high token waste)
- Require 6+ new files in `squads/{owner}/agents/`
- Add coordination overhead with zero specialization gain

The full-spawn pattern is reserved for skills where each phase has truly distinct
expert protocols (e.g. `sinkra-map-process` spawns 7 specialists across 60-120 minutes).
tech-research's 7 molecules complete in ~5-15 minutes inline.

### When inline fallback applies (from sinkra-map-process)

N/A here — inline IS the canonical execution. No fallback needed.

---

## NON-NEGOTIABLE RULES (read BEFORE any phase)

**RULE 1: Guardrails first.** Phase 00 MUST `Read("squads/research/checklists/tech-research/guardrails.yaml")` and confirm `veto_conditions`, `constraints`, `implementation_redirect`, `security`, `scope_boundaries` are loaded. Apply vetoes immediately. Skipping guardrails = INADMISSIBLE.

**RULE 2: Checkpoints are absolute.** `COVERAGE_GATE` VETO (coverage<50 after 3 waves) halts. `CITATION_GATE` VETO (verified_ratio<0.85 after 2 fix attempts) halts. REVIEW requires explicit caveat documentation in the final report. No override.

**RULE 3: Incremental learning log.** Write `.aiox/learning/logs/tech-research/{slug}-{timestamp}.yaml` at Phase 00c with all phases as `status: pending`, update on EVERY phase start (in_progress) AND completion (completed/halted/failed). Post-hoc single-write at end is forbidden — see `.claude/rules/incremental-learning-log.md`.

**RULE 4: Prior-art before absence.** Any claim of "this technology does not exist", "no library does X", "no benchmark available" requires documented WebSearch/grep with verdict. See `.claude/rules/prior-art-search.md`. Findings without evidence = REVIEW caveat.

**RULE 5: NO implementation.** Recommendations are research outputs, not production code. If the user request is "implement X" → redirect to `@aiox-pm` or `@aiox-dev`. Writing code/agents/skills/deploy artifacts = VETO. See `checklists/guardrails.yaml#implementation_redirect`.

**RULE 6: Outputs only under `docs/research/{date}-{slug}/`.** Plus the learning log under `.aiox/learning/logs/tech-research/`. Writing anywhere else = VETO.

**RULE 7: Follow-up reuses existing folder.** When the request continues an existing topic (mentions previous findings, uses terms like `mais sobre`, `continue`, `aprofunde`, `também`, technology names from active folder) → reuse the same `docs/research/{date}-{slug}/` folder and resolve next file number via `scripts/next_followup_number.py {output_dir}` before writing `04-*`, `05-*`, etc. Do NOT create a new folder.

**RULE 8: No partial reads of workflow files.** If you cannot load a phase YAML fully, HALT with `Missing tech-research operational file: {path}`. Partial reads corrupt phase contracts.

**RULE 9: Sequential by default; waves are bounded.** Phases run sequentially. Phase 3 search waves bounded at `max_waves: 3`. Wave 2+ MUST read `evolving_report.md` + `wave-*-summary.md` instead of carrying all raw results forward. Citation Gate fix loop bounded at 2 attempts.

**RULE 10: CLI next-command suggestion.** At completion (not on VETO/halt), suggest the next logical command per `.claude/rules/cli-next-command-flow.md`. Skip if `--yolo` was passed.

---

## WHEN CALLED BY ANOTHER SKILL

This skill is invoked by:

- **`/research-chief`** — `validate-product-idea` Wave 0 (atoms 3 Villain + 4 WTP)
- **`/skill-creator`** — optional prior-art evidence before scaffolding
- **`/aiox-architect`** — optional research-before-decision
- **`/research-bench`** — multi-player benchmarks (codebase/llm/product/company/technology). When query implies multi-player comparison or absorption analysis, **redirect to `/research-bench`** instead of executing in research-mode. Bench produces `docs/bench/{date}-{slug}/`, not `docs/research/{date}-{slug}/`.

The pipeline MUST execute identically when called from another skill — full 7 molecules,
both checkpoints, incremental learning log. Do NOT "simplify" or "estimate" because
you are inside another skill's context. The 7 molecules take ~5-15 minutes inline.
There is no faster alternative.

**Caller receives:**
- Path to `docs/research/{date}-{slug}/` directory (all atoms inside)
- `README.md` (TL;DR + index)
- `quick-wins.md` (≥3 items with hub targets) OR documented gap block
- Learning log path: `.aiox/learning/logs/tech-research/{slug}-{timestamp}.yaml`
- COVERAGE_GATE + CITATION_GATE verdicts (APPROVE is required for caller to proceed)

## Bench-Mode Redirect (Auto-Detection)

When `/tech-research` is invoked with a query that pattern-matches `compare X vs Y vs Z`, `X vs Y`, `top open-source projects for X`, `landscape of X`, `absorption analysis`, or similar **multi-subject comparison**, Auto-Clarify (Phase M1 / P0) MUST:

1. Tag `comparison_pattern: multi_player` in inferred_context
2. Emit suggestion to user: "Esta query parece ser multi-player comparison. Recomendação: redirecionar para `/research-bench` que produz `docs/bench/{date}-{slug}/` com Gold contract (16 YAMLs + microdim matrix + N-choose-2 duels)."
3. If user confirms → HALT tech-research, escalate to `/research-bench`
4. If user wants single-topic deep research anyway (e.g. "deep dive on X" not "compare X with Y") → continue tech-research normally

This prevents the failure mode observed 2026-05-18 where research-mode and bench-mode artifacts were mixed.

See `.claude/rules/research-bench-gold.md` Rule 10 for unified extractor mode.

---

## Phase 00: Parse Args + Initialize (team-lead, inline)

### 0.1 — Capture Start Time + Extract Arguments

```
start_epoch = Bash("date +%s")   # used for elapsed_minutes in learning log

query                = arguments[0]                    # required
product_discovery    = arg has --product-discovery | --pd
deep_mode            = arg has --deep
mode                 = "yolo" if --yolo else "interactive"   # default: interactive
slug                 = kebab-case(query[:60])
date                 = Bash("date +%Y-%m-%d")
output_dir           = docs/research/{date}-{slug}/
learning_log_dir     = .aiox/learning/logs/tech-research/
learning_log_path    = {learning_log_dir}/{slug}-{Bash('date +%Y%m%d-%H%M%S')}.yaml
```

### 0.2 — Pre-Flight Guardrails (RULE 1)

```
Read("squads/research/checklists/tech-research/guardrails.yaml")
Verify sections present: veto_conditions, constraints, implementation_redirect, security, scope_boundaries
Apply vetoes immediately:
  - request is "implement X" → REDIRECT to @aiox-pm or @aiox-dev, HALT
  - write outside docs/research/** → BLOCK
  - no results expected (impossible query) → HALT with explicit no-result message
```

### 0.3 — Follow-Up Detection (RULE 7)

```
existing_folders = Bash("ls docs/research/ 2>/dev/null | grep -E '^[0-9]{4}-[0-9]{2}-[0-9]{2}-.+'")
IF query mentions "continue|mais sobre|aprofunde|follow-up|também|e sobre" OR
   query references a slug from existing_folders OR
   query references technology name from a recent active folder:
   → mode = "follow_up"
   → output_dir = existing folder (most recent matching)
   → next_followup_num = Bash("python squads/research/scripts/tech-research/next_followup_number.py {output_dir}")
ELSE:
   → mode = "new_research"
   → Bash("mkdir -p {output_dir}")
```

### 0.4 — Display Banner

```
╔══════════════════════════════════════════════════════════╗
║  /tech-research — {query[:50]}                            ║
╠══════════════════════════════════════════════════════════╣
║  Slug:           {slug}                                   ║
║  Mode:           {new_research|follow_up}                 ║
║  Product Disc.:  {yes|no}                                 ║
║  Deep:           {yes|no}                                 ║
║  Interactive:    {yes|no}                                 ║
║  Output Dir:     docs/research/{date}-{slug}/             ║
║  Learning Log:   {learning_log_path}                      ║
╠══════════════════════════════════════════════════════════╣
║  Pipeline (7 molecules, 11 atoms):                        ║
║    P00. Parse + Init (team-lead)                          ║
║    P00b. TeamCreate + TaskCreate                          ║
║    P00c. Init Incremental Learning Log                    ║
║    M1 P0.     Auto-infer context (SEED)                   ║
║    M1 P1.     Strategic Brief Builder (always)            ║
║    M2 P1.5.   Decompose (2-3 per SCOPE angle, 5-18)       ║
║    M3 P2.     Generate Deep Research Prompt               ║
║    M4 P3-3.7. Execute Research (waves+evaluate+compress)  ║
║               [COVERAGE_GATE @ P3.5]                      ║
║    M5 P4.     Synthesize + Extract Quick Wins             ║
║    M6 P4.5.   Verify Citations [CITATION_GATE]            ║
║    M7 P5.     Document final artifacts                    ║
║    P5b. Finalize Log + Suggest Next Command               ║
╚══════════════════════════════════════════════════════════╝
```

Proceed directly. Only HALT conditions (guardrail veto, missing query, VETO without resolution) surface to user before P00b.

---

## Phase 00b: Create Team + Tasks (visual tracking)

```
TeamCreate(
  team_name: "trr-{slug}",
  description: "Tech Research — {query[:60]}"
)

TaskCreate(title: "P00c: Initialize Learning Log")
TaskCreate(title: "M1: Auto-Clarify")
TaskCreate(title: "M2: Decompose (2-3 per SCOPE angle, 5-18)")
TaskCreate(title: "M3: Generate Deep Research Prompt")
TaskCreate(title: "M4: Execute Research (waves + evaluate) [COVERAGE_GATE]")
TaskCreate(title: "M5: Synthesize + Quick Wins")
TaskCreate(title: "M6: Verify Citations [CITATION_GATE]")
TaskCreate(title: "M7: Document final artifacts")
TaskCreate(title: "P5b: Finalize Log + Suggest Next Command")
```

`TaskUpdate(in_progress)` on phase entry, `TaskUpdate(completed)` on phase exit.

---

## Phase 00c: Initialize Incremental Learning Log (RULE 3)

Write the log file BEFORE any research action. Pre-populate phase registry with all
phases as `status: pending`. This is the **provenance contract** — if the pipeline
crashes mid-way, the log preserves what was attempted.

```yaml
# Write to: .aiox/learning/logs/tech-research/{slug}-{timestamp}.yaml
schema_version: "1.0"
skill_id: "tech-research"
run_id: "{slug}-{YYYYMMDD-HHmmss}"
timestamp_started: "{ISO-8601 now}"
timestamp_updated: "{ISO-8601 now}"
timestamp_completed: null
outcome: in_progress

inputs:
  query: "{query}"
  product_discovery: {bool}
  deep_mode: {bool}
  follow_up: {bool}
  output_dir: "{output_dir}"

phases:
  p00_init:                { status: completed, started_at: "{start}", completed_at: "{now}" }
  p00b_team:               { status: completed }
  p00c_log_init:           { status: in_progress, started_at: "{now}" }
  p0_auto_clarify:         { status: pending }
  p1_strategic_brief:      { status: pending }
  p15_decompose:           { status: pending }
  p2_generate_prompt:      { status: pending }
  p3_execute_research:     { status: pending, waves: [] }
  p35_evaluate_coverage:   { status: pending, checkpoint: COVERAGE_GATE }
  p36_compress_wave:       { status: pending }
  p37_multi_llm:           { status: pending, conditional: true }
  p4_synthesize:           { status: pending }
  p45_verify_citations:    { status: pending, checkpoint: CITATION_GATE }
  p5_document:             { status: pending }
  p5b_finalize:            { status: pending }

artifacts:
  required: []   # populated as files are written
  optional: []
```

After write: `TaskUpdate(p00c_log_init, completed)` and update log:
`phases.p00c_log_init.status = completed`.

**Write protocol (per RULE 3):** Each phase transition does a FULL-FILE overwrite of
the YAML (no append, no diff). Update `timestamp_updated` on every write. Persist on
halt/error.

---

## Phase M1 / P0: Auto-Clarify (research-decomposer inline)

**TaskUpdate(M1, in_progress)** → **learning log: `p0_auto_clarify.status = in_progress`**

### Load

```
Read("squads/research/data/tech-research/auto-clarification.yaml")
Read("squads/research/workflows/tech-research/phase-0-auto-clarify.yaml")
```

Confirm marker: `LOADED: workflows/phase-0-auto-clarify.yaml ({line_count} lines)`

### Persona — Research Decomposer

You infer context to SEED the brief. Detect:
- **research focus**: technical | comparison | general
- **temporal intent**: recent/current vs evergreen
- **technology/domain**: match aliases from `data/auto-clarification.yaml`
- **product-validation pattern**: JTBD, Mom Test, smoke test, MVP keywords → set `product_discovery=true`

### Execute

Follow `phase-0-auto-clarify.yaml` protocol. There is **no skip gate** — strong
inference only pre-fills more of the brief; it never bypasses Phase P1.

### Outputs

- `inferred_context`: {focus, technology, temporal_intent, product_validation} — **SEED** for P1

### Transitions

- ALWAYS → Phase P1 (Strategic Brief Builder)

**TaskUpdate(M1, completed)** → **learning log: `p0_auto_clarify.status = completed`**, add `inferred_context` summary.

---

## Phase P1: Strategic Brief Builder (ALWAYS runs)

**Learning log: `p1_strategic_brief.status = in_progress`**

### Load

```
Read("squads/research/workflows/tech-research/phase-1-clarify.yaml")
Read("squads/research/data/tech-research/auto-clarification.yaml")  # strategic_brief_builder
```

### Persona — Research-Prompt Strategist

You convert a simple question into a strategic Deep Research brief. **Expand the
scope, never narrow it.** Bias toward actionable insight over generic summary.

### Execute

Apply `strategic_brief_builder` from `auto-clarification.yaml`:

0. **Read `few_shot_examples.cases` first — they are DEPTH ANCHORS.** Match
   that level of strategic reframing: turn the naive question into a research
   *territory*, expand scope, add a time horizon, make SCOPE angles specific.
   A skeletal brief that just restates the query is a FAIL.
1. Use `inferred_context` (SEED) per `seed_usage` to pre-fill the brief.
2. Fill the `template`: **TOPIC** (strategic title + time horizon) → **CONTEXT**
   (purpose, why now) → **SCOPE** (4-6 angles: trends/cases, quant data,
   implementable, risks, comparison) → **REQUIREMENTS** (3-4 params) →
   **RECOMMENDED SOURCES** (3-4 source types) → **EXPECTED OUTCOMES** (3-5 deliverables).
3. **Emit the brief inside ONE fenced code block** — copy-pasteable to an
   external Deep Research tool AND consumed by P1.5 Decompose.
4. **Emit 2-3 clarifying questions AFTER and OUTSIDE the code block.** They are
   skippable — the brief stands alone.
5. Language: the BRIEF (incl. section headers) is **ALWAYS ENGLISH** (pasted
   into Deep Research, drives English search). The CLARIFYING QUESTIONS use the
   operator language (PT-BR default for AIOX operators).
6. If `product_discovery=true`, reshape the brief around JTBD / villain OSINT /
   WTP / blue ocean / validation case studies.

### Outputs

- `strategic_brief`: structured brief (in a code block)
- `clarifying_questions`: 2-3 questions (outside the block)

### Transitions

- ALWAYS → Phase P1.5 (Decompose), consuming `strategic_brief`. If the user
  answers the clarifying questions, fold the answers into the brief first.

**Learning log: `p1_strategic_brief.status = completed`**, record brief topic.

---

## Phase M2 / P1.5: Decompose Query (research-decomposer inline)

**TaskUpdate(M2, in_progress)** → **learning log: `p15_decompose.status = in_progress`**

### Load

```
Read("squads/research/workflows/tech-research/phase-1-5-decompose.yaml")
Read("squads/research/prompts/tech-research/decompose.md")
```

### Persona — Research Decomposer

Decompose the **strategic_brief** (from P1). Generate **2-3 orthogonal
sub-queries per SCOPE angle** (and its sub-bullets) — do NOT collapse a rich
brief into 5-7. Floor 5, ceiling 18 (M4 runs one search wave per sub-query —
cost is linear). Honor REQUIREMENTS as search constraints. Coverage MUST include:
- every SCOPE angle of the brief (≥2 sub-queries each)
- definitions/fundamentals + implementation + tradeoffs/comparison + real-world
- at least one devil's-advocate query
- at least one expert-level query

**If `product_discovery=true`:** use product-validation decomposition instead:
- JTBD framing
- Villain OSINT (3 competitors min)
- WTP signals (willingness-to-pay evidence)
- Blue ocean angle
- Validation case studies (Mom Test interviews, smoke tests)

Skip only for tiny follow-ups where a single targeted query is clearly enough.

### Outputs

- `decomposition_result`: N sub-queries with rationale (N = 2-3 per SCOPE angle, 5-18; PD mode 5-7)

**TaskUpdate(M2, completed)** → **learning log: `p15_decompose.status = completed`**, add sub-query count.

---

## Phase M3 / P2: Generate Deep Research Prompt (research-prompter inline)

**TaskUpdate(M3, in_progress)** → **learning log: `p2_generate_prompt.status = in_progress`**

### Load

```
Read("squads/research/workflows/tech-research/phase-2-generate-prompt.yaml")
Read("squads/research/templates/tech-research/deep-research-prompt-template.md")
```

### Persona — Research Prompter

Combine into the prompt template:
- original query
- strategic_brief (from P1) + any clarifying-question answers
- decomposition result
- temporal freshness requirements (if detected)
- explicit output expectations

### Output

- Write `docs/research/{date}-{slug}/01-deep-research-prompt.md` (atom: `research-prompt`)

**TaskUpdate(M3, completed)** → **learning log: `p2_generate_prompt.status = completed`**, record artifact path.

---

## Phase M4 / P3-P3.7: Execute Research (research-executor + coverage-evaluator inline)

**TaskUpdate(M4, in_progress)** → **learning log: `p3_execute_research.status = in_progress`**

The Execute Research molecule contains a wave loop with up to 3 iterations,
gated by COVERAGE_GATE at the end of each wave.

### Wave Loop Structure

```
FOR wave_num in [1, 2, 3]:
  P3:    Execute search (research-executor)
  P3.2:  Deep-read top sources (research-executor, conditional)
  P3.5:  Evaluate coverage [COVERAGE_GATE] (coverage-evaluator)
  P3.6:  Compress wave (coverage-evaluator)
  IF stop_decision OR wave_num == 3: break
```

### Phase P3 — Execute Search (per wave)

#### Load

```
Read("squads/research/workflows/tech-research/phase-3-execute-research.yaml")
Read("squads/research/data/tech-research/dependencies.yaml")
Read("squads/research/prompts/tech-research/tool-strategy.md")
Read("squads/research/prompts/tech-research/executor-matrix.md")
```

#### Persona — Research Executor

- Check Context7 and Exa availability before depending on them
- Use official docs first when a library/framework is detected (Context7)
- Use Exa for high-quality neural search when available
- Use WebSearch fallback when MCPs fail
- Use `scripts/url_detector.py` before routing special content (PDF, YouTube, arXiv)
- Execute sub-queries in main context by default
- Write `wave-{N}-progress.jsonl` after each sub-query result set (timeout recovery)

Carry forward source URLs, titles, snippets, tool used, credibility, extraction stats.

#### Output

- `wave-{N}-progress.jsonl`
- `search_results` (carried in context to P3.2/P3.5)

### Phase P3.2 — Deep Read (conditional, supplemental)

When snippets are insufficient for credibility/decision:

#### Load

```
Read("squads/research/workflows/tech-research/phase-3-2-deep-read.yaml")
Read("squads/research/prompts/tech-research/page-extract.md")
```

#### Execution

Use ETL first (YouTube transcript / PDF / blog fetch via `services/etl`), WebFetch fallback. Select top sources by credibility × relevance × density. Do NOT deep-read low-quality sources to fill quota.

### Phase P3.5 — Evaluate Coverage [COVERAGE_GATE]

#### Load

```
Read("squads/research/workflows/tech-research/phase-3-5-evaluate-coverage.yaml")
Read("squads/research/prompts/tech-research/evaluate.md")
```

#### Persona — Coverage Evaluator

Use `scripts/coverage_calculator.py` and `scripts/credibility_scorer.py` when available. Calculate:
- coverage_score (0-100)
- coverage_breakdown per sub-query
- source_quality (mean credibility)
- new_information_ratio (vs previous wave)
- remaining_gaps
- decision: `stop | continue | escalate-multi-llm`

#### COVERAGE_GATE Verdict

| coverage_score | wave_num | Verdict | Action |
|---|---|---|---|
| ≥ 70 | any | **APPROVE** | Stop search loop, proceed to P3.7 if `--deep` else P4 |
| 50-69 | < 3 | **REVIEW** | Continue to next wave |
| 50-69 | == 3 | **REVIEW** | Trigger P3.7 (multi-LLM escape valve) |
| < 50 | == 3 | **VETO** | HALT — escalate to user. Learning log: `outcome=halted`, reason=coverage_veto |

REVIEW band requires documenting the coverage caveat in the final report.

### Phase P3.6 — Compress Wave

#### Load

```
Read("squads/research/workflows/tech-research/phase-3-6-compress-wave.yaml")
```

#### Execution

Write `wave-{N}-summary.md`:
- coverage_score + decision
- key findings with source citations
- best source list
- remaining gaps

Update `evolving_report.md` cumulatively.

**Wave summaries are the memory bridge.** Wave 2+ MUST read summaries instead of carrying all raw data forward.

**Learning log per wave:** Append to `p3_execute_research.waves[]`: `{wave: N, coverage: X, decision: Y, sources_count: Z}`.

### Phase P3.7 — Multi-LLM Deep Research (conditional escape valve)

Triggered when:
- `--deep` flag was set, OR
- COVERAGE_GATE returned REVIEW band at wave 3, OR
- Manual keyword trigger ("multiple perspectives", "compare LLM views")

#### Load

```
Read("squads/research/workflows/tech-research/phase-3-7-playwright-deep-research.yaml")
Read("squads/research/prompts/tech-research/playwright-deep-research.md")
Read("config.yaml")    # for playwright_deep_research.* section
```

#### Persona — Research Executor (multi-LLM mode)

Use Playwright MCP to query Grok / Claude.ai / Gemini per `config.yaml#playwright_deep_research.llms`. Graceful degradation: 1 successful LLM is enough.

If Playwright MCP unavailable AND `--deep` was explicit:
- HALT and escalate ("Multi-LLM deep research requires Playwright MCP. Run `@devops *mcp-setup playwright`.")
- IF `--deep` NOT explicit: skip P3.7 silently, document missing capability in `evolving_report.md`

#### Output

- `docs/research/{date}-{slug}/XX-llm-deep-research.md` (atom: `llm-deep-research`)
- Screenshots per `config.yaml#playwright_deep_research.screenshots`

**TaskUpdate(M4, completed)** → **learning log: `p3_execute_research.status = completed`**, add waves array, COVERAGE_GATE verdict.

---

## Phase M5 / P4: Synthesize + Extract Quick Wins (research-synthesizer inline)

**TaskUpdate(M5, in_progress)** → **learning log: `p4_synthesize.status = in_progress`**

### Load

```
Read("squads/research/workflows/tech-research/phase-4-synthesize.yaml")
```

### Persona — Research Synthesizer

Read all `wave-*-summary.md` files + `evolving_report.md` + `XX-llm-deep-research.md` (if present) + any enriched_results still in context.

**Preserve disagreement, uncertainty, source-specific nuance.** Do NOT flatten contradictions into fake consensus.

### Step 5.5 — Extract Quick Wins (mandatory)

Scan consolidated findings for items where:
- `value = high`
- `effort ∈ {XS, S}`
- `time_to_value ≤ 1 week`

Produce a Quick Wins set with **≥ 3 entries**. Each entry MUST:
- Map to a hub target (squad / app / skill / agent / runner / rule / workflow / ADR / doc)
- Cite a § of the report
- State the concrete next action

**If fewer than 3 candidates qualify:** write an explicit `## Quick Wins Não Encontrados` block documenting the gap. NEVER pad with low-quality items.

### Outputs

- `synthesis_draft` (held in context for P5)
- Write `docs/research/{date}-{slug}/quick-wins.md` (atom: `quick-wins`)

**TaskUpdate(M5, completed)** → **learning log: `p4_synthesize.status = completed`**, record quick_wins_count.

---

## Phase M6 / P4.5: Verify Citations [CITATION_GATE] (citation-verifier inline)

**TaskUpdate(M6, in_progress)** → **learning log: `p45_verify_citations.status = in_progress`**

### Load

```
Read("squads/research/workflows/tech-research/phase-4-5-verify-citations.yaml")
Read("squads/research/prompts/tech-research/verify-citations.md")
```

### Persona — Citation Verifier

Every important claim needs a source. For each claim in `synthesis_draft`:
- Verify the citation URL exists (or that the source file still asserts the claim)
- Verify the quoted text matches the source (no paraphrase passing as quote)
- Verify the date is current relative to temporal intent

Use `scripts/claim_extractor.py` + `scripts/sources_extractor.py` if available.

### Fix Loop (bounded at 2 attempts)

```
attempt = 0
WHILE attempt < 2:
  unsupported = list of claims that failed verification
  IF len(unsupported) == 0: break
  FOR claim in unsupported:
    - Re-search for a backing source
    - IF found: update claim with verified citation
    - ELSE: mark claim for removal or downgrade to "speculation" tag
  attempt += 1
```

### CITATION_GATE Verdict

| verified_ratio | unsupported_count | Verdict | Action |
|---|---|---|---|
| ≥ 0.85 | 0 | **APPROVE** | Proceed to P5 |
| ≥ 0.85 | > 0 (residual) | **REVIEW** | Proceed to P5 with explicit caveat block listing unsupported claims |
| < 0.85 | any | **VETO** | HALT — escalate. Learning log: `outcome=halted`, reason=citation_veto |

**TaskUpdate(M6, completed)** → **learning log: `p45_verify_citations.status = completed`**, record `verified_ratio`, `unsupported_count`, gate verdict.

---

## Phase M7 / P5: Document Final Artifacts (research-documenter inline)

**TaskUpdate(M7, in_progress)** → **learning log: `p5_document.status = in_progress`**

### Load

```
Read("squads/research/workflows/tech-research/phase-5-document.yaml")
Read("squads/research/templates/tech-research/output-structure.md")
Read("squads/research/templates/tech-research/output-structure.yaml")
```

### Persona — Research Documenter

Write the final artifacts under `docs/research/{date}-{slug}/`. Phase splits into two
steps: **5.0 Write Narrative Atoms** (Markdown, hand-authored) and **5.1 Run Extractor
Atoms** (YAML/JSON, deterministic scripts). Both are required for the `rich` render
tier in the Research Observatory (`apps/dash`).

#### 5.0 — Narrative Atoms (hand-authored Markdown)

| Atom | Path | Contents |
|---|---|---|
| `research-readme` | `README.md` | Index + TL;DR + metadata (date, query, coverage_score, gate verdicts, file list, render_tier hint) |
| `original-query` | `00-query-original.md` | Original query + inferred context + flags |
| `research-report` | `02-research-report.md` | Full findings with source citations, confidence tags, disagreement preserved |
| `recommendations` | `03-recommendations.md` | Actionable recommendations (NO production code) + caveat blocks for CITATION_GATE REVIEW |
| `curiosity-queue` | `curiosity_queue.yaml` | Open questions, gaps, follow-up candidates — schema: `items: [{question, status: open\|resolved\|discarded, owner}]` (validated by `output_validator.py`) |
| `metrics.yaml` | `metrics.yaml` | coverage_score, gate verdicts, source counts, elapsed_minutes, token usage if tracked |
| `pipeline-state.yaml` | `pipeline-state.yaml` | Phase completion map (mirrors learning log) |

#### 5.1 — Extractor Atoms (deterministic scripts, MANDATORY for `rich` render tier)

All scripts already exist in `squads/research/scripts/tech-research/`. They parse the
narrative atoms from 5.0 + wave summaries and emit structured YAML/JSON consumed by
`apps/dash` Research Observatory tabs.

Run in this order (each tolerates absent inputs gracefully):

```
Bash("python3 squads/research/scripts/tech-research/sources_extractor.py {output_dir}")           # → sources.yaml
Bash("python3 squads/research/scripts/tech-research/players_extractor.py {output_dir}")           # → players.yaml
Bash("python3 squads/research/scripts/tech-research/ux_patterns_extractor.py {output_dir}")       # → ux-patterns.yaml
Bash("python3 squads/research/scripts/tech-research/comparison_matrix_extractor.py {output_dir}") # → matrices.yaml
Bash("python3 squads/research/scripts/tech-research/logger.py consolidate {output_dir}")          # → execution-log.jsonl (final consolidated timeline)
Bash("python3 squads/research/scripts/tech-research/action_assets_extractor.py {output_dir}")     # → action-plan.yaml, claims.yaml, risk-register.yaml, decision-ledger.yaml
Bash("python3 squads/research/scripts/tech-research/research_graph.py {output_dir}")              # → research-graph.json (DEPENDS on sources + action assets — run AFTER both)
Bash("python3 squads/research/scripts/tech-research/dashboard_manifest.py {output_dir}")          # → dashboard-manifest.yaml, validation-report.yaml
```

| Atom | Path | Extractor | Observatory Tab |
|---|---|---|---|
| `sources` | `sources.yaml` | `sources_extractor.py` | Evidências / Fontes (URLs + credibility + flags) |
| `players` | `players.yaml` | `players_extractor.py` | Players (tools/companies/people referenced) |
| `ux-patterns` | `ux-patterns.yaml` | `ux_patterns_extractor.py` | Map (UX/product patterns, when research is UX-themed) |
| `matrices` | `matrices.yaml` | `comparison_matrix_extractor.py` | Map (every Markdown table under a heading becomes a matrix) |
| `execution-log` | `execution-log.jsonl` | `logger.py consolidate` | Waves (timeline of events — consolidates `wave-*-progress.jsonl`) — schema validated by `output_validator.py` |
| `action-plan` | `action-plan.yaml` | `action_assets_extractor.py` | Ações / Map (decision, actions, roadmap) |
| `claims` | `claims.yaml` | `action_assets_extractor.py` | Evidências (claims verificáveis) |
| `risk-register` | `risk-register.yaml` | `action_assets_extractor.py` | Ações (riscos e mitigação) |
| `decision-ledger` | `decision-ledger.yaml` | `action_assets_extractor.py` | Ações (decisões e consequências) |
| `research-graph` | `research-graph.json` | `research_graph.py` | Evidências (nodes: query/waves/sources/report/decisions; links: cite/derives_from) |
| `dashboard-manifest` | `dashboard-manifest.yaml` | `dashboard_manifest.py` | Map (readiness por aba + quality bars) |
| `validation-report` | `validation-report.yaml` | `dashboard_manifest.py` | Evidências (checks estruturais) |

**Tolerance rule:** if an extractor returns 0 entries because the research has no
matching content (e.g. `ux-patterns.yaml` when research is pure backend), the empty
YAML/JSON is STILL written with `items: []`. Empty extractor output is NOT a failure.

**Apps/research render tier mapping**:
- `gold` — has `rich` assets plus `action-plan.yaml`, `claims.yaml`, `risk-register.yaml`, `decision-ledger.yaml`
- `rich`  — has core narrative + `metrics.yaml` + `sources.yaml` + `research-graph.json` + `recommendations`
- `partial` — has narrative + some YAML/JSON (missing graph or sources)
- `legacy` — Markdown-only (no extractors run)

**Target after 5.1: `gold` tier.** If any extractor fails (script error, not empty
output), log warning to `execution-log.jsonl` and continue — Observatory will fall
back to `partial` tier render. Do NOT halt the pipeline.

### Validator (mandatory)

```
Bash("python squads/research/scripts/tech-research/output_validator.py {output_dir}")
IF returns valid=false → HALT, report errors. Do NOT mark M7 completed.
```

### Quality Gates Enforced by Validator

- Original query + inferred context present
- Generated research prompt present (`01-deep-research-prompt.md`)
- Source list with URLs + titles + dates + credibility
- Coverage score + breakdown
- Binary rubrics (information recall / analysis / presentation)
- Confidence tags on findings
- Explicit gaps/caveats if coverage below excellent
- Citation verification completed before final report
- Recommendations contain no production code
- Stop reason explaining why research stopped
- Curiosity queue with status per item (schema: `items: [{question, status, owner?}]`)
- `quick-wins.md` with ≥3 selected entries OR `## Quick Wins Não Encontrados` block
- `execution-log.jsonl` present and valid JSONL (one JSON object per line)
- Extractor atoms attempted (warnings allowed; absence triggers `partial` render tier)

**TaskUpdate(M7, completed)** → **learning log: `p5_document.status = completed`**, list all artifact paths.

---

## Phase P5b: Finalize Learning Log + Suggest Next Command

**TaskUpdate(P5b, in_progress)** → **learning log: `p5b_finalize.status = in_progress`**

### Finalize Learning Log

```yaml
# Overwrite .aiox/learning/logs/tech-research/{slug}-{timestamp}.yaml
outcome: completed
timestamp_completed: "{ISO-8601 now}"
elapsed_minutes: {(Bash("date +%s") - start_epoch) / 60}

summary:
  coverage_gate_verdict: {APPROVE|REVIEW}
  citation_gate_verdict: {APPROVE|REVIEW}
  waves_executed: {1|2|3}
  multi_llm_triggered: {bool}
  quick_wins_count: {N}
  sources_consulted: {N}
  artifacts_written: [list of paths]
  output_dir: "{output_dir}"
```

### Suggest Next Command (RULE 10 — skip if --yolo)

Based on output content + flags:

| Condition | Suggestion |
|---|---|
| `--product-discovery` was set | "Próximo: `/research-chief` validate-product-idea para gerar GO/NO-GO sobre `{output_dir}`" |
| Architecture recommendation present | "Próximo: `/aiox-architect` para decisão arquitetural baseada em `{output_dir}/03-recommendations.md`" |
| Story implementation candidate | "Próximo: `/aiox-pm` para criar epic/story a partir de `{output_dir}/quick-wins.md`" |
| Citation Gate REVIEW (caveats present) | "Atenção: caveats não-resolvidos em `{output_dir}/02-research-report.md#caveats`. Revisar antes de decidir." |
| Coverage Gate REVIEW | "Cobertura intermediária. Considere `/tech-research \"{query}\" --deep` para multi-LLM cross-reference" |
| `--yolo` was passed | (skip suggestion silently) |

### Display Final Banner

```
╔══════════════════════════════════════════════════════════╗
║  /tech-research — COMPLETE                                ║
╠══════════════════════════════════════════════════════════╣
║  Output:     docs/research/{date}-{slug}/                 ║
║  Coverage:   {score}/100 ({APPROVE|REVIEW})               ║
║  Citations:  {ratio} ({APPROVE|REVIEW})                   ║
║  Quick Wins: {N} selected                                 ║
║  Sources:    {N} consulted                                ║
║  Elapsed:    {N} minutes                                  ║
║  Log:        {learning_log_path}                          ║
╠══════════════════════════════════════════════════════════╣
║  Próximo: {suggestion}                                    ║
╚══════════════════════════════════════════════════════════╝
```

**TaskUpdate(P5b, completed)** → **learning log: final write**. DONE.

---

## Halt Protocol (any VETO or unrecoverable error)

When triggered:
1. Set `learning_log.outcome = halted | failed | escalated`
2. Set `learning_log.timestamp_completed = now`
3. Append `learning_log.halt_reason = "{reason}"` (e.g. `coverage_veto`, `citation_veto`, `guardrail_redirect`, `partial_read_failure`, `user_abort`)
4. Persist the log immediately (full file overwrite)
5. `TaskUpdate(current_phase, completed)` with description=halted reason
6. Emit halt report to user:
   ```
   HALT: tech-research pipeline stopped at phase {phase_id}
   Reason: {reason}
   Partial artifacts: {list of files written so far}
   Learning log: {path}
   Remediation: {hint based on reason}
   ```

Halt does NOT skip the learning log. The log IS the provenance.

---

## Context Discipline

- Load each phase YAML / prompt / template **fully** when its phase starts (RULE 8)
- Do not read every workflow file at startup — only on phase entry
- Emit marker after every operational file load: `LOADED: {relative/path} ({line_count} lines)`
- Keep raw source extractions out of long-term context after wave compression (P3.6)
- Preserve exact code snippets, version numbers, benchmark numbers, citations, publication dates
- Do not paraphrase source claims before citation verification (P4.5)

---

## Skill File Structure

> **Note (v2.1.0, 2026-05-16):** This skill was absorbed into `squads/research/` as part
> of the spy→research squad rename. The `/tech-research` slash entry point remains here
> (`.claude/skills/tech-research/SKILL.md`) as a stable alias; the implementation
> (workflows, scripts, templates, prompts, data, checklists) lives under
> `squads/research/{section}/tech-research/`.

```
.claude/skills/tech-research/
└── SKILL.md                          # slash entry (this file) — alias preserved

squads/research/
├── agents/
│   └── tech-research-agent.md        # canonical agent file (v2.1.0)
├── docs/
│   └── tech-research-README.md       # quick reference
├── checklists/tech-research/
│   └── guardrails.yaml               # vetoes, constraints, security, scope
├── data/tech-research/
│   ├── _skill-config.yaml            # SINKRA-native + operational config
│   ├── auto-clarification.yaml
│   ├── commands.yaml
│   └── dependencies.yaml
├── workflows/tech-research/
│   ├── tech-research-pipeline.yaml   # aggregate manifest (process_mapping target)
│   ├── phase-0-auto-clarify.yaml
│   ├── phase-1-clarify.yaml
│   ├── phase-1-5-decompose.yaml
│   ├── phase-2-generate-prompt.yaml
│   ├── phase-3-execute-research.yaml
│   ├── phase-3-2-deep-read.yaml
│   ├── phase-3-5-evaluate-coverage.yaml
│   ├── phase-3-6-compress-wave.yaml
│   ├── phase-3-7-playwright-deep-research.yaml
│   ├── phase-4-synthesize.yaml
│   ├── phase-4-5-verify-citations.yaml
│   └── phase-5-document.yaml
├── prompts/tech-research/
│   ├── decompose.md
│   ├── evaluate.md
│   ├── executor-matrix.md
│   ├── page-extract.md
│   ├── playwright-deep-research.md
│   ├── tech-discovery.md
│   ├── tool-strategy.md
│   └── verify-citations.md
├── scripts/tech-research/
│   ├── claim_extractor.py
│   ├── compare-run-artifacts.sh
│   ├── comparison_matrix_extractor.py
│   ├── coverage_calculator.py
│   ├── credibility_scorer.py
│   ├── logger.py
│   ├── metrics_collector.py
│   ├── next_followup_number.py
│   ├── output_validator.py
│   ├── players_extractor.py
│   ├── research_graph.py
│   ├── research_kb_index.py
│   ├── scaffold.py
│   ├── sources_extractor.py
│   ├── url_detector.py
│   └── ux_patterns_extractor.py
└── templates/tech-research/
    ├── deep-research-prompt-template.md
    ├── meta-prompt-template.yaml
    ├── output-structure.md
    └── output-structure.yaml
```

---

## Output Structure (final, under `docs/research/{date}-{slug}/`)

```
docs/research/{YYYY-MM-DD}-{slug}/
├── README.md                    # Índice + TL;DR + metadata (atom: research-readme)
├── 00-query-original.md         # Query + flags + inferred context (atom: original-query)
├── 01-deep-research-prompt.md   # Generated prompt (atom: research-prompt)
├── 02-research-report.md        # Full findings (atom: research-report)
├── 03-recommendations.md        # Recommendations, no code (atom: recommendations)
├── quick-wins.md                # ≥3 selected QW OR gap block (atom: quick-wins)
├── curiosity_queue.yaml         # Open questions (atom: curiosity-queue)
├── evolving_report.md           # Cumulative state per wave (atom: evolving-report)
├── wave-1-summary.md            # Per-wave checkpoint (atom: wave-summary, cardinality: many)
├── wave-2-summary.md            # (if executed)
├── wave-3-summary.md            # (if executed)
├── XX-llm-deep-research.md      # Multi-LLM dossier (atom: llm-deep-research, conditional)
├── metrics.yaml                 # coverage, gates, counts, elapsed
├── pipeline-state.yaml          # phase completion map
│
│   # Extractor atoms — apps/dash Research Observatory (rich render tier)
├── sources.yaml                 # Fontes com URL + credibility + flags (atom: sources)
├── players.yaml                 # Ferramentas/companies/people citados (atom: players)
├── ux-patterns.yaml             # Padrões UX reutilizáveis (atom: ux-patterns)
├── matrices.yaml                # Tabelas extraídas dos Markdown (atom: matrices)
├── execution-log.jsonl          # Timeline consolidada de eventos (atom: execution-log)
├── research-graph.json          # Grafo nós/links query→waves→sources→report (atom: research-graph)
│
└── 04-*.md, 05-*.md, ...        # Follow-up files (RULE 7)

.aiox/learning/logs/tech-research/{slug}-{timestamp}.yaml   # incremental log (RULE 3)
```

**Observatory tab → atom dependency** (from `apps/dash/HANDOFF-research-compatibility.md`):

| Aba | Atoms consumidos |
|---|---|
| `Doc` | `README.md`, `02-research-report.md`, `03-recommendations.md` |
| `Map` | `metrics.yaml`, `pipeline-state.yaml`, `matrices.yaml`, `ux-patterns.yaml`, `curiosity_queue.yaml`, `research-graph.json` |
| `Evidências` | `sources.yaml`, `research-graph.json`, `metrics.yaml` |
| `Waves` | `execution-log.jsonl`, `wave-*-summary.md` |
| `Fontes` | `sources.yaml` |
| `Players` | `players.yaml` |
| `Ações` | `03-recommendations.md`, `quick-wins.md`, `curiosity_queue.yaml` |
| `Perguntas` | `curiosity_queue.yaml` |

---

## Changelog (v1.1.0 → v2.0.0)

| Change | Rationale |
|---|---|
| `config.yaml` rewrite | Added pack/process/artifact_contracts/checkpoints/knowledge_sources/invokes (SINKRA-native pattern) |
| `workflows/tech-research-pipeline.yaml` NEW | Aggregate manifest (process_mapping target). Pattern parity with `sinkra-pipeline.yaml`. |
| TeamCreate + TaskCreate added | Visual progress tracking (parity with `/sinkra-map-process`, `/sinkra-validate-squad`, `/full-sdc`) |
| Incremental learning log | `.aiox/learning/logs/tech-research/` per `.claude/rules/incremental-learning-log.md`. Replaces ad-hoc `execution-log.jsonl`. |
| COVERAGE_GATE + CITATION_GATE formalized | Soft coverage thresholds promoted to formal VETO/REVIEW/APPROVE gates with bounded fix loops |
| 10 NON-NEGOTIABLE RULES | Pattern parity with reference skills |
| Halt Protocol | Pipeline-wide halt with learning log persistence (no provenance loss on failure) |
| CLI next-command suggestion (P5b) | Per `.claude/rules/cli-next-command-flow.md` |
| Frontmatter | Drop `context`, `agent` (per Frontmatter Purity Rule). Keep `owner_squad`, `sinkra_tier` matching reference skills pattern. |
| Owner squad declared | `mega-brain` — research outputs feed knowledge management pipeline |
| Operational config preserved | `playwright_deep_research`, `search_waves`, `mcp_dependencies` unchanged |

Migration impact: zero — existing `docs/research/` folders remain valid; phase YAMLs unchanged; scripts unchanged. New runs write incremental learning logs (replaces ad-hoc `execution-log.jsonl`).
