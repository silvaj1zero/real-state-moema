---
name: "deploy"
description: "Runs the full deploy pipeline with quality gates, git operations, Vercel deployment, and health verification"
version: "1.0.0"
agent: "deploy"
user-invocable: true
maxTurns: 25
---

# Deploy Pipeline

Full deployment pipeline: quality gates, git operations, Vercel deploy, and health verification.

## Usage

```bash
/deploy                     # Deploy site-aiox (default)
/deploy site-aiox           # Explicit target
/deploy --skip-checks       # Skip quality gates (emergency only)
/deploy --dry-run           # Preview what would happen without executing
/deploy --no-push           # Run checks + deploy via CLI, skip git push
```

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `<target>` | string | `site-aiox` | App to deploy |
| `--skip-checks` | flag | false | Skip lint/typecheck/build (emergency deploy) |
| `--dry-run` | flag | false | Preview pipeline without executing |
| `--no-push` | flag | false | Deploy via Vercel CLI without pushing to git |

## Deployment Targets

| Target | Submodule Path | Vercel Project | Production URL | Git Repo |
|--------|---------------|----------------|----------------|----------|
| `site-aiox` | `apps/site-aiox` | `brand-aiox` | brand-aiox.vercel.app | oalanicolas/aiox-brandbook (main) |

## Execution Protocol

### Phase 1: Pre-Flight

```yaml
steps:
  - Detect target from $ARGUMENTS (default: site-aiox)
  - Resolve paths from Deployment Targets table
  - Run: git -C {submodule_path} status
  - If --dry-run: report plan and STOP
```

### Phase 2: Quality Gates

**Skip this phase if `--skip-checks` flag is set.** Report SKIPPED clearly.

Run inside the submodule directory (`apps/site-aiox`):

```yaml
gates:
  - name: lint
    command: npm run lint
    blocking: true

  - name: typecheck
    command: npm run typecheck
    blocking: true

  - name: build
    command: npm run build
    blocking: true
```

**Rules:**
- Run gates sequentially (lint -> typecheck -> build)
- If ANY blocking gate fails: STOP pipeline, report error with details
- Report each gate result as it completes: PASS / FAIL

**Output format after each gate:**
```
[PASS] lint (Xs)
[PASS] typecheck (Xs)
[PASS] build (Xs)
```

### Phase 3: Git Operations

```yaml
steps:
  - cd {submodule_path}
  - Check for uncommitted changes: git status --porcelain
  - If changes exist:
      - git add -A
      - git commit with descriptive message (conventional commits format)
      - git push origin {branch}
  - If no changes:
      - Check if local is ahead of remote: git status -sb
      - If ahead: git push origin {branch}
      - If up to date: report "No changes to push" and continue
```

**IMPORTANT:** Commit message must follow conventional commits (feat:, fix:, chore:, etc.).

### Phase 4: Vercel Deploy

```yaml
strategy: vercel_cli
steps:
  - Run: vercel --prod --yes --cwd {submodule_path}
  - Capture deployment URL from output
  - If deploy fails: STOP and report error
```

**Note:** The Vercel project `brand-aiox` is connected to `oalanicolas/aiox-brandbook` (main branch).
Git pushes in Phase 3 will also trigger auto-deploy. The CLI deploy in this phase ensures
the deployment happens immediately with the exact local code.

### Phase 5: Health Check

```yaml
steps:
  - Wait 5 seconds for deployment propagation
  - Run: curl -sI {production_url}
  - Verify HTTP 200 response
  - Check x-vercel-error header is absent
  - If health check fails: report WARNING (deploy may still be propagating)
```

### Phase 6: Report

Output a summary table:

```
## Deploy Report

| Phase | Status | Details |
|-------|--------|---------|
| Quality Gates | PASS | lint, typecheck, build |
| Git | PUSHED | 2 commits pushed to main |
| Vercel Deploy | READY | brand-aiox-xxx.vercel.app |
| Health Check | PASS | HTTP 200, no errors |

Production URL: https://brand-aiox.vercel.app
Deploy URL: https://brand-aiox-xxx.vercel.app
```

## Error Handling

| Error | Action |
|-------|--------|
| Lint fails | STOP. Show errors. User must fix. |
| Typecheck fails | STOP. Show errors. User must fix. |
| Build fails | STOP. Show full error output. |
| Git push rejected | STOP. Report conflict. User must resolve. |
| Vercel deploy fails | STOP. Show logs. Suggest `vercel logs {url}`. |
| Health check fails | WARN only. Deploy may still be propagating. |

## Vercel Auth

The Vercel CLI uses the token stored at:
`~/Library/Application Support/com.vercel.cli/auth.json`

For API calls (if needed), extract the token from that file.

## Adding New Targets

To add a new app, add a row to the **Deployment Targets** table above with:
- Target name (used in `/deploy {name}`)
- Submodule path relative to repo root
- Vercel project name
- Production URL
- Git repo and branch

---

*Skill: deploy v1.0*
*Pipeline: quality gates -> git -> vercel -> health check*
