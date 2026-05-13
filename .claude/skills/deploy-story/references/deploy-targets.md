# Deploy Targets — Operational Reference

Last updated: 2026-04-07 (Story 101.10 deploy)

## hetzner_docker Targets

### gateway-ai (OpenClaw Gateway)

| Field | Value |
|-------|-------|
| **Server** | all-ai-gateway |
| **Hetzner IP** | 89.167.3.24 (port 22 blocked — do NOT use) |
| **Tailscale IP** | 100.125.189.2 (use this for SSH) |
| **SSH user** | root |
| **SSH auth** | Tailscale SSH (browser auth required on first connect) |
| **App path** | `${OPENCLAW_APP_PATH}` (server-side absolute path — value documented in deploy secrets / Vault) |
| **Content-store** | `${OPENCLAW_APP_PATH}/memory/content-store/` |
| **Service** | `openclaw-gateway.service` (systemd) |
| **Repo type** | Standalone (NOT monorepo clone) |
| **Node.js** | Managed via systemd, ESM (`"type": "module"`) |
| **Deploy method** | SCP files or git pull within standalone repo, then `systemctl restart openclaw-gateway` |

**Access constraints:**
- MCP Docker Gateway (docker-gateway) runs inside Docker Desktop — NO Tailscale access
- Use `desktop-commander` MCP with `ssh -tt root@100.125.189.2` for interactive shell
- Tailscale SSH requires browser auth: follow the URL printed on first connect
- Single commands via `ssh root@100.125.189.2 <command>` fail (Tailscale SSH argument parsing) — use interactive `-tt` mode

**Deploy steps:**
```bash
# 1. Open interactive SSH via desktop-commander
ssh -tt -o StrictHostKeyChecking=no root@100.125.189.2
# (authenticate via Tailscale URL if prompted)

# 2. Inside server
cd "${OPENCLAW_APP_PATH}"
git pull origin master   # or SCP updated files
npm install              # rebuilds better-sqlite3 native
systemctl restart openclaw-gateway

# 3. Verify
systemctl status openclaw-gateway --no-pager | head -10
```

**Rollback:**
```bash
cd "${OPENCLAW_APP_PATH}" && git checkout HEAD~1 -- memory/content-store/ && systemctl restart openclaw-gateway
```

### squad-engine (Docker Swarm)

| Field | Value |
|-------|-------|
| **Server** | Hetzner primary (5.161.112.59) |
| **Registry** | 5.161.112.59:5000 |
| **Deploy method** | Docker build → push to registry → `docker service update` |
| **Managed via** | Portainer (environment `primary`, ID 1) |
| **MCP access** | docker-gateway MCP → Portainer API (works directly) |

**Deploy steps:**
```bash
# From local machine (monorepo root)
docker build -f apps/squad-engine/Dockerfile -t 5.161.112.59:5000/squad-engine:{tag} .
docker push 5.161.112.59:5000/squad-engine:{tag}
docker service update --image 5.161.112.59:5000/squad-engine:{tag} squad-engine
```

### execution-engine (Docker Swarm — formerly clickup-engine)

| Field | Value |
|-------|-------|
| **Server** | Hetzner primary (5.161.112.59) |
| **Registry** | 5.161.112.59:5000 |
| **Source dir** | `apps/clickup-engine/` (directory rename deferred — Story 101.16 D1, M6 condition) |
| **Dockerfile** | `apps/clickup-engine/Dockerfile` |
| **Build context** | Monorepo root (needs services/clickup, services/google-drive, services/media) |
| **Swarm services** | `clickup-engine` (API, MODE=api, port 3600) + `execution-engine-worker` (Worker, MODE=worker, port 3601) |
| **Note** | API service still named `clickup-engine` in Swarm (rename partial — Story 101.16 D1) |
| **Deploy method** | Docker build → push to registry → `docker service update` (both services) |
| **Managed via** | Portainer (environment `primary`, ID 1) |
| **MCP access** | docker-gateway MCP → Portainer API (works directly) |
| **OTel** | `tracing.cjs` included via `NODE_OPTIONS="--require ./tracing.cjs"` in Dockerfile (Story 101.13) |

**Deploy steps:**
```bash
# From local machine (monorepo root)
# 1. Get SHA for tag
SHA=$(git rev-parse --short HEAD)

# 2. Build (context = monorepo root, NOT apps/clickup-engine/)
docker build -f apps/clickup-engine/Dockerfile -t 5.161.112.59:5000/execution-engine:v$(date +%Y%m%d)-${SHA} .

# 3. Push to registry
docker push 5.161.112.59:5000/execution-engine:v$(date +%Y%m%d)-${SHA}

# 4. Update both Swarm services (note: API still named clickup-engine)
docker service update --image 5.161.112.59:5000/execution-engine:v$(date +%Y%m%d)-${SHA} clickup-engine
docker service update --image 5.161.112.59:5000/execution-engine:v$(date +%Y%m%d)-${SHA} execution-engine-worker

# 5. Verify
docker service ls | grep -E "clickup-engine|execution-engine"
docker service logs clickup-engine --tail 10          # API
docker service logs execution-engine-worker --tail 10  # Worker
```

**Rollback:**
```bash
docker service update --rollback clickup-engine              # API
docker service update --rollback execution-engine-worker      # Worker
```

**Important notes:**
- Build requires monorepo root as context because Dockerfile COPYs `services/clickup/`, `services/google-drive/`, `services/media/` as sinkra-packages
- The `sed` patch in Dockerfile converts `"*"` workspace refs to `"file:./sinkra-packages/*"` for standalone npm install
- Both API and Worker services use the SAME image but different `MODE` env var (api/worker)

## vercel Targets

| App | Domain | Auto-deploy |
|-----|--------|-------------|
| apps/web | allfluence.ai | On push to main |
| apps/acs | studio.allfluence.ai | On push to main |
| apps/tikguard-web | tikguard.allfluence.ai | On push to main |

No manual deploy needed — Vercel auto-deploys. Skill verifies deployment status only.

## railway Targets

| App | Domain | Auto-deploy |
|-----|--------|-------------|
| apps/api | api.allfluence.ai | On push to main |

No manual deploy needed — Railway auto-deploys. Skill verifies health endpoint.

## supabase_migration

| Field | Value |
|-------|-------|
| **CLI** | `services/supabase/cli.js` |
| **Migrations** | `packages/db/migrations/` |
| **Steps** | dry-run → execute → verify |
