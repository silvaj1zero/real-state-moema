---
name: "tech-research"
description: "Runs a deep technical research pipeline that gathers sources and writes comprehensive research reports with coverage scoring and confidence tagging"
version: "1.0.0"
workflow_version: "1.1.0"
agent: "tech-research"
user-invocable: true
maxTurns: 25
---

# Tech Research

Deep research pipeline que transforma perguntas em conhecimento documentado.

## Quick Start

```
/tech-research "como melhorar performance de queries SQL"
```

## Activation

1. Parse query dos argumentos (ou perguntar se não fornecido)
2. Execute workflow completo
3. Salve em `docs/research/{date}-{slug}/`

**CRITICAL:**
- Follow-up queries → MESMA pasta (não criar nova)
- NUNCA implementar código → Redirecionar para @pm ou @dev

## Artifact Directory

```
docs/research/{YYYY-MM-DD}-{slug}/
├── README.md                    # Índice e TL;DR
├── 00-query-original.md         # Pergunta + contexto
├── 01-deep-research-prompt.md   # Prompt gerado
├── 02-research-report.md        # Findings completos
├── 03-recommendations.md        # Recomendações (SEM código de produção)
├── curiosity_queue.yaml         # Perguntas abertas e lacunas de alto valor
├── evolving_report.md           # Estado Markoviano operacional mais recente
├── execution-log.jsonl          # Log mínimo por fase
└── 04-*.md, 05-*.md, ...        # Follow-up research
```

## Dependencies

| Type | File | Purpose |
|------|------|---------|
| Template | `templates/deep-research-prompt-template.md` | Prompt structure |
| Template | `templates/output-structure.md` | Output file formats |
| Prompt | `prompts/decompose.md` | Query decomposition |
| Prompt | `prompts/evaluate.md` | Coverage evaluation |

---

## Context Loading Contract

This skill is a research runner. The operational workflow follows the AIOX squad topology and is split by execution phase so each file can be loaded fully at the moment it is needed.

Before doing ANY research action beyond parsing the user's query, load `checklists/guardrails.yaml`. Do not continue unless vetoes, constraints, security, and scope boundaries are loaded.

Then load only the phase file required by the current step. Each phase file is authoritative for that step. Do not execute a phase from this summary alone.

If a required file cannot be loaded, HALT and report: `Missing tech-research operational file: {path}`.

## Operational Invariants

- Follow-up queries use the SAME existing research folder and append `04-*`, `05-*`, etc.
- Never implement code, create agents/skills, deploy, or write production artifacts.
- Only write research artifacts under `docs/research/**`.
- Use worker scripts from `.claude/skills/tech-research/scripts/` where specified by the loaded phase.
- Preserve coverage scoring, confidence tags, citation verification, and README metadata requirements from the loaded operational files.

## Operational Load Manifest

Load these files at the moment of use:

| Moment | Required file |
|---|---|
| Pre-flight, before any research | `checklists/guardrails.yaml` |
| Parse command or `*help` | `data/commands.yaml` |
| Auto-clarification config | `data/auto-clarification.yaml` |
| Phase 0 | `workflows/phase-0-auto-clarify.yaml` |
| Phase 1.5 | `workflows/phase-1-5-decompose.yaml` + `prompts/decompose.md` |
| Phase 1 fallback | `workflows/phase-1-clarify.yaml` |
| Phase 2 | `workflows/phase-2-generate-prompt.yaml` + `templates/deep-research-prompt-template.md` |
| Phase 3 | `workflows/phase-3-execute-research.yaml` + `data/dependencies.yaml` + `prompts/tool-strategy.md` + `prompts/executor-matrix.md` |
| Phase 3.2 supplemental | `workflows/phase-3-2-deep-read.yaml` + `prompts/page-extract.md` |
| Phase 3.5 | `workflows/phase-3-5-evaluate-coverage.yaml` + `prompts/evaluate.md` |
| Phase 3.6 | `workflows/phase-3-6-compress-wave.yaml` |
| Phase 3.7 deep mode | `workflows/phase-3-7-playwright-deep-research.yaml` + `prompts/playwright-deep-research.md` + `config.yaml` |
| Phase 4 | `workflows/phase-4-synthesize.yaml` |
| Phase 4.5 | `workflows/phase-4-5-verify-citations.yaml` + `prompts/verify-citations.md` |
| Phase 5 | `workflows/phase-5-document.yaml` + `templates/output-structure.yaml` + `templates/output-structure.md` |
| Meta prompt needed | `templates/meta-prompt-template.yaml` |

