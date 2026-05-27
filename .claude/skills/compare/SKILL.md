---
name: compare
description: "DEPRECATED - Legacy /compare pipeline was removed; route repo architecture comparisons to /code-anatomist and benchmark comparisons to /spy-bench-analyst."
version: "3.0.1"
owner_squad: sinkra-squad
sinkra_tier: Tier2
context: conversation
agent: general-purpose
user-invocable: true
argument-hint: "[repo_a_path] [repo_b_path]"
status: deprecated
deprecated_reason: "The old /compare skill referenced removed .claude/commands and compare-pipeline artifacts."
replacement: "/code-anatomist for repository architecture analysis; /spy-bench-analyst for benchmark comparisons"
---

# /compare - Deprecated Router

This skill is intentionally kept as an invocation-safe migration shim. Do not execute the removed legacy compare pipeline.

## Why It Is Deprecated

The previous `/compare` implementation referenced local artifacts that are no longer present in this repository:

- a legacy Claude command catalog
- a framework-level compare pipeline
- a directory of compare phase task files

Invoking the old flow led to a missing-file dead end. This router preserves the user-facing entry point while directing work to supported workflows that exist in the repository.

## Routing

For repository reverse engineering, architecture comparison, modernization planning, or adoption analysis:

Use `/code-anatomist`.

Supported artifacts:

- `.agents/skills/code-anatomist/SKILL.md`
- `.claude/skills/code-anatomist/SKILL.md`
- `squads/code-anatomist/tasks/compare.md`
- `squads/code-anatomist/tasks/multi-compare.md`
- `squads/code-anatomist/workflows/wf-multi-compare.yaml`

For framework, product, market, or competitor benchmarking:

Use `/spy-bench-analyst`.

Supported artifacts:

- `.agents/skills/spy-bench-analyst/SKILL.md`
- `.claude/skills/spy-bench-analyst/SKILL.md`
- `squads/spy/tasks/bench-quick-compare.md`
- `squads/research/tasks/bench-quick-compare.md`

## Execution Contract

1. Acknowledge that `/compare` is deprecated.
2. Classify the request as repository architecture comparison or benchmark comparison.
3. Route to the replacement skill above.
4. Do not reference or load removed command-catalog artifacts.
5. Do not promise the old 9-phase compare pipeline unless it is reintroduced as real files in the repository.

## Validation

`npm run validate:compare-skill` checks that this shim does not point back to removed local artifacts and that all supported replacement paths exist.
