---
name: code-anatomist
description: "Complete software reverse engineering pipeline — 9 phases covering architecture, domain, data, API, dependencies, and infrastructure. Renamed from domain-decoder (RT-DD-V2-001)."
version: "3.1.0"
context: fork
agent: general-purpose
user-invocable: true
argument-hint: "[*extract-full|*extract-arch|*domain-only|*scoping] <target-path-or-github-url> [--with-roundtable|--auto-approve]"
---

# Code Anatomist — Complete Software Reverse Engineering Pipeline

## PURPOSE

Orchestrates the code-anatomist squad through a 9-phase reverse engineering pipeline
covering architecture, domain, data, API, dependencies, and infrastructure.

Based on synthesis of 18 academic frameworks (SEI/CMU Horseshoe Model, Symphony,
Reflexion Models, Ducasse-Pollet Taxonomy, ATAM, QADSAR) and 81 tools cataloged
in deep research RT-DD-V2-001.

Key principles:
- Hybrid approach: LLM agents + traditional static analysis tools
- 5 quality gates with measurable criteria (G0-G4)
- G3 is HUMAN-BLOCKING (architecture synthesis requires domain expert review)
- 2 parallelization windows (Group A: Phases 1+2, Group B: Phases 4+5)
- Backward compatible: v1 commands still work via `*domain-only` alias

Research refs:
- Roundtable: `docs/research/2026-04-03-reverse-engineering-frameworks/ROUNDTABLE-REPORT-2026-04-03.md`
- Structured output: `docs/research/2026-04-03-reverse-engineering-frameworks/structured-output.yaml`
- Tools catalog: `docs/research/2026-04-03-software-reverse-engineering-tools/catalog.md`

---

## PHASE -1: SOURCE ACQUISITION (AUTO-CLONE)

Before any phase runs, the skill resolves the source code location.

### Source Resolution Logic

```
IF Q1 is a GitHub URL (contains github.com):
  1. Extract {owner}/{repo} from URL
  2. Derive {slug} from repo name (kebab-case)
  3. Check if outputs/decoded/{slug}/source/ exists AND has .git/
     - YES → skip clone (already acquired), run `git pull` to update
     - NO  → run `git clone --depth 1 {url} outputs/decoded/{slug}/source/`
  4. Set SOURCE_PATH = outputs/decoded/{slug}/source/

ELIF Q1 is a local path (exists on filesystem):
  1. Derive {slug} from last path segment (kebab-case)
  2. Set SOURCE_PATH = Q1 (read directly, no copy)

ELIF Q1 is a {slug} name (no slashes, no URL):
  1. Check if outputs/decoded/{slug}/source/ exists
     - YES → Set SOURCE_PATH = outputs/decoded/{slug}/source/
     - NO  → ASK user for GitHub URL or local path

ELSE:
  HALT — cannot resolve source
```

### Clone Convention

```
outputs/decoded/{slug}/
  source/                    ← git clone --depth 1 (or local path reference)
  stack-detection.yaml       ← Phase 0.5 auto-detection
  phase-0-scoping/           ← Phase 0 output
  phase-1-context/           ← Phase 1 output
  phase-2-extraction/        ← Phase 2 output
  phase-2.5-metrics/         ← Phase 2.5 output (NEW v3.1)
  phase-3-fusion/            ← Phase 3 output
  phase-4-dynamic/           ← Phase 4 output (optional)
  phase-5-domain/            ← Phase 5 output
  phase-6-synthesis/         ← Phase 6 output
  phase-7-validation/        ← Phase 7 output
  phase-8-documentation/     ← Phase 8 output
  00-extraction-index.yaml   ← Master index tracking all phases
```

### Clone Commands

```bash
# GitHub clone (depth 1 to save space)
git clone --depth 1 https://github.com/{owner}/{repo}.git outputs/decoded/{slug}/source/

# If source already exists, just update
cd outputs/decoded/{slug}/source/ && git pull
```

### Rules

1. **ALWAYS use `--depth 1`** — we need current code, not full history
2. **NEVER clone into project root** — always into `outputs/decoded/{slug}/source/`
3. **Source dir is READ-ONLY** — never write decoder outputs into source/
4. **All subsequent phases** read from `outputs/decoded/{slug}/source/` as their source path
5. **`.gitignore` must exclude** `outputs/decoded/*/source/` (cloned repos)

