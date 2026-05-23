---
paths:
  - "squads/c-level/**"
  - "squads/squad-creator/**"
  - ".aiox-core/development/tasks/*story*.md"
  - ".aiox-core/development/tasks/validate-next-story.md"
  - "docs/stories/**"
  - "docs/epics/**"
---

# Squad Bootstrap Sequence

Applies when discovery output, C-Level workspace setup, squad creation, epic drafting, story drafting, validation, or SDC execution are connected in one workflow.

## Canonical Sequence

```text
Discovery -> Squad fit classification -> Squad bootstrap -> Squad validation -> Epic -> Story -> Story validation -> SDC
```

No step may recommend the next step until its local prerequisites are physically verified.

## Routing Preflight

Before recommending a command or workflow, the orchestrator must verify:

1. The command exists in the active agent or skill catalog.
2. The backing task/workflow file exists on disk.
3. The task preconditions can be satisfied from current repository state.
4. The target squad is not merely "in construction" when a story or SDC workflow expects a bootstrapped squad.
5. The next canonical action is explicit when a prerequisite is missing.

If any check fails, halt and report the missing prerequisite. Do not route to story drafting, story validation, `/full-sdc`, deploy, or push.

## In-Construction Squads

A squad is in construction until all of the following are true:

- `squads/{slug}/config.yaml` exists.
- The squad appears in the configured ecosystem registry or has an explicit creation runtime state.
- `validate-squad-preflight` or equivalent squad validation has passed.
- The owner has decided whether the squad is framework-level, business-owned, or private/operator-only.

In-construction squads are framework construction artifacts. They are not yet valid targets for epic/story/SDC execution.

## Required Gate Before Stories

Story creation and story validation must check squad state when the epic/story references a squad, executor, workflow, or task under `squads/{slug}/`.

If the referenced squad is missing, incomplete, or unvalidated:

1. Stop story creation/validation.
2. Route to `validate-squad-preflight` or the canonical squad bootstrap flow.
3. Resume story work only after the squad-state gate passes.

## Required Gate Before SDC

Before recommending `/full-sdc`, `/story-cycle`, `/develop-story`, `/review-story`, `/push-story`, or `/deploy`, verify:

- story status is `Ready` or equivalent,
- target story file exists,
- referenced squad state is bootstrapped and validated,
- branch/worktree isolation is valid,
- operator boundary validators pass in this checkout.

Related: issue #60.
