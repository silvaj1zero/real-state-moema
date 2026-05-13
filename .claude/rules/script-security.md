---
paths:
  - "scripts/**/*.js"
  - "scripts/**/*.cjs"
  - "scripts/**/*.sh"
  - "squads/**/scripts/**"
---

# Script Security — Sinkra Hub

Applies to CLI/automation scripts that accept user input (flags, positional args, env vars, stdin) and execute shell commands or filesystem operations at scale.

## Non-Negotiable Rules

### R1 — Never interpolate user input into shell command strings

**WRONG:**
```js
execSync(`git grep "${userInput}"`)
```

A value like `'"; rm -rf / #'` breaks out of the string.

**RIGHT:**
```js
spawnSync('git', ['grep', '-F', userInput], { cwd })
```

Array args bypass the shell. Input is literal, never parsed as command.

### R2 — Graceful failure outside git repo

Scripts calling `git rev-parse --show-toplevel` at module load crash with unreadable stacks. Wrap in try/catch. Either fallback to `process.cwd()` walking up for a marker (e.g., `workspace/_system/config.yaml`), or exit code 3 with clear message.

### R3 — Bulk operations: dry-run + confirm + snapshot rollback

Any script modifying 5+ files must offer:
- `--dry-run` showing changes before apply
- Confirmation (skippable with `--yes`)
- Snapshot-based rollback — capture contents before writing, restore on failure. `git checkout` cannot restore untracked files.

### R4 — Post-modification validation triggers rollback

After bulk write, run the relevant validator before reporting success. If validator fails, rollback via snapshots and exit non-zero.

### R5 — Distinct exit codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Validation failure (rolled back) |
| 2 | No-op (no matches, nothing to do) |
| 3 | Argument/environment error |

Never conflate "no changes needed" (2) with "changes failed" (1).

## Required Test Cases

1. Injection via quote: `'"; echo PWNED > /tmp/x; echo "'` — file NOT created
2. Injection via backtick: `` '`command`' `` — no substitution
3. Empty input — exit 3
4. Identical from/to — exit 3
5. Rollback of untracked file — original state restored

## Validator Self-Check

A findings validator must have:
- Known-bad input test → expect non-zero findings
- Clean input test → expect zero findings

A validator that always returns zero is likely dead code.

## Review Checklist

- [ ] User input goes through `spawnSync`/`execFile` with array args
- [ ] `git rev-parse` wrapped or has fallback
- [ ] Bulk ops have `--dry-run`, confirm, rollback
- [ ] Snapshot-based rollback (not just `git checkout`)
- [ ] Exit codes distinct and in `--help`
- [ ] 5 test cases above exist
- [ ] Validator has self-check

## Reference

`scripts/sinkra/rename-artifact.js` is the canonical example (post EPIC-124 QA hardening).

## Related

- `artifact-rename.md` — use the CLI
- `portable-paths.md` — no hardcoded absolute paths
- `epistemic-standards.md` — risk confidence tagging
