---
name: "telegram"
description: "Manage the AIOX Message Gateway — multi-runtime, multi-channel agent lifecycle: setup, deploy, enable, disable, restart, status, logs, health, and webhook management"
version: "2.0.0"
user-invocable: true
maxTurns: 15
---

# AIOX Message Gateway

Manage the Universal Agent Gateway (Epic 110 + Epic 114). Supports 5 channels (Telegram, Discord, Web Chat, WhatsApp, Slack), 4 runtimes (Claude Code, Codex, API-OpenRouter, Mock), and full agent lifecycle.

## Usage

```bash
/telegram                    # Show full status (agent, channels, runtime, delivery mode)
/telegram setup              # Interactive channel setup (needs BotFather token)
/telegram deploy             # Generate/update the agent runtime in .aiox/
/telegram start              # Enable the agent (auto-detects OS: launchd/systemd/schtasks)
/telegram stop               # Disable the agent
/telegram restart            # Restart the agent (preserves conversation)
/telegram logs               # Tail recent logs (activity, fast-checker, crashes)
/telegram test               # Send a test message via the bot
/telegram health             # Run gateway-health.sh (JSON report of all agents + adapters)
/telegram webhook status     # Show webhook configuration
/telegram webhook enable     # Setup webhook (auto-detect tunnel) + start receiver
/telegram webhook disable    # Remove webhook, revert to polling
/telegram webhook logs       # Tail webhook receiver logs
```

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `<action>` | string | `status` | One of: `setup`, `deploy`, `start`, `stop`, `restart`, `logs`, `test`, `status`, `health`, `webhook` |
| `<sub-action>` | string | `status` | For `webhook`: `status`, `enable`, `disable`, `logs` |

## Architecture Overview

```
infrastructure/message-gateway/        ← COMMITADO (framework/engine)
  core/bus/                            ← Channel adapters (send-*.sh, check-*.sh, hooks)
  core/scripts/                        ← Agent lifecycle (wrapper, fast-checker, persistence)
  core/runtimes/                       ← Runtime drivers (claude-code, codex, api-openrouter, mock)
  core/webhook/                        ← Webhook receiver + setup/teardown
  core/memory/                         ← Memory provider abstraction
  adapters/{telegram,discord,web,whatsapp,slack}/  ← Per-channel start/stop/health
  agents/agent-template/               ← Template base for new agents
  deploy-agent.sh                      ← Generates agent in .aiox/
  enable-agent.sh                      ← Start persistence (launchd/systemd/schtasks) + tmux
  disable-agent.sh                     ← Stop service
  install.sh                           ← Setup state dirs (~/.claude-remote/)
  setup-channel.sh                     ← Interactive onboarding per channel
  gateway-health.sh                    ← Unified health check (JSON)
  session-persist.sh                   ← Hook: session → SQLite
  session-recall-server.py             ← MCP server for FTS5 search
  skill-lifecycle.py                   ← Skill promotion pipeline (73 security patterns)
  web-chat-server.py                   ← Web Chat HTTP server
  tests/                               ← 92+ tests

.aiox/message-gateway/                 ← GITIGNORED (runtime integrations)
  agents/aiox-master/                  ← Deployed agent (SOUL.md, CLAUDE.md, config.json)
```

### Runtimes (4 drivers)

| Runtime | CLI | Models | Tools | Hooks | Continue |
|---------|-----|--------|-------|-------|----------|
| `claude-code` | `claude` | Claude family | Full | Yes | `--continue` |
| `codex` | `codex` | OpenAI (o4-mini, o3) | Full (sandboxed) | No | `resume --last` |
| `api-openrouter` | None (Python daemon) | 200+ via OpenRouter | **None** (chat only) | No | N/A |
| `mock` | None | — | — | — | — (testing) |

### Channels (5 adapters)

