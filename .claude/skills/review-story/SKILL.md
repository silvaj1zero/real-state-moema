---
name: review-story
description: "Quality gate review — comprehensive story review with CodeRabbit self-healing, risk escalation, deploy readiness, and PASS/CONCERNS/FAIL/WAIVED verdict"
version: "2.0.0"
owner_squad: infra-ops-squad
sinkra_tier: Tier1
context: inline
agent: general-purpose
user-invocable: true
argument-hint: "[story-path | story-id (e.g. 103.1)]"
---

# Review Story — Quality Gate Protocol

## Dynamic Agent Binding

This skill adapts to the **quality_gate** agent defined in the story being reviewed.

1. Read the story file's `**Quality Gate:**` field (e.g., `@qa`, `@cso`, `@architect`, `@po`)
2. Extract the agent ID (strip `@` prefix, e.g., `qa`, `cso`, `architect`, `po`)
3. Load the agent persona from `.claude/agents/{agent-id}.md`
4. **Adopt that agent's persona** for this entire review — their role, lens, checklist priorities, and vocabulary
5. If no quality_gate field found or agent file doesn't exist → **fallback to @qa** (`.claude/agents/qa.md`)

**You are the quality gate agent defined in the story.** Not always Quinn — if the story says `quality_gate: @cso`, you are Pedro (CSO) reviewing governance. If `quality_gate: @architect`, you are Aria reviewing architecture. Adapt your review lens accordingly.

## Purpose

Execute the full AIOS quality gate review protocol: automated CodeRabbit self-healing loop → code intelligence reference impact → risk assessment → comprehensive analysis → deploy readiness → active refactoring → standards compliance → AC validation → gate file creation.

## Pre-Execution Learning Check (Story 103.9 — Lazy Promotion)

> **Trigger:** Runs BEFORE Prerequisites check on every invocation. Zero-overhead if no candidates exist.

1. **Scan** `.aios/learning/entries/review-story/` for all `*.yaml` files where `status: draft`
2. **Filter** entries with `promotion_score >= 3.5` (Pattern/Anti-Pattern threshold per canonical ontology Section 4.3)
3. **If none found:** Proceed normally to Prerequisites — no interruption
4. **If candidates found:** Show promotion prompt BEFORE skill execution begins:

```
+----------------------------------------------------------+
| LEARNING PROMOTION — {N} candidates from review-story    |
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
   - (c) Update source entry in `.aios/learning/entries/review-story/{id}.yaml`: set `status: promoted`, add `promoted_at: {ISO-8601}`, `promoted_to: {PV_KE_NNN}`. Never delete the entry.

7. **For approved Rules/Vetos — inline to SKILL.md:**
   - If entry is classified as `Rule`: Append to this file's `## Rules` section (create if absent). Format: `- {ID}: {description}` with evidence reference.
   - If entry is classified as `Veto`: Append to this file's `## Vetos` section (create if absent). Format: `- {ID}: {description}` with evidence reference.

8. **For superseded entries:** Mark earlier entry `status: superseded`, add `superseded_by: {PV_KE_NNN}`. Entries are NEVER deleted.

9. **THEN** proceed to Prerequisites and normal skill execution.

---

## Prerequisites

- Story status must be "InReview" (or "Review")
- Developer has completed all tasks and updated the Dev Agent Record File List
- All automated tests are passing
- Story file must have a populated Dev Agent Record

**Blocking pre-conditions (HALT if any fail):**
- Story file exists and has a Dev Agent Record section
- File List in Dev Agent Record is non-empty
- Story has at least one acceptance criterion defined

## Execution Modes

Choose mode before starting:

| Mode | Prompts | Best For |
|------|---------|----------|
| **YOLO** | 0–1 | Simple, deterministic stories |
| **Interactive** (default) | 5–10 | Complex decisions, learning |
| **Pre-Flight** | Upfront planning | Ambiguous requirements, critical work |

Parameter: `mode` in `$ARGUMENTS` (default: `interactive`).

## Inputs

```yaml
required:
  story_id: '{epic}.{story}'           # e.g., "103.2"
  story_path: path to the story file   # derive from story_id if not given
  story_title: '{title}'               # derive from story file H1 if missing
  story_slug: '{slug}'                 # derive from title (lowercase, hyphenated)
```

