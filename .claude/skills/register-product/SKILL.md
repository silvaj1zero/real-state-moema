---
name: register-product
description: "Orchestrates product marketing registration (phases 6-8 of wf-create-product-full). Produces marketing assets, runs roundtable, validates completeness."
version: "1.0.0"
owner_squad: product-squad
sinkra_tier: Tier2
context: conversation
agent: general-purpose
user-invocable: true
argument-hint: "[business_slug/product_slug] [--tier 1|2|3] [--skip-roundtable]"
depends_on: ["/roundtable"]
invokes: ["/roundtable"]
---

# /register-product — Product Marketing Registration

## Process Reference
- **Process ID:** SP-PROD-REG-001
- **Workflow:** `squads/product-squad/workflows/wf-create-product-full.yaml`
- **Parent:** SP-PRODUCT (extends phases 1-5 with marketing phases 6-8)
- **IDS Decision:** ADAPT (not CREATE)

## When to Use

After `wf-create-product` phases 1-5 complete (product exists in L3-product/ with 4 core files + registry entries), invoke this skill to upgrade the product from Tier 1 (Registered) to Tier 2 (Vendavel) or Tier 3 (Enterprise-grade).

Can also be used to remediate existing products that are below Tier 1.

## Arguments

```
/register-product aiox/aiox_enterprise --tier 3
/register-product allfluence/ttcx --tier 2
/register-product --audit                        # Audit all products, show completeness
```

- `business_slug/product_slug` — target product (required unless --audit)
- `--tier 1|2|3` — target completeness tier (default: 2)
- `--skip-roundtable` — skip phase 7 (for Tier 2 only, Tier 3 always requires roundtable)
- `--audit` — run `scripts/validate-product-completeness.js` and show report

## Pre-conditions

1. Product directory exists under `AIOX_BUSINESS_WORKSPACE_ROOT/{biz}/L3-product/{slug}/` (fallback display path: `workspace/businesses/{biz}/L3-product/{slug}/`)
2. At minimum, `offerbook.yaml` exists (can be stub)
3. Business workspace is bootstrapped (L0-L4 structure exists)
4. Resolve physical paths through `packages/core/workspace-root/resolve.cjs`; do not assume the multi-tenant checkout is the business workspace root.

## Pipeline (3 Phases)

### Phase 6: Marketing Asset Production

**Executor:** Cross-squad parallel (Hormozi + Copy + COO)

1. **Read context:**
   - `workspace/businesses/{biz}/L3-product/{slug}/offerbook.yaml`
   - `workspace/businesses/{biz}/L1-strategy/icp.yaml`
   - `workspace/businesses/{biz}/L1-strategy/pricing-strategy.yaml`
   - `workspace/businesses/{biz}/L0-identity/company-dna.yaml`
   - `workspace/businesses/{biz}/L0-identity/founder-dna.yaml`

2. **Create/update core files (if missing):**
   - `icp.yaml` — Product-level ICP (use template: `workspace/_templates/product-template-v1/icp.yaml`)
   - `curriculum.yaml` — Delivery format
   - `proof.yaml` — Evidence and case studies
   - `testimonials.yaml` — Social proof (3 tiers)
   - `adoption-signals.yaml` — Activation metrics
   - `onboarding-flow.yaml` — Day-by-day protocol

3. **Launch 3 parallel agents (Tier 2+):**

   **Agent 1 — Hormozi Chief** (if Tier 3):
   ```
   Agent(subagent_type="hormozi", prompt="Analyze {product} offerbook and generate hormozi-analysis.yaml with: 15+ hooks, Big Idea (3 versions), Value Equation breakdown, Grand Slam restructure, 10+ tribal terms, 10+ objection destroyers. Output: L3-product/{slug}/narrative/hormozi-analysis.yaml")
   ```

   **Agent 2 — Copy Chief:**
   ```
   Agent(subagent_type="copy-chief", prompt="Generate marketing narrative for {product}. Create: brandscript.yaml (StoryBrand 7 elements), product-story.yaml (origin story), pitch-narrative.yaml (elevator + full pitch + key quotes). If Tier 3: also landing-page-copy.yaml, email-sequence.yaml, faq-assincrono.yaml. Output: L3-product/{slug}/narrative/")
   ```

   **Agent 3 — COO (VoC Enrichment)** (if transcriptions available):
   ```
   Agent(prompt="Extract voice of customer from provided transcriptions. Categorize: testimonials, emotional moments, objections, buying signals, projects built. Output: L3-product/{slug}/voice-of-customer.yaml + data/marketing-quotes-curated.yaml")
   ```

4. **Gate QG-MKT-001:** Check minimum assets produced
   - Tier 2: 6+ files
   - Tier 3: 14+ files

### Phase 6b: Extended Registry Sync

1. **Update document-registry.yaml** — Add entries for ALL new files (not just offerbook)
2. **Update pricing-strategy.yaml** — Ensure product section exists with pricing model
3. **Update offerbook.yaml index** — Add product entry with data_files references
4. **Update company-dna.yaml** — Add product to portfolio with revenue estimate

5. **Gate QG-REG-002-EXT:** Verify 4/4 registries reflect all files

### Phase 7: Roundtable Gap Analysis (Tier 3 only)

1. **Invoke /roundtable** with mode=gap_analysis:
   ```
   Skill("roundtable", args="gap_analysis for {biz}/{slug} product registration")
   ```
   Panel: CSO, PO, Architect, CMO, SINKRA-Chief

2. **Gate QG-MKT-002:**
   - Score >= 6.0 AND BLOCKERs == 0: PASS
   - Score < 4.0: VETO → return to Phase 6
   - Score 4.0-5.9: fix BLOCKERs, re-evaluate

### Phase 8: Validation & Closure

1. **Run completeness validator:**
   ```bash
   node scripts/validate-product-completeness.js --product {biz}/{slug} --json
   ```

2. **If LP exists:** Audit LP vs workspace (compare claims, pricing, features)

3. **Generate pending decisions** (if any unresolved items):
   - `data/decisoes-pendentes.yaml`
   - `data/founder-credibility-links.yaml` (Tier 3)

4. **Gate QG-MKT-003:**
   - Tier 2: completeness >= 45%
   - Tier 3: completeness >= 80% AND roundtable >= 6.0

5. **Report final status to user**

## Completeness Tiers

| Tier | Name | Min Files | Registries | Phases Used |
|------|------|-----------|------------|-------------|
| 1 | Registered | 4 | 1+ | wf-create-product (1-5) |
| 2 | Vendavel | 10 | 4/4 | + Phases 6, 6b, 8 |
| 3 | Enterprise-grade | 18+ | 4/4 + 10 entries | + Phases 6, 6b, 7, 8 |

## YAML Validation

After ALL file creation/edits, validate:
```bash
node -e "const y=require('js-yaml'),f=require('fs');y.load(f.readFileSync('{path}','utf8'));console.log('OK')"
```

## Output

Final report with:
- Files created/updated (list)
- Completeness score (% and tier)
- Registry status (4/4)
- Roundtable score (if Tier 3)
- Pending decisions (if any)
- Next steps (what's needed to reach next tier)