## Resident Execution Contract

Keep this section in working memory for the whole run. It is the map; the loaded files are the executable details.

### Startup Gate

Before searching, fetching, decomposing, or creating files:

1. Parse the user's query and command flags only.
2. Load `checklists/guardrails.yaml`.
3. Confirm these guardrail sections are present: `veto_conditions`, `constraints`, `implementation_redirect`, `security`, `scope_boundaries`.
4. Apply vetoes immediately:
   - Implementation/code/deploy request → redirect to PM/dev, do not research implementation as an execution task.
   - Write outside `docs/research/**` → block.
   - No results after fallback search → stop with explicit no-result message.
5. Continue only if the request is research/documentation within scope.

### Phase Routing Table

| Phase | When to run | Must load before executing | Output to carry forward |
|---|---|---|---|
| Parse | Always first | `data/commands.yaml` only if command syntax or `*help` is involved | `original_query`, flags, command mode |
| 0 Auto-Clarify | Always after guardrails | `data/auto-clarification.yaml`, `workflows/phase-0-auto-clarify.yaml` | `inferred_context` |
| 1.5 Decompose | Default for non-trivial research | `workflows/phase-1-5-decompose.yaml`, `prompts/decompose.md` | `decomposition_result` with 5-7 sub-queries |
| 1 Clarify | Only when auto-clarify cannot infer context | `workflows/phase-1-clarify.yaml` | one user answer or clarified context |
| 2 Generate Prompt | Always before search | `workflows/phase-2-generate-prompt.yaml`, `templates/deep-research-prompt-template.md` | `01-deep-research-prompt.md` |
| 3 Execute Research | First search wave and each continuation wave | `workflows/phase-3-execute-research.yaml`, `data/dependencies.yaml`, `prompts/tool-strategy.md`, `prompts/executor-matrix.md` | `search_results`, tool stats, source credibility |
| 3.2 Deep Read | Supplemental when snippets are insufficient | `workflows/phase-3-2-deep-read.yaml`, `prompts/page-extract.md` | `enriched_results`, extraction stats |
| 3.5 Evaluate | After each search/deep-read wave | `workflows/phase-3-5-evaluate-coverage.yaml`, `prompts/evaluate.md` | `decision`, `coverage_score`, `gaps`, `next_queries` |
| 3.6 Compress | After every evaluation | `workflows/phase-3-6-compress-wave.yaml` | `wave-{N}-summary.md` |
| 3.7 Deep Mode | If `--deep`, coverage < 70% after wave 2, or multi-LLM requested | `workflows/phase-3-7-playwright-deep-research.yaml`, `prompts/playwright-deep-research.md`, `config.yaml` | `XX-llm-deep-research.md` |
| 4 Synthesize | Once coverage stop condition is met | `workflows/phase-4-synthesize.yaml` | consolidated findings and recommendations draft |
| 4.5 Verify Citations | Before final docs are considered complete | `workflows/phase-4-5-verify-citations.yaml`, `prompts/verify-citations.md` | citation integrity results and fixes |
| 5 Document | Always final | `workflows/phase-5-document.yaml`, `templates/output-structure.yaml`, `templates/output-structure.md` | README, report, recommendations, metadata |

### Required Control Flow

