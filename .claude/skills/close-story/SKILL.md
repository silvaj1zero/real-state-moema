---
name: close-story
description: "PO story closure — verify completion, mark Done, update Epic. Includes CHK-8 (deploy verification, blocking), CHK-9 (registry governance, advisory), CHK-10 (IDS post-check, advisory)."
version: "1.1.0"
owner_squad: sinkra-squad
sinkra_tier: Tier1
context: inline
agent: po
activation_type: pipeline
user-invocable: true
---

# Close Story — PO Closure Protocol

You are the Product Owner (@po) closing a story after successful quality gate review.

## Input

Story file path from `$ARGUMENTS`. If not provided, ask the user.

## Pre-Execution Learning Check (Story 103.9 — Lazy Promotion)

> **Trigger:** Runs BEFORE Pre-Closure Gates on every invocation. Zero-overhead if no candidates exist.

1. **Scan** `.aios/learning/entries/close-story/` for all `*.yaml` files where `status: draft`
2. **Filter** entries with `promotion_score >= 3.5` (Pattern/Anti-Pattern threshold per canonical ontology Section 4.3)
3. **If none found:** Proceed normally to Pre-Closure Gates — no interruption
4. **If candidates found:** Show promotion prompt BEFORE skill execution begins:

```
+----------------------------------------------------------+
| LEARNING PROMOTION — {N} candidates from close-story     |
+----------------------------------------------------------+
| 1. [{type}] "{observed_pattern}"                         |
|    Score: {X.X} | Evidence: {N} | Classification: {cls}  |
+----------------------------------------------------------+
| Approve? [y=all / n=skip / 1,2=select / d=defer]        |
+----------------------------------------------------------+
```

**Note for Rules/Vetos (score >= 4.0):** Show with governance notice: "These require governance review before inlining to skill. Approve to register in decision-cards; governance inlining is a separate step."

5. **Process user response:**
   - `y` (all): Promote ALL candidates
   - `n` (skip): Proceed without promoting
   - `1,2,...` (select): Promote only selected entries by number
   - `d` (defer): Mark entries `status: deferred` — not shown again until score increases or explicitly requested via `@heuristic-ops *promote`

6. **For each approved entry — execute promotion:**
   - (a) Create L2 decision card in `squads/squad-creator-pro/minds/{owner}/heuristics/decision-cards.yaml` using v2 schema. Set `learning_source_type: skill_execution`, `policy_snapshot: {current context}`, `status: active`. Assign next available `PV_KE_NNN` ID.
   - (b) Create L3 heuristic doc at `squads/squad-creator-pro/minds/{owner}/heuristics/{ID}.md` with description, evidence summary, applicability context, and anchor.
   - (c) Update source entry in `.aios/learning/entries/close-story/{id}.yaml`: set `status: promoted`, add `promoted_at: {ISO-8601}`, `promoted_to: {PV_KE_NNN}`. Never delete the entry.

7. **For approved Rules/Vetos — inline to SKILL.md:**
   - If entry is classified as `Rule`: Append to this file's `## Rules` section (create if absent). Format: `- {ID}: {description}` with evidence reference.
   - If entry is classified as `Veto`: Append to this file's `## Vetos` section (create if absent). Format: `- {ID}: {description}` with evidence reference.

8. **For superseded entries:** Mark earlier entry `status: superseded`, add `superseded_by: {PV_KE_NNN}`. Entries are NEVER deleted.

9. **THEN** proceed to Pre-Closure Gates and normal skill execution.

---

## Dynamic Agent Binding

This skill adapts to the **quality_gate** agent defined in the story being closed.

1. Read the story file's `**Quality Gate:**` field
2. Extract the agent ID (strip `@` prefix)
3. Load the agent persona from `.claude/agents/{agent-id}.md`
4. **Adopt that agent's persona** for closure verification
5. If not found → **fallback to @po** (`.claude/agents/po.md`)

---

## Pre-Closure Gates (execute BEFORE delegating to po-close-story.md)

### CHK-8: Deploy Verification Gate (BLOCKING)

Read `deploy_type` from the story frontmatter.

**IF `deploy_type` is absent or `'none'`:** Skip CHK-8 — story has no deploy requirement.

**IF `deploy_type != 'none'`:**
1. Read the story Dev Agent Record section
2. CHECK: `e2e_verification` section exists in Dev Agent Record
3. CHECK: `e2e_verification.status == 'PASS'`
4. CHECK (provenance): verify-deploy learning log exists at `.aios/learning/logs/verify-deploy/verify-deploy-{story-id}-*.yaml`. If the log does not exist, the `e2e_verification` data was written manually without running the skill — this is a process violation.