---

## PHASE 0.5: STACK DETECTION (AUTO)

After source is cloned/resolved (Phase -1) and before Phase 0:

1. Read source directory for package manifests:
   - `package.json` → Node.js/TypeScript (enable dependency-cruiser)
   - `requirements.txt` / `pyproject.toml` → Python (enable pydeps)
   - `go.mod` → Go
   - `Cargo.toml` → Rust
   - `pom.xml` / `build.gradle` → Java
   - `*.csproj` / `*.sln` → .NET
2. Detect database:
   - `prisma/schema.prisma` → Prisma (enable db pull)
   - `docker-compose.yml` with postgres/mysql → DB present
   - `migrations/` directory → ORM with migrations
3. Detect infrastructure:
   - `Dockerfile` → containerized
   - `docker-compose.yml` → multi-service
   - `.github/workflows/` → CI/CD
   - `terraform/` → IaC
4. Write stack report: `outputs/decoded/{slug}/stack-detection.yaml`

### Tool Selection per Stack

| Stack | Tools Available |
|-------|----------------|
| Node.js/TS | dependency-cruiser (npx), tsoa/swagger |
| Python | pydeps, FastAPI OpenAPI |
| Any + Prisma | prisma db pull |
| Any + DB access | tbls |
| Any | Mermaid (always available — text-based) |
| No tools | LLM-only mode [CONFIDENCE: REDUCED] |

---

## CRITICAL RULES (Erratas E1-E10)

### E1: No Synthesizing
Each phase MUST spawn a dedicated agent or read actual source files.
NEVER synthesize output from memory or prior context.

### E2: Save Before Advance (AUTO-ENFORCED BY THIS SKILL)
Each phase MUST write output to `outputs/decoded/{slug}/` BEFORE the phase gate runs.
Gate verifies existence of file via `ls`.

**Implementation:** After each phase completes, this skill:
1. Writes the output file using the Write tool
2. Runs `ls outputs/decoded/{slug}/{phase_dir}/` to verify
3. Runs `wc -c` to verify file > 500 bytes
4. Only then advances to next phase

### E3: Relevant Content Per Phase
Extract content relevant to the current phase dimension:
- Phase 0: Stakeholder concerns, quality attributes, scope boundaries
- Phase 1: System context, external actors, external systems
- Phase 2: Dependencies, data schemas, call graphs, import maps
- Phase 2.5: Quantitative metrics — coverage, dead code, coupling, CVE, license
- Phase 3: Container/component views, module boundaries
- Phase 4: Runtime traces, sequence diagrams (optional)
- Phase 5: Domain model, business rules, bounded contexts, ER diagrams
- Phase 6: Architecture description (Arc42), quality attribute analysis (ATAM)
- Phase 7: Conformance report, drift analysis, risk inventory
- Phase 8: ADRs, final documentation, fitness functions
NOT: UI colors, cache config, boilerplate, irrelevant implementation details.

### E8: Correct Output Path
Output path is `outputs/decoded/{slug}/`. NO other path is valid.
Never use `outputs/domain-decoder/` — that violates the squad contract.

### E9: Gates With Commands
Phase Gate requires running:
1. `ls outputs/decoded/{slug}/{phase_dir}/` (must list files)
2. `wc -c outputs/decoded/{slug}/{phase_dir}/*.{yaml,md}` (each > 500 bytes)
3. `grep -rl "VETO|BLOCKED|FAILED" outputs/decoded/{slug}/{phase_dir}/` (must be empty)

### E10: Input Collection
8 mandatory questions must be answered before any agent spawns:
- Q1: What is the target system/module? (GitHub URL, local path, or slug)
- Q2: What is the project type? (migration, audit, documentation, BRMS, refactoring, architecture-recovery)
- Q3: What output format? (yaml, markdown, both)
- Q4: What priority bounded contexts? (or "all")
- Q5: What depth? (surface, deep)
- Q6: Stack override? (auto-detect by default, manual if needed)
- Q7: DB connection string available? (for Phase 2 data extraction with tbls)
- Q8: Skip dynamic analysis? (Phase 4 opt-out — default: skip unless explicitly requested)

---

## PIPELINE PHASES

