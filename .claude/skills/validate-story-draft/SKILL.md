---
name: validate-story-draft
description: "PO story validation — 12-step protocol with Epic Context + cross-story incremental analysis. Auto-fixes Should-Fix issues."
version: "3.1.0"
owner_squad: sinkra-squad
sinkra_tier: Tier1
context: inline
agent: po
activation_type: pipeline
user-invocable: true
argument-hint: "[story-file-path]"
---

# Validate Story Draft — PO Validation Protocol

You are the Product Owner (@po / Pax) validating a story draft before it enters the sprint backlog.

## Purpose

Comprehensively validate a story draft before implementation begins. Ensures the story is complete, accurate, consistent with prior epic execution, and provides sufficient context for successful development. Prevents hallucinations, executor divergences, schema conflicts, and IDS violations.

## Input

Story file path from `$ARGUMENTS`. If not provided, ask the user.

## Pre-Execution Learning Check (Story 103.9 — Lazy Promotion)

> **Trigger:** Runs BEFORE Sequential Execution on every invocation. Zero-overhead if no candidates exist.

1. **Scan** `.aios/learning/entries/validate-story-draft/` for all `*.yaml` files where `status: draft`
2. **Filter** entries with `promotion_score >= 3.5` (Pattern/Anti-Pattern threshold per canonical ontology Section 4.3)
3. **If none found:** Proceed normally to Sequential Execution — no interruption
4. **If candidates found:** Show promotion prompt BEFORE skill execution begins:

```
+----------------------------------------------------------+
| LEARNING PROMOTION — {N} candidates from                 |
|                        validate-story-draft               |
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
   - (c) Update source entry in `.aios/learning/entries/validate-story-draft/{id}.yaml`: set `status: promoted`, add `promoted_at: {ISO-8601}`, `promoted_to: {PV_KE_NNN}`. Never delete the entry.

7. **For approved Rules/Vetos — inline to SKILL.md:**
   - If entry is classified as `Rule`: Append to this file's `## Rules` section (create if absent). Format: `- {ID}: {description}` with evidence reference.
   - If entry is classified as `Veto`: Append to this file's `## Vetos` section (create if absent). Format: `- {ID}: {description}` with evidence reference.

8. **For superseded entries:** Mark earlier entry `status: superseded`, add `superseded_by: {PV_KE_NNN}`. Entries are NEVER deleted.

9. **THEN** proceed to Sequential Execution and normal skill execution.

---

## Sequential Execution — Do Not Skip Steps

Execute ALL phases and steps in order. Do not proceed to the next step until the current step is complete. Do not skip steps on partial success.

---

## Constitutional Gates (Check BEFORE executing)

Before running any validation step:

1. **Story file must exist and be readable** — attempt to Read the story file. If it fails, HALT: "Story file not found at {path}. Cannot validate."
2. **core-config.yaml must exist** — load `.aiox-core/core-config.yaml`. If not found, HALT: "core-config.yaml not found. This file is required for story validation."
3. **Story template must be loadable** — load `aios-core/templates/story-tmpl.yaml` for completeness comparison. If not found, log warning and continue with known required sections.
4. **All 10+ validation steps must run in sequence** — do not exit early even if critical issues are found. Complete the full pipeline and accumulate all findings into the final report.

---

## Phase 0 — Epic Context Loading (MANDATORY, before checklist)

Before validating the story itself, load the FULL context of the Epic it belongs to. This prevents validating stories in isolation and catches inconsistencies from earlier waves.

### 0.1 — Read the Epic File

- Identify the epic number from the story file path or frontmatter (e.g., `epic-103` → epic `103`)
- Read `docs/stories/epic-{N}/EPIC-{N}-*.md` — understand wave structure, dependencies, business value
- Extract: wave plan, story list, declared dependencies, architectural decisions

### 0.2 — Discover All Stories in Epic

- List ALL `STORY-{epic}.{N}-*.md` files in `docs/stories/epic-{N}/` sorted by story number ascending
- For epics with >10 previous stories, analyze the 10 most recent
- Separate into: Done/InReview stories (have Dev Agent Record) vs Draft/Ready stories (no execution yet)

### 0.3 — Extract from Each Completed Story

For each story with status Done or InReview:
- **Dev Agent Record**: decisions made, files created/modified, implementation notes
- **QA/Architect Results**: findings, concerns, observations that may affect current story
- **Change Log**: who changed what and when
- **Deploy results**: DB migrations applied, services deployed, endpoints created/renamed

### 0.3b — Epic Holistic Analysis + Code Reality Check (NON-NEGOTIABLE)

This step has TWO dimensions: (A) holistic epic-level analysis and (B) code-level verification. Both are mandatory.

