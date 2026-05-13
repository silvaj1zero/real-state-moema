---
paths:
  - ".claude/rules/mind-*.md"
  - "minds/*/heuristic-hints.yaml"
---

# Mind Rules Governance — Sinkra Hub

Governance for the Mind Lens System (MLS). Defines how mind-heuristics are exposed as path-scoped rules that activate **framing lenses** during edit of specific artifacts.

## When this applies

Applies when creating, editing, or reviewing:
- `.claude/rules/mind-*.md` (activation contracts)
- `minds/*/heuristic-hints.yaml` (hint SOT files)

## Design principles (5 non-negotiables)

From research `docs/research/2026-04-14-context-engineering-heuristic-activation/` + roundtable `docs/architecture/roundtable-mind-rules-implementation-2026-04-14.md`:

### 1. Lens format, not persona swap

**WRONG:** "You are Alex Hormozi. Answer as he would."

**RIGHT:** "Apply these Hormozi analysis lenses. You remain Claude."

**Rationale:** USC research 2026 — persona swap degrades factual accuracy (-3.6 pp MMLU). Lens format preserves accuracy while adding useful framing.

### 2. Safe contexts only

Paths MUST match **artifacts of thought** (offerbook, icp, adrs, roundtables, strategy docs). Paths MUST NOT match **execution code** (`.ts`, `.py`, `.sql`, migrations, tests, deployments).

Code correctness is factual recall — persona interference harms it. Strategy framing benefits from distinct perspectives.

### 3. Budget cap: max 3 simultaneous rules

Anthropic empirical limit: 150-200 instructions before LLM accuracy degrades. System baseline ~50. Mind rules must cap at 3 concurrent activations.

If a path naturally activates 4+ mind rules, split the path or consolidate the lenses.

### 4. Counter schema (ACE-inspired)

Every rule declares `counter: {helpful: N, harmful: N}` in frontmatter. Every hint entry in `heuristic-hints.yaml` has same fields.

Manually incremented by operators over time. Rules with `harmful > helpful × 2` after 3 months are candidates for deprecation.

### 5. Derivation classification

Every rule declares `derivation: success | failure` in frontmatter.

- **success:** lens teaches "what to do" (apply Grand Slam formula, empilhar valor). Better for execution contexts.
- **failure:** lens teaches "what to avoid" (bias check, inversion). Better for exploration contexts (ADRs, roundtables).

Evidence: ERL paper arXiv 2603.24639 — failure-derived heuristics +14% in search tasks, success-derived +9% in execution tasks.

### 6. Lens vs Agent separation (suggested_agent field)

Mind rules são **lentes leves** que ativam automaticamente no flow de edição. Quando o operador precisa de **escopo maior** (rebuild completo de oferta, audit cross-artifact, copy de VSL longa), a rule deve sugerir o **agente correlato** (ex: `@hormozi-chief`).

Princípio: **lens é horizontal (framing 1-shot), agent é vertical (orquestração multi-fase).** São complementares, não concorrentes.

Implementação:

- Frontmatter: campo opcional `suggested_agent: {name, skill, invocation, when_to_escalate}`
- Body: seção "Quando escalar para `@<agent>`" com cenários concretos
- Signal tag: incluir `escalation: /<command>` para visibilidade

Anti-pattern: tentar fazer a rule **spawnar o agente automaticamente** (perigoso — quebra USC research lightweight principle, custa orders of magnitude mais tokens, perde controle do operador).

Evidence: USC research — full persona swap degrada accuracy técnica. Lens preserva accuracy. Agent invocation explícita preserva controle.

## File structure

### `minds/{mind_slug}/heuristic-hints.yaml` — SOT for surfaced hints

```yaml
---
mind: <mind_slug>
version: "1.0.0"
last_reviewed: "<ISO date>"
purpose: "Brief description of what these hints surface."

hints:
  - id: <MIND_INITIALS>_KE_NNN
    label: "Short descriptive name"
    derivation: success | failure
    context: [tag1, tag2]     # offer, pricing, decision, copy, etc.
    helpful: <integer>
    harmful: <integer>
    full_ref: minds/<mind_slug>/heuristics/<ID>.md
    lens: |
      Short distilled framing (3-5 lines).

counters_protocol:
  description: "How to update counters"
  review_cadence: "trimestral"
  deprecation_threshold: "harmful > helpful × 2 after 3 months"
```

### `.claude/rules/mind-{mind_slug}-{context}.md` — activation contract