```
Phase -1: SOURCE ACQUISITION (auto-clone)
Phase 0.5: STACK DETECTION (auto)

Phase 0: SCOPING & GOALS
  Agents: rick-kazman (QADSAR scenarios)
  Output: outputs/decoded/{slug}/phase-0-scoping/
  Gate: G0

  Parallel Group A: Phase 1 Context Recovery uses simon-brown (C4 L1) and writes phase-1-context/; Phase 2 Static Extraction uses data-specialist + michael-feathers and writes phase-2-extraction/; Gate: G1.

Phase 2.5: METRICS PASS (NEW v3.1)
  Worker: static-tool runners (no agent)
  Output: phase-2.5-metrics/
  Gate: G1.5

Phase 3: VIEW FUSION
  Agent: simon-brown (C4 L2/L3)
  Output: phase-3-fusion/
  Gate: G2

  Parallel Group B: Phase 4 Dynamic Analysis is optional (Q8 opt-in) and writes phase-4-dynamic/; Phase 5 Domain & Data uses evans, ross, feathers, von-halle, and witt (v1 pipeline) and writes phase-5-domain/.

Phase 6: ARCHITECTURE SYNTHESIS
  Agent: rick-kazman (Horseshoe/ATAM)
  Output: phase-6-synthesis/
  Gate: G3 (HUMAN-BLOCKING)

Phase 7: VALIDATION & CONFORMANCE
  Agent: gail-murphy (Reflexion Models)
  Output: phase-7-validation/
  Gate: G4

Phase 8: DOCUMENTATION & DECISIONS
  Agent: simon-brown (Arc42 finalize) + ADR inference
  Output: phase-8-documentation/
```

### Phase 0: SCOPING & GOALS

**Agent:** rick-kazman
**Input:** Q1-Q8 answers + stack-detection.yaml
**Process:**
1. Define system boundaries and scope
2. Identify stakeholder quality concerns
3. Generate quality attribute scenarios (QADSAR)
4. Select architectural views to recover based on quality concerns
5. Plan tool selection based on stack detection

**Output:** `phase-0-scoping/`
- `scope-document.yaml` — boundaries, stakeholders, quality scenarios
- `view-selection.yaml` — which views to recover and why
- `tool-plan.yaml` — tools to use per phase based on stack

### Phase 1: CONTEXT RECOVERY (Group A — parallel with Phase 2)

**Agent:** simon-brown
**Input:** SOURCE_PATH + scope-document
**Process:**
1. Identify external systems, actors, integrations
2. Read README, docs, API specs, docker-compose
3. Generate C4 Level 1 (System Context) diagram in Mermaid

**Output:** `phase-1-context/`
- `c4-context.md` — Mermaid C4Context diagram
- `tech-inventory.yaml` — technologies, frameworks, languages detected
- `external-systems.yaml` — integrations and protocols

### Phase 2: STATIC EXTRACTION (Group A — parallel with Phase 1)

**Worker:** data-specialist + michael-feathers
**Input:** SOURCE_PATH + stack-detection + tool-plan
**Process:**
1. Extract dependency graph (dependency-cruiser for JS/TS, pydeps for Python, or LLM inference)
2. Extract data model (tbls if DB access, Prisma db pull, or ORM inference)
3. Extract API surface (OpenAPI from FastAPI, tsoa, or LLM inference from route files)
4. Extract call graph and import maps
5. Catalog module boundaries

**Output:** `phase-2-extraction/`
- `dependency-graph.md` — Mermaid graph of module dependencies
- `er-diagram.md` — Mermaid erDiagram of data model
- `api-surface.yaml` — endpoints, methods, schemas
- `import-map.yaml` — raw import relationships
- `fact-database.yaml` — consolidated raw facts

### Phase 2.5: METRICS PASS (NEW v3.1)

**Worker:** static-tool runners (no agent — pure tooling)
**Input:** SOURCE_PATH + stack-detection
**Process:** Run 5 quantitative checks per stack. If a tool is missing, record `tool_unavailable: <name>` and continue (do NOT block).

