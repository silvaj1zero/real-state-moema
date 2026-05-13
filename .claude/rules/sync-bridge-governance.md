---
paths:
  - "infrastructure/sync/**"
  - "infrastructure/**"
  - "scripts/hub-sync.js"
  - "sot-manifest.yaml"
---

# Sync Bridge Governance — Sinkra Hub

Applies to all sync operations between Sinkra Hub and spoke repositories.

## Non-Negotiable Rules

1. **Allowlist-only** — Sync script operates on a hardcoded allowlist of paths. Everything outside is blocked.
2. **One-directional** — Hub → Spoke only. No reverse sync path exists. Spoke contributions go through PR to Hub reviewed by CODEOWNERS.
3. **@devops-only** — Only `@devops` agent can execute sync operations (agent authority).
4. **From main only** — Sync distributes from Hub's `main` branch, never from feature branches.
5. **No workspace data** — `workspace/`, `outputs/`, `docs/stories/` are categorically excluded from sync.
6. **No secrets** — `.env`, `.mcp.json`, `settings.local.json` never sync.

## SOT Resolution

| Layer | SOT | Notes |
|-------|-----|-------|
| Framework / governance | Hub | `.aiox-core/`, `.claude/rules/` |
| L0-L1 (identity / strategy) | Hub | Templates and base definitions |
| L2 (tactical) | Shared | Hub provides templates, spoke fills instances |
| L3-L4 (product / operational) | Spoke | Business-specific implementation |
| Business workspace data | Spoke | Business owner sovereignty |
| Process registry schema | Hub | Structure and validation rules |
| Process registry instances | Spoke | Populated per-business |
| Token registry base | Hub | Canonical token definitions |
| Token extensions | Spoke | Overlay only, never override base tokens |

## Conflict Resolution

- Spoke modified a synced file AND Hub also changed it → **CONFLICT**, skip unless `--force`
- Spoke never touched the file (matches manifest hash) → safe overwrite
- Schema changes → conformance check on spoke instances, never data merge

## Sync Executor

- Only `@devops` can run `hub-sync.js`
- Each sync generates a narrative changelog in `infrastructure/sync/logs/`
- Backup created before any write in `infrastructure/sync/backups/`

## Reference

- Roundtable: `docs/sessions/2026-04/2026-04-09-roundtable-hub-strata-sync-bridge.md`
- SOT Manifest: `sot-manifest.yaml`
- Artifact Classification: `.claude/rules/artifact-classification.md`
