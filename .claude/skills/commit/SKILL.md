---
name: "commit"
description: "Runs the automated DevOps commit workflow with scope filtering and optional"
version: "3.1.0"
agent: "commit"
user-invocable: true
maxTurns: 25
---

# Commit Workflow (inline)

Scope-based commit splitting, executed **inline in the current conversation**. Does NOT spawn a devops subagent.

**Strategy source of truth:** `.aiox-core/development/tasks/github-devops-commit-strategy.md`

## Why inline (authority without spawn)

Spawning a subagent for commits (v3.x behavior) wasted context, lost session state, and often failed when the parent session already had live git knowledge. This v4 runs in the same conversation where the changes were made — the LLM already knows what it did and why.

**Authority model:**
- `agent: devops` in frontmatter = the LLM in the current session **assumes @devops authority** for the duration of the skill. Per `.claude/rules/agent-authority.md`, only @devops may `git push`, `git tag`, or create PRs.
- `context: inline` = execution happens in the current conversation (no Task spawn, no persona switch, no isolated subagent). The LLM reads this skill and executes its steps directly.
- The pair `agent: devops` + `context: inline` means: "run here, but as @devops". This is the only way to honor Constitution Article II (only @devops pushes) without losing session context.
- Git push authority is enforced at the shell layer by `.claude/hooks/enforce-git-push-authority.sh`, which checks `AIOX_ACTIVE_AGENT=devops`. The skill satisfies the hook by prefixing every `git push` with `AIOX_ACTIVE_AGENT=devops` inline on the command itself. No shell export, no persona wrapper needed.

