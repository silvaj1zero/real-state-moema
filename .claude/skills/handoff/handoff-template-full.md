# Handoff: {PROJECT_NAME}

```yaml
# SINKRA Artifact Metadata
artifact:
  id: "{YYYY-MM-DD}-{PROJECT}-handoff"
  template: handoff-template v3.0
  status: "{approved | draft | stale}"  # Artifact lifecycle
  ttl: P30D                             # 30-day validity
  created: "{CURRENT_DATE}"
  scope: "{intra_processo | intra_bu | inter_bu}"
```

**Date:** {CURRENT_DATE}
**Owner:** {SESSION_OWNER}
**Status:** {CURRENT_PHASE} -> {NEXT_PHASE}
**Priority:** {P0 | P1 | P2 | P3}
**Scope:** {intra_processo | intra_bu | inter_bu}
**Next Agent:** Any AI without prior context

```
Priority Guide (maps to Complexity):
  P0 = Critical / System (cross-domain, architectural impact)
  P1 = High / Feature (multi-file, decisions needed)
  P2 = Medium / Enhancement (few files, known pattern)
  P3 = Low / Quick fix (single file, clear problem)
```

---

## CRITICAL CONTEXT (read first)

### What is {PROJECT}

{1-2 paragraphs explaining the project. Assume the reader knows NOTHING.}

{Use analogies to make abstract concepts concrete:}
```
Good clone: THINKS like the person (decides based on values, obsessions, frameworks)
Bad clone: TALKS like the person (any LLM does that)
```

### The problem in one sentence

**{ONE SENTENCE: what is broken/missing/needed.}**

### The solution in one sentence

**{ONE SENTENCE: what must be done to fix it.}**

### Key Facts

```yaml
facts:
  - fact: "{critical fact about the project}"
    status: ACTIVE           # ACTIVE | SUPERSEDED | DEPRECATED
    since: "{YYYY-MM-DD}"

  - fact: "{another critical fact}"
    status: ACTIVE
    since: "{YYYY-MM-DD}"

  - fact: "{fact that changed}"
    status: SUPERSEDED
    since: "{YYYY-MM-DD}"
    superseded_by: "{what replaced it}"
```

### Files to read BEFORE executing

```yaml
mandatory_reading:
  1_understand_project:
    - "{file_1}"  # {why}
    - "{file_2}"  # {why}

  2_understand_current_work:
    - "{file_3}"  # {why}
    - "{file_4}"  # {why}

  3_understand_next_step:
    - "{file_5}"  # {why}
```

---

## CONTEXT (read if needed)

### Who is involved

{List people mentioned in the session with their role and relevance.}

### Accountability

```yaml
accountability:
  accountable: "{Human who owns this handoff — session owner}"
  scope: review_only      # full | review_only | escalation_target
  escalation: medium      # critical | high | medium | low
```

### Project Structure

```
{relevant_folder_tree}
```

### Glossary

| Term | Meaning |
|------|---------|
| {term_1} | {meaning} |
| {term_2} | {meaning} |
| ... | Min 10 terms |

---

## WHAT HAPPENED

### Executive Summary

{3-5 bullets of what was done in this session, with files touched.}

### Decisions Made

| Decision | Why | Alternatives Rejected |
|----------|-----|-----------------------|
| {decision_1} | {rationale} | {what was considered but not chosen, and why} |

### Lessons Learned

**What worked:**
{list}

**Mistakes to NOT repeat:**
```yaml
error:
  description: "{what went wrong}"
  root_cause: "{why it happened}"
  lesson: "{rule to follow next time}"
```

---

## WHAT IS MISSING

### Current State vs Desired State

```
CURRENT STATE:
{ASCII diagram or description of how things are NOW}

DESIRED STATE:
{ASCII diagram or description of how things SHOULD be}
```

### Success Criteria

```yaml
success_criteria:
  - "{measurable_criterion_1}"
  - "{measurable_criterion_2}"
  - "{measurable_criterion_3}"
```

### What was NOT done (and needs doing)

```yaml
not_done:
  - "{task_1}"
  - "{task_2}"
```

---

## EXECUTION PLAN

### Phase 1: {name}

**Objective:** {what this phase delivers}

{Concrete tasks with expected output format.}

### Phase 2: {name}

**Objective:** {what this phase delivers}

{Concrete tasks with expected output format.}

### Phase 3: {name}

**Objective:** {what this phase delivers}

{Concrete tasks with expected output format.}

### Files to Create/Modify

**Create:**

| File | Content |
|------|---------|
| {path} | {what goes in it} |

**Modify:**

| File | Change |
|------|--------|
| {path} | {what changes} |

---

## VETO CONDITIONS

```yaml
veto_conditions:
  V1_{name}:
    trigger: "{what triggers this veto}"
    action: "{what to do}"

  V2_{name}:
    trigger: "{what triggers this veto}"
    action: "{what to do}"
```

---

## BOOTSTRAP PROTOCOL

### Self-Verification (answer BEFORE executing)

```yaml
verification:
  - question: "{question about the project}"
    expected: "{correct answer}"
    if_wrong: "Re-read section CRITICAL CONTEXT"

  - question: "{question about the task}"
    expected: "{correct answer}"
    if_wrong: "Re-read section WHAT IS MISSING"
```

### First Command (copy-paste ready)

```bash
{exact_command_to_start}
```

### Valid Questions (ask user if stuck)

- "{specific question about ambiguity}"
- "{specific question about missing file}"

### Invalid Questions (answered in this handoff)

- "{question already answered above}"
- "{question already answered above}"

---

## CONCRETE EXAMPLE

### How to execute Phase 1, Task 1

```
{Step-by-step with actual commands, file paths, and expected output.
NOT abstract. Show exactly what to type and what to expect.}
```

---

## SUCCESS METRICS

| Metric | Baseline (now) | Target |
|--------|----------------|--------|
| {metric_1} | {current} | {goal} |

### Done Checklist

- [ ] {criterion_1}
- [ ] {criterion_2}
- [ ] {criterion_3}

---

```yaml
# Handoff Quality Score (filled by generator, not by hand)
quality:
  score: "{0-10}"
  sections_filled: "{N}/10"
  glossary_terms: "{N}"
  word_count: "~{N}"
  referenced_files: "{N}"
  gate: "{PASS | FAIL}"
```

**Artifact Status:** {approved | draft | stale}
**Last Updated:** {CURRENT_DATE}
**Next AI:** Read CRITICAL CONTEXT, pass self-verification, then execute Phase 1