#### A. Epic Holistic Analysis

Look at the WHOLE epic — not just the current story — to understand the cumulative state:

1. **Build the Epic Delivery Map** — For ALL completed stories, compile:
   - Files created/modified (aggregate from all Dev Agent Records)
   - Modules, classes, interfaces introduced (new architectural surface area)
   - Patterns established (e.g., "all executors use OpenRouter via Vercel AI SDK")
   - Shared code that emerged (e.g., MODEL_MAP duplicated in 2 executors)
   - Documentation created (ADRs, deploy-targets, architecture docs)
   - Decisions that changed during execution vs original plan

2. **Identify Epic-Level Gaps** — Questions to answer:
   - Are there shared patterns across completed stories that should be extracted? (e.g., MODEL_MAP in a shared module)
   - Does the current story duplicate work already done? (IDS violation)
   - Does the current story depend on infrastructure created by completed stories? Verify it exists.
   - Are there unresolved tech debt items from prior stories' QA Results that affect this story?
   - Does the wave plan still make sense given what was learned during execution?

3. **Cross-Story Consistency** — Verify:
   - Naming conventions established in prior stories are followed (file names, class names, enum values)
   - Error handling patterns are consistent (all executors return `ExecutionResult` with same shape)
   - Test patterns are consistent (same mock strategy, same assertion style)
   - Deploy patterns are consistent (same Dockerfile, same Swarm service structure)

#### B. Code Reality Check

**Do NOT rely only on story files.** Verify the actual codebase state:

1. **Read key source files** that the current story will modify or depend on:
   - If the story creates a new executor → read `executor-registry.js` to see current registered types
   - If the story adds API endpoints → read `index.js` and `routes/` to see existing routes
   - If the story creates new modules → `ls` the target directory to see what already exists
   - Read at least ONE completed executor/module from a prior story to extract the actual pattern

2. **Extract real interfaces** from code created by prior stories:
   - Method signatures, class names, export names
   - Enum values, type definitions
   - Configuration patterns (MODEL_MAP, COST_PER_1M, etc.)
   - Import paths (absolute vs relative, ESM vs CJS)

3. **Update story Technical Notes** with real code references:
   - If story says "use ExecutorRegistry" but code renamed it to something else → flag and fix
   - If story references a function that doesn't exist yet → verify it's in a prior story's scope
   - If story duplicates code that a prior story already created → flag IDS violation and suggest REUSE
   - Add "Reference implementation: {file}" so the developer has a concrete example to follow

**Why:** Stories are written BEFORE implementation. By the time a later story is validated, earlier stories may have changed paths, renamed classes, or introduced patterns not in the original spec. The holistic analysis catches systemic gaps (shared code extraction, pattern drift). The code check catches specific divergences (wrong class names, stale paths). Together they ensure the story is grounded in reality, not in the original spec's assumptions.

### 0.4 — Filesystem Verification

For each file the current story says "Create":
- Use `ls {path}` or Read attempt to check if it already exists
- If it exists → flag as condition (ADAPT not CREATE per IDS Principles)
- If referenced but not yet created → verify it's covered by a prior story in the wave plan

### 0.5 — Dependency Check

- If `depends_on` lists other stories, verify those stories have status Done
- Cross-reference decisions from prior stories with the current story's Technical Notes and ACs
- If a prior architectural decision contradicts the current story → flag as condition

### Phase 0 Output Summary (include in validation report)

```
Epic Context: Epic {N} — {title}
Stories analyzed: {count} Done, {count} InReview, {count} Draft
Findings from prior stories: {count} relevant to this story
Filesystem conflicts: {count}
Dependency status: all met | {list of unmet}
```

---

## Phase 0.5 — D10 Incremental Analysis

After loading Epic context (Phase 0), perform incremental analysis to detect divergences before running the checklist.

### Step 1 — Discover

List all `STORY-{epic}.{N}-*.md` in `docs/stories/epic-{N}/` sorted ascending. Exclude the current story being validated.

### Step 2 — Extract from Each Previous Story (if Dev Agent Record exists)

- Decisions made during execution (Dev Agent Record, Change Log)
- Files created/modified (Dev Agent Record `file_list`)
- DB migrations applied (`deploy-results` section or Dev Agent Record notes)
- Executor changes (e.g., `@data-engineer` deprecated → `@db-sage`)
- ACs referencing specific endpoints, tables, or components

### Step 3 — Detect Divergences

| Divergence Type | Trigger |
|----------------|---------|
| **Executor divergence** | Story uses `@data-engineer` but prior story established `@db-sage` as replacement |
| **Schema divergence** | Story assumes table X doesn't exist but prior story already created it via migration |
| **IDS violation** | Story creates functionality that a prior story already implemented (duplication) |
| **Endpoint divergence** | ACs reference an endpoint renamed or removed during execution of a prior story |
| **Effort divergence** | Estimate based on a premissa that was invalidated by prior story execution |

