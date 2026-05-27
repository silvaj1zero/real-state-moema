# Gap Analysis — cron-Supabase vs LangGraph Day 1

## Gaps where LangGraph beats cron-Supabase

| ID | Gap | Severity | Mitigation |
|---|---|---|---|
| gap-cs-1 | No built-in checkpointer; retry/idempotency BYO | medium | Self-healing pattern with execution IDs |
| gap-cs-2 | 5000 ms Edge Function timeout via Cron UI | low | pgmq queue for long jobs |
| gap-cs-3 | No native human-in-the-loop / pause-resume | low | Status-table state machine |
| gap-cs-4 | Single Postgres cluster | low | Not relevant for Zona Sul scope |
| gap-cs-5 | Hand-off hop when Wave B NLP joins | low | AppFolio Realm-X uses exact pattern in prod |

## Gaps where cron-Supabase beats LangGraph

| ID | Gap | Severity | Mitigation |
|---|---|---|---|
| gap-lg-1 | $70+/mês platform fees on Plus after free tier | medium | Don't use LangGraph for deterministic ETL |
| gap-lg-2 | LangSmith Plus $39/user/mês minimum | medium | Same as above |
| **gap-lg-3** | **Adds Python runtime to TS-first stack** | **HIGH** | Reserve Python for ML/NLP only |
| gap-lg-4 | Checkpointer saves between nodes, not inside long nodes | medium | Decompose to short nodes or pair with Temporal |
| **gap-lg-5** | **Non-determinism is supported by design — wrong tool for deterministic ETL** | **HIGH** | Match tool to problem class |
| gap-lg-6 | New mental model + observability vendor | medium | Adopt only when LLM justifies it |

## Interpretation

Both tools are excellent at their **proper problem class**:

- **Deterministic ETL** (Wave A) → cron-Supabase
- **Agentic / LLM reasoning** (Wave B classifier + message generator) → LangGraph

The two interface at the **boundary** — exactly the AppFolio Realm-X pattern.

## Sources

- https://supabase.com/docs/guides/cron
- https://supabase.com/blog/processing-large-jobs-with-edge-functions
- https://dev.to/domoniqueluchin/building-a-self-healing-cron-system-with-pgcron-and-supabase-edge-functions-5420
- https://www.langchain.com/pricing-langgraph-platform
- https://docs.langchain.com/oss/python/langgraph/durable-execution
- https://blog.langchain.com/customers-appfolio/
