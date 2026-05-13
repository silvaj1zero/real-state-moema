# Handoff Template — Router

> **Version:** 3.1.0
> **Updated:** 2026-03-28

This file routes to the appropriate handoff template based on priority and scope.

## Template Selection

| Template | When to Use | File |
|----------|-------------|------|
| **Lite** | P2/P3 + intra_processo or self_continuation | [handoff-template-lite.md](./handoff-template-lite.md) |
| **Full** | P0/P1 or intra_bu/inter_bu | [handoff-template-full.md](./handoff-template-full.md) |

## Decision Matrix

```
IF priority IN (P0, P1) → use FULL template
IF scope IN (intra_bu, inter_bu) → use FULL template
IF priority IN (P2, P3) AND scope IN (intra_processo, self_continuation) → use LITE template
DEFAULT → use FULL template
```

## Size Limits

| Priority | Max Words | Template |
|----------|-----------|----------|
| P3 | 500 | lite |
| P2 | 1500 | lite |
| P1 | 3000 | full |
| P0 | unlimited | full |

## Quality Gate

| Template | Checklist | Gate |
|----------|-----------|------|
| Lite | [quality-checklist-lite.md](./checklists/quality-checklist-lite.md) (6-point) | >= 4 PASS |
| Full | [quality-checklist-full.md](./checklists/quality-checklist-full.md) (10-point) | >= 7 PASS |

## ATM-003 Auto-Selection

ATM-003 (Classify Handoff Scope) automatically determines which template to use based on the resolved priority and scope. The pipeline generator (ATM-005) reads the selected template path from ATM-003 output.

---

*Handoff Template Router v3.1.0 | 2026-03-28*