| Stack | Coverage | Dead Code | Coupling | CVE | License |
|-------|----------|-----------|----------|-----|---------|
| Node.js/TS | `vitest run --coverage` or `jest --coverage` | `knip` or `ts-prune` | `dependency-cruiser --output-type metrics` | `npm audit --json` | `license-checker --json` |
| Python | `pytest --cov` | `vulture` | `pydeps --show-cycles` | `pip-audit --format json` | `pip-licenses --format=json` |
| Go | `go test -cover` | `unused` | `go mod graph` + `goda` | `govulncheck` | `go-licenses csv` |
| Rust | `cargo tarpaulin` | `cargo-machete` | `cargo-modules` | `cargo audit` | `cargo-license` |

**Output:** `phase-2.5-metrics/`
- `coverage.yaml` — per-package coverage % + uncovered hotspots
- `dead-code.yaml` — unused exports, files, dependencies
- `coupling-metrics.yaml` — afferent/efferent/instability per module
- `cve-report.yaml` — vulnerabilities by severity
- `license-audit.yaml` — license inventory + GPL/AGPL flags
- `metrics-summary.md` — 1-page rollup with traffic-light verdicts

### Phase 3: VIEW FUSION

**Agent:** simon-brown
**Input:** phase-1-context/ + phase-2-extraction/
**Process:**
1. Compose structural facts into functional views
2. Generate C4 Level 2 (Container) diagram
3. Generate C4 Level 3 (Component) diagrams for key containers
4. Cross-reference context diagram with extracted dependencies

**Output:** `phase-3-fusion/`
- `c4-container.md` — Mermaid C4Container diagram
- `c4-component-{container}.md` — Component diagrams per container
- `view-consistency.yaml` — cross-reference checks between views

### Phase 4: DYNAMIC ANALYSIS (Optional — Group B, parallel with Phase 5)

**Worker:** optional (enabled only if Q8 = "include dynamic analysis")
**Input:** SOURCE_PATH + phase-2 facts
**Process:**
1. Identify entry points (main, handlers, routes)
2. Trace execution paths for key scenarios
3. Generate sequence diagrams for critical flows

**Output:** `phase-4-dynamic/`
- `sequence-{scenario}.md` — Mermaid sequence diagrams
- `entry-points.yaml` — catalogued entry points
- Note: If Q8 = skip (default), create `phase-4-dynamic/SKIPPED.md` with reason

### Phase 5: DOMAIN & DATA RECOVERY (Group B — parallel with Phase 4)

**Agents:** eric-evans, ronald-ross, michael-feathers, barbara-von-halle, graham-witt
**Input:** SOURCE_PATH + phase-2 facts (especially ER diagram and API surface)
**Process:** This is the v1 domain-decoder pipeline:
1. Evans: Map bounded contexts and ubiquitous language
2. Ross: Classify business rules (5-type taxonomy)
3. Feathers: Characterize legacy code, find hidden rules
4. von Halle: Model decisions (Decision Model)
5. Witt: Express rules in RuleSpeak (SBVR)

**Output:** `phase-5-domain/`
- `domain-map.yaml` — bounded contexts, aggregates, entities
- `rule-catalog.yaml` — classified business rules
- `decision-model.yaml` — decision tables
- `sbvr-rules.md` — natural language rule expressions
- `enforcement-gap-report.yaml` — rules not enforced in code

### Phase 6: ARCHITECTURE SYNTHESIS

**Agent:** rick-kazman
**Input:** All prior phases (0-5)
**Process:**
1. Apply Horseshoe Model: compose extracted facts into architecture
2. Run ATAM analysis: map quality scenarios to architectural decisions
3. Identify sensitivity points, tradeoff points, risks
4. Generate Arc42 documentation (§1-§12)
5. Populate Arc42 from prior phases: §3=C4 L1, §5=C4 L2+L3, §7=deployment

**Output:** `phase-6-synthesis/`
- `arc42-architecture.md` — complete Arc42 document
- `atam-analysis.yaml` — quality attribute analysis
- `risk-inventory.yaml` — sensitivity points, tradeoffs, risks
- `G3-signoff.md` — signoff template for human review

### Gate G3 — HUMAN-BLOCKING (NON-NEGOTIABLE)