---

## Review Process

### Step 0: CodeRabbit Full Self-Healing Loop (Inline Execution)

**Execute FIRST — before any manual review step.**

**MANDATORY:** This step MUST execute. `coderabbit_iterations` in the learning log MUST be >= 1.

1. **Run CodeRabbit directly via WSL (inline, NOT background):**
   ```bash
   PROJECT_WSL=$(wsl bash -c "wslpath -a '$(git rev-parse --show-toplevel)'" 2>/dev/null)
   wsl bash -c "cd '$PROJECT_WSL' && ~/.local/bin/coderabbit --prompt-only -t committed --base main 2>&1"
   ```
   **Timeout:** 900000ms (15 minutes). Use Bash tool with this timeout.

2. **Parse the output** for severity markers:
   - Count findings by type: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `potential_issue`, `improvement`
   - Map `potential_issue` → HIGH, `improvement` → MEDIUM if no explicit severity

3. **Self-healing loop (if CRITICAL or HIGH found):**
   ```
   iteration = 1
   max_iterations = 3

   WHILE iteration <= max_iterations AND critical_or_high_issues_remain:
     a. Attempt auto-fix for each CRITICAL/HIGH issue (read the file, apply the fix)
     b. Re-run CodeRabbit: same command as step 1
     c. iteration++

   Record final iteration count in learning log as coderabbit_iterations
   ```

4. **After loop completes:**
   - Merge ALL findings into the Comprehensive Analysis (Step 2)
   - CRITICAL/HIGH issues auto-escalate risk profile to DEEP
   - If CRITICAL issues remain after max_iterations: Gate = FAIL (automatic, non-negotiable)
   - MEDIUM issues → document in QA Results as tech debt
   - LOW issues → note in QA Results

5. **If CodeRabbit CLI is not found** (`command not found` or WSL unavailable):
   - Log: "CodeRabbit CLI not installed — requires WSL setup"
   - Set `coderabbit_iterations: 0` in learning log
   - Continue all steps (do not HALT)
   - Note in QA Results: "CodeRabbit: SKIPPED (CLI not installed)"
   - **This is the ONLY acceptable reason for coderabbit_iterations: 0**

**Why inline:** Background delegation via Agent tool was unreliable — sub-agents consistently skipped CodeRabbit execution, resulting in 0% execution rate across 34 stories. Inline execution guarantees the CLI runs and findings are available for the gate decision.

#### Severity Handling Table

| Severity | Action | Notes |
|----------|--------|-------|
| CRITICAL | Auto-fix (up to 3 attempts) | Security vulnerabilities, breaking bugs |
| HIGH | Auto-fix (up to 3 attempts) | Significant quality problems |
| MEDIUM | Create tech debt issue, log in QA Results | Document for future sprint — no block |
| LOW | Note in QA Results | Nit-level, no action required |

#### Integration with Gate Decision

If self-healing loop exhausts all iterations with remaining CRITICAL/HIGH issues:
- Gate = FAIL (automatic, non-negotiable)
- `top_issues` populated from remaining CodeRabbit findings
- `status_reason` includes "CodeRabbit self-healing exhausted"
- Review HALTS — no further steps executed until human resolves

---

### Step 0b: Code Intelligence Reference Impact (Conditional)

**Only execute if `isCodeIntelAvailable()` returns true. If unavailable → skip silently.**

After CodeRabbit passes:

1. Collect modified files from the story's Dev Agent Record File List
2. Call `getReferenceImpact(files)` from `.aiox-core/core/code-intel/helpers/qa-helper.js`
3. If result is non-null, render the Reference Impact table in QA Results:

```markdown
### Reference Impact (Code Intelligence)
| Modified File | Consumers Affected |
|---------------|--------------------|
| {file}        | {N} consumers: {consumer-file-1}, {consumer-file-2} |
```

4. Files with >10 consumers → auto-escalate to deep review in Step 1
5. If `getReferenceImpact` returns null or throws → skip silently, continue as normal

**Fallback guarantee:** Code intelligence unavailability never blocks or degrades the review.

---

### Step 1: Risk Assessment (Determines Review Depth)

Evaluate before starting Section 2 analysis. Risk assessment determines depth — standard vs deep review.

**Auto-escalate to DEEP review when ANY condition is true:**