### Step 4 — Adjust (do not just flag)

- Update deprecated executors: `@data-engineer` → `@db-sage` for DB work
- Update ACs if endpoints/tables changed in prior stories
- Remove duplicated functionality, flag explicitly as IDS violation
- Adjust effort if premissa invalidated
- Record each adjustment in the story's Change Log section

### Step 5 — Output Incremental Analysis Section

```
Incremental Analysis (D10)
Stories analyzed: N
Divergences found: N
  - [source story] → [this story] → [conflict description]
Adjustments made: N
  - [what was adjusted and why]
Confidence: HIGH (no divergences) | MEDIUM (minor adjustments) | LOW (major rewrite needed)
```

Append this to the Phase 0 Output Summary.

---

## Step 0.5 — Proactive Executor Suggestion (BEFORE assignment) [Story RV-1.2]

**Purpose:** Before @po manually assigns an executor, run resolve-executor to provide a data-driven suggestion. Runs BEFORE Step 1, after Phase 0 epic context and D10 incremental analysis are complete.

**Execution:**

1. Check whether the story's `executor` field is already set (non-empty):
   - If set → skip display and proceed directly to Step 1 (Step 1.1b will validate the existing assignment)
   - If empty/unset OR if this is a fresh validation with no prior assignment → continue to step 2

2. Call resolve-executor on story content via Bash tool:
   ```bash
   node -e "const r = require('./packages/@sinkra/engine-routing/src/resolve-executor.js'); \
     const fs = require('fs'); const story = fs.readFileSync('{story_path}','utf8'); \
     r.resolveExecutor(story).then(res => console.log(JSON.stringify(res)))" 2>/dev/null
   ```
   Parse output to extract `{ primary_executor, confidence, tier_used, reasoning }`.
   - If invocation fails (module not found, throws, or empty output) → skip suggestion silently, log "resolve-executor unavailable" in validation notes, proceed to Step 1

3. IF executor field is empty/unset, display the suggestion box:
   ```
   Executor Suggestion (resolve-executor):
      Primary: {primary_executor}
      Confidence: {confidence:.2f} ({tier_used})
      Reason: {reasoning}

      Accept? Add executor: {primary_executor} to story metadata.
      Or assign manually and add executor_override_reason if confidence >= 0.7.
   ```

4. Store suggestion in context for Step 1.1b comparison:
   `{ suggested_executor: primary_executor, confidence, tier_used, reasoning }`

5. If the story already has an executor field set → skip display, store suggestion in context anyway for Step 1.1b validation use.

**Outcome:** Step 1.1b will use the stored suggestion to validate whether a manual override is justified.

---

## Step 1 — Template Completeness Validation

- Load `aios-core/templates/story-tmpl.yaml` and extract all required section headings
- **Missing sections check**: compare story sections against template sections — all required sections must be present
- **Placeholder validation**: ensure no template placeholders remain unfilled (e.g., `{{EpicNum}}`, `{{role}}`, `_TBD_`)
- **Agent section verification**: confirm all sections needed for future agent use exist
- **Structure compliance**: verify story follows template structure and formatting

---

## Step 1.1 — Executor Assignment Validation

**Required Fields Check:**
- [ ] `executor` field present and not empty
- [ ] `quality_gate` field present and not empty
- [ ] `quality_gate_tools` field present as non-empty array

**Constraint Validation:**
- [ ] `executor != quality_gate` (CRITICAL — must be different agents)
- [ ] `executor` is a known core agent OR a valid squad specialist
- Known core agents: `@dev`, `@db-sage`, `@devops`, `@ux-design-expert`, `@analyst`, `@architect`
- Note: `@data-engineer` is a deprecated alias for `@db-sage` — auto-correct if found
- Known quality gate agents: `@architect`, `@dev`, `@pm`, `@po`, `@qa`

**Type-to-Executor Consistency:**

| Work Type | Expected Executor | Expected Quality Gate |
|-----------|------------------|----------------------|
| Code/Features/Logic | @dev | @architect |
| Schema/DB/RLS/Migrations | @db-sage | @dev |
| Infra/CI/CD/Deploy | @devops | @architect |
| Design/UI Components | @ux-design-expert | @dev |
| Research/Investigation | @analyst | @pm |
| Architecture Decisions | @architect | @pm |

