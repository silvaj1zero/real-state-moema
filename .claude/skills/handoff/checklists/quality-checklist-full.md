# Extracted from: .claude/skills/handoff/SKILL.md (ATM-006)
# Part of: SP-HANDOFF-GEN process
# Version: 3.1.0

# Handoff Quality Checklist (10-Point Scoring)

## Purpose

Validate handoff document completeness before persistence. Each item scores 0 or 1. The sum (0-10) is the **completeness score**.

## Gate Threshold

- **PASS:** Score >= 7 (TK-HO-003)
- **FAIL:** Score < 7 — triggers ATM-007 (Auto-Fix Defects), max 1 retry cycle

## Scoring Checklist

| # | Check | Score | Notes |
|---|-------|-------|-------|
| 1 | Priority (P0-P3) set in header | 0/1 | Must appear in document header. P0=Critical, P1=High, P2=Medium, P3=Low |
| 2 | CRITICAL CONTEXT has problem + solution in one sentence | 0/1 | Single sentence summarizing what this handoff is about |
| 3 | Key Facts have temporal markers (ACTIVE/SUPERSEDED/DEPRECATED) | 0/1 | Every key fact must be tagged with its current status |
| 4 | All main sections present (min 8 of 10) | 0/1 | The handoff template has 10 sections; at least 8 must be filled |
| 5 | Glossary has min 10 terms | 0/1 | Domain-specific terms, acronyms, people names, project jargon |
| 6 | Bootstrap has self-verification questions with expected answers | 0/1 | Questions the next AI can use to confirm it understood the handoff |
| 7 | First command is copy-paste ready | 0/1 | The reader can execute it immediately without modification |
| 8 | Concrete example has step-by-step (not abstract) | 0/1 | Real example with actual file paths, commands, or code snippets |
| 9 | Success criteria are measurable | 0/1 | Quantifiable or verifiable outcomes, not vague descriptions |
| 10 | Files to read BEFORE executing are listed | 0/1 | Explicit list of files the next session must read for context |

## Scoring Instructions

1. Read the generated handoff document end-to-end
2. For each check, assign **1** if the criterion is clearly met, **0** if missing or inadequate
3. Sum all scores to get the completeness score (0-10)
4. Record the score in the handoff metadata

## Post-Scoring Actions

| Score | Action | Artifact Status |
|-------|--------|-----------------|
| >= 7 | PASS — proceed to persistence (ATM-008) | `approved` |
| < 7 (first attempt) | FAIL — trigger ATM-007 auto-fix, then re-score | pending |
| < 7 (after fix) | Emit warning to user, persist anyway | `draft` |

## Auto-Fix Protocol (ATM-007)

When score < 7:
1. Identify all items with score = 0
2. Fix each from conversation context (do NOT ask the user)
3. Max **1 retry cycle** (TK-HO-011)
4. If still < 7 after fix: persist with `artifact_status: draft` and warn user

## Priority Mapping Reference

| Complexity | Priority | Description |
|-----------|----------|-------------|
| 4 (System) | P0 Critical | Cross-domain, architectural impact |
| 3 (Feature) | P1 High | Multi-file, decisions needed |
| 2 (Enhancement) | P2 Medium | Few files, known pattern |
| 1 (Quick fix) | P3 Low | Single file, clear problem |

## Threshold Tokens

| Token | Value | Description |
|-------|-------|-------------|
| TK-HO-003 | 7.0 | Minimum completeness score to pass |
| TK-HO-004 | 10 | Minimum glossary terms |
| TK-HO-005 | 8 | Minimum sections filled (of 10) |
| TK-HO-011 | 1 | Max retry cycles for auto-fix |
| TK-HO-012 | 2000 | Max handoff size in words |
