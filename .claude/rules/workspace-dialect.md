---
paths:
  - "squads/**/*.yaml"
  - "squads/**/*.yml"
  - "squads/**/templates/**"
  - "squads/**/data/**"
  - "squads/**/tasks/**"
  - "squads/**/workflows/**"
  - "squads/**/scripts/**"
  - "workspace/**"
---

# Workspace Dialect — L0-L4 Canonical (NON-NEGOTIABLE)

Applies to all files in `squads/**`.

## Rule

**Squads MUST use the L0-L4 canonical workspace dialect.**

The workspace model is defined in `workspace/_system/config.yaml` with layers `L0-identity`, `L1-strategy`, `L2-tactical`, `L3-product`, `L4-operational`. The legacy dialect inherited from `aiox-stage` (`company/`, `products/`, `copy/`, `brand/`, `design/`, `movement/`, `pitch-deck/`, `content/`, `operations/` at the business root) is **forbidden** in active squad code.

## Canonical Mapping

| Legacy (FORBIDDEN) | Canonical |
|--------------------|-----------|
| `workspace/businesses/{biz}/company/company-profile.yaml` | `workspace/businesses/{biz}/L0-identity/company-dna.yaml` |
| `workspace/businesses/{biz}/company/founder-dna.yaml` | `workspace/businesses/{biz}/L0-identity/founder-dna.yaml` |
| `workspace/businesses/{biz}/company/icp.yaml` | `workspace/businesses/{biz}/L1-strategy/icp.yaml` |
| `workspace/businesses/{biz}/company/offerbook.yaml` | `workspace/businesses/{biz}/L1-strategy/offerbook.yaml` |
| `workspace/businesses/{biz}/company/pricing-strategy.yaml` | `workspace/businesses/{biz}/L1-strategy/pricing-strategy.yaml` |
| `workspace/businesses/{biz}/company/legal/**` | `workspace/businesses/{biz}/L0-identity/legal/**` |
| `workspace/businesses/{biz}/operations/` | `workspace/businesses/{biz}/L1-strategy/` |
| `workspace/businesses/{biz}/analytics/` | `workspace/businesses/{biz}/L1-strategy/analytics/` |
| `workspace/businesses/{biz}/brand/**` | `workspace/businesses/{biz}/L2-tactical/brand/**` |
| `workspace/businesses/{biz}/design/**` | `workspace/businesses/{biz}/L2-tactical/design/**` |
| `workspace/businesses/{biz}/movement/**` | `workspace/businesses/{biz}/L2-tactical/movement/**` |
| `workspace/businesses/{biz}/products/{p}/**` | `workspace/businesses/{biz}/L3-product/{p}/**` |
| `workspace/businesses/{biz}/copy/{camp}/**` | `workspace/businesses/{biz}/L4-operational/campaigns/{camp}/**` (ADR-012) |
| `workspace/businesses/{biz}/content/**` | `workspace/businesses/{biz}/L4-operational/content/**` |
| `workspace/businesses/{biz}/pitch-deck/**` | `workspace/businesses/{biz}/L4-operational/pitch-deck/**` |

## Enforcement

Enforced by `scripts/validate-workspace-dialect.js`:

| Command | Scope |
|---------|-------|
| `npm run validate:workspace-dialect` | Scan `squads/**` for forbidden patterns (exit 1 on violation) |
| `npm run test:workspace-dialect` | Run synthetic test suite (29 tests) |

Integrated into:
- `.claude/hooks/pre-push-validation.sh` (step 7 — BLOCK)
- `scripts/doctor.js` (as part of overall health check)
- CI `ci-gate.yml` (planned)

## Allowlist

Legitimate exceptions are listed in `.workspace-dialect-allowlist.yaml` at repo root.

**Adding an entry requires approval from `@architect`.**

Schema:

```yaml
entries:
  - path: "relative/path/from/root"    # exact path or prefix ending in /**
    reason: "why this legitimately references legacy dialect"
    approved_by: "@architect handle"
    expires: "YYYY-MM-DD"               # optional; strict enforcement
```

Valid allowlist categories:
1. **Validators that DETECT legacy dialect** (like `squads/brand/scripts/validate-brand-essentials.sh`)
2. **Documentation that shows before/after migration** (like `docs/stories/epic-120/**`, ADRs)
3. **Audit/report files** (like `outputs/qa/workspace-l0l4-migration-audit-*.md`)
4. **Archive directories** (like `squads/*/archive/**`)

Invalid categories (reject by default):
- Active squad code that still uses legacy paths — migrate instead
- Generated outputs that leak into squads — fix the generator
- "Temporary" entries without expiration — set an expires date

## References

- **Rule:** This file
- **Validator:** `scripts/validate-workspace-dialect.js`
- **Allowlist:** `.workspace-dialect-allowlist.yaml`
- **Test suite:** `scripts/tests/validate-workspace-dialect.test.js`
- **Epic:** `docs/stories/epic-120/EPIC-120-WORKSPACE-L0L4-SQUAD-MIGRATION.md`
- **Story:** `docs/stories/epic-120/STORY-120.6-WORKSPACE-DIALECT-GATE.md`
- **ADR:** `docs/adrs/ADR-012-campaign-canonical-layout.md` (for L4-operational/campaigns/)
- **System config:** `workspace/_system/config.yaml` (layer definitions)
- **Canonical rule:** `.claude/rules/artifact-classification.md` (decision tree)