**Squad Specialist Validation (if executor is not a core agent):**
- [ ] T2.1: Specialist exists in `squad-registry.yaml` under `executor_capable_agents`
- [ ] T2.2: Specialist's `work_contexts` are coherent with story keywords (at least 1 match)
- [ ] T2.3: Specialist has `can_execute: true` in their `executor_profile`
- [ ] T2.4: Specialist has `core_replaces` defined (fallback available)
- [ ] T2.5: If any of T2.1-T2.4 fails → flag SHOULD-FIX with suggested alternative

If `squad-registry.yaml` is unavailable and executor is unknown → flag as SHOULD-FIX.

**Validation Result:**
- PASS: All executor assignment fields valid
- FAIL: Missing fields, invalid assignment, or `executor == quality_gate`
- SHOULD-FIX: Squad specialist failed validation (non-blocking)

---

## Step 1.1b — Executor Override Justification Check

**Purpose:** Detect when @po assigns a different executor than resolve-executor suggested at high confidence, and emit an advisory warning if no justification is provided. Non-blocking — does NOT affect the GO/NO-GO verdict.

**Relationship with Step 0.5:** resolve-executor runs PROACTIVELY at Step 0.5 before @po assigns. Step 1.1b validates that if an override occurred (executor differs from suggestion), justification is present. Step 1.1b does NOT re-invoke resolve-executor if Step 0.5 already stored a suggestion — reuse stored context instead.

**Optional Story Field:** `executor_override_reason: "free-text reason"` — add to story metadata YAML to suppress this warning when overriding a high-confidence suggestion.

**Procedure:**

1. Read the `executor` field from story metadata → `actual_executor`
2. Retrieve stored suggestion from Step 0.5 context: `{ suggested_executor, confidence }`.
   - If Step 0.5 stored a suggestion → use it directly (do NOT re-invoke resolve-executor)
   - If Step 0.5 was skipped or failed (resolve-executor unavailable) → attempt invocation now:
     ```bash
     node -e "const r = require('./packages/@sinkra/engine-routing/src/resolve-executor.js'); \
       const fs = require('fs'); const story = fs.readFileSync('{story_path}','utf8'); \
       r.resolveExecutor(story).then(res => console.log(JSON.stringify(res)))" 2>/dev/null
     ```
     Parse output to extract `{ primary_executor, confidence }`. If invocation fails → set `suggested_executor = null, confidence = null`. Skip warning check. Still populate log entry for Step 11.1.

3. **Override check:**
   - If `confidence == null` OR `confidence < 0.7` → skip silently
   - If `actual_executor == suggested_executor` → skip silently
   - If `actual_executor != suggested_executor` AND `confidence >= 0.7`:
     - Read `executor_override_reason` from story metadata YAML
     - If present and non-empty → skip silently (suppressed by PO justification)
     - If absent or empty → append to Should-Fix section:
       ```
       Override WARNING: resolve-executor suggested {suggested_executor} (confidence: {confidence:.2f}) but story assigns {actual_executor}. Add executor_override_reason to story metadata to suppress this warning.
       ```

4. **Warning behavior:**
   - Appears in "Should-Fix Issues" section only — NOT in "Critical Issues"
   - Does NOT trigger Auto-Fix step 11.5 (reason requires PO judgment — cannot be inferred)
   - Does NOT change final verdict (GO/NO-GO unaffected)

5. **Store for Step 11.1:** `{ suggested_executor, confidence, overridden: actual != suggested, override_reason: value_or_null }`

---

## Step 1.2 — Accountability Validation

**Accountability Token Check:**
- [ ] `accountable` field present in story (in Executor Assignment section or dedicated Accountable section)
- [ ] `accountable` is a Human ID (not an agent, worker, or clone)
- [ ] Exactly 1 accountable defined (not zero, not multiple)

**Domain → Accountable Consistency:**

| Domain | Expected Accountable |
|--------|---------------------|
| `*` (default) | pedro-valerio |
| `financial` | marcus-prado |
| `operations` | marcus-prado |
| `editing` | pedro-ximentes |
| `genai` | rafael-gomes |

**Conditional Enforcement:**
- If executor is NOT Human (e.g., `@dev`, `@db-sage`): `accountable` is OBRIGATÓRIO — flag as Critical if missing
- If executor IS Human: `accountable` is RECOMENDADO — flag as Should-Fix if missing

**Validation Result:**
- PASS: Accountable field valid and consistent with domain mapping
- WARN: Accountable missing but executor is Human (recommended, not blocking)
- FAIL: Accountable missing and executor is non-Human (blocking)

---

## Step 1.3 — Deploy Type Validation

**Verify `deploy_type` field present and valid:**
- [ ] `deploy_type` field exists in story frontmatter or Story Context section
- [ ] Value is one of the valid set: `none`, `supabase_migration`, `railway`, `vercel`, `hetzner_docker`, `multi`
- [ ] If field is absent, auto-detect from story tasks and file paths (see heuristics below)

