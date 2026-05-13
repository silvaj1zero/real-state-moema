# Handoff: {PROJECT_NAME}

```yaml
artifact:
  id: "{YYYY-MM-DD}-{PROJECT}-handoff"
  template: handoff-template-lite v3.1
  status: "{approved | draft}"
  ttl: P30D
  created: "{CURRENT_DATE}"
```

**From:** {FROM_AGENT}
**To:** {TO_AGENT_OR_ARRAY}
**Date:** {CURRENT_DATE}
**Type:** {session | agent_transfer | phase_transition | roundtable_summary | self_continuation}
**Scope:** {intra_processo | intra_bu | self_continuation}
**Priority:** {P2 | P3}
**Parent Handoff:** {parent_handoff_id | null}
**Consumed:** {null | YYYY-MM-DD by Agent:name}

---

## CRITICAL CONTEXT

{One sentence: what this handoff is about, what the project is, and why it matters.}

---

## WHAT WAS DONE

### {Topic 1}
- {Action taken, with file path if relevant}
- {Action taken}

### {Topic 2}
- {Action taken}
- {Action taken}

### {Topic 3}
- {Action taken}

---

## WHAT REMAINS

- **[URGENT]** {Task that must be done immediately}
- **[NEXT]** {Task that is the logical next step}
- **[BACKLOG]** {Task that can wait}

Urgency indicators: `[URGENT]` = blocking, do first. `[NEXT]` = next logical step. `[BACKLOG]` = non-blocking, can defer.

---

## FILES MODIFIED

```yaml
files:
  created:
    - "{path/to/new-file}"
  modified:
    - "{path/to/changed-file}"
  deleted:
    - "{path/to/removed-file}"  # if any
```

---

## DECISIONS MADE

| Decision | Rationale |
|----------|-----------|
| {decision_1} | {why} |
| {decision_2} | {why} |

---

## BLOCKERS

{List blockers, or "None" if clear.}

- {Blocker description and who/what can unblock it}

---

```yaml
quality:
  score: "{0-6}"
  gate: "{PASS | FAIL}"  # >= 4 = PASS
  word_count: "~{N}"
  template: lite
```

**Artifact Status:** {approved | draft}
**Next AI:** Read CRITICAL CONTEXT, then execute first item from WHAT REMAINS.