1. Do not skip Phase 0. If auto-clarification fails, use Phase 1 fallback.
2. Prefer Phase 1.5 decomposition for any broad or technical query; skip only for clearly tiny follow-ups.
3. Phase 3 can run up to 3 waves. Each wave must be evaluated by Phase 3.5 and compressed by Phase 3.6.
4. Wave 2+ must read `evolving_report.md` plus relevant `wave-*-summary.md` files instead of carrying all raw results.
5. Stop search when Phase 3.5 returns a stop decision, unless `--deep` explicitly requires Phase 3.7.
6. Phase 4 synthesis reads wave summaries, enriched results still in context, and any multi-LLM output.
7. Phase 4.5 citation verification is mandatory before final documentation.
8. Phase 5 writes only under `docs/research/{YYYY-MM-DD}-{slug}/`.
9. Phase 5 must write `metrics.yaml` and `pipeline-state.yaml` before running the final validator.
10. Completion is forbidden until `output_validator.py` returns `valid: true`.
11. Every completed run must have `stop_reason`, `curiosity_queue.yaml`, `evolving_report.md`, `execution-log.jsonl`, and binary rubrics in metadata.

### Context Discipline

- Load each operational file fully when its phase starts.
- Do not read every workflow file at startup.
- Do not use partial reads of a workflow file; if the file cannot fit, that file is too large and execution should halt.
- Keep raw source extractions out of long-term context after compression.
- Preserve exact code snippets, version numbers, benchmark numbers, citations, and publication dates.
- Do not paraphrase source claims before citation verification.

### Partial-Read Failure Mode

If you are about to say, or have just said, that you will read an operational file "in parts", "parcialmente", "in chunks", "first part", or equivalent: STOP before any research/tool action for that phase.

Required response:

1. Report the exact file that could not be loaded fully.
2. Do not continue from a partial read.
3. Ask for a file split or choose the smaller phase-specific file if one exists.
4. Continue only after the required phase file is fully loaded.

This is a quality gate, not a preference.

After every operational file load, emit a marker in this format before executing the phase:

```
LOADED: <relative/path> (<line_count> lines)
```

If the marker cannot be emitted because the file was only partially loaded, halt.

### Follow-Up Detection

Treat the user request as a follow-up when it continues the same topic, mentions previous findings, asks for more detail, or uses terms such as `mais sobre`, `continue`, `aprofunde`, `follow-up`, `também`, `e sobre`, or the same technology names from the active research folder.

For follow-ups:

1. Reuse the same `docs/research/{date}-{slug}/` folder.
2. Resolve the next file number with `scripts/next_followup_number.py {output_dir}` before writing.
3. Update `README.md` with the new files.
4. Do not create a new folder unless the topic changed.

### Quality Gates

Every completed run must include:

- Original query and inferred context.
- Generated research prompt.
- Source list with URLs, titles, dates when available, and credibility.
- Coverage score and coverage breakdown.
- Binary rubrics for information recall, analysis, and presentation.
- Confidence tags on findings.
- Explicit gaps or caveats when coverage is below excellent.
- Citation verification before final report.
- Recommendations that do not implement production code.
- Stop reason explaining why research stopped.
- Curiosity queue with unresolved, resolved, or discarded open questions.

## Phase Resident Summaries

These summaries are intentionally resident in `SKILL.md`. They tell the agent what each phase is for, while the phase files carry the detailed procedure.

### Phase 0: Auto-Clarify

Purpose: infer context before asking the user anything.

Load:
- `data/auto-clarification.yaml`
- `workflows/phase-0-auto-clarify.yaml`

Use it to detect:
- research focus: technical, comparison, or general
- temporal intent: recent/current versus evergreen
- technology/domain names from aliases
- whether clarification can be skipped

Do not ask clarification questions if the query already reveals a usable focus or technology domain.

### Phase 1.5: Decompose

Purpose: turn one broad query into 5-7 orthogonal sub-queries.

Load:
- `workflows/phase-1-5-decompose.yaml`
- `prompts/decompose.md`

The decomposition should include:
- definitions/fundamentals
- implementation details
- tradeoffs or comparison angle
- best practices
- real-world examples
- at least one devil's-advocate query
- at least one expert-level query

Skip only for tiny follow-ups where a single targeted query is clearly enough.

### Phase 1: Clarify Fallback

Purpose: ask one concise question only when auto-clarification fails.

Load:
- `workflows/phase-1-clarify.yaml`

Do not ask the old three-question flow unless the auto-clarification config is unavailable. The default fallback is one combined question about focus and technical context.

### Phase 2: Generate Prompt

Purpose: produce the research prompt artifact before search.