| Condition | Signal |
|-----------|--------|
| Auth / payment / security files touched | High blast radius |
| No tests added to the story | Coverage gap risk |
| Diff > 500 lines | Complexity risk |
| Previous gate was FAIL or CONCERNS | Regression risk |
| Story has > 5 acceptance criteria | Scope risk |
| Any modified file has >10 consumers (Step 0b) | Impact risk |

**Risk output:** Document in QA Results as `risk_profile: standard | deep` with triggering conditions listed.

---

### Step 2: Comprehensive Analysis

Execute all sub-sections. Depth (standard vs deep) determined by Step 1.

#### A. Requirements Traceability

- Map each acceptance criterion to its validating tests (Given-When-Then format — describe tests, do not reproduce test code)
- Identify coverage gaps (ACs without corresponding tests)
- Verify all requirements have test cases; record `ac_covered[]` and `ac_gaps[]` for gate file

#### B. Code Quality Review

- Architecture and design patterns — does implementation fit the existing architecture?
- Refactoring opportunities (document and perform in Step 3)
- Code duplication or inefficiencies
- Performance optimisation candidates
- Security vulnerabilities
- Best practices adherence (TypeScript strict, no `any`, absolute imports, etc.)

#### C. Test Architecture Assessment

- Test coverage adequacy at appropriate levels (unit / integration / e2e)
- Test level appropriateness
- Test design quality and maintainability
- Test data management strategy
- Mock/stub usage appropriateness
- Edge case and error scenario coverage
- Test execution time and reliability

#### D. Non-Functional Requirements (NFRs)

Assess and record status (PASS / CONCERNS / FAIL) for each:

- **Security:** Authentication, authorisation, data protection, RLS enforcement
- **Performance:** Response times, resource usage, query complexity
- **Reliability:** Error handling, recovery mechanisms, idempotency
- **Maintainability:** Code clarity, documentation, naming, complexity

#### E. Testability Evaluation

- **Controllability:** Can inputs be controlled?
- **Observability:** Can outputs be observed and asserted?
- **Debuggability:** Can failures be diagnosed easily?

#### F. Technical Debt Identification

- Accumulated shortcuts or workarounds
- Missing tests flagged but not blocking
- Outdated dependencies
- Architecture violations (document as MEDIUM issues)

---

### Step 2.5: Deploy Readiness Review (Conditional)

**SKIP entirely if story `deploy_type` is `none` or absent.**

Read story frontmatter / Story Context section for `deploy_type`. Apply per-type checklist below. This is a code-level review only — NOT actual deployment execution.

**Advisory by default:** Deploy readiness findings become Gate CONCERNS (not FAIL) unless:
- A `supabase_migration` dry-run check fails, OR
- A rollback plan is completely absent for any deploy target

#### `supabase_migration`

- [ ] Migration files exist in `packages/db/migrations/` with correct `YYYYMMDD_*.sql` timestamp prefix
- [ ] Migration is additive-only (no destructive `DROP`, `TRUNCATE`, `ALTER COLUMN` without nullable/default fallback)
- [ ] RLS policies present for all new tables
- [ ] Dry-run check: migration SQL is syntactically valid (manual review or `supabase db diff`)
- [ ] Rollback plan documented in story (reverse migration or compensating migration)

#### `railway`

- [ ] API endpoints have health check routes (`/health` or `/api/health`)
- [ ] No hardcoded secrets — all secrets via environment variables
- [ ] Railway config (`railway.toml` or Procfile) present or confirmed inherited
- [ ] Rollback plan documented (previous deploy SHA or feature flag)

#### `hetzner_docker`

- [ ] Dockerfile present and valid (`FROM`, `WORKDIR`, `CMD` defined)
- [ ] Docker Compose service definition updated if applicable
- [ ] No secrets embedded in Dockerfile or docker-compose.yaml
- [ ] Rollback plan documented (previous image tag)

#### `vercel`

- [ ] `vercel.json` present or confirmed inherited
- [ ] Build command and output directory correct
- [ ] Environment variables documented (no hardcoded secrets)
- [ ] Rollback plan documented (previous deployment URL)

#### `multi`

Apply all relevant per-type checklists above for each affected platform.

**Recording:** Add a `### Deploy Readiness` subsection to QA Results. List each checked item with pass/fail. Unchecked items become CONCERNS in the gate file.

