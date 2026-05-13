---
name: deploy-story
description: "Deploy story artifacts based on deploy_type detection — auto-detects from file_list patterns and executes Supabase, Docker Swarm, Vercel, or Railway deployments"
version: "1.0.0"
owner_squad: infra-ops-squad
sinkra_tier: Tier1
context: inline
agent: general-purpose
user-invocable: true
argument-hint: "[story-file-path]"
---

# deploy-story Skill

## Purpose

Executes Step 6 (Deploy) of the 7-step SDC pipeline. Reads a story file's `deploy-config` section to determine `deploy_type`, then executes the appropriate deployment pipeline. Populates `dev-agent-record.deploy-results` on completion.

## Activation

```
/deploy-story {story-file-path}
```

## Pre-Execution: Load Deploy Targets Reference

**BEFORE any deploy execution,** read `.claude/skills/deploy-story/references/deploy-targets.md` to load operational knowledge about each deploy target (IPs, paths, access methods, constraints). This file contains:
- Server IPs (Tailscale vs public), SSH users, app paths on each server
- Which MCP tools work for each target (and which don't)
- Step-by-step deploy commands per target
- Rollback commands

**Do NOT skip this step.** Deploy without reading targets reference leads to wrong IPs, wrong paths, and failed connections.

## Execution Protocol

### Phase 1: Auto-Detection (AC-2)

1. Read the story file at `docs/stories/epic-{epic}/STORY-{id}-*.md`
2. Extract `deploy_type` from `deploy-config` section of the story
3. If `deploy_type` is `auto_detect` or missing, infer from `dev-agent-record.file_list`:

| File Pattern | Detected Type |
|---|---|
| `packages/db/migrations/**/*.sql` | `supabase_migration` |
| `apps/squad-engine/**` or `apps/clickup-engine/**` | `hetzner_docker` |
| `apps/web/**` | `vercel` |
| `apps/acs/**` | `vercel` |
| `apps/api/**` | `railway` |
| `apps/gateway-ai/**` | `hetzner_docker` |
| Multiple patterns matched | `multi` |
| No patterns matched | `none` |

4. Update story file `deploy_type` field with detected value
5. If `deploy_type: none` → record `deploy_status: skipped` and exit

### Phase 2: Deploy Execution

#### Supabase Migration (`deploy_type: supabase_migration`) — AC-3

Execute for EACH migration file in `file_list` (ordered by filename):

```bash
# Step 1: Dry-run
node services/supabase/cli.js dry-run <migration-file>
# → If FAIL: record failure, halt

# Step 2: Execute
node services/supabase/cli.js run-migration <migration-file>
# → If FAIL: record failure, halt

# Step 3: Verify
node services/supabase/cli.js query "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
# → Record table list in verification_checks
```

Rollback command (document in deploy_notes):
```bash
node services/supabase/cli.js rollback <migration-file>
```

#### Docker Swarm / Hetzner (`deploy_type: hetzner_docker`) — AC-4

**DELEGATION: This deploy type is executed by `@infra-chief` (infra-ops-squad), NOT by this skill directly.**

The infra-ops-squad has exclusive access to Hetzner/Portainer/SSH MCPs and is the authority for all infrastructure operations (see `.claude/rules/agent-authority.md` — `feedback_infra_responsibility`).

**Execution protocol:**

1. **Detect service** from story file_list patterns:
   - `apps/squad-engine/**` → Docker Swarm service (registry 5.161.112.59:5000)
   - `apps/gateway-ai/**` → Hetzner Helsinki systemd (89.167.3.24, `openclaw-gateway.service`)

2. **Delegate to @infra-chief** via Agent tool:
   ```
   Agent(
     subagent_type: "infra-chief",
     description: "Deploy {service} to Hetzner",
     prompt: "Deploy story {story-id} to {target}.
       Service: {service-name}
       Files changed: {file_list from Dev Agent Record}
       Deploy target: {server/swarm details from story context}
       After deploy, report: deploy_status, verification_checks, rollback command.
       For gateway-ai: git pull + npm install + sudo systemctl restart openclaw-gateway
       For swarm services: docker build + push to registry + docker service update",
     name: "deploy-infra"
   )
   ```

3. **Record results** from @infra-chief response into `deploy-results` section.

**Known targets:**

| Service | Target | Method |
|---------|--------|--------|
| squad-engine | Docker Swarm (5.161.112.59) | Build → registry push → service update |
| gateway-ai | Hetzner Helsinki (89.167.3.24) | git pull → npm install → systemctl restart |

**Tag format:** `{service}:v{YYYYMMDD}-{short-sha}`

#### Vercel (`deploy_type: vercel`) — AC-5

Vercel auto-deploys on push to main. Skill verifies deployment status:

```bash
# Check latest deployment
vercel ls --token=$VERCEL_TOKEN

# Verify preview URL
curl -f -s -o /dev/null -w "%{http_code}" https://{preview-url}
# → Expect 200
```

Covers both `apps/web` (allfluence.ai) and `apps/acs` (studio.allfluence.ai).

#### Railway (`deploy_type: railway`) — AC-6

Railway auto-deploys on push to main. Skill verifies:

```bash
# Check API health
curl -f -s -w "\n%{http_code} %{time_total}s" https://api.allfluence.ai/health
# → Expect 200, record response time
```

Record HTTP status and response time in `verification_checks`.

#### Multi-Deploy (`deploy_type: multi`) — AC-8

Detect all applicable types from `file_list`, then execute in strict order:

1. **Supabase migrations FIRST** (schema must exist before app deploys)
2. **Docker/Railway/Vercel SECOND** (parallel if independent)
3. If any step fails → halt remaining, record partial results with `deploy_status: failed`

### Phase 3: Record Results (AC-9)

Populate `dev-agent-record.deploy-results` in story file:

```yaml
deploy-results:
  deploy_type: <detected-or-configured-type>
  deploy_status: success           # success | failed | skipped
  deploy_timestamp: "<ISO-8601-UTC>"
  deploy_target: "<e.g. supabase/migration | hetzner/squad-engine | vercel/web | railway/api>"
  deploy_url: "<url-if-applicable>"
  deploy_notes: "<rollback command + summary>"
  verification_status: pass        # pass | fail | skipped
  verification_checks:
    - name: "<check-name>"
      status: "pass"               # pass | fail | skipped
      details: "<details>"
```

## Supabase CLI Extensions (AC-7)

Two new commands in `services/supabase/cli.js`:

### `functions-deploy`

Deploys Supabase edge functions:
```bash
node services/supabase/cli.js functions-deploy
node services/supabase/cli.js functions-deploy --function-name <name>
```

### `seed`

Executes a seed SQL file in a transaction:
```bash
node services/supabase/cli.js seed packages/db/seeds/seed.sql
```

## Files

| File | Purpose |
|---|---|
| `.claude/skills/deploy-story/SKILL.md` | This file — skill definition |
| `services/supabase/cli.js` | Extended with `functions-deploy` + `seed` commands |

## Error Handling

- Dry-run failure → halt, record `deploy_status: failed`, do NOT execute migration
- Docker push failure → halt, do NOT update service (prevents broken state)
- Health check failure → record `verification_status: fail`, flag for manual review
- Partial multi-deploy failure → halt remaining steps, record which completed

## Dependencies

- Story 102.1: `story-tmpl.yaml` must have `deploy_type` and `deploy-results` fields
- `services/supabase/cli.js`: `run-migration`, `dry-run`, `rollback`, `query` commands
- Docker CLI: available in shell for hetzner_docker deployments
- Vercel CLI: `vercel` command for deployment verification
- `VERCEL_TOKEN`, `RAILWAY_TOKEN` env vars for API-based checks

---

## Workflow Phases

### Phase 1: Pre-Deploy Checks

- [ ] Story file located at `docs/stories/epic-{epic}/STORY-{id}-*.md`
- [ ] `deploy_type` extracted from `deploy-config` section (or auto-detected from `file_list`)
- [ ] If `deploy_type: none` or undetectable: record `deploy_status: skipped` and exit — no further phases
- [ ] `deploy_type` written back to story file if it was auto-detected
- [ ] For `supabase_migration`: migration files exist in `packages/db/migrations/` and are readable
- [ ] For `hetzner_docker`: Docker CLI available, Tailscale VPN reachable (`89.167.3.24`)
- [ ] For `vercel`: `VERCEL_TOKEN` env var present or `vercel` CLI authenticated
- [ ] For `railway`: API health endpoint known from story context

> **STOP** — Do not proceed to Phase 2 until deploy type is confirmed and pre-conditions for that type are met. Executing a deployment against an unverified environment is the primary source of partial-deploy failures that leave infrastructure in broken state.

### Phase 2: Deploy Execution

- [ ] For `supabase_migration`: dry-run executed BEFORE any `run-migration` call
- [ ] For `supabase_migration`: migrations executed in filename order (chronological)
- [ ] For `hetzner_docker`: build → push → update service → health check executed in sequence
- [ ] For `vercel`: deployment status verified via CLI or API (auto-deploy triggered by push)
- [ ] For `railway`: health endpoint checked after push (auto-deploy triggered by push)
- [ ] For `multi`: Supabase migrations run FIRST, then remaining targets in parallel
- [ ] Any failure halts remaining steps immediately — partial results recorded

> **STOP** — Do not proceed to Phase 3 if any step in the execution sequence fails. A failed dry-run must not proceed to `run-migration`. A failed Docker push must not proceed to service update. Partial execution is worse than no execution.

### Phase 3: Record Results

- [ ] `dev-agent-record.deploy-results` populated with all required fields
- [ ] `deploy_type`, `deploy_status`, `deploy_timestamp`, `deploy_target`, `deploy_url` filled
- [ ] `deploy_notes` includes rollback command
- [ ] `verification_status` recorded (`pass` / `fail` / `skipped`)
- [ ] `verification_checks[]` populated with per-check name/status/details
- [ ] Story file saved with updated `deploy-results` section

> **STOP** — Deployment is not complete until `deploy-results` is written to the story file. A deployment that ran but left no record is invisible to `close-story` (CHK-8) and `verify-deploy`. The record is the gate input.

---

## Red Flags

| Rationalization | Why It Fails |
|----------------|--------------|
| "The dry-run passed last time, I'll skip it this migration" | Dry-run validates the current migration file against the current schema state. Schema changes from concurrent work can break migrations that previously passed dry-run. |
| "I'll push the Docker image and check the service status later" | A pushed image that fails to start leaves the service on the previous image silently. The update-then-verify sequence must be atomic within the deployment step. |
| "The deployment obviously worked — I'll fill in `deploy-results` afterward" | `deploy-results` written from memory is less accurate than `deploy-results` captured from command output. CHK-8 reads the record, not the deployer's recollection. |
| "Supabase migrations are additive — no need for rollback documentation" | Rollback commands are required regardless of migration type. "Additive only" is an intent, not a guarantee. The rollback command in `deploy_notes` is the recovery path when intent and reality diverge. |
| "Multi-deploy: I'll run all targets in parallel to save time" | Supabase migrations must run first in multi-deploy. App code that references tables not yet created produces runtime failures that are harder to diagnose than a sequencing delay. |
| "The Docker health check shows 1/1 — I'll skip log inspection" | Replica count confirms the container started; it does not confirm the application is healthy. Log inspection catches startup errors that health checks miss in the first minutes. |
| "Vercel auto-deploys on push — I don't need to verify deployment status" | Auto-deploy can fail silently. Vercel build errors, environment variable mismatches, and function size limits all produce failed deployments that still appear as "triggered". |

---

## Blocking Conditions

HALT deployment and surface to user when:

1. **Supabase dry-run fails** — `node services/supabase/cli.js dry-run <migration-file>` exits non-zero. Action: HALT. Record `deploy_status: failed`. Do NOT execute the migration. Output the dry-run error. Resolution: Fix the migration SQL and retry from Phase 1.

2. **Docker push fails** — Image cannot be pushed to the registry (`5.161.112.59:5000`). Action: HALT. Do NOT update the running service — the service must remain on the last known-good image. Output the push error. Resolution: Diagnose registry connectivity or image build issue before retrying.

3. **Tailscale VPN unreachable for hetzner_docker** — `89.167.3.24` not reachable. Action: HALT. Deployment cannot proceed without VPN access. Output: "Tailscale VPN required for Hetzner deployment. Connect VPN and retry." Resolution: Connect Tailscale, confirm ping succeeds, retry.

4. **`deploy_type` cannot be determined** — Neither `deploy-config` section nor `file_list` patterns yield a detectable type. Action: HALT. Do not guess. Output the ambiguity. Resolution: Story author sets `deploy_type` explicitly in the story file.

5. **Multi-deploy partial failure** — One step in the multi-deploy sequence fails. Action: HALT remaining steps. Record which steps completed and which failed with `deploy_status: failed`. Do not attempt recovery automatically. Resolution: Human reviews partial state, decides whether to continue or rollback completed steps.

---

## Post-Execution Learning (MANDATORY — Write Log Before HALT)

> **This is an EXECUTABLE step.** You MUST use the Write tool to create the log file.

**BEFORE completing this skill, create the execution log:**

1. **File path:** `.aios/learning/logs/deploy-story/deploy-story-{story-id}-{YYYYMMDD}-{HHmmss}.yaml`
2. **Use Write tool** to create the file with this content:

```yaml
schema_version: "1.0"
skill_id: "deploy-story"
timestamp: "{current ISO-8601}"
story_id: "{story-id from $ARGUMENTS}"
executor: "{agent who executed}"
duration_minutes: {estimate}
mode: null
files_modified: [{list}]
decisions: []
errors: []
outcome: "{completed|halted|failed}"
coderabbit_iterations: 0
gate_result: "N/A"
epilogue:
  what_worked: "{patterns}"
  what_failed: "{anti-patterns or null}"
  decision_drift: "{drift or null}"
  confidence: "{HIGH|MEDIUM|LOW}"
  source_type: "skill_execution"
```

3. **NEVER skip** — even on failure, write with `outcome: failed`.

> This log feeds `scripts/learning-digester.js` which generates observations for the unified learning system.

---

## Skill Chain Decision (SCD)

> **This is the FINAL executable step.** After writing the learning log, evaluate chain routing.

**Chain Position:** `deploy-story` → **verify-deploy**
**Irreversible:** YES — deploy actions cannot be undone. **Propose-commit gate applies.**

### Confidence Evaluation

| Signal | HIGH | MEDIUM | LOW |
|--------|------|--------|-----|
| All deploy steps succeeded | Yes | Partial (some steps ok, warnings present) | No, failures occurred |
| `deploy_status` in story | `success` | `success` with warnings | `failed` |
| Blocking conditions hit | 0 | 0 | 1+ |
| Outcome in learning log | `completed` | `completed` | `halted` or `failed` |

### Routing

**IMPORTANT: This skill is IRREVERSIBLE. The propose-commit gate applies regardless of confidence.**

- **HIGH** → Propose (NOT auto-chain): Output: `🔗 SCD: HIGH confidence — deployment succeeded. Run /verify-deploy {story-id} to verify? (y/n)` — HALT and wait for user confirmation.
- **MEDIUM** → Propose with warning: Output: `🔗 SCD: MEDIUM confidence — deployment completed with warnings. Review deploy results above, then run /verify-deploy {story-id} if satisfied. Proceed? (y/n)` — HALT and wait.
- **LOW** → Halt: Output: `🔗 SCD: LOW confidence — deployment had failures. Resolve issues above before verification.` — Do NOT propose.

### Rules

1. **NEVER auto-chain from deploy-story** — this is an irreversible action, always require user confirmation (propose-commit pattern from R7)
2. **NEVER skip the learning log** to chain faster — SCD runs AFTER the log is written
3. **NEVER auto-chain if outcome is `halted` or `failed`** — override to LOW regardless of other signals
4. The user can always override: "skip chain" cancels proposal, "force chain" overrides LOW

---

*deploy-story Skill v1.0.0 — Epic 102, Story 102.2*
*Owner: infra-ops-squad | Tier: Tier1*
