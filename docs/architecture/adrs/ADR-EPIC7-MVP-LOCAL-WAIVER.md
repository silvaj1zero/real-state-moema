# ADR-EPIC7-MVP-LOCAL-WAIVER — Epic 7 MVP-Local Waiver (counsel-signature deferred)

- **Status:** ACCEPTED
- **Date:** 2026-05-24
- **Authorized by:** Founder (Zero)
- **Owners:** @architect (Aria), @pm (Morgan)
- **Scope:** Epic 7 (Inteligência de Prospecção Automatizada Multi-Fonte) — Wave A only
- **Supersedes / amends:** Story 7.10 QA gate (`docs/qa/gates/7.10-lgpd-foundation.yml`) AC1 blocker; Story 7.4 QA gate (`docs/qa/gates/7.4-mercadolivre-crawler.yml`) BLOCK-001
- **Related:**
  - LIA draft (kept, not discarded): `docs/legal/lia-epic7.md` (v0.1 DRAFT, 267 lines, 5 mandatory sections + 4 annex requirements)
  - Story 7.10 (LGPD Foundation): `docs/stories/7.10.story.md`
  - Story 7.4 (MercadoLivre crawler): `docs/stories/7.4.story.md`
  - ADR-EPIC7-001 / 002 / 003 / 004 / 005 / 006

---

## 1. Context

Epic 7 captures public real-estate listings from third-party portals (ZAP, OLX, VivaReal, MercadoLivre) and identifies FISBO advertisers (For-Sale-By-Owner). Captured fields include the advertiser's name (PF) and masked phone number (PF). Under LGPD (Lei 13.709/2018), Art. 7, IX, this processing is grounded in **legítimo interesse do controlador** and therefore requires a documented **LIA** (Legitimate Interest Assessment), preferably reviewed and signed by counsel before any production deploy.

Story 7.10 (LGPD Foundation) delivered:
- Vault-based PII encryption at rest (Supabase Vault native, no pgcrypto fallback)
- Audit log (`lgpd_audit_log`) with RLS + admin/own policies
- Opt-out flow (202 + protocol + 4 indexes + matcher)
- Anonymize cascade (vault DELETE + defensive clear of legacy columns)
- Privacy-policy page (Art. 18 disclosures)
- LIA draft v0.1 at `docs/legal/lia-epic7.md` — pending external counsel signature (SLA 15-25 days)

Story 7.4 (MercadoLivre crawler) delivered the first PF-capturing crawler; its QA gate flagged **BLOCK-001** (deploy gated on 7.10 LGPD foundation) and Story 7.10's QA gate flagged the AC1 (LIA counsel signature) waiver as the single hard blocker for any crawler-PF production deploy.

### What changed (2026-05-24)

Founder (Zero) made an explicit, documented decision: Epic 7 will not enter "production" in the broad sense for now. Instead, it will operate in **MVP-LOCAL** mode — a strictly bounded operational envelope for the single end-user (Luciana Borba, RE/MAX Galeria Moema) on a local server, for validation and product-market-fit purposes. The founder accepts the residual risk that comes with deferring the counsel signature, but only within the boundary defined in §4.

This ADR formalizes the waiver and its constraints, and re-tags the affected QA gate items.

---

## 2. Decision

The requirement that the LIA be **signed by external counsel** before Epic 7 may be deployed is **WAIVED for MVP-LOCAL scope only**, under the three binding constraints in §4 and the explicit re-evaluation triggers in §5.

### What is waived

- AC1 of Story 7.10 (LIA counsel signature) as a **deploy blocker for MVP-LOCAL scope**.
- BLOCK-001 of Story 7.4 (deploy gate on 7.10 LIA counsel signature) as a **production-cloud blocker, reframed as MVP-LOCAL allowed / cloud still blocked**.

### What is NOT waived

This waiver does **NOT** dispense any LGPD obligation toward the data subjects (the external advertisers whose name and masked phone are captured). It scopes the **counsel-signature procedural requirement** away for an MVP-local boundary; it does not scope the substantive law away.

The following LGPD obligations continue in force in MVP-LOCAL mode and are already implemented in code:

| Obligation | Source | Where it lives |
|---|---|---|
| Lawful basis: legítimo interesse | LGPD Art. 7, IX | LIA draft `docs/legal/lia-epic7.md` (founder-internal record, not counsel-signed) |
| Documented LIA on file | LGPD Art. 10, §3º | `docs/legal/lia-epic7.md` v0.1 DRAFT (retained as future asset) |
| Encryption at rest of PII | LGPD Art. 46 (security) | Supabase Vault (Story 7.10 migrations 014/015) |
| Append-only audit log of access | LGPD Art. 37 | `lgpd_audit_log` table + RLS |
| Data-subject rights (opt-out, access, anonymize) | LGPD Art. 18 | `/lgpd/opt-out` + `/lgpd/politica-privacidade` + `fn_lgpd_anonymize_lead` |
| Retention minimization (anonymize after 90d) | LGPD Art. 15-16 | `fn_lgpd_retention_sweep(90)` — manual invoke MVP-LOCAL, scheduled in 7.6 if scope grows |
| Data-minimization (no `descricao_*` raw text) | LGPD Art. 6, III | Story 7.4 regression test (deferred per 7.10 OBS) |