| Channel | Status | Key Scripts |
|---------|--------|-------------|
| Telegram | PRODUCTION | send-telegram.sh, check-telegram.sh, hook-permission-telegram.sh |
| Discord | PRODUCTION | send-discord.sh, check-discord.sh, hook-permission-discord.sh |
| Web Chat | PRODUCTION | send-web.sh, check-web.sh, web-chat-server.py |
| WhatsApp | PRODUCTION | send-whatsapp.sh, check-whatsapp.sh, whatsapp-bridge.js |
| Slack | PRODUCTION | send-slack.sh, check-slack.sh, socket-listener.py |

### Key Features

- **Smart Model Routing:** classify-turn.sh routes quick/standard/deep to different models
- **Cron Isolation:** Scheduled tasks run in subprocesses, zero context pollution
- **Credential Pool:** Multi-key rotation with least-used strategy
- **Session Recall:** FTS5 search over past sessions via MCP tool
- **Safety Scanner:** ~30 regex patterns blocking dangerous operations
- **Circuit Breaker:** Model fallback chain (30s→60s→5m cooldown)
- **Health Watchdog:** Auto-restart unhealthy adapters with exponential backoff

## Onboarding — Pre-Flight Check (runs FIRST, before any action)

Before executing ANY action, run this pre-flight check. Report results as a table. If anything fails, guide the user to fix it before proceeding.

```yaml
preflight:
  - name: "tmux"
    check: "which tmux >/dev/null 2>&1"
    fix: "(macOS) brew install tmux | (Linux) apt install tmux | (Windows) via WSL"

  - name: "jq"
    check: "which jq >/dev/null 2>&1"
    fix: "(macOS) brew install jq | (Linux) apt install jq | (Windows) via WSL"

  - name: "curl"
    check: "which curl >/dev/null 2>&1"
    fix: "(macOS) brew install curl | (Linux) apt install curl | (Windows) via WSL"

  - name: "claude CLI"
    check: "which claude >/dev/null 2>&1"
    fix: "npm install -g @anthropic-ai/claude-code"

  - name: "Gateway framework"
    check: "test -d infrastructure/message-gateway/core"
    fix: "Gateway not found. Copy infrastructure/message-gateway/ from sinkra-hub"

  - name: "Gateway installed"
    check: "test -d ~/.claude-remote/default"
    fix: "Run: bash infrastructure/message-gateway/install.sh"

  - name: "Agent deployed"
    check: "test -d .aiox/message-gateway/agents/aiox-master"
    fix: "Run: bash infrastructure/message-gateway/deploy-agent.sh"

  - name: "BOT_TOKEN configured"
    check: "grep -q 'BOT_TOKEN=.\\.+' ~/.claude-remote/default/config/aiox-master/.env 2>/dev/null"
    fix: "Run: ! bash infrastructure/message-gateway/setup-channel.sh"

report_format: |
  | Check | Status |
  |-------|--------|
  | tmux | OK / MISSING |
  | jq | OK / MISSING |
  | ... | ... |

  If ALL pass → proceed with requested action
  If ANY fail → show fix commands and STOP (do not proceed with action)
  Exception: /telegram setup can proceed even if BOT_TOKEN is missing (that's what setup does)
```

## Execution Protocol

Read `$ARGUMENTS` to determine the action. Default to `status` if empty.

**IMPORTANT:** Always run the pre-flight check first. Show a compact table of results. Only proceed to the action if all checks pass (or the user is running `setup` to fix missing config).

### Action: status

```yaml
steps:
  - Check agent dir: ls .aiox/message-gateway/agents/aiox-master/
  - Check persistence: (macOS) launchctl list | grep claude-remote / (Linux) systemctl --user is-active crm-* / (Windows) schtasks /query /tn crm-*
  - Check tmux: tmux has-session -t crm-default-aiox-master 2>/dev/null
  - Check .env for BOT_TOKEN: grep -c 'BOT_TOKEN=.\+' ~/.claude-remote/default/config/aiox-master/.env
  - Check runtime type: jq -r '.runtime // "claude-code"' .aiox/message-gateway/agents/aiox-master/config.json
  - Check enabled channels: jq -c '.channels[] | select(.enabled==true) | .type' .aiox/message-gateway/agents/aiox-master/config.json
  - Check adapter_mode: jq -r '.adapter_mode // false' .aiox/message-gateway/agents/aiox-master/config.json
  - Check webhook receiver: pgrep -f webhook-receiver.py
  - Check enabled-agents.json: cat ~/.claude-remote/default/config/enabled-agents.json
  - Report full table: CONFIGURED / RUNNING / STOPPED / NOT_SETUP
  - Report: runtime type, active channels, delivery mode (POLLING or WEBHOOK or ADAPTER)
```