---

### Step 3: Active Refactoring

**@qa has authority to refactor code directly when safe and appropriate.**

Rules:
- Run existing tests after any change to confirm nothing breaks
- Document every change in QA Results `Refactoring Performed` section with:
  - **File:** path
  - **Change:** what was changed
  - **Why:** reason (e.g., "eliminates duplication", "improves readability")
  - **How:** how it improves the code
- DO NOT alter story content beyond the QA Results section
- DO NOT change story Status or the File List — recommend only
- If modified files are not in the story's File List, note them in QA Results and ask Dev to update

---

### Step 4: Standards Compliance Check

- [ ] Coding standards (`docs/coding-standards.md`): TypeScript strict, no `any`, kebab-case files, PascalCase components, absolute imports via `@/`
- [ ] Project structure (`docs/unified-project-structure.md`): files in correct directories, naming conventions
- [ ] Testing strategy (`docs/testing-strategy.md`): appropriate test levels, coverage thresholds
- [ ] Story-specific guidelines: all guidelines mentioned in the story itself

---

### Step 5: Acceptance Criteria Validation

Walk through every AC in the story:
- Verify each AC is fully implemented and verifiable
- Check for missing functionality or partial implementations
- Validate that edge cases named in ACs are handled
- Record which ACs are fully covered vs have gaps → feed into `ac_covered[]` / `ac_gaps[]`

---

### Step 6: Documentation and Comments

- Verify code is self-documenting where possible
- Add comments for complex logic if missing (perform directly)
- Ensure API changes are documented (endpoint signatures, response shapes)
- Check that the Dev Agent Record in the story file is complete

---

## Output 1: QA Results Section Update

**CRITICAL CONSTRAINT:** You are authorised to update ONLY the `## QA Results` section of the story file. DO NOT modify any other section.

**Anchor rule:**
- If `## QA Results` does not exist → append at end of file
- If it exists → append a new dated entry below existing entries
- Never edit other sections

Append the following structure:

```markdown
## QA Results

### Review Date: {YYYY-MM-DD}

### Reviewed By: Quinn (Test Architect)

### CodeRabbit Self-Healing
- Iterations: {N}/3
- Outcome: PASSED | FAILED (exhausted)
- MEDIUM issues logged as tech debt: {N}

### Reference Impact (Code Intelligence)
{table if available, or "Skipped — code intelligence unavailable"}

### Risk Profile
- Depth: standard | deep
- Escalation triggers: {list conditions that fired, or "none"}

### Code Quality Assessment

{Overall assessment of implementation quality}

### Refactoring Performed

{List refactoring performed, or "None"}

- **File**: {filename}
  - **Change**: {what was changed}
  - **Why**: {reason}
  - **How**: {improvement}

### Deploy Readiness
{Per deploy_type checklist results, or "Skipped — deploy_type: none"}

### Compliance Check

- Coding Standards: [✓/✗] {notes}
- Project Structure: [✓/✗] {notes}
- Testing Strategy: [✓/✗] {notes}
- All ACs Met: [✓/✗] {notes}

### Improvements Checklist

{[x] items handled by QA, [ ] items for dev to address}

### Security Review

{Security findings and whether addressed}

### Performance Considerations

{Performance findings and whether addressed}

### Files Modified During Review

{List files modified — ask Dev to update File List}

### Gate Status

Gate: {PASS|CONCERNS|FAIL|WAIVED} → qa.qaLocation/gates/{epic}.{story}-{slug}.yml
Risk profile: qa.qaLocation/assessments/{epic}.{story}-risk-{YYYYMMDD}.md
NFR assessment: qa.qaLocation/assessments/{epic}.{story}-nfr-{YYYYMMDD}.md

### Recommended Status

[✓ Ready for Done] / [✗ Changes Required — See unchecked items above]
(Story owner decides final status)
```

---

## Output 2: Gate File Creation

**Template:** Render from `../templates/qa-gate-tmpl.yaml`
**Directory:** `qa.qaLocation/gates/` (from `.aiox-core/core-config.yaml`) — create if missing
**Filename:** `{epic}.{story}-{slug}.yml`

Gate file structure:

