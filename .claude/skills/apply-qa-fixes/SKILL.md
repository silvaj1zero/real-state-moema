---
name: apply-qa-fixes
description: "Fix QG findings — applies all fixes from quality gate review"
version: "1.0.0"
owner_squad: sinkra-squad
sinkra_tier: Tier1
context: inline
agent: general-purpose
user-invocable: true
argument-hint: "[story-file-path]"
---

# Apply QA Fixes — Remediate Quality Gate Findings

You are fixing all findings from a quality gate review. This skill reads the QG findings and applies corrections.

## Input

Story file path from `$ARGUMENTS`. If not provided, ask the user. The story must have a completed QG review with findings.

## Execution Protocol

1. **Read the story file** at the path provided in `$ARGUMENTS`
2. **Read the AIOS task file** at `.aiox-core/development/tasks/apply-qa-fixes.md`
3. **Follow the task file protocol exactly**:
   - Parse the QG Review Record for all findings
   - Prioritize by severity (CRITICAL > HIGH > MEDIUM > LOW)
   - For each finding:
     - Read the affected file(s)
     - Understand the issue and remediation guidance
     - Apply the fix
     - Verify the fix resolves the finding
   - Re-run relevant quality checks (lint, typecheck, tests) after all fixes
4. **Update the story file**:
   - Mark each finding as resolved
   - Update Dev Agent Record with additional files modified
   - Add fix notes

## Output

All QG findings resolved. Story ready for re-review or closure.

---

## Workflow Phases

### Phase 1: Finding Extraction

- [ ] Story file exists and is readable at the provided path
- [ ] QG Review Record located in the story file (gate verdict section or external gate file)
- [ ] All findings parsed with severity classification (CRITICAL / HIGH / MEDIUM / LOW)
- [ ] Affected file paths extracted from each finding
- [ ] Findings sorted by severity descending (CRITICAL first)

> **STOP** — Do not proceed to Phase 2 until all findings are extracted and prioritized. Applying fixes without a complete inventory risks missing critical issues while spending time on low-severity ones.

### Phase 2: Fix Application

- [ ] For each finding (severity order): affected file(s) read and understood
- [ ] Fix applied to resolve the finding per remediation guidance
- [ ] Fix verified: the specific issue identified in the finding no longer exists in the modified file
- [ ] No regressions introduced (adjacent code not broken by the fix)
- [ ] All CRITICAL and HIGH findings resolved before proceeding to MEDIUM/LOW

> **STOP** — Do not proceed to Phase 3 until all CRITICAL and HIGH findings are resolved. Unresolved CRITICAL findings mean the story cannot pass re-review regardless of how many MEDIUM/LOW fixes were applied.

### Phase 3: Verification + Story Update

- [ ] Quality checks re-run: `npm run lint && npm run typecheck` (for TypeScript stories)
- [ ] All findings marked as resolved in the story file
- [ ] Dev Agent Record updated with additional files modified during fix application
- [ ] Fix notes added summarizing what was changed and why
- [ ] Story ready for re-review or closure

> **STOP** — Fix application is not complete until quality checks pass and the story file reflects the resolved state. A fix that resolves a QG finding but breaks lint or typecheck has not improved the story.

---

## Red Flags

| Rationalization | Why It Fails |
|----------------|--------------|
| "The finding is cosmetic — I'll skip it" | QG findings are prioritized by severity. Even LOW findings were flagged for a reason. Skipping without explicit deferral leaves unresolved items in the review record. |
| "I fixed the code but I'll update the story file later" | The story file is the authoritative record. A fix applied in code but not reflected in the story is invisible to `close-story` and the re-review cycle. |
| "The lint error is unrelated to my fix — I'll ignore it" | Quality checks validate the full codebase. A pre-existing lint error surfaced during fix application is now the responsibility of this story. Fix or document as out-of-scope with justification. |
| "I'll fix all findings in one batch edit without verifying each" | Batch edits without per-finding verification mask regressions. A fix for finding A can reintroduce the condition flagged by finding B. Sequential verify catches this. |
| "The CRITICAL finding requires a big refactor — I'll fix the MEDIUM ones first" | CRITICAL findings block re-review. Time spent on MEDIUM/LOW fixes before resolving CRITICAL is wasted effort if the CRITICAL fix changes the approach. |

---

## Blocking Conditions

HALT fix application and surface to user when:

1. **Story file not found** — File does not exist at the provided path. Action: HALT. Output: "Story file not found at {path}. Cannot apply fixes." Resolution: User provides the correct path.

2. **No QG Review Record found** — The story file has no quality gate review section or findings. Action: HALT. Output: "No QG findings found in story. Run `/review-story {story-id}` first." Resolution: QG review must be completed before fixes can be applied.

3. **CRITICAL finding requires architectural change** — A CRITICAL finding's remediation involves changing interfaces, schemas, or cross-service contracts beyond the scope of this story. Action: HALT. Output the finding and explain why it exceeds fix scope. Resolution: Escalate to `@architect` for decision; story may need scope revision.

4. **Quality checks fail after all fixes applied** — `npm run lint` or `npm run typecheck` fails on code modified by this skill. Action: HALT. Output the failing check and affected files. Do not mark findings as resolved. Resolution: Fix the quality check failure, then re-verify all findings.

---

## Post-Execution Learning (MANDATORY — Write Log Before HALT)

> **This is an EXECUTABLE step.** You MUST use the Write tool to create the log file.

**BEFORE completing this skill, create the execution log:**

1. **File path:** `.aios/learning/logs/apply-qa-fixes/apply-qa-fixes-{story-id}-{YYYYMMDD}-{HHmmss}.yaml`
2. **Use Write tool** to create the file with this content:

```yaml
schema_version: "1.0"
skill_id: "apply-qa-fixes"
timestamp: "{current ISO-8601}"
story_id: "{story-id from $ARGUMENTS}"
executor: "{agent who executed}"
duration_minutes: {estimate}
mode: null
files_modified: [{list}]
decisions: []
errors: []
outcome: "{completed|halted|failed}"
coderabbit_iterations: 0
gate_result: "N/A"
epilogue:
  what_worked: "{patterns}"
  what_failed: "{anti-patterns or null}"
  decision_drift: "{drift or null}"
  confidence: "{HIGH|MEDIUM|LOW}"
  source_type: "skill_execution"
```

3. **NEVER skip** — even on failure, write with `outcome: failed`.

> This log feeds `scripts/learning-digester.js` which generates observations for the unified learning system.