### Action: setup

```yaml
steps:
  - DO NOT run setup-channel.sh via Bash tool — it is interactive and will fail
  - Instead, instruct the user to run it themselves using the ! prefix:
    "Execute no terminal: ! bash infrastructure/message-gateway/setup-channel.sh"
  - Explain what will happen:
    1. Menu with 5 channels: [1] Telegram  [2] Web Chat  [3] Discord  [4] Show config  [5] Exit
    2. For Telegram: paste @BotFather token, enter Chat ID
    3. For Web Chat: choose port (default 8080)
    4. For Discord: paste bot token from Developer Portal
  - Wait for user to confirm completion
  - After user confirms, verify config was created:
    ls ~/.claude-remote/default/config/aiox-master/.env
  - Report success and suggest next step: /telegram deploy
```

**IMPORTANT:** `setup-channel.sh` is interactive (reads from stdin). It CANNOT run via the Bash tool. Always ask the user to run it with `! bash infrastructure/message-gateway/setup-channel.sh` so the output lands in the conversation and they can interact with it.

### Action: deploy

```yaml
steps:
  - Run: bash infrastructure/message-gateway/deploy-agent.sh
  - Report generated files (SOUL.md, CLAUDE.md, config.json, .claude/settings.json)
  - Note: agent deploys to .aiox/message-gateway/agents/aiox-master/ (gitignored)
```

### Action: start

```yaml
steps:
  - Run: bash infrastructure/message-gateway/enable-agent.sh aiox-master
  - Wait 5 seconds for tmux to initialize
  - Verify: tmux has-session -t crm-default-aiox-master 2>/dev/null && echo RUNNING
  - Check activity log: tail -5 ~/.claude-remote/default/logs/aiox-master/activity.log
  - Report status
```

### Action: stop

```yaml
steps:
  - Run: bash infrastructure/message-gateway/disable-agent.sh aiox-master
  - Verify: tmux has-session -t crm-default-aiox-master 2>/dev/null && echo STILL_RUNNING || echo STOPPED
  - Report status
```

### Action: restart

```yaml
steps:
  - Run: bash infrastructure/message-gateway/enable-agent.sh aiox-master --restart
  - Wait 5 seconds
  - Verify tmux session
  - Report status
```

### Action: logs

```yaml
steps:
  - Tail activity log: tail -50 ~/.claude-remote/default/logs/aiox-master/activity.log
  - Tail fast-checker log: tail -20 ~/.claude-remote/default/logs/aiox-master/fast-checker.log
  - If crash log exists: tail -20 ~/.claude-remote/default/logs/aiox-master/crashes.log
  - If webhook log exists: tail -20 ~/.claude-remote/default/logs/aiox-master/webhook.log
  - If stderr exists: tail -20 ~/.claude-remote/default/logs/aiox-master/stderr.log
```

### Action: test

```yaml
steps:
  - Load CHAT_ID from: ~/.claude-remote/default/config/aiox-master/.env
  - Run: bash infrastructure/message-gateway/core/bus/send-telegram.sh $CHAT_ID "Test from /telegram skill"
  - Report success/failure
```

### Action: health

```yaml
steps:
  - Run: bash infrastructure/message-gateway/gateway-health.sh
  - Parse JSON output and present human-readable table
  - Report per-agent and per-adapter status
```

### Action: webhook status

