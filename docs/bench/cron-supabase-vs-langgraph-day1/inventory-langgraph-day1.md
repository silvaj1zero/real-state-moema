# Inventory — LangGraph from Day 1

**Snapshot:** 2026-05-14  ·  **Repo:** https://github.com/langchain-ai/langgraph

## GitHub metadata (live)

| Field | Value |
|---|---|
| Stars | 32,003 |
| Forks | 5,425 |
| Open issues | 536 |
| Created | 2023-08-09 |
| Last push | 2026-05-13 |
| License | MIT |
| Primary language | Python |

Source: GitHub API `repos/langchain-ai/langgraph` 2026-05-14.

## Deployment options & pricing

| Option | Cost | Notes |
|---|---|---|
| Self-hosted library | infra only (Postgres checkpointer) | you own scheduling, retries, scaling, observability |
| Platform Developer (free) | $0 up to 100 k node executions | Free tier |
| **Platform Plus** | **$39/user/mo LangSmith + $0.001/node + $0.0036/min standby (prod) / $0.0007/min (deployments)** | Plus tier |
| Enterprise | custom | negotiated |

Sources: https://www.langchain.com/pricing-langgraph-platform · https://www.zenml.io/blog/langgraph-pricing

## Additional costs

- **LLM tokens** (OpenAI / Anthropic / Gemini) billed separately per call.
- **LangSmith tracing** (Plus $39/user/mês) on top.
- **Checkpointer storage** — Postgres or Redis.

## Capability profile

- Stateful graph workflows with durable checkpointers
- Human-in-the-loop pause/resume
- Streaming · time-travel debugging · subgraphs · map-reduce
- Production adopters: Uber, LinkedIn, Replit, Klarna, **AppFolio Realm-X** (same vertical — real estate property tech)

## Known limitations (2026)

- Checkpointers save state **between** nodes, not inside; a long loop inside one node restarts on crash. Source: https://docs.langchain.com/oss/python/langgraph/durable-execution
- For side-effecting workflows needing crash-survival, canonical pattern is **LangGraph for reasoning + Temporal for orchestration**. Source: https://medium.com/data-science-collective/langgraph-vs-temporal-for-ai-agents-durable-execution-architecture-beyond-for-loops-a1f640d35f02
- Determinism is not enforced — by design, for LLM steps.

## Operational characteristics for *deterministic ETL* (this bench's question)

- **Overkill.** Wave A pipeline has no LLM step and no dynamic branching on content.
- Adds Python runtime to a TS-first stack (or use less-mature `langgraph-js`).
- **Platform fee illustration:** $0.001/node × 7 steps × 10 000 anúncios/mês = **$70/mês** *just on platform fees* — before any LLM token cost.
- Plus LangSmith $39/user/mês minimum.

## Sources

- https://www.langchain.com/pricing-langgraph-platform
- https://www.langchain.com/pricing
- https://www.zenml.io/blog/langgraph-pricing
- https://www.metacto.com/blogs/langgraph-pricing-explained-a-deep-dive-into-integration-maintenance-costs
- https://docs.langchain.com/oss/python/langgraph/durable-execution
- https://medium.com/data-science-collective/langgraph-vs-temporal-for-ai-agents-durable-execution-architecture-beyond-for-loops-a1f640d35f02
- https://cordum.io/blog/temporal-vs-langgraph
- https://blog.langchain.com/customers-appfolio/
- https://www.zenml.io/llmops-database/building-a-property-management-ai-copilot-with-langgraph-and-langsmith
- GitHub API 2026-05-14