**If verify-deploy learning log is missing (but e2e_verification exists):**
- **BLOCK close.** Output:
  ```
  CHK-8 BLOCKED: e2e_verification data exists but no verify-deploy learning log found.
  The data was written manually without invoking /verify-deploy skill.
  Run /verify-deploy {story-path} to create a verified record, then retry.
  ```
- HALT — do NOT proceed

**If `e2e_verification` section is missing:**
- **BLOCK close.** Output:
  ```
  CHK-8 BLOCKED: Deploy verification not found.
  Story has deploy_type: {deploy_type} but no e2e_verification record.
  Run *verify-deploy {story-id} first, then retry close-story.
  ```
- HALT — do NOT proceed to po-close-story.md

**If `e2e_verification.status == 'FAIL'`:**
- **BLOCK close.** Output:
  ```
  CHK-8 BLOCKED: Deploy verification status is FAIL.
  Failing checks:
  {e2e_verification.checks[] — list each failed check}
  Resolve deploy verification failures before closing this story.
  ```
- HALT — do NOT proceed to po-close-story.md

**If `e2e_verification.status == 'PARTIAL'`:**
- **BLOCK close.** Output:
  ```
  CHK-8 BLOCKED: Deploy verification status is PARTIAL.
  Some checks passed but non-critical checks failed:
  {e2e_verification.checks[] — list each check with status}
  Resolve PARTIAL verification before closing. Re-run *verify-deploy {story-id} after fixes.
  ```
- HALT — do NOT proceed to po-close-story.md

**If `e2e_verification.status == 'PASS'`:** CHK-8 PASS — continue to CHK-9.

---

### CHK-9: Registry Governance Gate (ADVISORY)

Run registry governance check:
```bash
node scripts/registry-governance-check.js --mode advisory
```

Parse output for:
- MISSING registries (entity changed without registry update)
- Coverage score (target: 60%, TK-RG-003)

**If any MISSING registries found:**
- WARN (do NOT block): "CHK-9 ADVISORY: The following registries were not updated:\n{list of missing registries}\nConsider updating them before or after close."

**If coverage < 60%:**
- WARN (do NOT block): "CHK-9 ADVISORY: Registry coverage is {score}% (target: 60%). Consider improving registry hygiene."

**MODE: advisory** — warns but does NOT block close (Sprint 1-2 per TK-RG-004).

Continue to CHK-10.

---

### CHK-10: IDS Post-Check (ADVISORY)

Read the story Dev Agent Record `file_list`.

Detect CREATE operations (new files added in this story — not present in previous commit):

**For each new service file matching `services/*`:**
- Read `squads/infra-ops-squad/data/service-catalog.yaml`
- Search for existing services with similar name or overlapping capabilities
- IF similarity found → WARN: "CHK-10 ADVISORY: New service '{name}' may overlap with existing '{existing}'. Verify IDS compliance (REUSE > ADAPT > CREATE)."

**For each new squad file matching `squads/*/config.yaml`:**
- Read `squads/sinkra-squad/data/ecosystem-registry.yaml`
- Search for squads with overlapping capabilities
- IF overlap found → WARN: "CHK-10 ADVISORY: New squad capabilities may overlap with '{existing-squad}'. Verify IDS compliance."

**For each new skill file matching `.claude/skills/*/SKILL.md`:**
- Read `.claude/skills/skill-registry.yaml`
- Search for skills with similar name or description
- IF duplicate found → WARN: "CHK-10 ADVISORY: New skill may duplicate existing '{existing-skill}'. Verify IDS compliance."

**MODE: advisory** — warns but does NOT block close. CREATE may be intentional.

---

## Execution Protocol (after gates pass)

1. **Read the story file** at the path provided in `$ARGUMENTS`
2. **Execute CHK-8, CHK-9, CHK-10** gates above (in order)
3. **Read the AIOS task file** at `.aiox-core/development/tasks/po-close-story.md`
4. **Execute the closure protocol** defined in the task file:
   - Verify QG review has PASS verdict
   - Verify all acceptance criteria are checked off
   - Verify Dev Agent Record is complete
   - Mark story status as `Done`
   - Update the Epic file:
     - Mark this story as Done in the story tracker
     - Update Epic progress metrics
     - Check if Epic is now complete (all stories Done)
   - Update any cross-references (document-registry, session logs, etc.)

## Output: Closure Summary (MANDATORY)

After all gates pass and status is set to Done, produce a **Closure Summary** displayed to the user. This summary is NOT optional — it is the handoff artifact that provides continuity for the next session.

### Section 1: Story Summary

Summarize what was delivered in this story:
- What was built (files created, modules added, interfaces defined)
- Key architectural decisions made during execution
- Tests added and coverage
- CodeRabbit iterations and findings
- Deploy target and image/version (if applicable)

### Section 2: Epic Progress Analysis