```yaml
schema: 1
story: '{epic}.{story}'
story_title: '{story title}'
gate: PASS|CONCERNS|FAIL|WAIVED
status_reason: '1-2 sentence explanation of gate decision'
reviewer: 'Quinn (Test Architect)'
updated: '{ISO-8601 timestamp}'

top_issues: []   # Empty if no issues; populate from CodeRabbit/manual findings
waiver: { active: false }   # Set active: true with reason + approver only if WAIVED

quality_score: 0-100   # See Quality Score Calculation below
expires: '{ISO-8601 timestamp}'   # Typically 2 weeks from review date

evidence:
  tests_reviewed: {count}
  risks_identified: {count}
  trace:
    ac_covered: []   # AC numbers with test coverage
    ac_gaps: []      # AC numbers lacking coverage

nfr_validation:
  security:
    status: PASS|CONCERNS|FAIL
    notes: 'Specific findings'
  performance:
    status: PASS|CONCERNS|FAIL
    notes: 'Specific findings'
  reliability:
    status: PASS|CONCERNS|FAIL
    notes: 'Specific findings'
  maintainability:
    status: PASS|CONCERNS|FAIL
    notes: 'Specific findings'

recommendations:
  immediate:   # Must fix before production
    - action: '{description}'
      refs: ['{file}']
      suggested_owner: dev|sm|po
  future:      # Address in a later sprint
    - action: '{description}'
      refs: ['{file}']
      suggested_owner: dev|sm|po
```

### Gate Decision Criteria

**Deterministic — apply rules in order, first match wins:**

1. **CodeRabbit self-healing exhausted** → Gate = FAIL (no override)

2. **Risk thresholds** (if `risk_summary` present):
   - Any risk score ≥ 9 → Gate = FAIL (unless waived)
   - Any risk score ≥ 6 → Gate = CONCERNS

3. **Test coverage gaps** (if `trace` populated):
   - Any P0 test from test-design is missing → Gate = CONCERNS
   - Security or data-loss P0 test missing → Gate = FAIL

4. **Issue severity** (from `top_issues`):
   - Any `severity == high` → Gate = FAIL (unless waived)
   - Any `severity == medium` → Gate = CONCERNS

5. **NFR statuses:**
   - Any NFR status = FAIL → Gate = FAIL
   - Any NFR status = CONCERNS → Gate = CONCERNS
   - All PASS → Gate = PASS

**WAIVED:** Only when `waiver.active: true` with `reason` and `approver` fields populated.

**Verbose meanings:**
- **PASS** — All critical requirements met, no blocking issues
- **CONCERNS** — Non-critical issues found; team should review before production
- **FAIL** — Critical issues that must be addressed before merge/close
- **WAIVED** — Issues acknowledged and explicitly waived by a named approver

### Quality Score Calculation

```
quality_score = 100 - (20 × count_of_FAILs) - (10 × count_of_CONCERNS)
Bounded: min = 0, max = 100
```

If `technical-preferences.md` defines custom weights, use those instead.

### Suggested Owner Convention

For each issue in `top_issues`, include a `suggested_owner`:

| Value | When |
|-------|------|
| `dev` | Code changes needed |
| `sm` | Requirements clarification needed |
| `po` | Business decision needed |

---

## Blocking Conditions

Stop the review and request human clarification if any of the following are true:

- Story file is incomplete or missing critical sections (Dev Agent Record, ACs)
- File List in Dev Agent Record is empty or clearly incomplete
- No tests exist when they were required by the story
- Code changes do not align with story requirements
- Critical architectural issues discovered that require architectural discussion
- CodeRabbit self-healing exhausted (FAIL gate set, HALT)

---

## Completion Checklist

After review completes:

1. [ ] QA Results section appended to story file (no other sections modified)
2. [ ] Gate file created at `qa.qaLocation/gates/{epic}.{story}-{slug}.yml`
3. [ ] Gate decision is deterministic and documented (4-step order applied)
4. [ ] Recommended status stated: "Ready for Done" or "Changes Required"
5. [ ] If files were modified during refactoring: listed in QA Results, Dev asked to update File List
6. [ ] Constructive, actionable feedback provided with clear ownership

## Handoff

After review:

| Verdict | Next Agent | Next Command |
|---------|------------|--------------|
| PASS / CONCERNS resolved | @devops | `*push` |
| FAIL / CONCERNS unresolved | @dev | `*apply-qa-fixes` |
| Structured fix list | @dev | `*fix-qa-issues` from `QA_FIX_REQUEST.md` |

