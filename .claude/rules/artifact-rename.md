---
paths:
  - "squads/**/config.yaml"
  - "squads/**/squad-io.yaml"
  - "workspace/_system/config.yaml"
  - "workspace/_templates/**"
  - "scripts/sinkra/rename-artifact.js"
---

# Artifact Rename — Sinkra Hub

Applies when renaming any file referenced by multiple squad files (tasks, agents, workflows, manifests, checklists, config, squad-io).

## Rule (NON-NEGOTIABLE)

**NEVER rename artifact references manually with Edit/sed/replace_all across multiple files.**

Use the rename CLI:

```bash
npm run sinkra:rename-artifact -- --from <old> --to <new> --squad <name> --yes
# Or repo-wide:
npm run sinkra:rename-artifact -- --from <old> --to <new> --all --yes
```

## Why

Manual rename of `brandbook.yaml` cost 113 edits across 32 files with 5 failed attempts.
The CLI does it in 1.5 seconds with atomic rollback on validation failure.

## Features

| Feature | Flag | Purpose |
|---------|------|---------|
| Preview | `--dry-run` | Shows all changes before applying |
| Scope | `--squad <name>` | Limit to one squad |
| Repo-wide | `--all` | All tracked files |
| Skip confirm | `--yes` | Non-interactive mode |
| Exclude | `--exclude-pattern <regex>` | Skip lines matching regex (default: `id:` lines) |
| Report | `--report <path>` | Save summary as YAML audit |
| Index | `--rebuild-index` | Rebuild backlink index |

## Post-rename validations (automatic)

- YAML syntax (`validate:yaml:changed`) — BLOCKS + rollback on failure
- Workspace dialect (`validate:workspace-dialect`) — BLOCKS on failure
- Rollback via git checkout + snapshot (handles both tracked and untracked files)

## Anti-Pattern

```
# WRONG — manual multi-file rename
Edit(file1, old_string: "brandbook.yaml", new_string: "brand-platform.yaml", replace_all: true)
Edit(file2, old_string: "brandbook.yaml", new_string: "brand-platform.yaml", replace_all: true)
... (repeat 32 times, hope nothing breaks)

# RIGHT — atomic CLI rename
Bash("npm run sinkra:rename-artifact -- --from brandbook.yaml --to brand-platform.yaml --squad c-level --yes")
```

## Known Limitations

- `git grep` only searches tracked files. Untracked files with old references are NOT renamed.
  Commit pending work before running rename.
- Semantic IDs (e.g., `id: brandbook` in YAML) are excluded by default via `--exclude-pattern`.
  Override if needed.

## Reference

- Script: `scripts/sinkra/rename-artifact.js`
- ADR: `docs/adrs/ADR-015-artifact-path-indirection.md`
- Epic: `docs/stories/epic-124/`
- Heuristic: AN_KE_153
- Related rule: `canonical-artifact-names.md` (CANP — when rename is allowed)
