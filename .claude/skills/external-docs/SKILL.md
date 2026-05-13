---
name: "external-docs"
description: "Fetches current API documentation from external providers (Context7, GitMCP, WebSearch) to prevent code hallucinations from stale training data"
version: "1.0.0"
owner_squad: "c-level"
sinkra_tier: "Tier1"
context: "conversation"
agent: "general-purpose"
user-invocable: false
maxTurns: 10
---

# External Docs Provider

Provides agents with access to current API documentation via multi-provider fallback chain.
Activated automatically by SYNAPSE L6 when prompts contain API/library keywords.

## Problem

Code hallucinations from stale training data cause 90%+ task failure rate in squads with external API dependencies. Agents write code against deprecated endpoints, renamed parameters, and removed functions.

## Provider Chain (priority order)

### Tier 1: Context7 (Popular Libraries)
```
mcp__context7__resolve-library-id({ libraryName: "<library>" })
mcp__context7__get-library-docs({ libraryId: "<id>", topic: "<focus>", tokens: 5000 })
```
Best for: React, Next.js, Supabase, Stripe, Prisma, TypeScript, Zod, Tailwind

### Tier 2: GitMCP (GitHub Repos)
Pre-configured repos in `.mcp.json`:
- `gitmcp-supabase` — Supabase docs direct from source
- `gitmcp-anthropic-sdk` — Anthropic Python SDK
- `gitmcp-nextjs` — Next.js docs

To add more repos: add entry to `.mcp.json` with `type: sse` and `url: https://gitmcp.io/{owner}/{repo}`

### Tier 3: WebSearch (Fallback)
```
WebSearch("site:docs.{library} <topic>")
WebSearch("site:{library}.dev <topic>")
```

## Guardrails

1. **grep-first policy**: When browsing docs, search for the specific topic before reading full pages
2. **Token budget**: Limit Context7 queries to 5000 tokens max per call
3. **Source attribution**: Always note which provider returned the docs used for implementation
4. **Freshness**: Context7 and GitMCP serve current docs. WebSearch may return stale results — verify dates
5. **Fallback discipline**: If Tier 1 fails, try Tier 2 before Tier 3. Never skip tiers.

## Integration

- **SYNAPSE**: Loaded by L6-Keyword via `.synapse/external-docs` domain
- **Runner**: `doc_source` field in `record_run()` tracks which provider was used
- **QA Gate**: Story lifecycle check #8 verifies API doc consultation

## MCP Servers

```yaml
context7:
  transport: sse
  url: https://mcp.context7.com/sse
  tools: [resolve-library-id, get-library-docs]

gitmcp-supabase:
  transport: sse
  url: https://gitmcp.io/supabase/supabase

gitmcp-anthropic-sdk:
  transport: sse
  url: https://gitmcp.io/anthropics/anthropic-sdk-python

gitmcp-nextjs:
  transport: sse
  url: https://gitmcp.io/vercel/next.js
```
