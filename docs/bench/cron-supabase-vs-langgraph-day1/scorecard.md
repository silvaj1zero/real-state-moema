# Scorecard — cron-Supabase vs LangGraph Day 1

**Scale:** 0–100  ·  **Context:** Wave A deterministic ETL, 7 steps, 1–10 k anúncios/mês, **no LLM in the loop**.

| Dimension | Weight | cron-Supabase | LangGraph day 1 | Δ |
|---|---|---|---|---|
| Complexity overhead | 0.15 | **92** | 55 | +37 |
| Debug DX (deterministic ETL) | 0.10 | **85** | 75 | +10 |
| Native Supabase observability | 0.10 | **95** | 50 | +45 |
| Cost (LLM tokens + platform fees) | 0.12 | **100** | 35 | +65 |
| Determinism | 0.13 | **100** | 70 | +30 |
| Retry/idempotency primitives | 0.10 | 75 | **88** | −13 |
| Fit for volume Zona Sul | 0.10 | **95** | 80 | +15 |
| Evolution path to Wave B (NLP) | 0.10 | 80 | **92** | −12 |
| Team familiarity | 0.10 | **92** | 55 | +37 |

### Weighted total

| Subject | Score |
|---|---|
| **cron-Supabase** | **91.00** |
| LangGraph day 1 | 65.55 |
| **Δ** | **+25.45 pts in favor of cron-Supabase** |

## Verdict — **CONFIRM** Wave 2

cron-Supabase wins every cost-, complexity-, and determinism-weighted dimension. The two LangGraph wins (retry primitives, evolution path) are real but small in magnitude and **bounded to Wave B concerns**. The AppFolio Realm-X precedent supports exactly this split: LangGraph **only** where there is real LLM reasoning. For the deterministic Wave A pipeline, LangGraph adds cost (~R$ 556/mês minimum) and cognitive load without buying anything the problem asks for.

## Sources

- https://supabase.com/docs/guides/cron
- https://supabase.com/docs/guides/database/extensions/pg_cron
- https://supabase.com/blog/processing-large-jobs-with-edge-functions
- https://www.langchain.com/pricing-langgraph-platform
- https://www.zenml.io/blog/langgraph-pricing
- https://docs.langchain.com/oss/python/langgraph/durable-execution
- https://blog.langchain.com/customers-appfolio/
- https://dev.to/domoniqueluchin/building-a-self-healing-cron-system-with-pgcron-and-supabase-edge-functions-5420
- https://boringsql.com/posts/time-keepers-pg-cron-pg-timetable/
- GitHub API `repos/langchain-ai/langgraph` 2026-05-14