After Phase 6 (Architecture Synthesis):
1. Create signoff template: `outputs/decoded/{slug}/phase-6-synthesis/G3-signoff.md`
2. **NEW v3.1 — `--with-roundtable` flag:** if passed, dispatch `/roundtable` BEFORE user review:
   - Personas: `aiox-architect`, `aiox-qa`, `aiox-devops`
   - Inputs: `arc42-architecture.md` + `atam-analysis.yaml` + `risk-inventory.yaml`
   - Output: `phase-6-synthesis/roundtable-review.md` (consensus + dissents)
   - Effect: confidence on §6/§8/§10–§12 elevates from MEDIUM to HIGH if all 3 personas converge
3. **`--auto-approve` flag:** single-pass mode — auto-fill verdict APPROVED in signoff (skip step 4–5). Use ONLY for non-production extractions.
4. **HALT pipeline** (default) — notify user with summary of findings
5. User reviews Arc42 output (and roundtable-review.md if present) and fills signoff (verdict: APPROVED / APPROVED_WITH_NOTES / REJECTED)
6. Pipeline verifies: signoff file exists AND verdict != REJECTED
7. If REJECTED → return to Phase 6 with reviewer notes
8. If APPROVED or APPROVED_WITH_NOTES → advance to Phase 7

```markdown
# G3 Architecture Review Signoff

## Reviewer: _______________
## Date: _______________

## Verdict: [ APPROVED | APPROVED_WITH_NOTES | REJECTED ]

## Notes:
_____________________________________________

## Sensitivity points reviewed: [ YES | NO ]
## Tradeoff points reviewed: [ YES | NO ]
## Risk inventory reviewed: [ YES | NO ]
```

### Phase 7: VALIDATION & CONFORMANCE

**Agent:** gail-murphy
**Input:** phase-6-synthesis/ (high-level model) + phase-2-extraction/ (actual dependencies) + ALL prior phase outputs
**Process:**
1. Define source-to-model mapping (files/packages → architectural modules)
2. Extract actual dependencies from code
3. Compute Reflexion Model: convergences (✅), divergences (❌), absences (⚠️)
4. Classify drift: structural, interface, layering, convention
5. Generate risk inventory from divergences
6. **NEW v3.1 — Internal-consistency cross-check** across all artifacts:
   - Every ADR `Decision` claim must trace to `fact-database.yaml` OR `rule-catalog.yaml`
   - Every "MUST"/"SHALL"/"NEVER" in `arc42-architecture.md` must trace to a constraint in `rule-catalog.yaml`
   - Every quality scenario in `scope-document.yaml` must appear in `atam-analysis.yaml`
   - Numeric facts (counts, line numbers, package counts) must match between `fact-database.yaml` and `arc42-architecture.md`
   - Every container in C4 L2 (`c4-container.md`) must appear in `conformance-report.yaml` source-to-model mapping
   - Output contradictions to `internal-consistency.yaml` with severity LOW/MEDIUM/HIGH

**Output:** `phase-7-validation/`
- `conformance-report.yaml` — reflexion model results
- `drift-analysis.yaml` — categorized drift with severity
- `risk-inventory-final.yaml` — consolidated risks (ATAM + conformance)
- `internal-consistency.yaml` — cross-artifact contradictions (NEW v3.1)

### Phase 8: DOCUMENTATION & DECISIONS

**Agent:** simon-brown + ADR inference
**Input:** All prior phases (0-7)
**Process:**
1. Finalize Arc42 document with conformance findings
2. Infer Architecture Decision Records (ADRs) from code patterns
3. Generate ADR library in MADR format
4. Produce final executive summary

**Output:** `phase-8-documentation/`
- `arc42-final.md` — finalized Arc42 with all sections
- `adr/` — directory of ADR markdown files (MADR format)
- `executive-summary.md` — 1-page overview for stakeholders
- `fitness-functions.yaml` — automated checks to maintain architecture

---

## AUTO-PERSISTENCE PROTOCOL

For EVERY phase, follow this exact sequence:

```
1. Create output directory:
   mkdir -p outputs/decoded/{slug}/{phase_dir}/

2. Execute the phase (spawn agent, read sources, extract/analyze)

3. Write output file(s):
   Write tool → outputs/decoded/{slug}/{phase_dir}/{filename}

4. Run phase gate:
   Bash: ls outputs/decoded/{slug}/{phase_dir}/
   Bash: wc -c outputs/decoded/{slug}/{phase_dir}/*

5. Update index:
   Edit tool → outputs/decoded/{slug}/00-extraction-index.yaml

6. ONLY THEN advance to next phase
```

