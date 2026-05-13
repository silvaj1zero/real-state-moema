---
name: dream-cycle
description: "Use when you want to run the AIOX Dream Cycle — automated ecosystem self-healing pipeline (HEAL → DETECT → REPORT) that fixes skill drift, syncs agents, and generates a health score report."
version: "1.0.0"
user-invocable: true
context: fork
argument-hint: "[--dry-run] [--heal=auto|interactive|off] [--retain <days>]"
---

# Dream Cycle

Runs the 3-phase ecosystem self-healing pipeline:

1. **HEAL** — executes auto-fix atoms (sync:skills:fix, sync:agent-skills, config:drift:gen, sync:ide)
2. **DETECT** — runs full doctor suite (D1–D10) and collects findings
3. **REPORT** — persists JSON + Markdown report to `outputs/qa/dream-cycle/` and prunes expired files

## Usage

```bash
# Standard run
npm run dream-cycle

# Dry-run (no side effects)
npm run dream-cycle -- --dry-run

# Custom retention (7-day instead of default 30-day)
npm run dream-cycle -- --retain 7

# Heal mode
npm run dream-cycle -- --heal=off
```

## Scheduling

```bash
# One-time via /loop (24h interval)
/loop 24h npm run dream-cycle

# Persistent cron (daily at 03:00 UTC)
CronCreate 0 3 * * * npm run dream-cycle --name dream-cycle-daily
```

## Output

Reports land in `outputs/qa/dream-cycle/{YYYY-MM-DD}.json` and `.md`.

Script: `scripts/dream-cycle.js` | Story: STORY-125 | ADR-016
