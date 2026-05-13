---
paths:
  - "squads/**/skills/**"
  - ".claude/skills/**"
  - ".aiox/learning/**"
  - ".aios/learning/**"
---

# Incremental Learning Log — Universal Rule for Orchestrating Skills

Applies to any skill that executes more than one phase (orchestrating skills like `/sinkra-map-process`, `/full-sdc`, `/sinkra-upgrade-squad`, `/roundtable`, `/governance-pipeline`, `/design-artifact-cycle`, `/book-summary`, `/enhance-workflow`).

## Rule (NON-NEGOTIABLE)

**Orchestrating skills MUST write the learning log incrementally — once after Phase 0 initialization, then updated after EACH phase completion.** Post-hoc writes at skill-end are forbidden for multi-phase skills.

## Why

Observed gap (this session): post-hoc learning logs are lost when the pipeline crashes mid-way. `/sinkra-map-process` criacao-slides-ia (2026-04-20) wrote the log at the END of the pipeline — 90 minutes of phase execution, single write at the end. If the skill had crashed at phase 5, no evidence of the 4 prior successful phases would exist. The feedback loop breaks precisely when we need it most (on failures).

Incremental logs turn the learning substrate from "artifact of success" into "provenance of any execution."

## Canonical Path

**`.aiox/learning/logs/{skill}/{skill}-{run-slug}-{YYYYMMDD-HHmmss}.yaml`**

(The parallel `.aios/learning/` tree exists and is drifted. Standardize on `.aiox/` — the path used by production runs. Migration of `.aios/` is a separate cleanup story.)

## Minimum Schema

```yaml
schema_version: "1.0"
skill_id: "{skill-name}"
run_id: "{slug}-{YYYYMMDD-HHmmss}"
timestamp_started: "{ISO-8601 — written at Phase 0}"
timestamp_updated: "{ISO-8601 — refreshed at each phase}"
timestamp_completed: null  # set at end
outcome: in_progress  # in_progress | completed | halted | failed | escalated

# Phase registry — one entry per phase declared by the skill
# Each entry starts as status: pending and transitions to in_progress → completed / halted / failed
phases:
  p00_init:
    status: completed
    started_at: "{ISO-8601}"
    completed_at: "{ISO-8601}"
    # phase-specific fields
  p01_discovery:
    status: pending  # updated to in_progress when phase starts
```

## Write Protocol

1. **At Phase 0 completion:** write the log file with the `phases:` object pre-populated with all known phases as `status: pending`.
2. **At the start of each phase:** update that phase's entry to `status: in_progress`, `started_at: {now}`, refresh `timestamp_updated`.
3. **At the end of each phase:** update that phase to `status: completed|halted|failed`, add `completed_at`, checkpoint verdict, scores, artifacts, any notable facts.
4. **On checkpoint VETO / error / user halt:** set `outcome: halted|failed|escalated`, set `timestamp_completed`, persist. Do NOT lose the log.
5. **At pipeline completion:** set `outcome: completed`, `timestamp_completed`, add summary fields.

Each write is a full-file overwrite. No append-only JSONL requirement (YAML overwrite is simpler and human-readable).

## What Goes in Each Phase Entry

Minimum:
- `status`: pending | in_progress | completed | halted | failed
- `started_at`, `completed_at`: ISO-8601
- `agent`: the subagent id if spawned, `inline` otherwise
- `execution`: spawn | inline | skipped

Whatever the phase produces:
- Checkpoint verdict + scores
- Artifacts list (relative paths)
- Deviations logged (reference DEV-ID)
- Counts that matter (tasks, edges, gaps, whatever the skill tracks)

## Integration with Existing Learning System

- `.aiox/learning/entries/` remains the draft→promotion path for heuristics (close-story scans, promotion to `minds/{owner}/heuristics/`). **No change.**
- `.aiox/learning/logs/` becomes the canonical provenance record per execution. **This rule formalizes what was ad-hoc.**
- `close-story` and `verify-deploy` provenance guards (block if log missing) continue to work — incremental logs satisfy the same check AND provide partial state on crash.

## Enforcement

| Skill | Compliance today | After this rule |
|---|---|---|
| `/sinkra-map-process` | Post-hoc only (1 write at end) | Incremental per phase |
| `/full-sdc` | Not explicitly tracked | SHOULD adopt |
| `/sinkra-upgrade-squad` | Post-hoc | SHOULD adopt |
| `/book-summary` | Not explicitly | SHOULD adopt |
| `/roundtable`, `/governance-pipeline`, `/design-artifact-cycle`, `/enhance-workflow` | Not explicitly | SHOULD adopt |

Migration is opt-in per skill on next touch. New orchestrating skills MUST comply from day one.

## Anti-Patterns

- **Single final write** — defeats crash recovery.
- **Writing only successful phases** — failures are the highest-value learning signal.
- **Mixed `.aios/` + `.aiox/` paths in the same skill** — pick canonical, note drift once.
- **Deep per-write diffs (e.g. JSON Patch)** — overcomplicated. Overwrite the YAML; it's short and readable.

## Related

- `.claude/rules/prior-art-search.md` — same provenance discipline applied to gap claims
- `squads/sinkra-squad/tasks/handoff-downstream.md` — downstream consumers can read the log for pipeline context
- `/close-story` scan pattern — promotion flow stays intact

---

*Origin: session 2026-04-19/20 review of `/sinkra-map-process` real run; post-hoc log would have been lost on any pre-final crash.*
