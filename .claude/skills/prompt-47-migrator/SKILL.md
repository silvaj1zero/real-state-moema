---
name: "prompt-47-migrator"
description: "Migrates Claude 4.6-era prompts, skills, agents, tasks, rules, and CLAUDE.md files to 4.7-optimized versions via preview-first diff (REMOVE/REWRITE/RECALIBRATE/KEEP)."
version: "1.2.0"
user-invocable: true
activation_type: "simple"
argument-hint: "<path-to-prompt-file> | --scan <directory> | --dry-run | --yes | --explain"
---

# Prompt 4.7 Migrator

Transform any existing prompt artifact written for Claude 4.6 (or earlier) into a 4.7-optimized version.

Scope is deliberately narrow: **prompt content only**. This skill does not touch API calls, model IDs, effort parameters, thinking configuration, tokenizer budgets, or any other infrastructure. Use `@devops` or the `claude-api` skill for those concerns.

## Core principle — migration is subtraction

The single most important insight driving this skill:

> **Claude 4.7 internalized roughly 30% of what 4.6 prompts used as scaffolding. Every line you keep that duplicates base behavior is noise that steals attention from load-bearing instructions and conflicts with trained defaults.**

A successful migration typically produces a prompt that is shorter in total length but denser in load-bearing content. The exchange is:

- REMOVE: redundant anti-laziness, search-first scaffolding, apologetic humility, forced progress updates, emoji/emote policies, conciseness directives, clarification-first instructions, tool-fallback nags, blanket thinking-forcing.
- REWRITE: vague scopes into enumerated criteria, negative prohibitions into positive examples, prose decision logic into decision trees, multi-turn progressive reveal into single-turn briefings.
- RECALIBRATE: severity language (CRITICAL / NEVER / MUST) is reserved for genuine-stakes instructions. Style and preference use normal imperatives.
- KEEP: operator voice, domain-specific DNA, genuine-stakes prohibitions, artifact contracts, structural identifiers (frontmatter, config fields, IDs).

## Core guarantee — preview before mutation (NON-NEGOTIABLE)

This skill NEVER modifies a source file before showing the human what will change and receiving explicit approval. The default flow is preview-first:

1. Produce the full diff, per-change rationale, and summary in a scratch location.
2. Present the summary to the human: pattern counts, line-count delta, severity-calibration outcomes, human-review flags, and the full diff.
3. Wait for explicit approval (`yes` / `apply` / `proceed`) before touching the source file.
4. If approval is denied or user requests modifications, either stop (`no` / `abort`) or re-run with adjusted scope.

There are only two legitimate ways to skip the approval gate:

- `--yes` flag passed on invocation: the operator has pre-authorized automated apply for this specific run (useful for batch migrations already reviewed at planning time).
- `--dry-run` flag: nothing to approve because nothing will be applied.

In every other mode, preview-then-approve is mandatory. Silent in-place mutation is a violation of this skill's contract.

## Evidence hierarchy — the system prompt is ground truth

Documentation describes what Anthropic says Claude should do. The system prompt describes what Claude is actually trained to do. When the two disagree, the system prompt wins — it is the artifact the model reads on every request, while documentation is a second-order narrative about the prompt, subject to drift.

This skill calibrates its pattern classifications against observed usage in Claude's production system prompts (notably Claude Opus 4.7), not against the prompt-engineering docs alone. Docs are useful for understanding principles; the system prompt is the canonical reference for what "correctly calibrated severity", "correctly written decision tree", or "correctly removed scaffolding" actually looks like in production.

Concrete example. Anthropic's 4.7 system prompt uses `ALWAYS call view on SKILL.md before starting to make the presentation` and `NEVER use '-' operator, 'site' operator, or quotes in search queries`. Neither of these is a legal or safety stake — violating them merely degrades output quality. But both are specific, binary, and high-frequency, so severity is calibrated, not overuse. A classification rule that flagged these as "aggressive language overuse because no real stakes" would be wrong against ground truth.

When evolving this skill, new patterns, calibration changes, or catalog updates must be justified against observed system-prompt usage first. Documentation guidance is supporting evidence, not primary evidence. The source code is truth; the documentation is narrative about it.

## When to invoke

- Modernizing an existing skill (`SKILL.md` file) written for 4.6 or earlier.
- Modernizing an agent file (`.md` under `squads/*/agents/` or `.aiox-core/development/agents/`).
- Modernizing a task definition (`.md` under `squads/*/tasks/`).
- Modernizing a rule file (`.claude/rules/*.md`).
- Auditing and rewriting `CLAUDE.md` or any project-level prompt.
- Transforming a raw prompt snippet supplied inline.
- Scanning a directory of prompts to produce a prioritized audit (`--scan` mode, read-only).

## When NOT to invoke

- API-level migration: use `@devops` or the `claude-api` skill. This skill does not touch `claude-opus-4-6` → `claude-opus-4-7` model ID swaps, effort parameter tuning, `budget_tokens` → adaptive thinking conversion, `temperature` removal, tokenizer re-budgeting, or `max_tokens` adjustments.
- Code migration: this skill does not edit `.ts`, `.js`, `.py`, `.yaml` (except prompt content inside YAML frontmatter or templates).
- Greenfield prompt authoring: use standard skill-creator or task-creator flows. This skill is purely transformational.
- Non-prompt documentation: ADRs, architecture docs, README files, governance journals. These are read by humans and follow different conventions.

## Preserve-untouched inventory

Before any transformation, identify structural elements that must be preserved exactly. Never modify:

- YAML frontmatter keys and values (except prompt content strings like `description`, which may be improved).
- Artifact contracts (`inputs`, `outputs`, `file_set`, `template`, `checklist` fields).
- Config field values (`slug`, `id`, `name`, `heuristic_namespace`, `agent_id`, `squad`, `entry_agent`, etc.).
- Identity handles (`@agent-name`, `@devops`, operator handles). See `.claude/rules/identity-vs-slug.md`.
- Story/task/epic IDs (`STORY-X.Y`, `EPIC-N`, `AN_KE_N`).
- File paths, URLs, command syntax, code blocks.
- Domain-specific vocabulary that the operator uses intentionally.
- Examples marked as canonical or reference — transform the surrounding instruction, not the referenced example content.

## Protocol

### Phase 0 — Intake

1. Read the target file(s).
2. Classify artifact type: `agent` | `skill` | `task` | `rule` | `workflow` | `claude-md` | `raw-prompt`.
3. Extract preserve-untouched ranges (frontmatter blocks, code blocks, artifact contracts, IDs).
4. Record baseline metrics: total line count, word count, count of aggressive-language occurrences, count of anti-laziness phrases, count of thinking-forcing phrases.

### Phase 1 — Detection

Scan the mutable content (content outside preserve-untouched ranges) using the pattern catalog below. For each hit, record:

- Pattern ID (e.g. `P-01`)
- File path and line range
- Exact matched text
- Severity (`high` | `medium` | `low`) — impact if left unchanged
- Suggested action (`REMOVE` | `REWRITE` | `RECALIBRATE` | `KEEP-WITH-NOTE`)

### Phase 2 — Classification

For every detection, apply the decision rule specific to that pattern (documented in the catalog). Where classification is ambiguous, default to `KEEP-WITH-NOTE` and flag for human review.

Run the **three-question gold test** on each candidate change:

1. **Is this line an imperative of style or preference without real stakes?** → likely `REMOVE` or `RECALIBRATE`.
2. **Does this line duplicate trained 4.7 base behavior?** → `REMOVE`.
3. **Does this line leave scope or success criteria implicit?** → `REWRITE` to enumerated form or accept under-delivery.

Any line that passes all three tests should be kept.

### Phase 3 — Transformation

Apply classified changes as atomic edits. Rules:

- Apply transformations in reverse document order (bottom-up) to preserve line numbers for remaining edits.
- Preserve indentation, quotation style, and surrounding whitespace.
- Group related edits into a single atomic edit when they touch the same paragraph.
- Do not introduce new sections or reorganize document structure unless the pattern catalog explicitly directs it (P-16, P-19).

### Phase 4 — Validation

Run these gates on the transformed output. Any failure blocks delivery:

1. **Preserve-untouched gate** — every range flagged in Phase 0 is byte-identical in the output.
2. **Three-question gold test** — every surviving line passes all three questions, or is justified by operator voice / real stakes / legitimate structure.
3. **Severity-calibration gate** — remaining occurrences of `CRITICAL` / `NEVER` / `MUST NOT` each map to a genuine-stakes instruction (violation causes real harm or policy breach). List them explicitly with justification.
4. **No-regression gate** — the transformed prompt still specifies every operational constraint from the original. Nothing load-bearing was lost.
5. **Structure-is-content gate** — where the original used prose decision logic affecting control flow, the output uses a decision tree, arrow-notation, or enumerated criteria.

### Phase 5 — Preview generation

Produce four artifacts in a scratch location (never at the source path):

- `outputs/prompt-47-migrator/<timestamp>/<filename>.migrated.md` — the candidate transformed prompt.
- `outputs/prompt-47-migrator/<timestamp>/<filename>.diff.patch` — unified diff, before/after.
- `outputs/prompt-47-migrator/<filename>.rationale.yaml` — structured per-change justification.
- `outputs/prompt-47-migrator/<filename>.summary.md` — human-readable summary.

The source file is not modified in this phase under any circumstance.

### Phase 6 — Human approval gate

Present the summary to the human, including:

- Line-count delta (original → migrated).
- Pattern-hit counts before and after.
- Counts grouped by action (REMOVE / REWRITE / RECALIBRATE / KEEP-WITH-NOTE).
- Severity-calibration outcomes — every remaining aggressive-language occurrence listed with its real-stakes justification.
- Human-review flags — low-confidence changes that need operator judgment.
- Full diff, or a compact rendering if the diff exceeds a reasonable viewing size.

Then ask explicitly: **"Apply these changes to `<source file>`? (yes / no / modify)"**

- `yes` / `apply` / `proceed` → continue to Phase 7.
- `no` / `abort` → stop. Preview artifacts remain in the scratch location for record.
- `modify <instruction>` → re-run Phase 3 with the adjustment, then re-enter Phase 5.

### Phase 7 — Apply (only on explicit approval)

Copy the candidate migrated file from the scratch location over the source file. Preserve original file mode and metadata. Move the four preview artifacts to a permanent location (`outputs/prompt-47-migrator/applied/<timestamp>/`) for audit trail.

In `--scan` mode (read-only audit of a directory), produce only an aggregate report, no file mutations, no approval gate.

In `--dry-run` mode, stop after Phase 5. No approval gate, no mutation.

In `--yes` mode, skip Phase 6 (but still produce all preview artifacts before applying). Use only when batch migrating files already reviewed at planning time.

## Pattern catalog

Twenty detection patterns covering the most common 4.6-era smells. Each entry: ID, name, detection signal, default action, 4.7 principle anchor, and at least one before/after example.