**Auto-detect heuristics (if deploy_type not set):**

| Touch Point | Inferred deploy_type |
|-------------|---------------------|
| `packages/db/migrations/`, Supabase schema, RLS policies | `supabase_migration` |
| `apps/api/`, FastAPI routes, `railway.toml` | `railway` |
| `apps/web/`, `apps/acs/`, `apps/tikguard-web/`, Vercel config | `vercel` |
| `apps/squad-engine/`, `apps/gateway-ai/`, Docker, Hetzner | `hetzner_docker` |
| Multiple of the above detected | `multi` |
| No production deployment detected | `none` |

**FLAG conditions:**
- FLAG if supabase migration mentioned in tasks/ACs but `deploy_type` is `none`
- FLAG if Docker/API/container changes detected but `deploy_type` is `none`
- FLAG if `deploy_type` is absent and auto-detection yields non-`none` → add inferred value as Should-Fix

**Validation Result:**
- PASS: `deploy_type` present and consistent with story content
- SHOULD-FIX: Field absent or inconsistent — auto-infer and add

---

## Step 2 — File Structure and Source Tree Validation

- **File paths clarity**: Are new/existing files to be created/modified clearly specified?
- **Source tree relevance**: Is relevant project structure included in Dev Notes?
- **Directory structure**: Are new directories/components properly located according to project structure?
- **File creation sequence**: Do tasks specify where files should be created in logical order?
- **Path accuracy**: Are file paths consistent with project structure from architecture docs?
- **Verify filesystem**: For files the story says "Create" — do they already exist? If so, flag as ADAPT, not CREATE (IDS Principles)

---

## Step 3 — UI/Frontend Completeness Validation (if applicable)

Skip if story has no UI/frontend touch points.

- **Component specifications**: Are UI components sufficiently detailed for implementation?
- **Styling/design guidance**: Is visual implementation guidance clear?
- **User interaction flows**: Are UX patterns and behaviors specified?
- **Responsive/accessibility**: Are these considerations addressed if required?
- **Integration points**: Are frontend-backend integration points clear?

---

## Step 4 — Acceptance Criteria Satisfaction Assessment

- **AC coverage**: Will all acceptance criteria be satisfied by the listed tasks?
- **AC testability**: Are acceptance criteria measurable and verifiable?
- **Missing scenarios**: Are edge cases or error conditions covered?
- **Success definition**: Is "done" clearly defined for each AC?
- **Task-AC mapping**: Are tasks properly linked to specific acceptance criteria?

---

## Step 5 — Validation and Testing Instructions Review

- **Test approach clarity**: Are testing methods clearly specified?
- **Test scenarios**: Are key test cases identified?
- **Validation steps**: Are acceptance criteria validation steps clear?
- **Testing tools/frameworks**: Are required testing tools specified?
- **Test data requirements**: Are test data needs identified?

---

## Step 6 — Security Considerations Assessment (if applicable)

Skip if story has no security-sensitive touch points.

- **Security requirements**: Are security needs identified and addressed?
- **Authentication/authorization**: Are access controls specified?
- **Data protection**: Are sensitive data handling requirements clear?
- **Vulnerability prevention**: Are common security issues addressed?
- **Compliance requirements**: Are regulatory/compliance needs addressed?

---

## Step 7 — Tasks/Subtasks Sequence Validation

- **Logical order**: Do tasks follow proper implementation sequence?
- **Dependencies**: Are task dependencies clear and correct?
- **Granularity**: Are tasks appropriately sized and actionable?
- **Completeness**: Do tasks cover all requirements and acceptance criteria?
- **Blocking issues**: Are there any tasks that would block others?

---

## Step 8 — CodeRabbit Integration Validation (CONDITIONAL)

Check `coderabbit_integration.enabled` in `core-config.yaml`.

**IF disabled:**
- SKIP this step
- Verify story contains skip notice: `> **CodeRabbit Integration**: Disabled`
- Log: "CodeRabbit validation skipped — disabled in core-config.yaml"

**IF enabled, validate:**
- Section `🤖 CodeRabbit Integration` present with all subsections
- Story type correctly identified; complexity level matches scope
- `@dev` listed as primary agent (required for all stories)
- Type-specific agents assigned: DB stories → `@db-sage`, Frontend → `@ux-expert`, Deploy → `@github-devops`, Security → `@architect`
- Quality gate tasks defined (Pre-Commit, Pre-PR, Pre-Deployment as applicable)
- Self-healing config present and mode matches primary agent
- Focus areas match story type

**Validation Result:** PASS / PARTIAL / FAIL / N/A (disabled)

---

## Step 8.1 — Code Intelligence: No Duplicate Functionality (Auto-skip if unavailable)

