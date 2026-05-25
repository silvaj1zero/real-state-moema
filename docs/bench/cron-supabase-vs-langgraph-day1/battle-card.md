# Battle Card — cron-Supabase vs LangGraph Day 1

**Context:** Should Wave A ETL pipeline run on native Supabase cron, or should we adopt LangGraph from day 1?
**Decision needed by:** @architect / @pm before Sprint 1 of Epic 7.

## Verdict — CONFIRM Wave 2 winner

> **Wave A pipeline on cron-Supabase puro.**
> **LangGraph reserved for the Wave B NLP step (classifier + message generator), following the AppFolio Realm-X pattern.**

**Scorecard:** cron-Supabase **91.00** vs LangGraph day 1 **65.55** · Δ +25.5 pts · confidence **High**.

## Why cron-Supabase wins for Wave A

1. **Cost (Δ +65 pts).** Zero token, zero platform fees vs ~R$ 556/mês minimum for LangGraph Plus.
2. **Determinism (Δ +30 pts).** SQL semantics enforce it by construction; LangGraph deliberately permits non-determinism.
3. **Complexity (Δ +37 pts).** Stack-native SQL + Edge Functions vs a new abstraction tier + Python runtime.
4. **Team familiarity (Δ +37 pts).** Founder + Luciana already use Supabase and TS daily.
5. **Native observability (Δ +45 pts).** `cron.job_run_details` + Supabase Logs are in-band — no LangSmith subscription.

## Where LangGraph wins (and why Wave A doesn't need it)

- Built-in retry primitives (Δ −13 pts) — solvable via execution-ID self-healing pattern.
- Evolution path to Wave B (Δ −12 pts) — solved by the boundary hand-off pattern AppFolio uses in production.

## Risks

- **R1 — Boundary hand-off complexity.** When the NLP node arrives in Wave B, cron-Supabase will call out to a LangGraph subgraph (Edge Function → LangGraph endpoint or queue). Design the interface contract during Sprint 1 of Wave A so migration is clean. Tracked in `wave-2-summary.md`.
- **R2 — `pg_cron` 5 s Edge Function timeout** via the UI. For any ETL step > 5 s, use pgmq queues; **don't** route long jobs through synchronous Edge Function from the cron trigger.
- **R3 — Long-running ETL crash recovery.** Make every step idempotent and write status to a `pipeline_runs` table; do NOT trust a single long-running Edge Function call.

## Interface contract for Wave A → Wave B boundary (sketch)

```
pg_cron → Edge Function `classify-anuncio`
  → if heurística determinística pode decidir: classifica e retorna
  → else (NLP needed): enqueue para LangGraph subgraph endpoint, retorna pending
  ← LangGraph subgraph webhook callback → Edge Function `apply-classification` → leads
```

This contract:
- Keeps Wave A 100% deterministic.
- Adds Wave B NLP via a single async hop, exactly like AppFolio Realm-X.
- Lets the LLM cost scale only with NLP calls (probably < 1k/dia), not with every ETL step.

## One-line decision

> Wave A on cron-Supabase. LangGraph only at the moment NLP becomes the bottleneck.