---

## Workflow Phases

### Phase 1: CodeRabbit Full Self-Healing Loop (MANDATORY)

- [ ] Story file exists and has a populated Dev Agent Record
- [ ] File List in Dev Agent Record is non-empty
- [ ] Story has at least one acceptance criterion defined
- [ ] CodeRabbit CLI executed INLINE via WSL: `wsl bash -c "cd '$PROJECT_WSL' && ~/.local/bin/coderabbit --prompt-only -t committed --base main 2>&1"` (timeout: 900000ms)
- [ ] Output parsed for CRITICAL/HIGH/MEDIUM/LOW findings
- [ ] CRITICAL and HIGH issues categorized
- [ ] Auto-fix attempted for all CRITICAL and HIGH issues (max 3 iterations with re-run)
- [ ] MEDIUM issues logged as tech debt
- [ ] `coderabbit_iterations` recorded in learning log (MUST be >= 1 unless CLI not installed)

> **STOP** — Do not proceed to Phase 2 if CRITICAL or HIGH issues remain after 3 iterations. Gate = FAIL. HALT and require human intervention. `coderabbit_iterations: 0` with CLI installed is a process violation — the skill MUST execute the WSL command inline.

### Phase 2: Code Intelligence Reference Impact

- [ ] `isCodeIntelAvailable()` checked
- [ ] If available: `getReferenceImpact(files)` called with modified files from File List
- [ ] Reference Impact table rendered in QA Results (if non-null)
- [ ] Files with >10 consumers flagged for deep review escalation
- [ ] If unavailable: skip silently, continue

> **STOP** — Do not proceed to Phase 3 without completing the Code Intelligence check (or confirming unavailability). Files with high consumer counts must be identified before analysis depth is set.

### Phase 3: Risk Assessment

- [ ] All 6 auto-escalation conditions evaluated (auth/payment files, no tests, diff >500 lines, prior FAIL gate, >5 ACs, >10-consumer files)
- [ ] Risk profile declared: `standard` or `deep`
- [ ] Triggering conditions listed explicitly
- [ ] Review depth locked before Phase 4 begins

> **STOP** — Do not proceed to Phase 4 without a declared risk profile. Defaulting to standard review on a story that meets deep-review criteria is a quality escape that cannot be corrected retroactively.

### Phase 4: Comprehensive Analysis

- [ ] AC → test traceability mapped (Given-When-Then format); `ac_covered[]` and `ac_gaps[]` populated
- [ ] Code quality reviewed: architecture fit, duplication, performance, security
- [ ] Test architecture assessed: coverage, level appropriateness, edge cases, mocks
- [ ] NFR validation complete: security, performance, reliability, maintainability
- [ ] Testability evaluated: controllability, observability, debuggability
- [ ] Technical debt identified and classified (MEDIUM items → tech debt log)

> **STOP** — Do not proceed to Phase 5 until all sub-sections (A–F) are complete. Skipping NFRs because the story appears backend-only or "small" is not valid — NFR statuses feed the gate decision algorithm directly.

### Phase 5: Deploy Readiness Review

- [ ] `deploy_type` read from story frontmatter
- [ ] If `deploy_type` is `none` or absent: skip entirely and record skip
- [ ] Per-type checklist applied (supabase_migration / railway / hetzner_docker / vercel / multi)
- [ ] Deploy Readiness subsection added to QA Results
- [ ] Advisory findings recorded as CONCERNS; dry-run failures or absent rollback plan recorded as FAIL

> **STOP** — Do not proceed to Phase 6 if a supabase_migration dry-run check fails or if rollback plan is completely absent for any deploy target. These are gate FAIL conditions, not advisory warnings.

### Phase 6: Active Refactoring + Gate File Creation

- [ ] Active refactoring performed where safe; each change documented (File, Change, Why, How)
- [ ] Standards compliance check complete (coding standards, project structure, testing strategy, story-specific guidelines)
- [ ] Every AC walked through individually; gaps recorded
- [ ] Documentation and comments verified; complex logic commented directly
- [ ] Gate decision applied in deterministic order: CodeRabbit → risk thresholds → test gaps → issue severity → NFR statuses
- [ ] Gate file created at `qa.qaLocation/gates/{epic}.{story}-{slug}.yml`
- [ ] QA Results section appended to story file (no other sections modified)
- [ ] Recommended status stated clearly: "Ready for Done" or "Changes Required"