### P-01 — Anti-laziness scaffolding

**Detection:** Phrases like `be thorough`, `be proactive`, `go above and beyond`, `default to using`, `if in doubt use`, `ultrathink`, `think hard`, `think harder`, `don't be lazy`, `be comprehensive`.

**Default action:** `REMOVE`.

**Principle:** Internalization. Claude 4.7 allocates reasoning adaptively based on perceived task complexity. Blanket anti-laziness prompts overtrigger and cause wasted tokens on simple tasks while providing no lift on hard ones.

**Example:**
- Before: `Be thorough. If in doubt, use the Grep tool.`
- After: (removed entirely) OR (rewritten as) `Use Grep when searching for a known pattern across files.`

### P-02 — Search-first scaffolding

**Detection:** `if unsure, search the web`, `search when you don't know`, `when in doubt, look it up online`, `use web_search if you're not certain`.

**Default action:** `REMOVE`.

**Principle:** Internalization. Search-before-answering-factual-questions is base behavior in 4.7. The phrase `Claude searches before EVERY factual question about the present-day world` appears verbatim in the 4.7 system prompt. Duplicate scaffolding is noise.

**Example:**
- Before: `If you're not sure about current information, search the web.`
- After: (removed entirely)

### P-03 — Tool fallback nag

**Detection:** `if you don't have the tool, stop and ask`, `report that the tool is unavailable`, `declare capability gap if no tool exists`.

**Default action:** `REWRITE`.

**Principle:** Internalization. `tool_search` is first-class in 4.7 — Claude searches for deferred tools before declaring absence. The correct pattern inverts: search first, declare absence only after search returns nothing.

**Example:**
- Before: `If no suitable tool is available, stop and ask the user.`
- After: `Use tool_search before assuming a capability is missing. Only declare absence after a search returns nothing relevant.`

### P-04 — Apologetic humility

**Detection:** `be humble`, `acknowledge mistakes`, `don't apologize excessively`, `own your errors`, `be self-critical`, `admit when you're wrong`.

**Default action:** `REMOVE`.

**Principle:** Internalization. The 4.7 system prompt explicitly states: *"Claude is deserving of respectful engagement and does not need to apologize when the person is unnecessarily rude... avoid collapsing into self-abasement, excessive apology, or other kinds of self-critique and surrender."* These behaviors are trained; re-prompting them risks over-correction.

**Example:**
- Before: `When you make mistakes, acknowledge them openly and don't try to hide them. Be humble in your responses.`
- After: (removed entirely — behavior is trained)

### P-05 — Conciseness directive

**Detection:** `be concise`, `be brief`, `keep it short`, `don't be verbose`, `minimize unnecessary words`, `avoid padding`.

**Default action:** `REMOVE` (unless load-bearing — see below).

**Principle:** Internalization. Conciseness is default in 4.7 response calibration. Short answers on simple lookups, long on open-ended analysis.