**What this skill is NOT:**
- NOT a Task subagent spawn (that was v3.x, deprecated)
- NOT a persona switch wrapping the current Claude (the current session keeps its own style; only the authority label changes)
- NOT a wrapper over `@devops *commit` (Gage's command flow) — this is the canonical `/commit` path and Gage may delegate to it

## Usage

```bash
/commit                       # Stage + commit ALL changes in the working tree, split by scope, push
/commit docs                  # Only stage files matching docs/ (path filter), commit, push
/commit squads                # Only squads/
/commit .claude               # Only .claude/
/commit workspace             # Only workspace/

# Flags
/commit --no-push             # Commit but do NOT push
/commit --split-only          # Alias for --no-push
/commit --dry-run             # Preview commits without running any git write command
/commit --single              # One single commit instead of split by scope
/commit --review              # Run CodeRabbit on uncommitted changes first; halt on CRITICAL
/commit docs --no-push        # Combine filter + flag
```

## Pre-flight checks (ALWAYS run first)

Before staging anything, the skill runs these checks inline. On any failure, it HALTS with a clear message.

```bash
# 1. Git state sanity — abort if in the middle of merge/rebase/cherry-pick
test -f .git/MERGE_HEAD       && echo "HALT: merge in progress"     && exit 1
test -f .git/REBASE_HEAD      && echo "HALT: rebase in progress"    && exit 1
test -f .git/CHERRY_PICK_HEAD && echo "HALT: cherry-pick in progress" && exit 1

# 2. Branch check
git rev-parse --abbrev-ref HEAD

# 3. Change detection
git status --porcelain

# 4. If nothing to commit → report and STOP
```

## Algorithm (inline execution)

1. **Read current state**
   - `git status --porcelain`
   - `git log --oneline -5` (recent message style)
   - `git diff --cached --stat` + `git diff --stat`

2. **Filter by scope** (if `<scope-filter>` argument provided)
   - If argument is a directory under the repo → use `git status --porcelain -- <scope-filter>/`
   - If argument is one of the known scope keywords (docs, squads, .claude, workspace, app, infrastructure, scripts, packages, services) → same as above
   - If argument starts with `--` → treat as flag, no scope filter

3. **Read the canonical strategy** (`.aiox-core/development/tasks/github-devops-commit-strategy.md`) and apply its Scope Buckets + Dominant Category + Guardrails logic:

```yaml
Tool: Task
Parameters:
  subagent_type: "devops"
  prompt: |
    Execute commit workflow for NESTED REPO: {repo_name}

4. **Compute split plan**
   - Each file → exactly one scope (first match wins).
   - Per scope: pick dominant category (feat / fix / refactor / docs / chore).
   - Split only when scope exceeds guardrails (content: 100 files / 20k lines; code: 50 files / 8k lines).
   - Feat + Fix in same scope → 2 commits.
   - `--single` → override: 1 commit covering everything.

5. **Dry-run output** (if `--dry-run`)
   - Print the proposed commit table (scope, type, file count, subject) + `git status -- <scope>` for each.
   - DO NOT run any git write command.
   - STOP.

6. **Review gate** (if `--review`)
   - Detect platform: `uname -s` → `Darwin|Linux = native`, `MINGW/MSYS = WSL`.
   - Run `coderabbit --prompt-only -t uncommitted` (native) or `wsl bash -c 'coderabbit --prompt-only -t uncommitted'` (WSL).
   - Parse CRITICAL / HIGH / MEDIUM / LOW counts.
   - **If CRITICAL > 0** → attempt auto-fix max 2 iterations, re-run review. If still CRITICAL → HALT, do NOT commit.
   - HIGH/MEDIUM/LOW → document in commit body, do not block.
   - If `coderabbit` CLI missing → warn and proceed without review.

7. **Stage + commit each scope sequentially** (inline, using Bash tool directly)
   - `git add <files for this scope>`
   - `git commit -m "<type>(<scope>): <subject>$'\n\n'<body bullets>$'\n\n'Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"`
   - Use HEREDOC for the message to preserve formatting.
   - Capture the hash for the summary table.

8. **Push** (unless `--no-push` / `--split-only`)
   - `AIOX_ACTIVE_AGENT=devops AIOX_PUSH_TARGET=<remote> node scripts/aiox-safe-push.js <remote> <current-branch>`
   - Use the operator private remote by default; push to multi-tenant `origin` only when `AIOX_ALLOW_MULTITENANT_PUSH=1` and boundary validators pass.
   - On push failure: report and STOP. Do NOT force-push. Do NOT auto-merge.
   - On success: capture `old..new` range.

9. **Report**
   - Print a markdown table: `# | Scope | Type | Files | Hash`
   - Print the push result
   - Print any warnings (skipped files, review findings, hook outputs)

## Commit message format

```
<type>(<scope>): <subject ≤72 chars>

- Bullet list of key changes
- Explain why, not what (the diff shows what)

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
```

**Conventional commit types:** `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `perf`, `style`.

```yaml
Tool: Task
Parameters:
  subagent_type: "devops"
  prompt: |
    Execute commit workflow with PATH FILTER: {path}/

**Story reference:** If any commit touches files listed in an active story, include `[STORY-X.Y]` at the end of the subject. The `enforce-story-reference.sh` hook warns on missing references.

**Co-author trailer:** REQUIRED. The canonical strategy says "never" but the repo's current convention (per recent commits and commit workflow) is to include it. Keep it.

## What this skill does NOT do

- ❌ NO `npm run lint | typecheck | test | build | audit`
- ❌ NO `npx secretlint`
- ❌ NO security scans
- ❌ NO running `.aiox-core/development/tasks/github-devops-pre-push-quality-gate.md`
- ❌ NO spawning `@devops` subagent (v3.x behavior, deprecated)
- ❌ NO persona switching

```yaml
Tool: Task
Parameters:
  subagent_type: "devops"
  prompt: |
    Execute commit workflow for FULL REPO (mmos)

## Safety rules

- **Never** `git add -A` without the user knowing — always show `git status --porcelain` first.
- **Never** `git reset --hard` or `git clean -fdx` unless the user explicitly asks.
- **Never** force-push without explicit user confirmation.
- **Never** amend published commits.
- If merge/rebase/cherry-pick is in progress → HALT and ask.
- If a pre-commit hook fails → create a NEW commit with the fix, do NOT `--amend`.
- On push rejection → report and ask, do NOT auto-pull or auto-merge.

## Examples

### Basic commit all + push
```
/commit
```
→ Reads working tree, splits by scope, commits each scope, pushes to origin.

### Commit only docs
```
/commit docs
```
→ Only files in `docs/` are staged. Other changes stay unstaged.

### Preview split without committing
```
/commit --dry-run
```
→ Prints proposed commits with scope/type/subject. No git write commands.

### Split commits, review before pushing
```
/commit --split-only
```
→ Creates all commits locally. User can `git log` / `git diff` before manually running push.

### Review with CodeRabbit first
```
/commit --review
```
→ Runs CodeRabbit on uncommitted changes. Halts if CRITICAL. Otherwise commits + pushes.

## Reference

- `.aiox-core/development/tasks/github-devops-commit-strategy.md` — algorithm source of truth
- `.claude/hooks/enforce-git-push-authority.sh` — git push authority hook (requires `AIOX_ACTIVE_AGENT=devops`)
- `.claude/rules/agent-authority.md` — who can do what
- `.claude/rules/story-lifecycle.md` — story reference convention

---

*Commit Skill v4.0 — inline execution, no subagent spawn. STORY-MIG-1.5 follow-up.*