> **STOP** — The review is not complete until both the gate file and QA Results section exist. A verbal verdict without a gate file is invisible to automated tooling and cannot unblock the story lifecycle.

---

## Red Flags

| Rationalization | Why It Fails |
|----------------|--------------|
| "The tests look fine, I'll skip CodeRabbit" | CodeRabbit catches structural issues, dead code, security patterns, and style violations that passing tests do not cover. The self-healing loop exists because tests are insufficient on their own. |
| "Deploy type is irrelevant for this review" | Step 2.5 surfaces pre-production surprises. A missing rollback plan discovered in production costs far more than 10 minutes reviewing it now. |
| "I'll CONCERNS this gate to avoid blocking the team" | CONCERNS without documented rationale dilutes the signal. Future reviewers cannot distinguish "minor polish needed" from "buried critical issue". Every CONCERNS must state what was found and why it does not reach FAIL. |
| "The story is straightforward, standard review is fine" | Risk assessment is not a judgment about story quality — it is an objective check against 6 escalation conditions. Any one of them mandates deep review regardless of perceived simplicity. |
| "I'll skip Code Intelligence — the files are small" | File size is unrelated to consumer count. A small utility function used by 40 consumers is a higher-impact change than a large isolated module. |
| "I'll note the AC gap in QA Results text but not the gate file" | `ac_gaps[]` in the gate file is machine-readable. Notes in prose are not. Omitting from the gate file makes the gap invisible to automated tooling and future audits. |
| "CodeRabbit ran once clean, I'll skip the loop structure" | The algorithm specifies a fixed check, not an adaptive one. One clean run is the expected outcome. The loop exists for the cases where it is not. |
| "I'll refactor in a follow-up story" | @qa has authority to refactor directly when safe. Deferring avoidable debt to a future story that may never be scheduled is the primary mechanism by which technical debt accumulates. |
| "Review passed, I'll close the story directly" | If `deploy_type != none`, the story MUST go through `/deploy-story` → `/verify-deploy` → `/close-story`. Manually editing Status → Done bypasses CHK-8 (Deploy Verification Gate). NEVER close a story with deploy_type by editing the file — always use `/close-story` which enforces CHK-8. |

---

## Blocking Conditions

HALT the review and request human clarification if any of the following are true:

1. **Story file is incomplete or missing critical sections** — Dev Agent Record is absent, File List is empty, or acceptance criteria are undefined. Action: HALT. Output which sections are missing. Do not begin analysis. Resolution: Developer completes the story file before review proceeds.

2. **No tests exist when story required them** — Story ACs reference testable behavior but the File List contains no test files. Action: HALT. Flag as gate FAIL immediately without running the full pipeline. Resolution: Developer adds tests and re-submits for review.

3. **CodeRabbit self-healing exhausted** — 3 iterations complete with CRITICAL or HIGH issues remaining. Action: HALT. Gate = FAIL (automatic, non-negotiable). Populate `top_issues`, set `status_reason`. No further review steps execute. Resolution: Human resolves remaining issues; review restarts from Phase 1.

4. **Code changes do not align with story requirements** — The implementation addresses a different problem than the story describes, or significant functionality is absent. Action: HALT. Document the misalignment specifically. Do not produce a gate file yet. Resolution: Developer and PO clarify scope before review continues.

5. **Critical architectural issue discovered** — Implementation introduces a pattern that contradicts existing architecture decisions (ADRs, service catalog, IDS rules). Action: HALT. Flag for `@architect` review before gate decision. Resolution: Architect weighs in; review resumes with architectural guidance applied.

---

## Post-Execution Learning (MANDATORY — Write Log Before HALT)

> **This is an EXECUTABLE step.** You MUST use the Write tool to create the log file.

**BEFORE completing this skill, create the execution log:**

1. **File path:** `.aios/learning/logs/review-story/review-story-{story-id}-{YYYYMMDD}-{HHmmss}.yaml`
2. **Use Write tool** to create the file with this content:

```yaml
schema_version: "1.0"
skill_id: "review-story"
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