Load:
- `workflows/phase-2-generate-prompt.yaml`
- `templates/deep-research-prompt-template.md`

The prompt must combine:
- original query
- inferred or clarified context
- decomposition result when present
- temporal freshness requirements when detected
- explicit output expectations

Save as `01-deep-research-prompt.md`.

### Phase 3: Execute Research

Purpose: gather sources with tool strategy, deterministic checkpoints, and runtime-honest execution.

Load:
- `workflows/phase-3-execute-research.yaml`
- `data/dependencies.yaml`
- `prompts/tool-strategy.md`
- `prompts/executor-matrix.md`

Required behavior:
- check Context7 and Exa availability before depending on them
- use official docs first when a library/framework is detected
- use Exa for high-quality neural search when available
- use WebSearch fallback when MCPs fail
- use URL detection before routing special content
- execute sub-queries in main context by default
- dispatch through `deep-researcher` only when that subagent exists in the current runtime
- write `wave-{N}-progress.jsonl` after each sub-query result set for timeout recovery

Carry forward source URLs, titles, snippets, tool used, credibility, and extraction stats.

### Phase 3.2: Deep Read

Purpose: enrich top sources beyond snippets.

Load:
- `workflows/phase-3-2-deep-read.yaml`
- `prompts/page-extract.md`

Use ETL first:
- YouTube → transcript extractor
- PDF/arXiv → PDF extraction
- blogs/articles → `fetch-page.js`
- other URLs → ETL first, WebFetch fallback

Select top sources by credibility, relevance, and information density. Do not deep-read low-quality sources just to fill quota.

### Phase 3.5: Evaluate Coverage

Purpose: decide whether to continue searching.

Load:
- `workflows/phase-3-5-evaluate-coverage.yaml`
- `prompts/evaluate.md`

Must calculate:
- coverage score
- coverage breakdown
- source quality
- new information ratio
- remaining gaps
- stop/continue decision

Use worker scripts where specified. Do not make the stop decision by intuition if the worker is available.

### Phase 3.6: Compress Wave

Purpose: prevent context bloat.

Load:
- `workflows/phase-3-6-compress-wave.yaml`

After each evaluated wave, write `wave-{N}-summary.md` with:
- coverage and decision
- key findings with sources
- best source list
- remaining gaps

Wave summaries are the memory bridge. Wave 2+ reads summaries instead of carrying all raw data.

### Phase 3.7: Playwright Deep Research

Purpose: query multiple LLMs through browser automation when search coverage is insufficient or user requested deep mode.

Load:
- `workflows/phase-3-7-playwright-deep-research.yaml`
- `prompts/playwright-deep-research.md`
- `config.yaml`

Trigger when:
- query includes `--deep`
- coverage is below threshold after wave 2
- user asks for multiple LLM perspectives

Gracefully skip unavailable LLM targets. One successful LLM is enough to produce a useful supplemental artifact.

### Phase 4: Synthesize

Purpose: consolidate evidence into findings and recommendations.

Load:
- `workflows/phase-4-synthesize.yaml`

Read all `wave-*-summary.md` files and any deep-mode output. Preserve disagreement, uncertainty, and source-specific nuance. Do not flatten contradictions into fake consensus.

### Phase 4.5: Verify Citations

Purpose: check that claims are backed by actual sources.

Load:
- `workflows/phase-4-5-verify-citations.yaml`
- `prompts/verify-citations.md`

Every important claim needs a source. Fix or remove unsupported claims before final documentation.

### Phase 5: Document

Purpose: write final artifacts.

Load:
- `workflows/phase-5-document.yaml`
- `templates/output-structure.yaml`
- `templates/output-structure.md`

Required files:
- `README.md`
- `00-query-original.md`
- `01-deep-research-prompt.md`
- `02-research-report.md`
- `03-recommendations.md`
- follow-up files as `04-*`, `05-*`, etc.

Never write outside `docs/research/**`.

---

## Execution Flow

### Full Flow

