---
paths:
  - "squads/**/agents/**"
  - "squads/**/config.yaml"
  - "squads/**/squad-io.yaml"
  - ".claude/agents/**"
  - ".aiox-core/development/agents/**"
  - "**/migrations/*.sql"
  - ".github/workflows/**"
  - ".claude/settings*.json"
  - ".aiox-core/core-config.yaml"
---

# Agent Authority — Sinkra Hub

Applies when any agent is activated.

## Exclusive Authorities

| Agent | Exclusive Rights | Others MUST Delegate |
|-------|-----------------|---------------------|
| `@devops` | `git push`, `git tag`, PR creation, MCP management, release, deploy (Docker Swarm, Railway, Vercel) + Supabase migration execution in production + model routing config (`model_routing.*` in `core-config.yaml`), budget pressure thresholds, model tier mappings — Art. XII-B | All agents propose, `@devops` deploys and owns routing config |
| `@db-sage` | Database migrations, schema changes, query optimization, RLS policies — **ENFORCED** (`enforce-migration-authority.sh`: blocks Edit/Write on `**/migrations/*.sql` + Bash `supabase db push`/`prisma migrate`/`drizzle-kit migrate`/`knex migrate`/`psql *.sql` unless `AIOX_ACTIVE_AGENT ∈ {db-sage, aiox-data-engineer, devops, github-devops}`) | `@dev` proposes, `@db-sage` executes |
| `@architect` | Architecture decisions, tech stack changes + intent resolver configuration (keyword table, confidence thresholds, embedding model selection) — Art. XII-B | `@dev` proposes, `@architect` decides |
| `@qa` | Quality sign-off, test strategy | `@dev` writes tests, `@qa` validates |
| `@po` | Story validation (10-point check) | `@pm` creates, `@po` validates |
| `@sm` | Sprint management, story creation | Others request, `@sm` creates |
| `@clickup-chief` | ClickUp structure creation (Spaces, Folders, Lists, CFs), SuperAgent config | All other agents propose, `@clickup-chief` materializes |
| `@sinkra-chief` | Dispatch table ownership (`DISPATCH_RULES[]` in `dispatch-table.js`), dispatch routing logic — Art. XII-B | All agents propose dispatch rules, `@sinkra-chief` approves and merges; escalation to `@master` |

## Delegation Protocol

When `@dev` needs to push code:
1. `@dev` completes implementation
2. `@dev` requests `@devops` to push via handoff
3. `@devops` validates and pushes

When any agent needs architecture change:
1. Agent proposes to `@architect`
2. `@architect` evaluates and decides
3. Decision logged in `.ai/` directory

When `@db-sage` handles database migrations:
1. `@db-sage` designs migration and runs dry-run + staging execution
2. `@db-sage` hands off to `@devops` for production execution
3. `@devops` executes migration in production via `*deploy-story`

When any agent needs to deploy:
1. `@dev` or `@db-sage` proposes, implements, and tests in staging/dry-run
2. `@devops` executes deploy in production (EXCLUSIVE authority)
3. `@qa` or `@devops` runs `*verify-deploy` post-deploy for E2E verification

## MCP Governance

**ONLY `@devops`** can:
- `claude mcp add/remove`
- Modify `.mcp.json`
- Configure Docker MCP Gateway
- Manage MCP secrets

Other agents are MCP **consumers**, not administrators.
