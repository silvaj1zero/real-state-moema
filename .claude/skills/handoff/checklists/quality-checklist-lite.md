# Extracted from: .claude/skills/handoff/SKILL.md (ATM-006 lite path)
# Part of: SP-HANDOFF-GEN process
# Version: 3.1.0

# Handoff Quality Checklist — Lite (6-Point Scoring)

## Purpose

Validate lightweight handoff documents (P2/P3, intra_processo, self_continuation, agent_transfer). Lighter gate than the full 10-point checklist.

## Gate Threshold

- **PASS:** Score >= 4 (of 6)
- **FAIL:** Score < 4 — triggers ATM-007 (Auto-Fix Defects), max 1 retry cycle

## When to Use

Use this checklist when **all** of the following are true:
- Priority is P2 or P3
- Scope is `intra_processo` or `self_continuation`
- Template used is `handoff-template-lite.md`

For P0/P1 or `intra_bu`/`inter_bu` handoffs, use `quality-checklist-full.md` (10-point).

## Scoring Checklist

| # | Check | Score | Notes |
|---|-------|-------|-------|
| 1 | From/To/Date present in header | 0/1 | All three fields must be filled with real values |
| 2 | What was done has min 3 items | 0/1 | At least 3 concrete actions listed across all topic groups |
| 3 | What remains has min 1 item | 0/1 | At least 1 next step with urgency indicator ([URGENT]/[NEXT]/[BACKLOG]) |
| 4 | Files modified non-empty | 0/1 | At least 1 file listed in created, modified, or deleted |
| 5 | Decisions made present | 0/1 | At least 1 decision with rationale (not placeholder text) |
| 6 | No placeholders remaining | 0/1 | Zero `{PLACEHOLDER}`, `{TODO}`, `TBD`, or template markers in final output |

## Scoring Instructions

1. Read the generated lite handoff document
2. For each check, assign **1** if the criterion is clearly met, **0** if missing or inadequate
3. Sum all scores to get the completeness score (0-6)
4. Record the score in the handoff metadata

## Post-Scoring Actions

| Score | Action | Artifact Status |
|-------|--------|-----------------|
| >= 4 | PASS — proceed to persistence (ATM-008) | `approved` |
| < 4 (first attempt) | FAIL — trigger ATM-007 auto-fix, then re-score | pending |
| < 4 (after fix) | Emit warning to user, persist anyway | `draft` |

## Size Limits by Priority

| Priority | Max Words | Template |
|----------|-----------|----------|
| P3 | 500 | lite |
| P2 | 1500 | lite |
| P1 | 3000 | full |
| P0 | unlimited | full |
