---
paths:
  - ".claude/settings*.json"
  - ".claude/hooks/**"
  - ".claude/rules/**"
  - ".agents/skills/**/SKILL.md"
  - ".claude/skills/**/SKILL.md"
  - ".aiox-core/development/agents/**"
  - ".aiox-core/development/tasks/**"
  - ".aiox-core/development/workflows/**"
  - "scripts/operator-*.sh"
  - "scripts/validate-branch-switching-instructions.js"
---

# Cross-Terminal Isolation

Applies when more than one agent, IDE, terminal, or automation session may operate on the repository.

## Rule

Use one worktree per branch per terminal.

Do not switch an active shared checkout to another branch for task work. Create an isolated worktree instead:

```bash
bash scripts/operator-new-worktree.sh ../worktrees/<task-slug> <branch-name>
```

Run the worktree doctor before automated workflows in that checkout:

```bash
bash scripts/operator-worktree-doctor.sh
```

## Why

Multiple terminals on the same checkout can silently change branch, index, staged files, and hook context for each other. In this repository that is a boundary risk, because automated SDC workflows can commit or push faster than a human can inspect every diff.

The safe invariant is:

```text
1 terminal = 1 worktree = 1 branch = 1 task context
```

## Allowed

- Creating a new isolated worktree with `scripts/operator-new-worktree.sh`.
- Listing worktrees with `git worktree list`.
- Running `scripts/operator-worktree-doctor.sh` before SDC, deploy, push, or release automation.
- Restoring a file path from git with checkout syntax when it does not switch branch context.

## Forbidden

- Branch switching in a shared checkout for task work.
- Running automated workflows after another terminal changed the current branch.
- Reusing one dirty checkout for parallel PRs, SDC runs, deploys, or incident remediation.
- Treating `git stash` as isolation; stash is still shared mutable state.

## Recovery

If a checkout may have been reused across terminals:

1. Stop automated workflows in that checkout.
2. Run `git status --short --branch`.
3. Run `git worktree list`.
4. Move the task into a dedicated worktree with `scripts/operator-new-worktree.sh`.
5. Run `scripts/operator-worktree-doctor.sh`.
6. Resume automation only after boundary validators pass.

## Enforcement

| Layer | Mechanism |
|---|---|
| Guidance | This rule: one worktree per branch per terminal |
| Scaffolding | `scripts/operator-new-worktree.sh` |
| Audit | `scripts/operator-worktree-doctor.sh` |
| Static validation | `scripts/validate-branch-switching-instructions.js` |
| Boundary validation | `npm run validate:operator-boundary` |

Related: issue #69 and issue #78.
