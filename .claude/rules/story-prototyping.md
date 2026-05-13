---
paths:
  - "docs/stories/**/*.md"
---

# Story Prototyping — Sinkra Hub

Applies when drafting, validating, or promoting a story to `status: Ready`.

## Rule

Stories with `effort >= 8` points require a proof-of-concept (PoC) before status transitions from `Draft` to `Ready`. The PoC must prove the core technical assumption is viable.

## Why

EPIC-124 STORY-124.1 was prototyped live (rename CLI tested on real data: 32 files, 114 refs, 1.5s) **before** ACs were finalized. This caught that a backlink index was needed — which would not have been in the spec otherwise. Large stories that skip PoC produce ACs based on assumption rather than evidence, leading to mid-implementation refactors.

## PoC Scope

A PoC is NOT a full implementation. It is the minimum code needed to validate the riskiest assumption:

| Assumption Type | Example PoC |
|----------------|-------------|
| Performance | Run the core algorithm on real data; measure |
| Integration | Call the external API/tool with a real payload |
| Design | Implement the smallest end-to-end slice |
| Security | Test one attack vector against the happy-path implementation |

**Time budget:** 10-20% of the story's effort estimate. If PoC exceeds 25%, the story is too ambiguous and should be split.

## When PoC is NOT Required

- Story effort < 8 points (trivial, well-understood change)
- Story extends a pattern with an existing PoC in the same Epic
- Story is pure documentation, config, or test addition
- Story is a bug fix with a reproducer already in the ticket

## Evidence Requirement

PoC evidence must be committed or logged before the story is `Ready`:

- Prototype script (can be deleted after, but must exist during validation)
- Benchmark output (time, memory, throughput numbers from real data)
- Failing test case showing the bug (for bug fixes)
- Note in story's "Technical Notes" section linking to the PoC evidence

## Anti-Patterns

- **PoC after implementation** — defeats the purpose; at that point it's just a regression test
- **PoC on mock data only** — real data uncovers edge cases mocks don't
- **PoC skipped because "obvious"** — if it's obvious, PoC takes 10 minutes; do it anyway

## Validation Checklist (for `@po *validate-story-draft`)

For stories with `effort >= 8`:

- [ ] Story has "Technical Notes" or "Proof of Concept" section
- [ ] Evidence linked (script path, benchmark output, issue reproducer, etc.)
- [ ] Core technical assumption explicitly named
- [ ] Measurement or observation cited (not just "it should work")

If any check fails, story stays `Draft`. Prototype first, validate after.

## Related

- `story-lifecycle.md` — lifecycle states
- `epistemic-standards.md` — confidence tagging for risk claims
- `full-sdc` skill — orchestrates the full cycle (**preferred for new work**)
- `story-cycle` skill — DEPRECATED 2026-04-14 (`replaced_by: full-sdc`); retained only for workflows requiring Synapse L2 preservation via main-context agent activation