- Check code intelligence availability: `isCodeIntelAvailable()` from `.aiox-core/core/code-intel`
- If available: call `validateNoDuplicates(storyDescription)` — advisory only, does not block
- If unavailable: skip silently

---

## Step 9 — Anti-Hallucination Verification

- **Source verification**: Every technical claim must be traceable to source documents
- **Architecture alignment**: Dev Notes content matches architecture specifications
- **No invented details**: Flag any technical decisions not supported by source documents
- **Reference accuracy**: Verify all source references are correct and accessible
- **Fact checking**: Cross-reference claims against epic and architecture documents
- Use context7 MCP for library documentation verification when needed

---

## Step 10 — Dev Agent Implementation Readiness

- **Self-contained context**: Can the story be implemented without reading external docs?
- **Clear instructions**: Are implementation steps unambiguous?
- **Complete technical context**: Are all required technical details present in Dev Notes?
- **Missing information**: Identify any critical information gaps
- **Actionability**: Are all tasks actionable by a development agent?

---

## Step 11 — Generate Validation Report

Produce a structured validation report with the following sections:

### Phase 0 + D10 Summary

Include Phase 0 Output Summary and Incremental Analysis (D10) output from Phases 0 and 0.5.

### Template Compliance Issues

- Missing sections from story template
- Unfilled placeholders or template variables
- Structural formatting issues

### Critical Issues (Must Fix — Story Blocked)

- Missing essential information for implementation
- Inaccurate or unverifiable technical claims
- Incomplete acceptance criteria coverage
- Missing required sections
- Accountability missing for non-Human executor

### Should-Fix Issues (Important Quality Improvements)

- Unclear implementation guidance
- Missing security considerations
- Task sequencing problems
- Incomplete testing instructions
- Missing `deploy_type` (auto-inferred value provided)
- Squad specialist executor failed validation

### Nice-to-Have Improvements (Optional Enhancements)

- Additional context that would help implementation
- Clarifications that would improve efficiency
- Documentation improvements

### Anti-Hallucination Findings

- Unverifiable technical claims
- Missing source references
- Inconsistencies with architecture documents

### CodeRabbit Integration Findings (CONDITIONAL)

Include only if `coderabbit_integration.enabled: true`. Otherwise note "CodeRabbit disabled — skip notice verified".

### Final Assessment

- **GO** — Story is ready for implementation
- **GO with Auto-Fix** — Story ready after should-fix corrections applied automatically
- **GO Condicional** — Story ready but has conditions from Phase 0 executor must address
- **NO-GO** — Story has blocking issues requiring human intervention
- **Implementation Readiness Score**: 1-10 scale
- **Confidence Level**: HIGH / MEDIUM / LOW for successful implementation

---

## Step 11.5 — Auto-Fix Should-Fix Issues (MANDATORY)

After generating the validation report, if Should-Fix issues were identified:

1. **Apply ALL should-fix corrections directly** to the story file using Edit tool
2. **Re-read** the modified story file to confirm edits are correct
3. **Update the report**: mark each should-fix item as `FIXED` instead of leaving as pending
4. **Add Change Log entry** to the story: `| {date} | @po (Pax) | Validation auto-fix: {summary} |`
5. **Recalculate** the Implementation Readiness Score post-fix

**Auto-fix scope — APPLY automatically:**
- Missing `accountable` field → add `pedro-valerio` (default)
- Missing Dev Notes section → add with available technical context
- Missing Change Log section → add with creation + validation entries
- Vague acceptance criteria → clarify with specific formats, tools, thresholds
- Missing testing/validation instructions → add based on story type
- Missing `pressupostos`/assumptions → add based on inputs and context
- Incomplete file paths in deliverables → resolve from project structure
- Deprecated executor (`@data-engineer`) → replace with `@db-sage`
- Missing `deploy_type` → add inferred value from auto-detection heuristics

**Auto-fix exclusions — DO NOT auto-fix, flag for user:**
- Issues requiring business decisions not derivable from inputs
- Issues that change the scope of the story (new ACs, removed ACs)
- Critical issues blocking implementation (missing dependencies, invalid architecture)
- Issues requiring information the PO does not have access to

---

## Step 11.1 — Write Executor Assignment Log (MANDATORY)

**Purpose:** Maintain an append-only audit trail of every executor assignment decision. Enables future analytics on override frequency, confidence thresholds, and routing accuracy improvement.

**Execution:** Runs after Phase 5 verdict is declared (after Step 11.5 auto-fix), before Post-Execution Learning.

**Log path:** `.synapse/metrics/executor-assignments.jsonl`

**Procedure:**

