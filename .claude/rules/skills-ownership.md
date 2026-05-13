---
paths:
  - ".claude/skills/**"
  - ".aiox/active-operator.yaml"
  - ".aiox/active-operator.example.yaml"
  - "scripts/sinkra-operator.js"
  - "minds/**"
---

# Skills Ownership Resolution — Sinkra Hub

Applies when a skill needs to resolve operator identity, namespace, or any owner-derived value at runtime.

## Rule (NON-NEGOTIABLE)

Skills MUST read ownership state from `.aiox/active-operator.yaml` as the **first step** of runtime initialization. Cascading inference (context, working directory, last-commit author, git config, etc.) is allowed **ONLY** as emergency fallback when the canonical file is absent or inconsistent.

**Important:** `.aiox/active-operator.yaml` is **LOCAL and gitignored** — it is individual per checkout. What is committed is `.aiox/active-operator.example.yaml` (schema/template). The canonical file is **bootstrapped** on first use via cascade fallback + write-back, or manually via `npm run sinkra:operator -- set <slug>`.

## Canonical File

**Path:** `.aiox/active-operator.yaml`

**Schema (v1.0.0):**

```yaml
schema_version: "1.0.0"
operator:
  slug: "alan_nicolas"                             # snake_case filesystem-safe identifier
  handle: "@oalanicolas"                           # @-prefixed handle used in text (identity, preserved)
  display_name: "Alan Nicolas"                     # human name for display
  heuristic_id_prefix: "AN_KE"                     # prefix for heuristic family
  heuristic_namespace: "minds/alan_nicolas"
  heuristic_count: 152                             # last-known filesystem count
  last_heuristic_id: "AN_KE_152"
  next_heuristic_id: "AN_KE_153"                   # pre-computed next available
  mind_type: "knowledge-architect"
  mind_status: "active"
metadata:
  created_at: "2026-04-11T00:00:00Z"
  last_updated: "2026-04-11T00:00:00Z"
  last_updater: "alan_nicolas via STORY-MIG-1.13 initial population"
  source_story: "STORY-MIG-1.13"
  source_heuristic: "AN_KE_152"
```

## How Skills Load Ownership

1. Read `.aiox/active-operator.yaml` as **Phase 0.5** (before any main pipeline phase)
2. Parse YAML, extract `operator.*` fields
3. Validate: `heuristic_namespace` exists as directory; `heuristic_count` roughly matches filesystem scan (warn on drift > 10%)
4. Use values directly — **skip** any cascade inference
5. If file missing/malformed → emergency fallback (cascade) → on successful cascade, WRITE resolved values back to the file

## Canonical Setter and Getter

**Setter (NEVER manually edit the file):**

```bash
npm run sinkra:operator -- set <slug>
```

**Getter:**

```bash
npm run sinkra:operator -- get
# OR
cat .aiox/active-operator.yaml
```

**Refresh (re-scan filesystem for counts):**

```bash
npm run sinkra:operator -- refresh
```

**List available operators:**

```bash
npm run sinkra:operator -- list
```

Script source: `scripts/sinkra-operator.js` (Node, zero external deps beyond `js-yaml`).

## Rationale

See heuristics:

- **AN_KE_152** — Runtime Ownership via Persistent State (Genialidade). Architectural rationale: re-inferring ownership every invocation is non-deterministic and produces silent errors across invocations. Persistent state is mechanism; cascade is aspiration.
- **AN_KE_147** — Principle is Aspiration, Enforcement is Mechanism (Genialidade). Broader principle: every declared rule must map to an enforcement mechanism or be marked as guidance-only. This rule is the mechanism for AN_KE_152.

See story: **STORY-MIG-1.13** (Persistent Ownership State for Runtime Skill Resolution).

## Exemptions

- **Operator-agnostic skills** (e.g. `/validate-yaml`, `/doctor`, `/doctor-minds`, generic validators) do NOT need to resolve owner and may skip this rule entirely.
- **CI contexts** where `.aiox/active-operator.yaml` may not exist should use cascade fallback with **explicit logging** — `log.warn("canonical operator file missing, using cascade")`. The file should still be committed so CI reads the default operator.
- **Multi-operator sessions** (ex: pair programming with shared ownership) are not supported by the current schema. If needed, treat as single-operator via convention and add a `co_operators` field as a v1.1 schema extension.

## Enforcement

Currently:

- **Documented** in this rule file
- **Invoked** by `extract-session-heuristics/SKILL.md` Phase 0.5 (v3.5.0+)
- **Setter available** via `npm run sinkra:operator`

Planned (follow-up stories):

- `validate-skills.js` check that flags new skills which re-infer ownership without consulting this file
- Pre-push hook warning when `.aiox/active-operator.yaml` has `last_updated` > 30 days old (stale operator)

## Skills Known to Implement This Pattern

| Skill | Version | Phase | Runner |
|---|---|---|---|
| `extract-session-heuristics` | 3.6.0+ | Phase 0.5 — Runtime Owner Load | Yes — `scripts/runner.js bootstrap` + `status` + `scan` |

Skills to migrate as they encounter the need:

- `squad-creator` family (when resolving which minds namespace to scaffold into)
- Any future skill that writes to `minds/{slug}/` or similar owner-keyed directory

## Skill Runners (script helpers)

A skill pode ter um runner helper em `scripts/runner.js` (ou equivalente) que executa os passos determinísticos da pipeline. O runner **nunca substitui** o LLM nas partes cognitivas — só elimina toil em:

- Read/write de arquivos canônicos (`.aiox/active-operator.yaml`, decision-cards, etc)
- Filesystem scans e drift detection
- Grep/regex-based validation (compliance gates, template checks)
- YAML atomic round-trips
- Jaccard similarity / token overlap / mechanical dedup

O runner **nunca** classifica semanticamente, gera texto, ou infere significado. Essas responsabilidades são do LLM lendo o contexto da sessão.

Primeiro exemplo: `extract-session-heuristics/scripts/runner.js` — ver STORY-MIG-1.13 AC-11 a AC-14 para o responsibility split completo.

## Anti-Patterns

- **Re-inferring owner via cascade every invocation** — produces non-determinism (AN_KE_152 violation)
- **Persisting the same information in N different files** — drift between skills
- **Using `git config user.email` as canonical source** — email is not a valid slug, and multiple collaborators can share checkouts
- **Using `$USER` environment variable** — breaks in CI and Docker contexts
- **Assuming "Claude always resolves correctly"** — Claude is stochastic, not mechanism (AN_KE_147 violation)

---

*Rule created 2026-04-11 as part of STORY-MIG-1.13 implementation. Traced to AN_KE_152 and AN_KE_147.*