---

## PHASE GATE CHECKS

Reference checklist: `.claude/skills/code-anatomist/checklists/phase-gates-G0-G4.md`

### Gate G0 (after Phase 0 — Scoping)

```bash
ls outputs/decoded/{slug}/phase-0-scoping/scope-document.yaml
wc -c outputs/decoded/{slug}/phase-0-scoping/scope-document.yaml  # > 500 bytes
grep -c "quality_scenarios" outputs/decoded/{slug}/phase-0-scoping/scope-document.yaml  # >= 1
```
Criteria: scope document exists, has quality scenarios, boundaries defined.

### Gate G1 (after Phases 1+2 — Context + Extraction)

```bash
ls outputs/decoded/{slug}/phase-1-context/c4-context.md
ls outputs/decoded/{slug}/phase-2-extraction/fact-database.yaml
wc -c outputs/decoded/{slug}/phase-1-context/c4-context.md          # > 500 bytes
wc -c outputs/decoded/{slug}/phase-2-extraction/fact-database.yaml   # > 1000 bytes
grep -c "C4Context" outputs/decoded/{slug}/phase-1-context/c4-context.md  # >= 1
```
Criteria: C4 L1 exists with Mermaid syntax, fact database has content.
Cross-check: external systems in context match integrations in extraction.

### Gate G1.5 (after Phase 2.5 — Metrics Pass) — NEW v3.1

```bash
ls outputs/decoded/{slug}/phase-2.5-metrics/metrics-summary.md
wc -c outputs/decoded/{slug}/phase-2.5-metrics/metrics-summary.md  # > 200 bytes
ls outputs/decoded/{slug}/phase-2.5-metrics/*.yaml | wc -l         # >= 3
```
Criteria: at least 3 of {coverage, dead-code, coupling-metrics, cve-report, license-audit} produced; summary references the produced metrics. Missing tools logged as `tool_unavailable: <name>` do NOT fail the gate.

### Gate G2 (after Phase 3 — View Fusion)

```bash
ls outputs/decoded/{slug}/phase-3-fusion/c4-container.md
wc -c outputs/decoded/{slug}/phase-3-fusion/c4-container.md  # > 500 bytes
grep -c "C4Container" outputs/decoded/{slug}/phase-3-fusion/c4-container.md  # >= 1
```
Criteria: C4 L2 exists, containers match tech-inventory from Phase 1.
Cross-check: every container in C4 L2 has a corresponding module in Phase 2 dependency graph.

### Gate G3 (after Phase 6 — Architecture Synthesis) — HUMAN-BLOCKING

```bash
ls outputs/decoded/{slug}/phase-6-synthesis/arc42-architecture.md
ls outputs/decoded/{slug}/phase-6-synthesis/G3-signoff.md
wc -c outputs/decoded/{slug}/phase-6-synthesis/arc42-architecture.md  # > 2000 bytes
grep -c "APPROVED" outputs/decoded/{slug}/phase-6-synthesis/G3-signoff.md  # >= 1
grep -c "REJECTED" outputs/decoded/{slug}/phase-6-synthesis/G3-signoff.md  # == 0
```
Criteria: Arc42 exists (>2KB), signoff exists with APPROVED verdict, no REJECTED.
**HALT pipeline and notify user if signoff missing or REJECTED.**

### Gate G4 (after Phase 7 — Validation)

```bash
ls outputs/decoded/{slug}/phase-7-validation/conformance-report.yaml
ls outputs/decoded/{slug}/phase-7-validation/internal-consistency.yaml
wc -c outputs/decoded/{slug}/phase-7-validation/conformance-report.yaml  # > 500 bytes
grep -c "convergence\|divergence\|absence" outputs/decoded/{slug}/phase-7-validation/conformance-report.yaml  # >= 1
grep -c "severity:.*HIGH" outputs/decoded/{slug}/phase-7-validation/internal-consistency.yaml  # SHOULD == 0 (warns if > 0)
```
Criteria: conformance report exists with reflexion model results; internal-consistency report exists. HIGH-severity contradictions emit a WARN but do NOT block the gate (advisory). MEDIUM/LOW are informational.
Cross-check: all modules from Phase 3 appear in conformance mapping.

---

## COMMAND ROUTING