1. Retrieve stored values from Step 1.1b: `{ suggested_executor, confidence, overridden, override_reason }`
2. Construct single-line JSON entry (no pretty-print):
   ```json
   {"timestamp":"<ISO-8601>","story_id":"<from metadata>","suggested_executor":"<agent or null>","actual_executor":"<executor>","confidence":<float or null>,"override_reason":"<string or null>","overridden":<bool>}
   ```
   - `timestamp`: current UTC ISO-8601 timestamp
   - `story_id`: from story metadata `story_id` field
   - `suggested_executor`: from Step 1.1b (null if resolve-executor unavailable)
   - `actual_executor`: from story metadata `executor` field
   - `confidence`: from Step 1.1b (null if resolve-executor unavailable)
   - `override_reason`: value of `executor_override_reason` from story metadata, or null if absent
   - `overridden`: true when `actual_executor != suggested_executor` AND `suggested_executor != null`

3. Append entry to log file via Bash tool:
   ```bash
   echo '{"timestamp":"..."}' >> .synapse/metrics/executor-assignments.jsonl
   ```
   - If file does not exist: command creates it automatically
   - Append-only: never truncate, overwrite, or read the full file before writing

4. **On write failure:** Log advisory warning in validation report. Do NOT halt validation. The audit log is observability infrastructure — its failure must not block story progression.

---

## Change Log Entry (MANDATORY)

Every validation MUST append to the story's Change Log:

```
| {date} | @po (Pax) | Validated {score}/10 [{verdict}]. Context: Epic {N}, Wave {M}. {N} stories anteriores analisadas. D10: {divergences} divergências, {adjustments} ajustes. Condições: {lista ou "nenhuma"}. |
```

---

## Output

Verdict with one of four outcomes:
- **GO** — Story is ready for development, no changes needed
- **GO with Auto-Fix** — Story has minor issues that were auto-corrected (list changes made)
- **GO Condicional** — Story is ready but has conditions from Phase 0 that the executor must address (list conditions)
- **NO-GO** — Story has blocking issues that require human intervention (list issues with remediation steps)

---

## Workflow Phases

### Phase 1: Constitutional Gates

- [ ] Story file exists and is readable at the provided path
- [ ] `core-config.yaml` exists at `.aiox-core/core-config.yaml`
- [ ] Story template loadable at `aios-core/templates/story-tmpl.yaml` (warning only if missing)
- [ ] Full pipeline commitment confirmed — do not exit early even if critical issues found

> **STOP** — Do not proceed to Phase 2 until all hard prerequisites pass. A missing `core-config.yaml` is a HALT condition, not a warning. Validating without it produces unreliable results.

### Phase 2: Epic Context Loading (Phase 0)

- [ ] Epic number identified from story path or frontmatter
- [ ] Epic file read (`docs/stories/epic-{N}/EPIC-{N}-*.md`)
- [ ] All stories in the epic discovered and sorted ascending
- [ ] Stories separated into Done/InReview vs Draft/Ready
- [ ] Dev Agent Records extracted from each completed story
- [ ] Filesystem verification run for files the story says "Create"
- [ ] Dependency check run against `depends_on` list
- [ ] Phase 0 Output Summary produced

> **STOP** — Do not proceed to Phase 3 until Phase 0 Output Summary is written. Validating a story without epic context is the primary source of cross-story divergences and IDS violations.

### Phase 3: D10 Incremental Analysis (Phase 0.5)

- [ ] All prior stories in epic discovered and sorted
- [ ] Dev Agent Records, file lists, DB migrations, executor changes extracted
- [ ] 5 divergence types checked: executor, schema, IDS, endpoint, effort
- [ ] Adjustments applied directly to the story file (not just flagged)
- [ ] Each adjustment recorded in story Change Log
- [ ] Incremental Analysis section output with confidence rating (HIGH / MEDIUM / LOW)

> **STOP** — Do not proceed to Phase 4 until divergences are resolved and adjustments are committed to the story. Flagging without adjusting passes broken context to the executor.

### Phase 4: Checklist Validation Steps (Steps 0.5–10)

- [ ] Step 0.5: Proactive executor suggestion — call resolve-executor if executor unset; display suggestion box; store result for Step 1.1b
- [ ] Step 1: Template completeness — missing sections, unfilled placeholders
- [ ] Step 1.1: Executor assignment — executor and quality_gate valid and different
- [ ] Step 1.1b: Executor override justification — reuse Step 0.5 stored suggestion; high-confidence override warning + store log entry data
- [ ] Step 1.2: Accountability — `accountable` field present, one human, correct domain mapping
- [ ] Step 1.3: Deploy type — present, valid, or auto-detected
- [ ] Step 2: File structure and source tree accuracy
- [ ] Step 3: UI/Frontend completeness (skip only if no UI touch points)
- [ ] Step 4: AC satisfaction and testability
- [ ] Step 5: Validation and testing instructions
- [ ] Step 6: Security considerations (skip only if no security touch points)
- [ ] Step 7: Task/subtask sequence and granularity
- [ ] Step 8: CodeRabbit integration (skip if disabled in core-config)
- [ ] Step 8.1: Code Intelligence duplicate check (skip if unavailable)
- [ ] Step 9: Anti-hallucination verification
- [ ] Step 10: Dev agent implementation readiness