1. **Parse Query** → Extrai tópico da pergunta
2. **Auto-Clarify** → Detecta patterns e tecnologias automaticamente
3. **Clarify** → Apenas se necessário: 0 ou 1 pergunta
4. **Decompose** → Decompõe query em 5-7 sub-queries atômicas (com ultrathink)
5. **Generate Prompt** → Cria prompt estruturado
6. **Context7 + Search** → Busca docs oficiais via Context7, depois WebSearch paralelo
7. **Deep Read** → Lê top 5 páginas com WebFetch para extração profunda
8. **Evaluate** → Avalia cobertura com stopping criteria rigorosos (max 3 waves)
9. **Compress Wave** → escreve wave-N-summary.md como checkpoint de memória
10. **Playwright Deep Research** → Se coverage < 70% OU --deep flag, consulta Grok/Claude/Gemini via browser (NEW)
11. **Synthesize** → Lê wave summaries + LLM responses, consolida em recomendações
12. **Verify Citations** → Verifica integridade de todas as citações
13. **Document** → Salva em docs/research/

### Flow Diagram (v3.2 - Runtime-Honest Agent + Optional Worker)

```
Query → Auto-Clarify → Decompose (ultrathink, MAIN MODEL)
                              |
              [Sub-query 1]  [Sub-query 2]  ... [Sub-query 7]
                   |              |                   |
              Main-context Agent execution by default
              Optional deep-researcher only if runtime exposes it
                   |              |                   |
                   +------+-------+-------+-----------+
                          |
                    Aggregate (MAIN MODEL)
                          |
                    Evaluate Coverage (script-assisted)
                          |
                    Checkpoint ──→ wave-N-progress.jsonl + wave-N-summary.md
                          |
                    (coverage OK?) ───── NO ──→ Read summaries ──→ [Wave 2+]
                          | YES (or <70%)        (max 3 waves)
                          |
                    (coverage < 70% OR --deep?)
                          | YES
                          ▼
              Playwright deep research: query Grok, Claude.ai, and Gemini,
              aggregate + synthesize responses, then write
              XX-llm-deep-research.md.
                          |
                    Synthesize (MAIN MODEL) ← reads wave summaries + LLM responses
                          |
                    Verify Citations (MAIN MODEL)
                          |
                       Document (MAIN MODEL)
```

### Skill File Structure

```
.claude/skills/tech-research/
├── SKILL.md              # Activation summary and loading contract
├── README.md             # Quick reference
├── config.yaml           # Playwright deep research configuration (NEW)
├── checklists/
│   └── guardrails.yaml   # Vetoes, constraints, security, scope boundaries
├── data/
│   ├── auto-clarification.yaml
│   ├── commands.yaml
│   └── dependencies.yaml
├── workflows/
│   ├── phase-0-auto-clarify.yaml
│   ├── phase-1-5-decompose.yaml
│   ├── phase-1-clarify.yaml
│   ├── phase-2-generate-prompt.yaml
│   ├── phase-3-execute-research.yaml
│   ├── phase-3-2-deep-read.yaml
│   ├── phase-3-5-evaluate-coverage.yaml
│   ├── phase-3-6-compress-wave.yaml
│   ├── phase-3-7-playwright-deep-research.yaml
│   ├── phase-4-synthesize.yaml
│   ├── phase-4-5-verify-citations.yaml
│   └── phase-5-document.yaml
├── prompts/
│   ├── decompose.md      # Query decomposition (5-7 sub-queries)
│   ├── evaluate.md       # Coverage evaluation with credibility scoring
│   ├── page-extract.md   # Deep page content extraction
│   ├── tech-discovery.md # Tool/MCP/API discovery
│   ├── verify-citations.md # Citation integrity verification
│   └── playwright-deep-research.md # Multi-LLM browser automation (NEW)
└── templates/
    ├── deep-research-prompt-template.md
    ├── meta-prompt-template.yaml
    ├── output-structure.md
    └── output-structure.yaml
```

### Output Structure

```
docs/research/2026-02-07-{slug}/
├── README.md                    # Índice e TL;DR
├── 00-query-original.md         # Pergunta + contexto
├── 01-deep-research-prompt.md   # Prompt gerado
├── 02-research-report.md        # Findings completos
├── 03-recommendations.md        # Recomendações (SEM código produção)
└── 04-*.md, 05-*.md, ...        # Follow-up research
```
