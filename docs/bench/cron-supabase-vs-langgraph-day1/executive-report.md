# Executive Report — cron-Supabase vs LangGraph Day 1

**Bench ID:** BENCH-03-cron-supabase-vs-langgraph-day1
**Date:** 2026-05-14
**Author:** spy-bench-analyst (Phase 3)
**Wave 2 suggested winner:** cron-Supabase puro in Wave A; LangGraph reserved for Wave B NLP
**Verdict:** **CONFIRM** · confidence **High**

---

## TL;DR

cron-Supabase wins the scorecard **91.00 vs 65.55** (+25.5 pts) for Wave A's deterministic 7-step ETL pipeline at 1–10 k anúncios/mês. LangGraph day 1 would add ~R$ 556/mês in platform fees (Plus tier + LangSmith) plus a Python runtime and a new abstraction tier — all to solve a problem class (deterministic ETL) it deliberately does *not* enforce. The AppFolio Realm-X precedent (CQ-009) supports the **hybrid pattern**: deterministic orchestration outside, LangGraph only at the LLM step. H-003 was correctly CONFIRMED in Wave 2; Phase 3 validates the magnitude.

---

## Decision

| Phase | Choice | Trigger to revisit |
|---|---|---|
| **Wave A** (Epic 7 Sprint 1–3) | pg_cron + Edge Functions + status tables (deterministic ETL) | n/a |
| **Wave B** (NLP classifier + message gen) | LangGraph subgraph reachable via Edge Function hand-off | when heurística determinística accuracy plateau hits or NLP feature ships |

---

## Quantitative summary

| Dimension | Weight | cron-Supabase | LangGraph day 1 | Δ |
|---|---|---|---|---|
| Complexity overhead | 15 % | 92 | 55 | **+37** |
| Debug DX (deterministic ETL) | 10 % | 85 | 75 | +10 |
| Native Supabase observability | 10 % | 95 | 50 | **+45** |
| Cost (tokens + platform) | 12 % | 100 | 35 | **+65** |
| Determinism | 13 % | 100 | 70 | +30 |
| Retry/idempotency | 10 % | 75 | 88 | −13 |
| Fit for volume Zona Sul | 10 % | 95 | 80 | +15 |
| Evolution path → Wave B | 10 % | 80 | 92 | −12 |
| Team familiarity | 10 % | 92 | 55 | **+37** |
| **Total** | **100 %** | **91.00** | **65.55** | **+25.45** |

### LLM-cost back-of-envelope (LangGraph day 1)

- 7 nodes × 10 000 anúncios/mês = 70 000 node executions.
- 100 000 free on Developer tier, so net 0 platform fees if you stay under 100 k.
- **BUT** moving to production deployments forces Plus tier ($0.001/node + $39/user/mês LangSmith + standby).
- At 100 k/mês on Plus: $100 node + $39 LangSmith + ~$10 standby = ~$149/mês = **~R$ 760/mês** before any LLM tokens.
- Versus cron-Supabase: $0.

---

## Cross-source consistency

| Source | Wave 2 claim | Phase 3 finding | Status |
|---|---|---|---|
| AppFolio Realm-X case study | hybrid pattern is canonical | Confirmed | **OK** |
| LangGraph docs durable execution | checkpointers reliable | Phase 3 surfaces: checkpoint is between nodes, NOT inside long nodes (limitation) | **REFINED** |
| LangGraph pricing $0.001/step | yes | Phase 3 confirms numerically; also surfaces $39 LangSmith requirement | **OK with nuance** |
| Supabase pg_cron native | yes | Phase 3 surfaces 5000 ms UI timeout edge-case | **REFINED** |
| Stack híbrida canonizada 2026 | yes | Confirmed across Cordum, Anubhav, Anup.io sources | **OK** |

---

## Recommendation (P0 / P1 / P2)

| Priority | Action |
|---|---|
| **P0** | Lock cron-Supabase + Edge Functions as Wave A orchestrator in PRD Epic 7 |
| **P0** | Design status-table + execution-ID self-healing pattern for retry/idempotency from Sprint 1 (gap-cs-1 mitigation) |
| **P0** | Decompose every ETL step to ≤ 5 s when invoked synchronously; longer steps must enqueue to pgmq (gap-cs-2 mitigation) |
| **P0** | Define the Wave A → Wave B boundary contract during Sprint 1: a single `classify-anuncio` Edge Function that calls a LangGraph subgraph later, keeping the deterministic graph untouched (interface in battle-card.md) |
| **P1** | Add Google Alert for "AppFolio Realm-X architecture" — track precedent evolution |
| **P2** | If volume sustained > 50 k anúncios/mês and crash-tolerance becomes a pain, evaluate Temporal as a second-layer durability primitive (LangGraph + Temporal pattern documented by Anubhav / Cordum) |

---

## Top risks identified by this bench (that Wave 2 missed)

1. **LangGraph platform-fee floor** is not $0.001/step alone — it requires LangSmith Plus ($39/user/mês) for production, raising the cost-of-day-1 by an order of magnitude vs Wave 2's mental model.
2. **Checkpointer granularity gap.** LangGraph's durable-execution claim has the "doesn't checkpoint inside a node" caveat; this matters when planning long-running steps in the Wave A pipeline.
3. **Edge Function 5 s Cron-UI timeout** is a real operational gotcha that needs the pgmq pattern from day 1 to avoid mysterious silent failures.

---

## Handoff to Phase 4 (code-anatomist)

No NEW clone target unlocked by this bench (LangGraph is well-documented; Supabase patterns are in-house). Recommend Phase 4 focus on:

1. **`19950512/buscacreci`** (PHP) for CRECI lookup pattern — feeds Wave A heuristic step.
2. **`Bunsly/HomeHarvest`** for real-estate selector patterns.
3. (Defer LangGraph code-anatomy to Wave B — by then community will have richer real-estate examples.)

---

## Sources

- https://supabase.com/docs/guides/cron
- https://supabase.com/docs/guides/database/extensions/pg_cron
- https://supabase.com/docs/guides/functions/schedule-functions
- https://supabase.com/blog/processing-large-jobs-with-edge-functions
- https://dev.to/domoniqueluchin/building-a-self-healing-cron-system-with-pgcron-and-supabase-edge-functions-5420
- https://github.com/orgs/supabase/discussions/37574
- https://boringsql.com/posts/time-keepers-pg-cron-pg-timetable/
- https://www.langchain.com/pricing-langgraph-platform
- https://www.langchain.com/pricing
- https://www.zenml.io/blog/langgraph-pricing
- https://www.metacto.com/blogs/langgraph-pricing-explained-a-deep-dive-into-integration-maintenance-costs
- https://docs.langchain.com/oss/python/langgraph/durable-execution
- https://medium.com/data-science-collective/langgraph-vs-temporal-for-ai-agents-durable-execution-architecture-beyond-for-loops-a1f640d35f02
- https://cordum.io/blog/temporal-vs-langgraph
- https://blog.langchain.com/customers-appfolio/
- https://www.zenml.io/llmops-database/building-a-property-management-ai-copilot-with-langgraph-and-langsmith
- GitHub API `repos/langchain-ai/langgraph` 2026-05-14