```markdown
---
paths:
  - "<glob pattern 1>"
  - "<glob pattern 2>"
mind_ref: <mind_slug>
context: <context_tag>
derivation: success | failure
hints_file: minds/<mind_slug>/heuristic-hints.yaml
suggested_agent:                          # OPTIONAL — escalation hint
  name: <agent_id>                        # ex: hormozi-chief
  skill: <skill_id>                       # ex: hormozi-chief (skill name if exists)
  invocation: "/<command>"                # ex: "/hormozi-chief"
  when_to_escalate:
    - "<scenario where lens is insufficient>"
counter:
  helpful: 0
  harmful: 0
---

# <Mind Name> Lens — <Context>

[2-3 sentences introducing the lens, emphasizing non-replacement of Claude]

## Top 3 lenses immediately
[Destilação curada de 3-5 hints do hints.yaml, em formato acionável]

## Quick checklist
[Bullet list of questions the operator should ask while editing]

## For deeper detail
[Pointer to minds/<mind_slug>/heuristics/ for full reasoning]

## Anti-patterns this lens PREVENTS
[3-5 things this framing helps avoid]
```

## Naming convention

`.claude/rules/mind-{mind_slug}-{context}.md`

- `mind_slug` matches directory name under `minds/` (e.g., `alex_hormozi`, `naval_ravikant`, `charlie_munger`)
- Shortening acceptable for common cases: `hormozi`, `naval`, `munger`
- `context` is a single-word tag matching actual activation domain: `offer`, `leverage`, `decision`, `copy`, `process`

One mind can have multiple rules if it operates in distinct contexts:
- `mind-hormozi-offer.md` (activating on offerbook/pricing)
- `mind-hormozi-acquisition.md` (activating on funnel/leadgen) — future

## Lifecycle

| Stage | Criteria | Gate |
|-------|---------|------|
| Draft | Rule file created, not yet merged | — |
| Pilot | Merged, counters at 0, <30 days usage | Informal review |
| Active | Has activation logs, counters incremented | CSO review if `harmful>0` |
| Deprecating | `harmful > helpful × 2` for 90 days | CSO decision |
| Archived | Moved to `.claude/rules/archive/` | CSO approval |

## Validation checks (to implement as validators)

- [ ] Rule has `paths:` frontmatter (required)
- [ ] Rule has `mind_ref:` matching a real dir under `minds/`
- [ ] Rule has `hints_file:` pointing to existing `heuristic-hints.yaml`
- [ ] Rule has `derivation: success|failure`
- [ ] Rule has `counter: {helpful, harmful}`
- [ ] Rule is ≤ 80 lines (budget cap)
- [ ] No path matches `.ts|.py|.sql|migrations|test|spec` (safe contexts enforcement)
- [ ] Rule content does NOT contain "você é" / "you are" followed by a name (lens format enforcement)
- [ ] `hints_file` has `hints[]` array with each entry having `id`, `label`, `derivation`, `full_ref`

Script placeholder: `scripts/validate-mind-rules.js` (to be implemented when ≥3 mind rules exist).

## Who owns what

| Artifact | Owner | Approval |
|----------|-------|----------|
| `minds/{slug}/heuristic-hints.yaml` | Mind owner (e.g., @oalanicolas for alan_nicolas) | Mind owner |
| `.claude/rules/mind-{slug}-{context}.md` | Rule author | @cso gate for first rule per mind |
| This governance doc | @cso | Roundtable if changed materially |
| Counter updates | Operators during usage | No gate (operational tracking) |
| Deprecation decisions | @cso | Trimestral review |

## Anti-patterns

### AP-1: Rule that copies full heuristic content

Violates AN_KE_037 (Single Source of Truth). Rule should be **activation contract**, not content duplication. Full content lives in `minds/{slug}/heuristics/*.md`.

### AP-2: Paths that match execution code

USC research — persona injection degrades factual accuracy. Code paths must never activate mind rules.

### AP-3: Persona swap instead of lens

"Você é Hormozi" degrades output. Always frame as "apply these Hormozi lenses while remaining Claude."

### AP-4: Reinventing Council of Nine / ACE

Those exist and solve different problems. MLS is specifically **path-triggered lens injection**, not full deliberation. See `docs/research/2026-04-14-context-engineering-heuristic-activation/04-deep-dive-opensource-papers.md`.

### AP-5: Auto-generating rules from all heuristics

Research prescribes manual curation of top 3-5 per context. Auto-gen from the full 154 AN_KE corpus would violate budget cap and surface weak/irrelevant content.

## When to promote to OPT-C (generator)

Current state is OPT-B (manual curation, thin rules pointing to hints files).

Upgrade to OPT-C (auto-generated rules from hints files) is justified only when:

1. There are ≥20 active mind rules (scale)
2. There are ≥100 hints entries across all `heuristic-hints.yaml` (volume)
3. Manual curation time exceeds 2h/month (friction)
4. Counter data shows consistent patterns (automation signal)

Until then, OPT-B is explicitly chosen. See roundtable rationale.

## References

- Research: `docs/research/2026-04-14-context-engineering-heuristic-activation/`
- Roundtable: `docs/architecture/roundtable-mind-rules-implementation-2026-04-14.md`
- Research papers: ERL (arXiv 2603.24639), ACE (arXiv 2510.04618), USC persona research (2026)
- Related rules: `script-security.md`, `artifact-classification.md`, `story-prototyping.md`
- Related skills: `synapse` (complementary context engine), `extract-session-heuristics` (SOT pipeline)
