---
name: pull
description: Sync the local AIOX Enterprise checkout with origin/main, then run npm ci if package-lock.json changed and npm run doctor to verify health. Use when the user says "pull", "sync", "atualiza", "atualizar", or "/pull". Fast, safe, idempotent — does not touch your workspace zone (gitignored per ADR-051).
---

# /pull — Sync AIOX Enterprise

## When to use

Run when the user wants to sync their local checkout with the latest upstream changes from `AIOXsquad/AIOX-enterprise`. Safe to run anytime — never touches `workspace/businesses/*` (gitignored).

## Steps

1. **Verify clean working tree.** Run `git status --porcelain`. If output is non-empty, ask the user whether to stash or abort. Never auto-stash.

2. **Detect tracking.** Run `git config --get branch.main.remote`. If empty, run `git branch --set-upstream-to=origin/main main` and inform the user that tracking has been configured.

3. **Pull.** Run `git pull --ff-only origin main`. If the pull is rejected (non-fast-forward), report the divergence and ask the user how to proceed. Do not force.

4. **Detect dependency change.** Compare `git log -1 --format=%H` vs the previous HEAD captured before pull. If `package-lock.json` is among the changed files (`git diff --name-only PREV_HEAD HEAD | grep package-lock.json`), recommend running `npm ci`. If the user agrees (or the skill is invoked with `--auto`), run it.

5. **Run health check.** Run `npm run doctor` and report the result. If anything fails, surface the failure to the user with actionable next steps.

6. **Summary.** Report: commits pulled (count + first lines of subjects), whether `npm ci` ran, doctor result.

## Edge cases

- **No tracking and `origin/main` doesn't exist:** report the remote situation and stop.
- **User is on a non-main branch:** ask whether to switch or pull on the current branch.
- **Detached HEAD:** abort with a clear message.

## Out of scope

- Pushing (use @devops or `/commit`)
- Resolving merge conflicts (delegate to user)
- Syncing local "work folders" outside the repo (the original feature request mentioned this — out of scope; track via separate tooling like `rsync` or a dedicated workspace sync script)

## Reference

- Issue #7 (the original request)
- ADR-051 (zone separation — explains why `git pull` is conflict-free for clients)