Read ALL stories in the epic directory and produce:

```
Epic {N} — {title}
Progress: {done}/{total} stories ({percentage}%)
Superseded: {count}

Wave Status:
  Wave {X}: {done}/{total} — {COMPLETE|IN_PROGRESS|NOT_STARTED}
  Wave {Y}: {done}/{total} — {COMPLETE|IN_PROGRESS|NOT_STARTED}
  ...

Recently Closed (this session):
  - Story {id}: {title} — {1-line summary}
```

### Section 3: Next Story Recommendation

Based on wave order and dependency analysis:

1. Identify the next Ready story in the current wave (if wave incomplete)
2. If current wave is complete, identify first story of next wave
3. Check dependencies are met for the recommended story

Output:
```
Next: Story {id} — {title} (Wave {X})
Dependencies: {met|list of unmet}
Command: /validate-story-draft docs/stories/epic-{N}/STORY-{id}-*.md
```

If multiple stories in the same wave are Ready with no dependency order, list all as options.

### Section 4: Epic Development Log Entry (MANDATORY)

Append a new entry to the `## Development Log` section of the Epic file (`docs/stories/epic-{N}/EPIC-{N}-*.md`).

**Format for each entry:**

```markdown
### Story {id} — {title} ({date})

**Built:**
- {file path} — {what it does, 1 line per file}

**Patterns established:**
- {patterns that future stories should follow}

**Key decisions:**
- {architectural or implementation decisions made during execution}

**Tech debt identified:**
- {issues noted in QA Results or CodeRabbit that weren't fixed}

**Tests:** {N} new ({N} regression). **Deploy:** {image tag}. **CodeRabbit:** {iterations} iter ({fixes} fixes)
```

**What to include:**
- Files CREATED (not modified — focus on new surface area)
- Interfaces, enums, classes that future stories will consume
- Patterns that became conventions (e.g., "all executors use OpenRouter via Vercel AI SDK")
- Decisions that deviated from the original story spec
- Tech debt explicitly identified but deferred