> **STOP** — Do not proceed to Phase 5 until all applicable steps are complete. Per-step skip conditions are defined in the step itself (e.g., Step 3 skips if no UI). Skipping steps by validator judgment is not permitted.

### Phase 5: Report + Auto-Fix + Verdict

- [ ] Validation report generated with all sections
- [ ] All Should-Fix issues within scope auto-fixed directly in the story file
- [ ] Story re-read after auto-fix to confirm edits applied correctly
- [ ] Each auto-fixed item marked `FIXED` in the report
- [ ] Change Log entry appended to story file
- [ ] Implementation Readiness Score recalculated post-fix
- [ ] Verdict declared: GO / GO with Auto-Fix / GO Condicional / NO-GO
- [ ] Step 11.1: Executor assignment log entry appended to `.synapse/metrics/executor-assignments.jsonl`

> **STOP** — Validation is not complete until the Change Log entry is written to the story file. A validation that leaves no trace in the story file is an unrecorded validation and cannot be audited.

---

## Red Flags

| Rationalization | Why It Fails |
|----------------|--------------|
| "The epic is new, there are no prior stories to analyze" | Phase 0.5 must still run — it completes quickly with zero prior stories. The discipline of running it prevents the habit of skipping it as the epic grows. |
| "I know what the architect decided, I don't need to load prior stories" | Memory of decisions decays across sessions. Dev Agent Records are authoritative. Recalled knowledge superseded by written records is one of the primary sources of executor divergence. |
| "The AC looks testable enough, I'll skip Step 4 detail" | "Testable enough" is not measurable and verifiable. Vague ACs produce executor divergences that this step exists to catch before implementation begins. |
| "I'll flag the missing `deploy_type` but not auto-fix it" | Auto-fix is mandatory for Should-Fix issues in scope. Flagging without fixing passes an incomplete story to the executor who will discover the gap mid-implementation. |
| "This is an internal story, security considerations don't apply" | Step 6 skips only if there are no security-sensitive touch points — not because the story is internal. Internal endpoints with missing auth checks are a primary source of vulnerabilities. |
| "The executor and quality gate feel like different roles — close enough" | Step 1.1 checks agent identity, not role perception. `executor == quality_gate` is a blocking failure regardless of how different the work types appear. |
| "I'll leave the divergence as a note rather than editing the story" | Phase 0.5 Step 4 requires adjustments applied to the story file. Notes in the validation report do not reach the executor. |

---

## Blocking Conditions

HALT validation and surface to user when:

1. **Story file not found** — File does not exist at the provided path. Action: HALT immediately. Output: "Story file not found at {path}. Cannot validate." Do not search for alternate paths. Resolution: User provides the correct path.

2. **`core-config.yaml` not found** — AIOS configuration file is missing. Action: HALT. Output: "core-config.yaml not found. This file is required for story validation." Resolution: Locate or restore `core-config.yaml` before retrying.

3. **Critical issues require business decisions** — Gaps require scope changes (new/removed ACs) or architectural decisions outside the PO's authority. Action: HALT. List each issue requiring human decision. Do not mark the story GO. Resolution: PO/PM/Architect decide; validator re-runs after story update.

4. **Dependency stories are not Done** — `depends_on` lists stories with status other than `Done`. Action: HALT. Output the blocking dependency list. Story context may be incomplete without them. Resolution: Upstream stories complete first, or dependency list is corrected.

5. **Executor equals quality gate agent** — `executor` and `quality_gate` resolve to the same agent. Action: HALT. This is a Critical failure per Step 1.1 and cannot be auto-fixed — it requires a business decision. Resolution: Story author assigns a different agent to one of the roles.

---

## Post-Execution Learning (MANDATORY — Write Log Before HALT)

> **This is an EXECUTABLE step.** You MUST use the Write tool to create the log file.

**BEFORE completing this skill, create the execution log:**

1. **File path:** `.aios/learning/logs/validate-story-draft/validate-story-draft-{story-id}-{YYYYMMDD}-{HHmmss}.yaml`
2. **Use Write tool** to create the file with this content:

```yaml
schema_version: "1.0"
skill_id: "validate-story-draft"
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
