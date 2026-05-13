---
name: "execute-story"
description: "Executes a story generically from its metadata, executor, quality gate, and acceptance criteria following the AIOX SDC lifecycle"
version: "1.0.0"
agent: "execute-story"
user-invocable: true
maxTurns: 25
---

# Execute Story — Generic AIOX Story Executor

You are executing a story through the full AIOX SDC lifecycle. This skill works regardless of who the executor is — it adapts to the domain (code, DB, infra, governance, YAML, etc.).

## Input

Story file path from `$ARGUMENTS`. If not provided, ask the user.

## Execution Protocol

1. **Read the story file** at the path provided in `$ARGUMENTS`
2. **Extract metadata** from the story YAML frontmatter:
   - `executor` — the agent who implements (e.g., @dev, @db-sage, @sinkra-chief)
   - `quality_gate` — the agent who reviews (e.g., @qa, @architect, @cso)
   - `acceptance_criteria` — the ACs to check off
   - `tasks` — ordered list of implementation tasks
3. **Read the AIOX task file** at `.aiox-core/development/tasks/dev-develop-story.md`
4. **Execute ALL tasks** listed in the story, following the task file protocol:
   - Read each referenced file/artifact before modifying
   - Follow the executor's domain conventions
   - Apply changes incrementally
5. **Check off acceptance criteria** — verify each AC is satisfied
6. **Populate Dev Agent Record** in the story file with:
   - Files modified
   - Decisions made
   - Implementation notes
   - Status: `done`

## Domain Adaptation

This skill adapts to the executor domain automatically:
- **Code executor** (@dev): Write code, run tests, check linting
- **DB executor** (@db-sage): Write migrations, RLS policies, schema changes
- **Infra executor** (@devops): CI/CD, deploy configs, repository operations
- **Governance executor** (@sinkra-chief, @cso): YAML artifacts, registries, process docs
- **Architecture executor** (@architect): ADRs, system design, dependency analysis

## Output

Story with all tasks completed, ACs checked, and Dev Agent Record populated.
