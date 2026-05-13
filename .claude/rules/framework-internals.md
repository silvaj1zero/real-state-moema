---
paths:
  - ".aiox-core/**"
---

# Framework Internals — `.aiox-core/`

Operational structure of the AIOX/SINKRA framework canonical:

- **Activation pipeline:** `.aiox-core/development/scripts/unified-activation-pipeline.js` — discovers agents dynamically from filesystem
- **IDE Sync:** `.aiox-core/infrastructure/scripts/ide-sync/` — propagates agents to all enabled IDEs with dynamic squad discovery
- **Ecosystem Sync:** `.aiox-core/core/ecosystem/` — reconciliation engine, contract validator, `*sync-ecosystem` command
- **Core modules:** `.aiox-core/core/` — session, permissions, themes, config, orchestration
- **Development:** `.aiox-core/development/` — agents, tasks, workflows, checklists, templates, agent-teams

Ecosystem registry maintained at `squads/sinkra-squad/data/ecosystem-registry.yaml` — updated by `*sync-ecosystem`.
