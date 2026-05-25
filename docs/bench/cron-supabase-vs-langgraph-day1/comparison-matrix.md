# Comparison Matrix — cron-Supabase vs LangGraph Day 1

**Pipeline anchor (Wave A):** 7 deterministic ETL steps, no LLM in the loop, ~1–10 k anúncios/mês.

| Capability | cron-Supabase | LangGraph day 1 | Advantage |
|---|---|---|---|
| Token cost for 10 k anúncios/mês × 7 steps | **$0** (no LLM) | $70 platform + $39 LangSmith = ~$109/mês = ~R$ 556 | **cron-Supabase** |
| Complexity overhead | SQL fn + Edge Function per step (already in stack) | Graph + checkpointer + state schema + new abstraction tier | **cron-Supabase** |
| Debug DX for deterministic ETL | SQL `cron.job_run_details` + Supabase Logs | LangSmith time-travel (overkill for ETL) | **cron-Supabase** |
| Native Supabase observability | 100 % | external (LangSmith) | **cron-Supabase** |
| Determinism guarantee | 100 % by SQL semantics | not enforced — by design supports non-determinism | **cron-Supabase** |
| Retry / idempotency primitives | BYO via execution IDs + status table | built-in checkpointer between nodes | **LangGraph** (mild) |
| Fit for volume 1–10 k anúncios/mês | comfortable | comfortable but cost grows linearly | **cron-Supabase** |
| Evolution path to Wave B (NLP step) | Hand off ONLY the NLP step to LangGraph subgraph | already there | **LangGraph** |
| Team familiarity (founder + Luciana) | SQL + TS (already used) | Python + graph mental model (new) | **cron-Supabase** |
| Production precedent in real-estate | generic Supabase | **AppFolio Realm-X** identical vertical | tie (different evidence) |
| Crash recovery for long-running ETL | status table + idempotency | checkpointer between nodes (gap inside long nodes) | tie |
| Vendor lock-in | Postgres + Supabase Edge (portable) | LangSmith + Platform coupling | **cron-Supabase** |

## Synthesis

cron-Supabase wins **8 of 12** dimensions, ties on 2, and loses 2 to LangGraph (retry primitives, evolution path to Wave B). Crucially, every LangGraph win is **bounded to Wave B concerns** (NLP, agentic workflows) — none of them moves the needle for the deterministic ETL of Wave A.

## Sources

- https://supabase.com/docs/guides/cron
- https://supabase.com/docs/guides/database/extensions/pg_cron
- https://supabase.com/blog/processing-large-jobs-with-edge-functions
- https://dev.to/domoniqueluchin/building-a-self-healing-cron-system-with-pgcron-and-supabase-edge-functions-5420
- https://www.langchain.com/pricing-langgraph-platform
- https://www.zenml.io/blog/langgraph-pricing
- https://docs.langchain.com/oss/python/langgraph/durable-execution
- https://blog.langchain.com/customers-appfolio/
- https://github.com/orgs/supabase/discussions/37574
- https://boringsql.com/posts/time-keepers-pg-cron-pg-timetable/