The legal reasoning is therefore: **the LIA exists, the basis is asserted, the controls are implemented; what is deferred is the third-party legal opinion attesting to the LIA's sufficiency, which is procedural overhead disproportionate to the MVP-LOCAL risk surface.**

---

## 3. Status

- **Status:** ACCEPTED 2026-05-24
- **Verdict on affected gates:** Story 7.10 → CONCERNS becomes **WAIVED (MVP-LOCAL)**; Story 7.4 BLOCK-001 → **RESOLVED-BY-WAIVER**. Story 7.4 retains **CONCERNS** for OBS-001 (real-staging PoC) which is independent of LGPD.
- **Effective until:** Any trigger condition in §5 fires, OR 2026-11-24 (6-month default revisit), whichever comes first.

---

## 4. Constraints (NON-NEGOTIABLE — binding)

These three constraints are the load-bearing assumptions that make the waiver defensible. Violating any one of them voids the waiver and re-triggers the original deploy blocker.

### Constraint 1 — Local server only

- Crawler, classifier, review queue, lead store and admin UI run on a **local machine** (Luciana's workstation OR a workstation under operator control).
- **No public IP, no external domain, no cloud deploy** of any Epic 7 component (Apify Actor execution on Apify Cloud for the crawl job itself is permitted as an operator subcontract per LIA §1, because the Actor returns results to the local store and does not expose endpoints publicly).
- Supabase project, if used as the local datastore, MUST be either (a) local Supabase via Docker, OR (b) a Supabase Cloud project with **no public Edge Function URLs exposing PII**. Edge Functions that exist (e.g., `trigger_mercadolivre_crawl`, `webhook_mercadolivre_done`) MUST require shared-secret authentication and MUST NOT be advertised in any public surface.
- No DNS records, no Vercel/Netlify deploy of the lead UI, no public-facing dashboard.

### Constraint 2 — No external data sharing

- Captured PF data (`nome_anunciante`, `telefone_anunciante`, `whatsapp_anunciante`, derived `leads.*` rows) is for **Luciana's internal commercial use only** within her RE/MAX consultancy.
- **No data export** to third parties: no CSV sharing to other consultants, no CRM sync to external SaaS, no integrations that egress PII (no Make.com, no Zapier, no n8n cloud).
- Exports for personal Excel/print use by Luciana are permitted; the operator must not republish or transmit them.
- Marketing automation, mass outreach, and any form of "purchased list" / "shared lead pool" usage are **forbidden** under this waiver.

### Constraint 3 — Mandatory re-evaluation triggers

Before any of the following events occurs, the waiver is **automatically void** and the original blocker (counsel-signed LIA) is reinstated:

- Any deploy of Epic 7 components to a public URL (production, staging-with-internet, or any cloud platform with a public endpoint).
- Onboarding of a **second end-user** (any natural person other than Luciana Borba) — whether internal at RE/MAX Galeria Moema or external.
- Any **cloud deploy** that places PII behind a publicly addressable endpoint (even if auth-gated).
- Sustained ingestion volume exceeding **100 leads/month** (single-month average over 2 consecutive months), as this approaches the volume threshold cited in LIA §2.3 (200-500/mo Wave A).
- Any incident involving exposure, exfiltration, or unintended disclosure of PII captured by Epic 7.
- Any regulatory inquiry, ANPD notification, or data-subject complaint (Art. 18 request) that cannot be resolved within the existing opt-out + anonymize flow.
- Material change in the LGPD legal landscape (new ANPD guideline, court decision, or law amendment) affecting Art. 7, IX legítimo interesse for real-estate prospecting.

If any trigger fires, the operator MUST: (a) halt Epic 7 ingestion within 24h, (b) re-engage counsel for LIA signature OR for re-scoping advice, (c) NOT resume operations until counsel has issued written direction.

---

## 5. Trigger Conditions for Re-evaluation

See §4 Constraint 3. Each trigger is a hard re-evaluation gate, not a soft warning. The operator and `@architect` MUST re-open this ADR (status → SUPERSEDED) and produce a successor ADR before any of those scope expansions becomes live.

A scheduled mandatory revisit is set at **2026-11-24** (6 months from acceptance) regardless of whether any trigger has fired. If no trigger has fired by that date, the operator MUST still review:
- Whether Luciana's usage pattern remains single-user / local.
- Whether the LIA draft requires any factual updates (e.g., new portals, new CNPJ data sources).
- Whether the constraints in §4 are still sufficient given updated threat models.

---

## 6. Consequences

### Positive

- Epic 7 can be used **in production by the single operator** for MVP/PMF validation immediately, without the 15-25d counsel SLA blocking value delivery.
- The LIA draft is retained as a near-complete asset (267 lines, 5 mandatory sections + 4 annex requirements), so when re-evaluation occurs, counsel review is a much shorter loop than starting from zero.
- The technical LGPD controls (vault, audit, opt-out, anonymize) are exercised in real conditions, surfacing any operational gaps before they go to a wider scope.
- Founder explicitly accepts and documents residual risk, which is itself a governance improvement over silently ignoring the blocker.

### Negative / Risks accepted

- **Residual legal risk:** if a data subject complains or the ANPD inquires, the operator's defense rests on the unsigned LIA + implemented controls + MVP-LOCAL scope. Counsel could later disagree with the LIA reasoning. This risk is judged low for single-user local use; it would be unacceptable for cloud/multi-user use, hence the constraints in §4.
- **No counsel coverage for edge cases:** the LIA was drafted by `@pm` (Morgan) coordinating with Luciana, not by a lawyer. Edge cases (e.g., a CRECI-registered advertiser asking why they were classified FISBO and contacted) have no pre-vetted answer; the operator must handle on a case-by-case basis using the opt-out flow.
- **Cloud deploy is now an explicit two-step process:** any future cloud move requires re-engaging counsel BEFORE the technical work, not in parallel. This is a feature, not a bug, but it must be planned for.
- **Scope creep risk:** a second user, a "quick demo" to a colleague, or a "let me just put this on Vercel" all trigger waiver-void. The constraints in §4 must be actively guarded; pre-push hooks at `@devops` continue to block cloud-deploy paths to enforce this mechanically.

### Neutral

- The LIA draft (`docs/legal/lia-epic7.md`) is **explicitly retained**, not discarded. It is a versioned asset for future reactivation.
- The QA gates for 7.4 and 7.10 are amended (waiver blocks appended); they are **not rewritten from scratch**.
- The story files themselves keep `Status: InReview` — closing them to `Done` requires a `@qa` re-gate that applies the waiver, which is a separate action from this ADR.

---

## 7. Tension noted between this waiver and the LIA draft (for future)

The LIA draft `docs/legal/lia-epic7.md` v0.1 contains several elements that assume a broader, counsel-signed deployment posture and therefore have a friction surface with MVP-LOCAL scope:

1. **§2.3 Volume estimate (200-500 leads/mo Wave A)** — MVP-LOCAL constraint caps re-evaluation at >100 leads/mo. The LIA's stated Wave A volume exceeds the waiver's safe envelope. If Luciana hits 100/mo regularly, the waiver triggers BEFORE the LIA's stated Wave A volume is exhausted.
2. **§1 Operators table cites Vercel + Supabase Inc. as cloud operators** — MVP-LOCAL says no public Vercel deploy. The LIA's identified operators are partially out-of-scope for the waiver. If reactivated, the operators table needs an MVP-LOCAL row or a Wave-A-cloud row distinction.
3. **§1 "Canal de contato titular (opt-out): URL pública /lgpd/opt-out (a ser publicada antes do go-live)"** — MVP-LOCAL means there is no public URL. The opt-out channel under MVP-LOCAL must be a **non-public contact method** documented in any external-facing advertiser communication Luciana makes. If she never reaches out to an advertiser whose data was captured, the opt-out channel never needs to be exposed; if she does reach out, she must provide a contact (e-mail or phone) for opt-out requests. This needs operational clarity from `@pm` before Luciana begins outreach.
4. **§2.4 "Análise estatística agregada"** — fine under MVP-LOCAL provided aggregation is local and not shared externally.
5. **DPO and CRECI fields are still placeholders** — under MVP-LOCAL the DPO contact may be Luciana herself (operator + DPO collapsed for single-operator MVP). Counsel may push back on this when the LIA is later signed; the waiver does not resolve this.

These tensions are **not blockers for the waiver itself** — they are flags for the next iteration of the LIA when counsel is re-engaged. They are recorded here so future `@architect` and `@pm` work has a clean handoff.

---

## 8. Audit trail

- 2026-05-24 — Founder decision recorded
- 2026-05-24 — ADR drafted by `@architect` (Aria)
- 2026-05-24 — Story 7.10 QA gate amended with `waivers:` block (verdict CONCERNS → WAIVED)
- 2026-05-24 — Story 7.4 QA gate amended with `waivers:` block (BLOCK-001 → RESOLVED-BY-WAIVER; verdict retains CONCERNS due to OBS-001 still pending)
- 2026-05-24 — Memory file `project_lgpd-mvp-waiver.md` recorded with same constraints

---

## 9. Revisit date

**Mandatory revisit:** 2026-11-24 (6 months) — OR earlier on any trigger from §4 Constraint 3 / §5.