**What NOT to include:**
- Story template compliance details (that's in the story file)
- Learning log data (that's in `.aios/learning/`)
- Full file lists (that's in the story's Dev Agent Record)
- Gate results (that's in `.aios/gates/`)

**Why in the Epic file:** The `/validate-story-draft` Phase 0.3b reads the Epic file first. Having the Development Log there means any future validation automatically sees what was built, what patterns to follow, and what tech debt exists — without reading every individual story file.

---

## Workflow Phases

### Phase 1: Story Verification

- [ ] Story file exists and is readable
- [ ] Gate file exists at `qa.qaLocation/gates/{epic}.{story}-{slug}.yml`
- [ ] Gate file verdict is `PASS` or `WAIVED` (not FAIL or open CONCERNS)
- [ ] All acceptance criteria are checked off (`[x]`) in the story file
- [ ] Dev Agent Record is populated with non-empty File List
- [ ] Story status is `InReview`

> **STOP** — Do not proceed to Phase 2 until all Phase 1 items are verified. Closing a story without a PASS gate file is a process violation. Unchecked ACs mean the story is incomplete, not done.

### Phase 2: CHK-8 Deploy Verification Gate (Blocking)

- [ ] `deploy_type` read from story frontmatter
- [ ] If `deploy_type` is absent or `none`: CHK-8 skipped, proceed to Phase 3
- [ ] `e2e_verification` section present in Dev Agent Record
- [ ] `e2e_verification.status` is `PASS`
- [ ] Critical checks in `e2e_verification.checks[]` reviewed

> **STOP** — Do not proceed to Phase 3 if `deploy_type` is set and `e2e_verification` is missing or non-PASS. Run `/verify-deploy {story-id}` first and resolve all failures before retrying closure.

### Phase 3: CHK-9 Registry Governance (Advisory)

- [ ] `node scripts/registry-governance-check.js --mode advisory` executed
- [ ] MISSING registry warnings reviewed and surfaced to user
- [ ] Coverage score checked against 60% target
- [ ] Advisory output acknowledged (non-blocking)

> **STOP** — CHK-9 does not block closure, but it must not be skipped silently. Unacknowledged registry warnings accumulate into untraceable infrastructure drift.

### Phase 4: CHK-10 IDS Post-Check (Advisory)

- [ ] Dev Agent Record `file_list` read for CREATE operations
- [ ] New `services/*` files checked against `service-catalog.yaml`
- [ ] New `squads/*/config.yaml` files checked against `ecosystem-registry.yaml`
- [ ] New `.claude/skills/*/SKILL.md` files checked against `skill-registry.yaml`
- [ ] Advisory warnings surfaced (non-blocking)

> **STOP** — CHK-10 does not block closure. Warnings must be acknowledged. Unrecorded IDS violations at close time create silent technical debt with no audit trail.

### Phase 5: Status Transition + Epic Update

- [ ] Story status set to `Done`
- [ ] Epic file updated: story marked Done, progress metrics updated
- [ ] Epic completion checked: if all stories are Done, Epic status updated
- [ ] Cross-references updated (document-registry, session logs as applicable)
- [ ] Closure summary produced (gate verdict, CHK results, actions taken)

> **STOP** — Closure is not complete until the Epic file reflects the story's Done status. A story marked Done without an Epic update creates tracking drift that misleads sprint planning.

---

## Red Flags

| Rationalization | Why It Fails |
|----------------|--------------|
| "The gate says CONCERNS but the dev said they're minor — I'll close anyway" | CONCERNS without explicit resolution means unresolved issues were knowingly shipped. The gate resolution process exists to document what was accepted and why. |
| "Deploy type is set but I know the deployment worked — CHK-8 is a formality" | CHK-8 reads `e2e_verification.status`, not the developer's recollection. Deployments that "worked" have failed verification checks. The record is authoritative. |
| "I'll skip CHK-9 — it's advisory anyway" | Advisory means non-blocking, not skippable. Unacknowledged warnings cannot be triaged later. Registry drift is real whether or not it was seen. |
| "The epic has many stories — I'll update it at end of sprint" | Epic progress updated per-story-close is the designed behavior. Batching creates windows where Epic status is wrong, misleading sprint planning and reporting. |
| "All the important ACs are checked, a couple minor ones are open" | Unchecked ACs are incomplete work by definition. If they were truly out of scope, they should have been removed from the story before InReview. |
| "QA said PASS in Slack, I don't need to read the gate file" | The gate file is the authoritative record, not chat communication. A PASS communicated informally but absent from the gate file is an unrecorded PASS. |
| "The story was simple — I'll skip the closure summary" | The closure summary is the handoff artifact. Without it, Epic updates, registry warnings, and deploy status are invisible to anyone reading the story file later. |

---

## Blocking Conditions

HALT closure and surface to user when:

1. **Gate file is missing or not PASS/WAIVED** — No gate file exists at the expected path, or verdict is FAIL or CONCERNS. Action: HALT. Output which condition applies. Do not proceed to CHK-8. Resolution: `@qa` runs `/review-story` and resolves the gate before closure retries.

2. **CHK-8 BLOCKED: `e2e_verification` missing or non-PASS** — Story has `deploy_type` set but deploy verification was not run or resulted in FAIL/PARTIAL. Action: HALT. Output the block message with failing checks listed. Resolution: Run `/verify-deploy {story-id}`, resolve failures, retry closure.

3. **Acceptance criteria not fully checked off** — One or more ACs remain `[ ]` in the story file. Action: HALT. List unchecked ACs. Do not proceed. Resolution: Developer resolves open ACs, or PO formally removes them from scope with a Change Log entry.

4. **Dev Agent Record is empty or absent** — Story has no implementation record. Action: HALT. Cannot close without evidence of execution. Resolution: Developer populates Dev Agent Record and story re-enters the review pipeline.

5. **Story status is not `InReview`** — Story is still Draft, Ready, or InProgress. Action: HALT. Closure assumes the full development and review pipeline completed. Resolution: Story progresses through correct lifecycle stages before closure.

---

## Post-Execution Learning (MANDATORY — Write Log Before HALT)

> **This is an EXECUTABLE step.** You MUST use the Write tool to create the log file.

**BEFORE completing this skill, create the execution log:**

1. **File path:** `.aios/learning/logs/close-story/close-story-{story-id}-{YYYYMMDD}-{HHmmss}.yaml`
2. **Use Write tool** to create the file with this content:

```yaml
schema_version: "1.0"
skill_id: "close-story"
timestamp: "{current ISO-8601}"
story_id: "{story-id from $ARGUMENTS}"
executor: "{agent who executed}"
duration_minutes: {estimate}
mode: "{mode used or null}"
files_modified: [{list of files you modified}]
decisions:
  - description: "{key decision made}"
    type: "{type}"
    alternatives: []
    rationale: "{why}"
errors: []
outcome: "{completed|halted|failed}"
coderabbit_iterations: 0
gate_result: "N/A"
epilogue:
  what_worked: "{specific patterns that worked}"
  what_failed: "{what was harder than expected, or null}"
  decision_drift: "{decisions that differed from plan, or null}"
  confidence: "{HIGH|MEDIUM|LOW}"
  source_type: "skill_execution"
```

3. **If Write fails:** Log warning in Dev Agent Record, do NOT halt skill.
4. **NEVER skip this step** — even on failure, write a log with `outcome: failed`.

> This log feeds `scripts/learning-digester.js` which generates observations for the unified learning system.