### Extraction Commands (M1 — Pipeline)

| Command | Action | Phases |
|---------|--------|--------|
| `*scoping <target>` | Phase 0 only (scope & goals) | -1, 0.5, 0 |
| `*extract-arch <target>` | Architecture-focused RE | -1, 0.5, 0, 1, 2, 3, 6 |
| `*extract-deps <target>` | Dependency analysis only | -1, 0.5, 0, 2 (deps) |
| `*extract-data <target>` | Data model extraction | -1, 0.5, 0, 2 (data) |
| `*domain-only <target>` | v1 behavior (domain + rules) | -1, 0.5, 0-5 |
| `*extract-full <target>` | Complete pipeline (9 phases + Phase 2.5 metrics) | -1, 0.5, 0, 1, 2, 2.5, 3-8 |
| `*extract-full <target> --with-roundtable` | Full pipeline + 3-persona consensus at G3 | -1, 0.5, 0, 1, 2, 2.5, 3-8 |
| `*extract-full <target> --auto-approve` | Single-pass mode (auto-approves G3) | -1, 0.5, 0, 1, 2, 2.5, 3-8 |
| `*metrics <target>` | Phase 2.5 only (after extraction exists) | 2.5 |
| `*validate <target>` | Conformance check (requires Phase 6 done) | 7 |
| `*document <target>` | Generate final docs (requires Phase 7 done) | 8 |

### Analysis Commands (M2 — Compare & Audit) — RT-ARCH-BRIDGE-001

| Command | Action | Input | Output |
|---------|--------|-------|--------|
| `*compare <slug_a> <slug_b>` | Diff estrutural entre 2 extrações | 2 slugs de outputs/decoded/ | `comparisons/{slug_b}/delta-report.yaml` |
| `*compare <slug_a> <slug_b> --phase N` | Compare focado em 1 fase | 2 slugs + phase number | delta-report filtrado |
| `*compare <slug_a> <slug_b> --dim X` | Compare focado em 1 dimensão | 2 slugs + dimension | delta-report filtrado |
| `*audit [slug]` | Self-analysis contra código atual | slug (default: allfluence) | `audits/{date}/conformance-delta.yaml` |
| `*audit [slug] --scope <module>` | Audit focado em módulo | slug + module path | conformance-delta filtrado |

### Adoption Commands (M3 — Adopt) — RT-ARCH-BRIDGE-001

| Command | Action | Input | Output |
|---------|--------|-------|--------|
| `*adopt <source> <pattern> --target <module>` | Proposta formal de adoção de padrão | source slug + pattern desc + target | `adoptions/{source}-{pattern}/adoption-proposal.yaml` |

**Note:** `*adopt` gera handoff inter-BU com signoff humano obrigatório. Pipeline halts até aprovação.

### Multi-Project Workflow (wf-multi-compare)

| Command | Action | Input | Output |
|---------|--------|-------|--------|
| `*multi-compare` | Pipeline completo: N compares paralelos → consolidação → conflitos → proposta unificada | Grupos de comparação (módulos AllFluence → referências) | `multi-compare/unified-proposal.yaml` |

**Phases:** Validate → Parallel Compares → Group Consolidation → Conflict Resolution → Architecture Synthesis (HUMAN-BLOCKING) → Handoff
**Note:** G-SYNTHESIS é human-blocking. Proposta unificada inclui C4 before/after + roadmap em waves + story candidates.

### Backward Compatibility (v1 aliases)

| v1 Command | v2 Equivalent | Notes |
|------------|---------------|-------|
| `*diagnose` | `*scoping` | Phase 0 only |
| `*extract-rules` | `*domain-only --phase 2` | Phase 5 extraction |
| `*extract-full` (v1 behavior) | `*domain-only` | 5-phase domain pipeline |
| `*model-decisions` | `*domain-only --phase 3` | Phase 5 sub-step |
| `*express-rules` | `*domain-only --phase 4` | Phase 5 sub-step |
| `*validate-sbvr` | `*domain-only --phase 5` | Phase 5 sub-step |

---

## AGENT FILES

Agents are loaded from `squads/code-anatomist/agents/`:

| Phase | Agent | File | Role |
|-------|-------|------|------|
| 0 | Eric Evans | `eric-evans.md` | Domain Discovery |
| 0 | Ronald Ross | `ronald-ross.md` | Rule Taxonomy |
| 0, 6, 7 | Rick Kazman | `rick-kazman.md` | Architecture Recovery (NEW v2) |
| 1, 3, 6, 8 | Simon Brown | `simon-brown.md` | C4 Visualization (NEW v2) |
| 2, 5 | Michael Feathers | `michael-feathers.md` | Legacy Code Entry |
| 2, 5 | Data Specialist | `data-specialist.md` | ER/Schema Extraction (NEW v2) |
| 3, 5 | Barbara von Halle | `barbara-von-halle.md` | Decision Modeling |
| 5 | Graham Witt | `graham-witt.md` | Rule Expression (SBVR) |
| 2 | Martin Fowler | `martin-fowler.md` | Pattern Identification |
| 2 | James Taylor | `james-taylor.md` | DMN Formalization |
| 7 | Gail Murphy | `gail-murphy.md` | Conformance Checking (NEW v2) |
| 5 | SBVR Checklist | `checklists/sbvr-validation.md` | Validation Tool |

---

## OUTPUT TEMPLATES

Templates in `.claude/skills/code-anatomist/templates/` and `squads/code-anatomist/templates/`:

| Template | Phase | Format | Auto-generable |
|----------|-------|--------|----------------|
| `arc42-tmpl.yaml` | 6 | YAML (renders to MD) | 8/12 sections |
| `madr-tmpl.md` | 8 | Markdown (MADR) | Yes |
| `scope-document.yaml` | 0 | YAML | Partial |
| `conformance-report.yaml` | 7 | YAML | Yes |
| `component-spec.yaml` | 3 | YAML | Yes |
| `backstage-catalog.yaml.tmpl` | 8 | Multi-doc YAML | Yes |
| `delta-report-tmpl.yaml` | M2 (compare) | YAML | Yes |
| `conformance-delta-tmpl.yaml` | M2 (audit) | YAML | Yes |
| `adoption-proposal-tmpl.yaml` | M3 (adopt) | YAML | Partial |

---

## PARALLELIZATION WINDOWS

Two groups of phases can run in parallel to reduce total execution time:

### Group A (after G0, before G1)
- Phase 1: Context Recovery (simon-brown)
- Phase 2: Static Extraction (data-specialist + feathers)

Both read from SOURCE_PATH independently. G1 waits for BOTH to complete.

### Group B (after G2, before Phase 6)
- Phase 4: Dynamic Analysis (optional worker)
- Phase 5: Domain & Data (evans, ross, feathers, von-halle, witt)

Both read from SOURCE_PATH + prior phase outputs. Phase 6 waits for BOTH (or Phase 5 only if Phase 4 skipped).

---

## INDEX FILE FORMAT

`outputs/decoded/{slug}/00-extraction-index.yaml`:

```yaml
slug: "{slug}"
source: "{url_or_path}"
started_at: "{ISO timestamp}"
stack: "{detected stack}"
phases:
  phase_0:
    status: "completed|in_progress|pending|skipped"
    output_dir: "phase-0-scoping/"
    files: ["scope-document.yaml", "view-selection.yaml", "tool-plan.yaml"]
    gate: "G0 PASS"
  phase_1:
    status: "pending"
    output_dir: "phase-1-context/"
    files: []
    gate: null
  phase_2_5:
    status: "pending"
    output_dir: "phase-2.5-metrics/"
    files: []
    gate: "G1.5"
  # ... etc for all phases
current_phase: 0
gates_passed: ["G0"]
human_gates_pending: []
flags:
  with_roundtable: false   # NEW v3.1
  auto_approve: false      # NEW v3.1
```

---

## CONFIDENCE TAGGING

Every phase output MUST include a confidence tag:

| Confidence | Criteria | Action |
|-----------|----------|--------|
| HIGH | Tool-extracted data (dependency-cruiser, tbls, Prisma) | Proceed |
| MEDIUM | LLM-inferred from code reading | Flag with `[CONFIDENCE: MEDIUM]` |
| LOW | LLM-inferred without tool validation | Flag with `[CONFIDENCE: LOW]`, recommend tool verification |

When no tools are available for a phase (LLM-only mode), ALL outputs get `[CONFIDENCE: REDUCED]` header.
