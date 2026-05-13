# Squads & PII — Identity-Bound vs Operational

Applies when creating, modifying, or auditing any squad in `squads/**` (including agents, tasks, workflows, data, templates).

## Rule (NON-NEGOTIABLE)

**Squads fall into two categories. Each has different rules for PII (real person identifiers, emails, voice DNA, heuristics).**

### Category 1 — Identity-Bound Squads (PII permitted)

Squad whose **identity IS the person**. Their voice, heuristics, and decisions are the squad's product.

**Manifest required** in `squads/{name}/config.yaml`:

```yaml
identity_bound: true
identity_source:
  type: person | mind        # 'person' = workspace registry, 'mind' = DNA Mental pack
  refs:
    - workspace/businesses/{slug}/L0-identity/people/{person_id}.yaml   # for type=person
    - minds/{slug}/                                              # for type=mind
```

**Examples (canonical):**

| Squad | Person | Why identity-bound |
|-------|--------|---------------------|
| `squads/sinkra-squad` | pedro-valerio | Sinkra is Pedro's methodology |
| `squads/squad-creator-pro` | pedro-valerio + alan-nicolas + thiago-finch | Three cognitive clones (Pedro/Alan/Thiago) for squad creation roundtables; data dirs include `an-*.yaml` (Alan), pv heuristics (Pedro), tf heuristics (Thiago) |
| `squads/advisory-board` | alan-nicolas | Profile-driven advisory loader |
| `minds/{slug}/*` | each | DNA Mental — by design |

**What's allowed inside Category 1:**
- `Human:{person_id}` references (kebab-case)
- Emails matching the person's record (sanitization is a publishing concern, not a squad concern)
- Voice DNA, heuristics, decision cards, archetype refs
- Agent files named after the person (e.g., `pedro-valerio.md`)

### Category 2 — Operational Squads (PII forbidden)

Squad whose function is **generic**. Person executing it is a **slot**, not part of identity.

**Manifest required** (default, can be omitted):

```yaml
identity_bound: false   # default
```

**Examples:**

| Squad | Why operational |
|-------|-----------------|
| `squads/google-workspace-squad` | Drive automation — agnostic of executor |
| `squads/course-creator` | Generic course factory |
| `squads/sop-chief` | Generic SOP factory |
| `squads/content-geo` | Generic content pipeline |

**What's FORBIDDEN inside Category 2:**
- Hardcoded `Human:{person_id}` (any case) referencing real registry persons
- Direct person email literals (`alan@alanicolas.com`, `pedro@allfluence.com`, ...)
- Agent files named after real persons
- Role/voice DNA references to specific people

**What's REQUIRED instead — Slot Pattern:**

```yaml
# WRONG (Category 2 with PII)
steward: "Human:pedro-valerio"
accountable: "Human:alan-nicolas"

# RIGHT (Category 2 with abstract slot)
steward: "{cso}"            # role-based slot, resolved at runtime
accountable: "{accountable}" # generic slot, must be supplied by mission/task

# RIGHT (slot resolution contract)
slot_resolution:
  source: workspace/businesses/{slug}/L0-identity/people/_registry.yaml
  cso: lookup person where roles[].title contains "CSO" AND primary=true
  accountable: provided per-task
```

## Decision Tree (when creating/modifying a squad)

```
Estou criando ou modificando um squad e preciso referenciar uma pessoa específica?
├── O squad TEM identity_bound:true em config.yaml?
│   ├── SIM → permitido referenciar persons listadas em identity_source
│   │
│   └── NÃO →
│       ├── A squad é claramente uma extração da pessoa (clone, voice, methodology)?
│       │   ├── SIM → adicionar identity_bound:true + identity_source ANTES de referenciar
│       │   └── NÃO → usar slot abstrato. NUNCA hardcode person_id.
```

## Validation

| Check | Tool | Mode |
|-------|------|------|
| Squad config has `identity_bound` field if person_id referenced | `validate:squad-pii` | advisory → blocking after grace |
| `identity_source` paths exist | `validate:squad-pii` | advisory |
| No real emails in Category 2 squads | `validate:squad-pii` (regex) | advisory |
| Slot pattern correctness in Category 2 | `validate:squad-pii` (heuristic) | advisory |

Script: `scripts/validate-squad-pii.js`

Integration roadmap:
1. **Phase 1 (current):** advisory only — flags violations, doesn't block
2. **Phase 2 (after audit):** blocking on push for Category 2 violations
3. **Phase 3 (steady state):** part of `npm run doctor`, blocks pre-push if config or PII violations

## Examples (canonical)

### Identity-Bound (correct)

```yaml
# squads/sinkra-squad/config.yaml
name: sinkra-squad
identity_bound: true
identity_source:
  type: person
  refs:
    - workspace/businesses/{slug}/L0-identity/people/pedro-valerio.yaml

# Inside data files — references to pedro-valerio are LEGITIMATE
# squads/sinkra-squad/data/composition-rules.yaml
openclaw_composition:
  identity:
    owner: "Human:pedro-valerio"   # OK — declared as identity_source
```

### Operational with slot (correct)

```yaml
# squads/google-workspace-squad/config.yaml
name: google-workspace-squad
identity_bound: false   # explicit, optional

# Inside agent
# squads/google-workspace-squad/agents/drive-automator.md
operation_result:
  accountability:
    steward: "{drive_steward}"     # slot, resolved per-context
    approved_by: "{approver}"
```

### Operational with PII (forbidden)

```yaml
# WRONG — squads/google-workspace-squad/agents/drive-automator.md
operation_result:
  accountability:
    steward: "Human:pedro-valerio"   # ❌ FAIL — no identity_bound declared
```

## Why this matters

1. **Portability:** Operational squads coupled to founders break when founders rotate or new founders join.
2. **Privacy:** Squads may be published as `@sinkra/core` packages. Hardcoded PII leaks.
3. **Offboarding:** When someone leaves, you only edit identity-bound squads (intentional knowledge bases) — operational squads keep running with new slot resolution.
4. **Discoverability:** Reviewers can audit "which squads encode personal knowledge" by grepping `identity_bound: true`.

## Cross-references

- **ADR (authoritative):** `docs/architecture/adrs/ADR-SQUAD-PII-POLICY.yaml`
- **Related rules:**
  - `.claude/rules/artifact-classification.md` — adds "PII allowed?" column
  - `.claude/rules/hub-governance.md` — Squads PII Boundary section
  - `.claude/rules/identity-vs-slug.md` — Category 1 squads are exception to global slug-rename rule
- **Related ADRs:** `ADR-GAP009-people-team-registry.yaml` (people-registry concept that slot resolution reads from)

## Open questions (under review)

See `docs/architecture/adrs/ADR-SQUAD-PII-POLICY.yaml#open_questions` — `minds/{slug}/` classification, gray-case agent naming, pedagogical templates.