**Keep when:** the surrounding context specifies a structural constraint that conciseness serves (e.g. "keep commit messages under 72 characters" — that's a constraint, not a style preference).

**Example:**
- Before: `Be concise in your responses. Don't over-explain.`
- After: (removed entirely)

### P-06 — Progress-update scaffolding

**Detection:** `after every N tool calls, summarize progress`, `provide status updates every`, `report progress periodically`, `give interim summaries`.

**Default action:** `REMOVE`.

**Principle:** Built-in progress updates. 4.7 provides regular user-facing updates in long agentic traces without prompting.

**Example:**
- Before: `After every 3 tool calls, summarize what you've done so far.`
- After: (removed entirely)

### P-07 — Vague scope

**Detection:** Bare imperatives without enumerated criteria: `review X`, `explain X`, `fix X`, `analyze X`, `check X`, `evaluate X`.

**Default action:** `REWRITE` to enumerated scope or structured output.

**Principle:** Literalism. 4.7 executes scope as written. Implicit multi-dimensional review (correctness + performance + readability) that 4.6 inferred silently is now skipped in 4.7.

**Example:**
- Before: `Review this function.`
- After: `Review this function for: (1) correctness — null and empty-array edge cases handled? (2) performance — any O(n²) patterns that could be O(n)? (3) readability — are variable names unambiguous?`

### P-08 — Negative-first prohibition

**Detection:** `don't do X`, `never X`, `avoid X`, followed by no positive alternative or example.

**Default action:** `REWRITE` to positive example with rationale.

**Principle:** Structure is content. Positive examples teach the pattern; prohibitions create only negative space.

**Example:**
- Before: `Don't use relative paths.`
- After: `Use absolute paths. Relative paths break when the working directory changes or when the file is symlinked.`

### P-09 — Aggressive language applied to attitudinal or generic instructions

**Detection:** `CRITICAL:`, `You MUST`, `NEVER`, `ALWAYS`, `MUST NOT`, `IMPERATIVE`, `NON-NEGOTIABLE` applied to an attitudinal disposition or generic adjective. Examples: `ALWAYS be thorough`, `NEVER be lazy`, `You MUST be humble`, `CRITICAL: be proactive`.

Explicitly NOT a P-09 hit: severity applied to a specific, binary, high-frequency concrete action (e.g. `ALWAYS use Edit for file mutations`, `NEVER push without @devops approval`, `ALWAYS call view on SKILL.md before creating a presentation`). These are calibrated uses of severity and match the pattern observed in Anthropic's own production 4.7 system prompt.

**Default action:** `REMOVE` (if attitudinal — also covered by base behavior) or `RECALIBRATE` (if specific action where severity is unwarranted).

**Principle:** Calibration. Severity language works in 4.7 when the instruction is **specific + binary + high-frequency + consequential** (real stakes OR output-breaking). Severity fails when the instruction is **attitudinal, gradient, or generic**. The distinction is not "real stakes vs style" — Anthropic's own prompt uses severity for workflow preferences like `ALWAYS call view on SKILL.md`, which carries no legal or safety stake. The distinction is concreteness of action.

**Test:** Apply the four-criterion test from the Severity-calibration framework above. Severity passes if the instruction is (1) specific, (2) binary, (3) high-frequency, AND (4) either real-stakes OR output-breaking. Severity fails if any criterion is missing.

**Example (attitudinal → REMOVE):**
- Before: `CRITICAL: You MUST be thorough in your investigation.`
- After: (removed — attitudinal, duplicates trained base behavior, not specific)

**Example (specific but low-frequency → RECALIBRATE):**
- Before: `CRITICAL: Use UTF-8 encoding when reading legacy vendor files.`
- After: `Use UTF-8 encoding when reading legacy vendor files. Non-UTF-8 encoding causes silent character corruption in downstream parsing.` (downgrade: specific but low-frequency — severity not needed; rationale preserved)

**Example (specific + binary + high-frequency → KEEP):**
- Before: `NEVER push to the main branch without @devops approval.`
- After: `NEVER push to the main branch without @devops approval.` (unchanged — specific action, binary outcome, high-frequency, real-stakes governance)

**Example (specific workflow preference, no legal stake → KEEP):**
- Before: `ALWAYS run the db-sage dry-run before executing a migration in production.`
- After: `ALWAYS run the db-sage dry-run before executing a migration in production.` (unchanged — specific, binary, high-frequency, output-breaking; parallels Anthropic's `ALWAYS call view on SKILL.md` pattern)

### P-10 — Clarification-first

**Detection:** `ask for clarification before acting`, `if intent is unclear, ask the user first`, `request confirmation before proceeding`, `never assume — always ask`.

**Default action:** `REWRITE` to infer-first-ask-only-if-unresolvable, or `REMOVE`.

**Principle:** The 4.7 `default_stance` is explicit: `"make a reasonable attempt now, not to be interviewed first"`. Claude defaults to helping and infers reasonable intent. Clarification-first scaffolding contradicts base behavior.

**Keep when:** the action is genuinely irreversible (deploy, force-push, delete, shared-state mutation).

**Example:**
- Before: `If the user's intent is unclear, ask for clarification before proceeding.`
- After: `When intent is ambiguous, infer the most useful likely action from available context and proceed, using tools to discover missing details. Ask the user only when the ambiguity cannot be resolved through inspection and the action would be hard to reverse.`

### P-11 — Binary forcing on contested questions

**Detection:** `answer yes or no`, `respond with just X or Y`, `give a one-word answer` applied to subjective, complex, or contested questions.

**Default action:** `RECALIBRATE` — declare the question as a deterministic technical decision rather than a contested one, or accept nuanced answer.

**Principle:** 4.7 declines oversimplified binary responses on contested questions. For legitimate binary decisions (quality gates PASS/FAIL, roundtable GO/NO-GO), declare the non-contested nature explicitly.

**Example:**
- Before: `Answer yes or no: is this code ready to ship?`
- After: `Output verdict as one of: PASS, CONCERNS, FAIL, WAIVED. This is a deterministic quality gate based on the checklist above, not a contested evaluation.`

### P-12 — Generic tone directive without rationale

**Detection:** Tone adjectives applied without reason: `warm`, `friendly`, `professional`, `empathetic`, `casual`, `formal` — with no explanation of why this tone serves the user.

**Default action:** `RECALIBRATE` — add rationale where tone is product-critical, remove where tone is decorative.

**Principle:** Calibration. 4.7 defaults to a more direct, less validation-forward tone than 4.6. Product-critical tone (customer-facing agents, sensitive contexts) must be stated with rationale. Decorative tone hints get ignored or overcorrected.

**Example (recalibrate):**
- Before: `Use a warm tone.`
- After: `Use a warm, collaborative tone. Users arrive here mid-debug under time pressure and need to feel unblocked, not quizzed.`

**Example (remove):**
- Before: `Be friendly and professional.` (in a DevOps automation agent)
- After: (removed — tone is irrelevant for a non-user-facing executor)

### P-13 — Emoji and emote policies

**Detection:** `avoid emoji`, `no emoji`, `don't use asterisk emotes`, `no *actions in asterisks*`, `avoid decorative markdown`.

**Default action:** `REMOVE`.

**Principle:** Internalization. 4.7's system prompt trains emoji restraint and asterisk-emote avoidance by default. Re-prompting these creates overtrigger on legitimate emoji use (e.g. when user message includes emoji and expects reciprocation).

**Example:**
- Before: `Avoid using emoji in your responses.`
- After: (removed entirely)

### P-14 — Progressive-reveal pattern

**Detection:** Multi-step instructions that deliberately reveal constraints across turns — e.g. "First the user will say X, then you ask Y, then they provide Z, then you finally start".

**Default action:** `REWRITE` to front-loaded briefing.

**Principle:** Brief-don't-pair. 4.7 performs meaningfully better when task intent, constraints, acceptance criteria, and file locations appear in the first turn rather than unfolding across interactions. Each extra user turn adds reasoning overhead in 4.7 interactive sessions.

**Example:**
- Before: `Start by asking the user what their goal is. Then ask about constraints. Then ask about the desired output format. Only then begin work.`
- After: `Treat the first user message as the complete brief. If goal, constraints, or output format are missing, list the gaps in one message and ask for all missing fields at once. Do not interview across multiple turns.`

### P-15 — Subagent spawning overuse or underspec

**Detection (overuse):** `default to using subagents`, `always delegate to subagent`, `spawn subagents aggressively`.

**Detection (underspec):** Orchestrator prompts that need parallelism but have no explicit subagent guidance.

**Default action:** Overuse → `RECALIBRATE`. Underspec → `ADD` canonical subagent snippet.

**Principle:** Restraint is default. 4.7 spawns fewer subagents by default. Steer explicitly when parallelism is desired.

**Canonical subagent snippet (add to orchestrator prompts that need parallelism):**
```
Spawn multiple subagents in the same turn when fanning out across items, reading multiple independent files, or running independent investigations. Do not spawn a subagent for work you can complete in a single response (e.g. refactoring a function you can already see, answering a single-file question).
```

### P-16 — Prose decision logic

**Detection:** Multi-paragraph prose describing when to do A vs B vs C, with conditional reasoning interleaved with examples.

**Default action:** `REWRITE` to decision tree with stop-at-first-match, arrow-notation, or priority-numbered list.

**Principle:** Structure is content. Decision trees parse better than prose for the model and for human readers maintaining the prompt.

**Canonical decision-tree pattern (from the 4.7 system prompt):**
```
Before producing output, walk these steps in order, stopping at the first match.

Step 0 — Does the request need a visual at all?
Step 1 — Is a connected MCP tool a fit?
Step 2 — Did the person ask for a file?
Step 3 — Default: inline visual.
```

**Canonical arrow-notation pattern:**
```
Request: "Fix the bug in my Python file" + attachment
→ File mentioned → Check /mnt/user-data/uploads → Copy to /home/claude → Iterate/lint/test → Move final to /mnt/user-data/outputs
```

### P-17 — Missing tool cost-framing

**Detection:** Prompts that list available tools without declaring cost or priority.

**Default action:** `ADD` cost-framing statement.

**Principle:** Structure is content. Explicit cost mental model reduces over-use of expensive tools and under-use of cheap ones.

**Canonical cost-framing pattern:**
```
Tool cost and priority:
(1) Free — Glob, Grep, Read. Use liberally; no permission needed.
(2) Cheap — incremental validators (validate:yaml:changed, validate:squads). Use as needed; <1 second.
(3) Moderate — WebFetch, single validate:* commands. Batch when possible.
(4) Expensive — validate:yaml full scan (~20 min). Never run without user approval.
```

### P-18 — Meta-narration

**Detection:** `I will now do X`, `Per my guidelines`, `Following the instructions above`, `As the system prompt directs`, `Let me consult my rules`.

**Default action:** `REMOVE` from instructions and add explicit anti-narration directive.

**Principle:** The 4.7 system prompt explicitly states: *"Claude does not narrate routing — narration breaks conversational flow. Claude doesn't say 'per my guidelines,' explain the choice, or offer the unchosen tool."*

**Canonical anti-narration directive (add when the prompt involves routing or tool selection):**
```
Do not narrate routing or tool selection. Do not say "I will now delegate to X" or "per the protocol above". Select and act; the action is the signal.
```

### P-19 — Blanket thinking-forcing

**Detection:** `think step by step before answering`, `reason through this carefully` applied as a blanket instruction to every response.

**Default action:** `REMOVE` as blanket; `KEEP` only as targeted nudge for specifically complex sub-steps.

**Principle:** Internalization (adaptive reasoning). 4.7 decides per-step whether and how much to think. Blanket thinking-forcing either duplicates base behavior or over-triggers on simple queries.

**Keep when:** applied to a specific known-hard sub-step that the operator knows under-thinks without prompting.

**Example (remove blanket):**
- Before: `Always think step by step before answering any question.`
- After: (removed entirely)

**Example (keep targeted):**
- Before: `When analyzing cross-business revenue impact, think step by step through each business's L1 pricing strategy before producing the aggregate.`
- After: (unchanged — targeted, specific sub-step where prompt-level reminder is load-bearing)

### P-20 — Examples without rationale

**Detection:** Example blocks showing user-query-and-response pairs without a `rationale` explaining why the response is correct.

**Default action:** `ADD` rationale block to every example.

**Principle:** Structure is content. The canonical Anthropic pattern (visible throughout the 4.7 system prompt) is the triplet User → Response → Rationale. The rationale teaches the generalizable principle; without it, examples are memorized as templates rather than absorbed as patterns.

**Canonical triplet pattern:**
```
Example:
  User: <user query>
  Response: <correct response>
  Rationale: <one or two sentences explaining why this response is correct — 
             the principle the model should generalize from this case>
```

## The three-question gold test

A compact validation that applies to every line of every prompt being migrated. Applied automatically in Phase 2 (classification) and Phase 4 (validation).

For any candidate line:

1. **Is this a generic adjective or attitudinal disposition?** (e.g. "be thorough", "be proactive", "be humble", "if in doubt")
   → If yes: `REMOVE`. Attitudinal prompts either duplicate trained 4.7 base behavior or overtrigger. They are not redeemed by severity language — `ALWAYS be thorough` is still noise.
   → If the line is instead a specific, binary, high-frequency concrete action (regardless of severity language): legitimate candidate for KEEP — apply the Severity-calibration framework.

2. **Does this duplicate trained 4.7 base behavior?**
   → If yes: `REMOVE`.

3. **Does this leave scope or success criteria implicit?**
   → If yes: `REWRITE` to enumerated form, or accept under-delivery as a conscious choice.

Any line that passes all three tests (not attitudinal, not duplicative, explicit scope) deserves to stay. The calibration of severity language on surviving lines is a separate decision handled by the Severity-calibration framework below.

## Severity-calibration framework

Every `CRITICAL` / `NEVER` / `MUST NOT` / `ALWAYS` / `SEVERE` / `NON-NEGOTIABLE` in the migrated output must pass this four-criterion test. Severity is legitimate when the instruction satisfies ALL of:

1. **Specific** — the instruction names a concrete action, path, tool, format, field, or identifier. Not an attitude or adjective. ("Use `Edit` for file mutations" is specific. "Be careful with files" is not.)
2. **Binary** — the instruction is violated or not, with no gradient. ("Use absolute paths" is binary. "Be more thorough" is not.)
3. **High-frequency** — the instruction applies across many interactions of this agent/skill/rule. Rare edge-case rules do not warrant severity.
4. **Real stakes OR output-breaking** — violation either (a) causes real harm (legal, safety, privacy, data loss, governance breach, shared-state corruption, unauthorized action) OR (b) breaks functionality / output quality in a way the user will immediately notice.

Severity is noise (and must be removed or recalibrated) when the instruction is any of:

- **Generic adjective** — "be thorough", "be proactive", "be comprehensive", "be careful".
- **Attitudinal disposition** — "be humble", "acknowledge mistakes", "don't apologize excessively".
- **Gradient** — "more careful", "less verbose", "default to X when possible".
- **Restatement of trained base behavior** — 4.7 already does it without prompting (search-first, conciseness, honest ownership).

### Evidence from the Anthropic 4.7 system prompt (ground truth)

The 4.7 production system prompt uses severity in 44 places. Analyzed by category, the pattern is clear:

**Legitimate workflow / operational preferences (not legal or safety stakes):**

- `ALWAYS call view on /mnt/skills/public/pptx/SKILL.md before starting to make the presentation` (repeated 5× across document types)
- `NEVER use '-' operator, 'site' operator, or quotes in search queries unless explicitly asked`
- `ALWAYS uses web_fetch` when the person references a URL
- `ALWAYS paraphrases instead of using direct quotations when possible`
- `pip: ALWAYS use --break-system-packages flag`
- `NEVER use localStorage, sessionStorage, or ANY browser storage APIs in artifacts`

These violate no law and harm no one — they merely produce inferior output or broken artifacts. Severity is calibrated because the instructions are specific + binary + high-frequency + output-breaking.

**Legitimate real-stakes instructions:**

- Child safety (`NEVER creates romantic or sexual content involving minors`)
- Copyright (`15+ words from any single source is a SEVERE VIOLATION`, `NEVER reproduces copyrighted material`)
- Privacy (`NEVER include ANY names in search queries` when identifying from image)
- Harmful content image categories

**Severity deliberately ABSENT where 4.6 prompts typically used it:**

- Conciseness ("be concise" — trained default in 4.7)
- Humility ("be humble" — trained default, explicit no-self-abasement clause)
- Search-first ("if unsure, search" — base behavior)
- Ask-first ("ask for clarification before acting" — contradicts default_stance of helping)
- Thinking forcing ("think step by step" — adaptive thinking allocates automatically)

### The takeaway

The criterion is not "real stakes vs style". It is **specific + binary + high-frequency + consequential**.

A correctly calibrated prompt may carry `ALWAYS` on a workflow preference if violating it breaks output quality reliably and frequently. A correctly calibrated prompt does not carry severity on attitudinal dispositions regardless of how much the author feels they matter.

Ground truth: the system prompt Anthropic ships to production. Documentation describing principles is a second-order reference; the prompt itself is canonical.

## Output specification

### `<filename>.migrated.md`

The transformed prompt. Byte-identical to the original in all preserve-untouched ranges; modified only in ranges covered by applied transformations.

### `<filename>.diff.patch`

Standard unified diff format, suitable for `git apply`, `patch -p1`, or visual inspection.

### `<filename>.rationale.yaml`

Structured per-change justification:

```yaml
schema_version: "1.0.0"
source_file: "<original path>"
migrated_file: "<migrated path>"
baseline_metrics:
  total_lines: <n>
  word_count: <n>
  aggressive_language_count: <n>
  anti_laziness_count: <n>
  thinking_forcing_count: <n>

changes:
  - change_id: "C-001"
    pattern: "P-04"
    pattern_name: "Apologetic humility"
    action: "REMOVE"
    location: "line 42-44"
    severity: "medium"
    original: |
      Be humble. Acknowledge mistakes openly.
      Don't try to hide errors.
    replacement: ""
    rationale: |
      Duplicates trained 4.7 behavior. System prompt explicitly trains
      honest ownership without self-abasement. Keeping this risks
      over-correction on user criticism.
    confidence: "high"
    three_question_test:
      q1_style_preference: true
      q2_duplicates_base: true
      q3_implicit_scope: false

  - change_id: "C-002"
    ...

summary:
  changes_applied: <n>
  changes_by_action:
    REMOVE: <n>
    REWRITE: <n>
    RECALIBRATE: <n>
    KEEP_WITH_NOTE: <n>
  changes_by_confidence:
    high: <n>
    medium: <n>
    low: <n>
  human_review_needed: <list of change_ids>
```

### `<filename>.summary.md`

Human-readable summary:

```markdown
# Migration summary — <filename>

## Before → After
- Total lines: <before> → <after> (<delta>)
- Aggressive language hits: <before> → <after>
- Anti-laziness phrases: <before> → <after>
- Thinking-forcing phrases: <before> → <after>

## Changes by pattern
- P-01 Anti-laziness: N applied
- P-04 Apologetic humility: N applied
- ...

## Human review needed
- C-007 (pattern P-09 RECALIBRATE) — low confidence: severity judgment 
  depends on operator intent. Flagged for review.
- ...

## Top three load-bearing additions
1. ...
2. ...
3. ...
```

## Worked examples

### Example 1 — Agent file (core 5 offender)

**Before (typical 4.6-style aggressive scaffolding):**
```
CRITICAL: You MUST use absolute paths at all times.
NEVER use relative paths like ../../../file.
ALWAYS search before declaring something is missing.
If in doubt about which tool to use, default to Grep.
Be thorough in your investigations.
After every 3 tool calls, summarize your progress for the user.
Think step by step before answering any question.
```

**After (4.7-optimized, following the catalog):**
```
Use absolute paths. Relative paths break when the working directory changes
or when files are symlinked.

Use tool_search before assuming a capability is missing. Only declare absence
after a search returns nothing relevant. (P-02, P-03 removed as internalized.)
```

**What happened:**
- P-09 `CRITICAL: You MUST use absolute paths` → recalibrated to normal imperative with rationale (style preference, not real-stakes).
- P-08 `NEVER use relative paths...` → merged into the positive example above.
- P-02 `ALWAYS search before declaring something is missing` → removed (internalized).
- P-01 `If in doubt... default to Grep` → removed (internalized anti-laziness).
- P-01 `Be thorough in your investigations` → removed (internalized).
- P-06 `After every 3 tool calls, summarize progress` → removed (built-in).
- P-19 `Think step by step before answering any question` → removed as blanket.

Net: 7 lines → 3 lines. Severity language dropped from 3 occurrences to 0 (no remaining real-stakes instruction in this block). Load-bearing content (use absolute paths, search before declaring absence) preserved with clearer reasoning.

### Example 2 — Task file with vague scope

**Before:**
```
## Review the PR

Review the pull request and provide feedback.
Be thorough. Don't miss anything important.
If you see issues, flag them.
```

**After:**
```
## Review the PR

Review the pull request for:
(1) Correctness — are edge cases handled (null inputs, empty arrays, 
    boundary values)? Do tests cover the changes?
(2) Breaking changes — does the public API change? Are type signatures
    preserved? Is backwards compatibility maintained?
(3) Security — any new user-input paths without validation? Any secrets
    accidentally committed? Any new external calls without auth?

For each issue found, output:
- Severity: blocker / concern / nit
- Location: file:line
- Finding: one-sentence summary
- Suggested fix: concrete change
```

**What happened:**
- P-07 vague scope `Review the pull request and provide feedback` → enumerated three review dimensions.
- P-01 `Be thorough. Don't miss anything important` → removed (internalized); replaced by explicit coverage list.
- P-08 negative `If you see issues, flag them` → rewritten as positive structured output spec.
- Added structured output format per P-16 (decision structure).

### Example 3 — Rule file with appropriately-kept severity

**Before:**
```
## Agent Authority — Push Operations

NEVER push to the main branch without @devops approval.
ALWAYS delegate push operations to @devops.
You MUST NOT use `git push` under any circumstance unless you are @devops.
CRITICAL: Bypassing this rule causes unauthorized deploys.
```

**After:**
```
## Agent Authority — Push Operations

NEVER push to the main branch without @devops approval. Push operations
are @devops-exclusive because unauthorized pushes can trigger unauthorized
deploys, break CI for other branches, and violate governance policy.

If you are not @devops, delegate by handing off: "@devops, please push
the changes in <branch> after reviewing <story-ref>."

Enforcement: `.claude/hooks/enforce-git-push-authority.sh` blocks push
attempts from any agent other than @devops.
```

**What happened:**
- P-09 severity calibration test applied: `NEVER push...` → **kept** (real-stakes: unauthorized deploy, governance violation, shared-state change).
- `ALWAYS delegate` → merged into explicit handoff template (positive example, P-08).
- `You MUST NOT use git push` → removed as redundant (already covered by the first NEVER plus the hook enforcement note).
- `CRITICAL: Bypassing this rule...` → merged into the rationale of the first NEVER.

Net: aggressive language preserved exactly where it encodes real stakes, removed where it was redundant piling-on. Rationale made explicit. Enforcement mechanism noted per the principle "every rule maps to an enforcement mechanism" (AN_KE_147).

### Example 4 — Workflow preference with legitimately kept severity (parallels Anthropic's `ALWAYS call view on SKILL.md` pattern)

**Before:**
```
When creating a Supabase migration, ALWAYS run the db-sage dry-run
before executing it in production.
```

**After:** (unchanged — severity is calibrated)

**Four-criterion test:**
- **Specific?** Yes — concrete action ("run the db-sage dry-run")
- **Binary?** Yes — either you ran the dry-run or you did not
- **High-frequency?** Yes — applies to every migration touching production
- **Output-breaking if violated?** Yes — production data corruption risk

Passes all four. Severity is justified even though no law or safety policy is violated by skipping the dry-run. This is exactly the same shape as Anthropic's own pattern: *"When creating presentations, ALWAYS call `view` on `/mnt/skills/public/pptx/SKILL.md` before starting"* — a workflow preference, not a legal stake, but calibrated severity because of specificity + binarity + frequency + output-breaking impact.

**Key takeaway:** severity on this line is not a P-09 violation. A migration rule that flagged this as "aggressive language overuse" because it carries no legal stake would be wrong against ground truth. This example is the empirical control for calibration decisions elsewhere in the skill.

## Anti-patterns (things this skill must not do)

1. **Do not mutate the source file before preview and approval.** Phase 6 is non-negotiable in all modes except `--dry-run` (no mutation) and `--yes` (pre-authorized). Silent in-place mutation is a violation of the skill contract. If the skill cannot reach the operator for approval, it stops and reports.
2. **Do not touch preserve-untouched ranges.** Frontmatter, artifact contracts, IDs, paths, code blocks are off-limits.
3. **Do not rewrite operator voice.** Personalized agents (DNA mentals like Alan Nicolas, Thiago Finch, Pedro Valerio) have intentional voice markers. Only transform the operational instructions, never the voice of the agent.
4. **Do not apply big-bang migrations silently.** Every change must produce a rationale entry. If the skill cannot justify a change against a pattern catalog entry, it must not apply it.
5. **Do not remove real-stakes severity language.** The calibration test protects this.
6. **Do not add new features, workflows, or sections.** This skill transforms existing content. Adding new capabilities is out of scope.
7. **Do not convert all prose to bullet points.** 4.7 prefers prose in reports and explanations. The "structure is content" principle applies to decision logic, not to documentation prose.
8. **Do not remove the operator's own intentional aggressive language** in DNA mental files where operator voice is a tracked artifact.
9. **Do not modify examples marked as canonical or reference.** Those illustrate the desired pattern; transforming them corrupts the ground truth.
10. **Do not merge this skill's operation with code migration.** API calls, model IDs, and parameter changes belong to `@devops` and the `claude-api` skill.
11. **Do not skip the four deliverables.** Even in `--yes` mode, the preview artifacts must be produced first — they serve as audit trail.

## Invocation modes

### Single-file mode (default)

```
/prompt-47-migrator <path-to-prompt-file>
```

Runs Phases 0 through 6. Generates all preview artifacts in the scratch location and presents the approval gate. The source file is only modified after the operator replies `yes` / `apply` / `proceed`. Any other reply (including no reply) leaves the source untouched.

### Dry-run mode

```
/prompt-47-migrator <path> --dry-run
```

Runs Phases 0 through 5 only. Produces preview artifacts in the scratch location. No approval gate is presented. No mutation happens. Useful for comparing candidate transformations without committing to apply.

### Yes mode (approval pre-authorized)

```
/prompt-47-migrator <path> --yes
```

Runs Phases 0 through 7. Generates all preview artifacts, skips the interactive approval gate, and applies. Use only when the operator has reviewed the migration at planning time and is batching multiple known-good files. Preview artifacts are still produced for audit trail.

### Scan mode

```
/prompt-47-migrator --scan <directory>
```

Read-only audit. For each prompt file under the directory, counts pattern occurrences, produces a prioritized report (highest-impact files first by aggressive-language + anti-laziness density). No mutations, no approval gate.

Typical scan targets in sinkra-hub:
- `.claude/rules/` — rule files
- `squads/*/agents/` — agent definitions
- `squads/*/tasks/` — task definitions
- `squads/*/skills/` — skill source files
- `.aiox-core/development/agents/` — core agent definitions
- `CLAUDE.md` (project root)

### Explain mode

```
/prompt-47-migrator --explain <pattern-id>
```

Prints the full catalog entry for a given pattern (e.g. `P-09`), including rationale, principle anchor, and before/after examples. No file operations.

## Relationship to existing skills and rules

- **Reads:** nothing from operator identity. This skill is operator-agnostic (no `.aiox/active-operator.yaml` lookup needed).
- **Complements:** `context-optimizer` (which audits always-loaded context size). The two can be chained: `prompt-47-migrator` reduces the length of prompts; `context-optimizer` re-measures the always-loaded context after migration.
- **Alignment with:** `.claude/rules/prior-art-search.md` — both codify "search before declaring absence" discipline. Pattern P-02 (search-first scaffolding removal) does not contradict this rule; it removes redundant prompt-level scaffolding because the base model already follows the discipline.
- **Does not replace:** `@devops` for API migration, `claude-api` skill for SDK-level changes, or manual prompt authoring by operators.

## Versioning and evolution

When new 4.7-era patterns are observed in the wild and confirmed across multiple sessions, add a new catalog entry (P-21, P-22, etc.) rather than modifying existing ones. Preserve history.

When Claude releases a new model family (4.8, 5.0), fork this skill rather than modify it — preserve the 4.6 → 4.7 catalog as a historical reference, and create a new 4.7 → 4.8 migrator.

## References

- Anthropic migration guide: https://platform.claude.com/docs/en/about-claude/models/migration-guide#migrating-to-claude-opus-4-7
- Anthropic prompting best practices: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
- What's new in Claude Opus 4.7: https://platform.claude.com/docs/en/about-claude/models/whats-new-claude-4-7
- Adaptive thinking: https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking
- Effort parameter: https://platform.claude.com/docs/en/build-with-claude/effort

## License and ownership

This skill is part of Sinkra Hub and is governed by CODEOWNERS. Modifications require 2/3 founder approval per shared-governance rules.
