---
paths:
  - "workspace/**"
  - "packages/**"
  - "apps/**"
  - "CODEOWNERS"
  - ".github/CODEOWNERS"
  - "infrastructure/sync/**"
---

# Hub Governance Rules — Sinkra Hub

Applies to all files in the repository.

## CODEOWNERS Enforcement

- Shared paths require 2/3 founder approval
- Business paths require only the business owner
- Shared products require all founders/stakeholders approval
- NEVER modify another business's workspace data without explicit permission

## Business Isolation

- Each business has its own workspace with L0-L4 layers
- Business data NEVER leaks to other businesses
- Cross-business operations go through squads/services, never direct access
- Supabase projects are separate per business

## Product Architecture

### Level 1 (Shared Products)

- Path: `workspace/shared-products/` (neutral, cross-business — per governance-journal 2026-03 decision)
- Sold by: Designated commercial BU (configured per business in L1-strategy/)
- Revenue: Split configured per business partnership agreement
- Governance: All founders/stakeholders approve changes (CODEOWNERS: all founders)
- Rationale: Products MUST NOT live under a single business path — neutral location reflects shared ownership

### Level 2 (Individual Products with Upsell)

- Path: `workspace/businesses/{slug}/L3-product/product-catalog.yaml`
- Flag: `shared_for_upsell` (true/false)
- Connection: Customer Success channel only (not commercial BU)
- Finder's fee: Configured per business in `L1-strategy/pricing-strategy.yaml`
- Governance: Business owner only

## Package Publishing

- All shared packages use @sinkra/ scope
- Published via GitHub Package Registry (private)
- Semantic versioning: major for breaking, minor for features, patch for fixes
- Release via git tags (v*)

## Squads PII Boundary (ADR-SQUAD-PII-POLICY)

Squads em `squads/**` classificam-se em duas categorias:

- **Identity-Bound** (`identity_bound: true` em `config.yaml`): squad cuja identidade É a pessoa (sinkra-squad/Pedro, advisory-board/Alan, squad-creator-pro/Pedro+Thiago, minds/{slug}/). PII é permitida e esperada.
- **Operational** (default, `identity_bound: false`): squad genérico, agnóstico de pessoa. PII proibida — usar slot abstrato (`{steward}`, `{accountable}`) resolvido via `workspace/businesses/{slug}/L0-identity/people/_registry.yaml`.

Detalhes operacionais: `.claude/rules/squads-pii-policy.md`. ADR autoritativa: `docs/architecture/adrs/ADR-SQUAD-PII-POLICY.yaml`.