```yaml
steps:
  - Run: bash infrastructure/message-gateway/core/webhook/setup-webhook.sh --info
  - Check if webhook-receiver.py is running: pgrep -f webhook-receiver.py
  - Check adapter_mode in config.json
  - Report: WEBHOOK_ACTIVE / WEBHOOK_INACTIVE / POLLING_MODE / ADAPTER_MODE
```

### Action: webhook enable

```yaml
steps:
  - Verify BOT_TOKEN configured (else guide to /telegram setup)
  - Check if tunnel is running (ngrok or cloudflared)
  - If no tunnel detected, guide user:
    "Start a tunnel first:
      cloudflared tunnel --url http://localhost:8443
    Or:
      ngrok http 8443"
  - Run: bash infrastructure/message-gateway/core/webhook/setup-webhook.sh --auto
  - Get WEBHOOK_SECRET from: ~/.claude-remote/default/config/aiox-master/.webhook-secret
  - Add to .env if not present: ADAPTER_MODE=true, WEBHOOK_SECRET=<secret>, WEBHOOK_PORT=8443
  - Start webhook receiver in background:
    nohup python3 infrastructure/message-gateway/core/webhook/webhook-receiver.py \
      >> ~/.claude-remote/default/logs/aiox-master/webhook.log 2>&1 &
  - Verify receiver is listening: curl -s http://localhost:8443/health
  - If agent is running, restart to pick up ADAPTER_MODE:
    bash infrastructure/message-gateway/enable-agent.sh aiox-master --restart
  - Report: webhook enabled, delivery mode changed to WEBHOOK
```

### Action: webhook disable

```yaml
steps:
  - Run: bash infrastructure/message-gateway/core/webhook/teardown-webhook.sh
  - Kill webhook receiver: pkill -f webhook-receiver.py
  - Update .env: set ADAPTER_MODE=false
  - If agent is running, restart to revert to polling:
    bash infrastructure/message-gateway/enable-agent.sh aiox-master --restart
  - Report: webhook removed, delivery mode reverted to POLLING
```

### Action: webhook logs

```yaml
steps:
  - Tail last 50 lines: tail -50 ~/.claude-remote/default/logs/aiox-master/webhook.log
  - Report webhook health: curl -s http://localhost:8443/health 2>/dev/null || echo "Receiver not running"
```

## Error Handling

| Error | Action |
|-------|--------|
| No BOT_TOKEN configured | Guide user to run `/telegram setup` first |
| Agent dir missing (.aiox/) | Guide user to run `/telegram deploy` first |
| enabled-agents.json missing | Auto-created by enable-agent.sh (fixed in v3.0) |
| persistence not loaded | Guide user to run `/telegram start` |
| tmux session not found | Check stderr.log for errors, may need `/telegram restart` |
| persistence config wrong | Run `/telegram restart` (regenerates persistence config with correct .aiox/ path) |
| send-telegram fails | Check token validity: `curl https://api.telegram.org/bot<TOKEN>/getMe` |
| No tunnel detected | Guide user to start ngrok or cloudflared first |
| webhook-receiver.py not running | Start it or check webhook.log for errors |
| aiohttp not installed | Guide: `pip3 install aiohttp` |
| Webhook registration failed | Check BOT_TOKEN, verify tunnel URL is HTTPS and reachable |
| fast-checker crash loop | Check fast-checker.log, watchdog halts after 5 restarts in 5min |
| Rate limited (429) | Automatic backoff in agent-wrapper.sh (300s × count) |

## Prerequisites

- Telegram bot token from @BotFather (for Telegram channel)
- `jq` and `curl` installed
- macOS, Linux, or Windows (auto-detects persistence: launchd / systemd / schtasks)
- For webhook mode: `python3` with `aiohttp`, plus a tunnel (`cloudflared` or `ngrok`)
- For WhatsApp: Node.js + `@whiskeysockets/baileys`
- For Slack: `python3` with `slack-bolt`
- For Discord: Bot token from Developer Portal

---

*Skill: telegram v2.0.0*
*Gateway: infrastructure/message-gateway/*
*Runtimes: 4 | Channels: 5 | Tests: 92+*
