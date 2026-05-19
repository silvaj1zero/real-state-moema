---
name: "push-story"
description: "Push/PR story code to remote and route to deploy-story or close-story based on deploy_type. Replaces manual @devops *push with guaranteed SDC handoff."
version: "1.0.0"
owner_squad: "infra-ops-squad"
sinkra_tier: "Tier1"
context: inline
agent: devops
activation_type: pipeline
user-invocable: true
argument-hint: "[story-file-path]"
---

# Push Story — DevOps Push + SDC Routing

## Purpose

Replace manual `@devops *push` with a skill that guarantees correct SDC lifecycle routing after push. Solves the recurring bug where stories get pushed but never routed to `/deploy-story` or `/close-story`.

## Input

Story file path from arguments. If not provided, ask the user.

## Execution Protocol

### Step 1: Read Story and Extract deploy_type

1. Read the story file at the provided path
2. Extract `deploy_type` from frontmatter (valid: `none`, `supabase_migration`, `railway`, `vercel`, `hetzner_docker`, `multi`)
3. Extract `Status` — must be `InReview` or `Ready for Review`
4. If story has no gate file with PASS verdict → HALT: "QA gate not passed. Run `/review-story` first."

### Step 2: Determine Push Mode

Read the user's role from the story's `Accountable` field or team access control:

| User | Mode | Action |
|------|------|--------|
| Framework maintainer | **Framework-only direct push** | Run `scripts/aiox-safe-push.js` with `AIOX_ALLOW_MULTITENANT_PUSH=1` only after boundary validators pass |
| Operator/licensee | **Private remote or PR** | Push to `AIOX_PUSH_TARGET` private remote by default; create PR through `scripts/aiox-safe-pr.js` only for framework-only diffs |

### Step 3: Stage and Commit (if uncommitted changes)

1. Check `git status` for uncommitted changes related to the story
2. If uncommitted changes exist:
   - Stage only story-related files (from Dev Agent Record File List)
   - Commit with conventional commit message referencing the story
3. If no uncommitted changes: proceed to Step 4

### Step 4: Push or Create PR

**Framework-only direct push:**
```bash
AIOX_ACTIVE_AGENT=devops AIOX_ALLOW_MULTITENANT_PUSH=1 node scripts/aiox-safe-push.js origin main
```

**PR mode:**
```bash
AIOX_ACTIVE_AGENT=devops node scripts/aiox-safe-pr.js --title "{conventional-commit-title} [Story {id}]" --body "## Summary\n{story-summary}\n\n## Test Plan\n- All ACs verified\n- {test_count} tests passing"
```

**Operator-private backup mode:**
```bash
AIOX_ACTIVE_AGENT=devops AIOX_PUSH_TARGET="{operator-private-remote}" node scripts/aiox-safe-push.js "{operator-private-remote}" "{branch}"
```

### Step 5: Route Based on deploy_type (NON-NEGOTIABLE)

After successful push/PR, immediately route:

```
IF deploy_type == 'none':
  → Output: "Push complete. No deploy needed."
  → Output: "Next: /close-story {story-path}"

ELSE (any deploy_type):
  → Output: "Push complete. Deploy required (deploy_type: {deploy_type})."
  → Output: "Next: /deploy-story {story-path}"
  → Output: "Then: /verify-deploy {story-path}"
  → Output: "Then: /close-story {story-path}"
```

**This step is the reason this skill exists.** The routing MUST happen. Never end without showing the next step.

### Step 6: Summary

Display:

```
## Push Story Complete

**Story:** {story-id} — {title}
**Mode:** Direct push | Pull Request
**Commit:** {sha}
**deploy_type:** {deploy_type}

### Next Steps
{routing from Step 5}
```

## Blocking Conditions

1. **No QA gate PASS** — Story must have a gate file with PASS or WAIVED verdict
2. **Uncommitted changes outside story scope** — Warn user, ask to stash or include
3. **Boundary validator fails** — Report the private path category, do not push or create PR
4. **Push fails** — Report error, do not route to deploy
5. **Branch conflicts** — Report conflict, do not force push

## Veto

- **NEVER** end without displaying the next step routing (Step 5)
- **NEVER** suggest `/close-story` directly when `deploy_type != none`
- **NEVER** force push without explicit user approval

## Post-Execution Learning (MANDATORY)

Write execution log to `.aios/learning/logs/push-story/push-story-{story-id}-{YYYYMMDD}-{HHmmss}.yaml`
