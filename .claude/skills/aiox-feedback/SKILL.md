---
name: aiox-feedback
description: "User-reported feedback / bug report for AIOX Enterprise. Collects the user's description, gathers redacted session + env context, and creates a GitHub issue in AIOXsquad/AIOX-enterprise via `gh issue create`. Inspired by Anthropic's /feedback."
version: "1.5.0"
owner_squad: infra-ops
sinkra_tier: Tier1
context: inline
agent: general-purpose
user-invocable: true
argument-hint: "[description]"
maxTurns: 15
---

# AIOX Feedback

User-facing feedback/bug-report skill. Mirrors Anthropic's `/feedback` behavior, but files the issue on the AIOX harness repo instead of anthropics/claude-code.

**Target repo:** `AIOXsquad/AIOX-enterprise`
**Issue tool:** `gh issue create` (user is authenticated as `oalanicolas`)
**Inline execution:** runs in the current conversation so it can summarize recent session context as part of the report.

## When to use

- User invokes `/aiox-feedback` (with or without an inline description)
- User explicitly says "report this as a bug", "abre um issue", "manda feedback disso pro harness"

## Non-goals

- Not a telemetry pipeline. No transcript upload to external services.
- Not a support ticket system. One GitHub issue per invocation.
- Not a substitute for story creation (`@sm` / `@po` own that).

---

## Pipeline

### 1. Pre-flight (fail fast)

Run these checks in parallel. If any fails, abort with the fix instruction:

```bash
gh auth status      # must be logged in
gh repo view AIOXsquad/AIOX-enterprise --json name  # must have access
```

If `gh` is missing → instruct user: `brew install gh && gh auth login`.
If no access to the repo → instruct user to request access from `@devops`.

### 0.5. Queue Check (NEW in v1.2.0)

Before asking for new feedback, check the fallback queue for pending retries:

```js
const queue = require('packages/core/feedback-queue/queue.cjs');
const items = queue.listQueued();
const poisoned = queue.listPoisoned();
```

**If `items.length === 0`:** skip this step entirely, proceed to Step 2.

**If `items.length > 0`:** show summary + ask the user (via `AskUserQuestion`):

> "Há ${items.length} feedback(s) pendente(s) de retry${poisoned.length > 0 ? ` + ${poisoned.length} poisoned (3+ falhas)` : ''}. Como proceder?"

Options:

- `retry-all` — call `queue.retry(item.invocation_id)` for each queued item, show summary `X recovered, Y still queued, Z poisoned`
- `retry-select` — list items (title + queued_at + attempt_count) and let user pick subset; retry only those
- `discard-all` — call `queue.discardAll()` (deletes queued, NOT poisoned); show count discarded
- `skip` — leave queue intact and continue with a new feedback submission

After the choice, proceed to Step 2 (collect new description) OR, if the user only intended queue maintenance with `retry-all` that fully drained, end the skill politely.

**Note:** Poisoned items (`queue/poison/{id}.yaml`) are NOT part of automatic retry — only surfaced in the count. User inspects them manually.

### 2. Collect description

If `$ARGUMENTS` is non-empty, use it as the initial description.
Otherwise, ask the user (one question, single-line or multiline ok):

> "Descreva o problema ou a sugestão. Quanto mais específico melhor — passos pra reproduzir, comportamento esperado vs. observado."

Use `AskUserQuestion` with a free-text answer. Do NOT invent a description on behalf of the user.

### 3. Classify type

Ask the user to pick the issue type. Use `AskUserQuestion` with options:

- `bug` — algo quebrado ou comportamento errado
- `enhancement` — nova feature ou melhoria
- `question` — dúvida sobre uso / comportamento esperado
- `documentation` — docs erradas ou faltando

Store the answer as `FEEDBACK_TYPE`. This becomes the GitHub label.

### 4. Gather env context

Run in parallel (via a single Bash call, no `find`/`grep`):

```bash
{
  echo "=== platform ==="
  uname -s -r -m
  echo "=== node ==="
  node --version 2>/dev/null || echo "node: not found"
  echo "=== npm ==="
  npm --version 2>/dev/null || echo "npm: not found"
  echo "=== cwd ==="
  pwd
  echo "=== git ==="
  git rev-parse --abbrev-ref HEAD 2>/dev/null
  git rev-parse --short HEAD 2>/dev/null
  git status --porcelain 2>/dev/null | head -20
  echo "=== claude ==="
  claude --version 2>/dev/null || echo "claude: not found"
  echo "=== operator ==="
  cat .aiox/active-operator.yaml 2>/dev/null | head -10 || echo "active-operator: not found"
}
```

Capture the output as `ENV_BLOCK`. If `git status` shows >20 files, truncate.

### 5. Synthesize session context (relevance-gated)

The LLM first decides **whether the feedback relates to the current session**, then chooses one of three modes. No user question — low friction.

**Relevance heuristic (LLM self-judges):**

- `related` — description references something the user/LLM did in this session (a file edited, a skill invoked, a command that failed, an output produced, a decision made). Example signals: "the /commit I just ran", "that script we wrote", "when I tried X above".
- `standalone` — description is about something unrelated to the session. Example signals: "I just remembered that", "unrelated, but", "btw in another project", or the topic has zero overlap with anything done in-session.
- `ambiguous` — can't tell confidently. Default to `standalone` to avoid forcing false connections.

**Output by mode:**

| Mode | `SESSION_CONTEXT` content |
|------|---------------------------|
| `related` | 3-8 factual bullets from THIS session that motivate the feedback. Reference file paths + line numbers (e.g. `.claude/skills/foo/SKILL.md:42`). Include user intent, action taken, observed behavior. Name the specific tool/skill/agent the feedback targets. |
| `standalone` | Single line: `Standalone feedback — not related to current session context.` Nothing else. Do not invent connections. |
| `ambiguous` | Same as `standalone`. The user can still add context in step 9 (edit). |

**Hard rules:**

- NEVER hallucinate prior context. If a claim can't be grounded in this session's messages, drop it.
- NEVER include session bullets when mode is `standalone` or `ambiguous`. The point of this step is to avoid leaking unrelated session state into a near-public issue.
- If the LLM is about to write bullets that feel generic/forced ("user was working on something and encountered this"), that's the tell — switch to `standalone`.

Store as `SESSION_CONTEXT`. The mode itself is not exposed in the issue body — only the content.

### 6. Redact sensitive info (v1.3.0 — deterministic runner)

Apply redaction to `DESCRIPTION`, `ENV_BLOCK`, and `SESSION_CONTEXT` via the pure-function runner at `packages/core/redaction/redact.cjs`. The runner implements 15 pattern categories in a frozen, ordered registry — NO inline regex interpretation, NO LLM cognitive work.

```js
// Resolve from skill runtime (project-root-relative path).
// If require() does not resolve via project-root (depends on skill harness cwd),
// substitute: require(path.resolve(process.cwd(), 'packages/core/redaction/redact.cjs'))
const path = require('node:path');
const fs = require('node:fs');
const { redact } = require('packages/core/redaction/redact.cjs');
const { renderAuditBlock } = require('packages/core/redaction/render-audit.cjs');
const { emit } = require('packages/core/telemetry/session-emitter.cjs');

const descRes = redact(DESCRIPTION);
const envRes = redact(ENV_BLOCK);
const ctxRes = redact(SESSION_CONTEXT);

// Use redacted values downstream.
DESCRIPTION = descRes.redacted;
ENV_BLOCK = envRes.redacted;
SESSION_CONTEXT = ctxRes.redacted;

// Aggregate metadata for telemetry (NEVER the content itself).
const totalCount = descRes.count + envRes.count + ctxRes.count;
const allTypes = [...new Set([
  ...descRes.types_detected,
  ...envRes.types_detected,
  ...ctxRes.types_detected,
])].sort();

// Render the audit block via pure helper — empty string when totalCount === 0.
// Metadata ONLY (count + category names) — NEVER the redacted content.
const AUDIT_BLOCK = renderAuditBlock({ count: totalCount, types_detected: allTypes });

// Direct-append telemetry (same pattern as feedback-queue writeTelemetry).
try {
  const line = emit('redaction_performed', {
    phase: 'aiox-feedback-step-6',
    status: 'ok',
    data: {
      redaction_count: totalCount,
      pii_types_detected: allTypes.join(','),  // CSV — ALLOWED_DATA_KEYS primitive-only
    },
  });
  const sinkPath = path.resolve(process.cwd(), '.synapse', 'metrics', 'aiox', 'session.jsonl');
  fs.mkdirSync(path.dirname(sinkPath), { recursive: true });
  fs.appendFileSync(sinkPath, line + '\n', 'utf8');
} catch (_e) {
  // Telemetry MUST NOT break the primary flow — silent-exit per hook-wrapper parity.
}
```

**Privacy boundary (NON-NEGOTIABLE):**

- `redact()` is pure and side-effect free — it does NOT emit telemetry itself.
- The skill runtime emits `redaction_performed` with ONLY metadata: `redaction_count` (int) and `pii_types_detected` (CSV string of category names).
- The redacted OR original content NEVER enters telemetry — the emitter's `sanitizeData()` drops any non-whitelisted key as defense-in-depth.

**When a new secret pattern is needed:** add it to `packages/core/redaction/patterns.cjs` (PATTERN_REGISTRY) with ordering consideration + positive/negative test — do NOT add ad-hoc regex here.

### 7. Compose issue body

```markdown
## {FEEDBACK_TYPE_TITLE}

{DESCRIPTION}

## Session Context

{SESSION_CONTEXT}

## Environment

```
{ENV_BLOCK}
```

{AUDIT_BLOCK}

## Reported by

- Operator: `{operator.slug from .aiox/active-operator.yaml}`
- Date: `{today ISO}`
- Session: `/aiox-feedback` skill v1.5.0
```

**`{AUDIT_BLOCK}` interpolation (NEW in v1.4.0):** replace with the return value of `renderAuditBlock({ count: totalCount, types_detected: allTypes })` computed at the end of Step 6. When `totalCount === 0`, the helper returns `''`, so the audit section is fully omitted (no whitespace, no marker) — cleaner issue body for zero-redaction cases. See Dev Notes → Reference: Audit Block Format below.

`FEEDBACK_TYPE_TITLE` mapping:
- `bug` → `Bug Description`
- `enhancement` → `Feature Request`
- `question` → `Question`
- `documentation` → `Documentation Issue`

### 8. Generate title

Write a single-line title, ≤80 chars, imperative or declarative. Rules:
- Prefix with a tag matching the type: `[bug]`, `[feat]`, `[question]`, `[docs]`
- Capture the essence of the description in ≤10 words
- No trailing punctuation
- Redact any sensitive info (same rules as step 6)

Example inputs → outputs:
- "the /commit skill hangs on push" → `[bug] /commit skill hangs on push step`
- "would be great to have a /status dashboard" → `[feat] add /status dashboard skill`

### 9. Preview + confirm

**9a. Spam heuristic pre-check (v1.5.0+):** before rendering the preview, run `checkSpam(DESCRIPTION)` from `packages/core/feedback-spam/check.cjs` to flag obviously low-quality descriptions. This is a WARNING-only gate — the user always has the final say.

```js
const { checkSpam } = require('packages/core/feedback-spam/check.cjs');
const spam = checkSpam(DESCRIPTION);

if (spam.severity === 'warn') {
  // Inline warning block — NO preview yet.
  // Rendered to the user EXACTLY as:
  //
  //   ⚠️ Sua descrição ativou {N} sinais de qualidade baixa: {signals-joined}.
  //   Feedback de baixa qualidade dificulta triagem.
  //
  //   Opções:
  //     1. edit             — reformular a descrição
  //     2. proceed-anyway   — submeter mesmo assim
  //     3. cancel           — abortar
  //
  // signals-joined = spam.signals.join(', ')   // human pretty-print

  // Emit telemetry — metadata only (CSV of category names, NEVER the text)
  try {
    const line = emit('spam_flagged', {
      phase: 'aiox-feedback-step-9',
      status: 'ok',
      data: { spam_signals: spam.signals.join(',') },
    });
    const sinkPath = path.resolve(process.cwd(), '.synapse', 'metrics', 'aiox', 'session.jsonl');
    fs.mkdirSync(path.dirname(sinkPath), { recursive: true });
    fs.appendFileSync(sinkPath, line + '\n', 'utf8');
  } catch (_e) {
    // Telemetry MUST NOT break the primary flow — silent-exit parity.
  }

  // AskUserQuestion with three options:
  //   - edit            → loop back to Step 2 (collect description). On re-entry
  //                       to Step 9, the spam check runs AGAIN. No auto-escape:
  //                       the warning re-prompts indefinitely until the user
  //                       picks proceed-anyway or cancel.
  //   - proceed-anyway  → continue to 9b (render standard preview)
  //   - cancel          → exit clean (no issue created)
}

// If severity === 'none' OR user chose proceed-anyway:
//   → fall through to 9b below.
```

**Privacy boundary (NON-NEGOTIABLE):** `spam_flagged` telemetry carries ONLY `spam_signals` (CSV of category names from the fixed 5-signal set). The description text is NEVER emitted. The emitter's `sanitizeData()` drops any non-whitelisted key as defense-in-depth.

**Re-prompt loop (UX decision, v1.5.0):** if the user picks `edit` and the new description ALSO triggers the warning, Step 9 re-renders the warning block with the new signals. There is no auto-escape after N attempts — the user is in full control. To submit low-quality feedback, they must consciously pick `proceed-anyway`. To exit, they pick `cancel`. This matches the warning-only design intent (never block, but always surface).

**9b. Preview:** show the user a preview — the preview MUST be byte-for-byte identical to the `{BODY}` that will be submitted in Step 10. This includes the conditional `{AUDIT_BLOCK}` section (v1.4.0+): when `totalCount > 0`, the "Privacy & Redaction Audit" block appears between `## Environment` and `## Reported by`; when `totalCount === 0`, the block is omitted entirely. Consent transparency — the user MUST see the exact audit section BEFORE clicking submit.

```
═══════════════════════════════════════════
Title:  {TITLE}
Label:  {FEEDBACK_TYPE}
Repo:   AIOXsquad/AIOX-enterprise

{BODY}
═══════════════════════════════════════════
```

Where `{BODY}` is the composed string from Step 7 (includes the interpolated `{AUDIT_BLOCK}`). Do NOT re-render the audit block here — reuse the same string to guarantee body/preview parity.

Then `AskUserQuestion` with three options:
- `submit` — create the issue now
- `edit` — let me change the description first (loop back to step 2)
- `cancel` — abort

Default to `submit` only if the user explicitly confirms.

### 10. Submit

Use a heredoc to pass the body safely (body contains backticks, newlines, etc.):

```bash
gh issue create \
  --repo AIOXsquad/AIOX-enterprise \
  --title "{TITLE}" \
  --label "{FEEDBACK_TYPE}" \
  --body "$(cat <<'EOF'
{BODY}
EOF
)"
```

**Do NOT** pass `--body` directly with string interpolation — it will break on backticks and newlines. Always use heredoc.

If the command succeeds, `gh` prints the issue URL. Capture it and show to the user:

```
Issue created: https://github.com/AIOXsquad/AIOX-enterprise/issues/{N}
```

If the label doesn't exist on the repo, retry without `--label` and warn the user.

**On `gh issue create` exit code ≠ 0 (network / 401 / rate-limit / 5xx):** do NOT surface this as a hard error. Instead, enqueue the payload for retry on the next `/aiox-feedback` invocation:

```js
const queue = require('packages/core/feedback-queue/queue.cjs');
const invocation_id = queue.enqueue({
  feedback_type: FEEDBACK_TYPE,
  title: TITLE,
  label: FEEDBACK_TYPE,
  body: BODY, // already REDACTED by Step 6
  failure: {
    gh_exit_code: ghExitCode,
    gh_stderr: ghStderr,
  },
});
```

Then show a friendly message:

```
Submission deferred — feedback salvo localmente como {invocation_id}.
Próxima invocação do /aiox-feedback oferecerá retry automático.
```

Exit the skill clean (status ok), NOT as an error. The queue is local-only (gitignored), so nothing leaves the machine until retry succeeds.

### 11. Done

End with a one-line summary:

```
Feedback submitted as #{N}. Thanks for helping improve the harness.
```

---

## Arguments

- `$ARGUMENTS` — optional initial description. If provided, skip step 2's prompt and use it directly. User can still edit in step 9.

Examples:

```
/aiox-feedback
/aiox-feedback o /commit trava na fase de push quando tem muitos arquivos
/aiox-feedback seria útil ter um dashboard de status dos squads
```

---

## Guardrails (NON-NEGOTIABLE)

1. **Never submit without user confirmation.** Step 9 is mandatory. No `--yes` flag.
2. **Never include unredacted secrets.** If redaction regex misses something obvious in the preview, the user can edit.
3. **Never open an issue on a repo other than `AIOXsquad/AIOX-enterprise`.** The target is hardcoded.
4. **Never push commits or create PRs from this skill.** Only `gh issue create`.
5. **Obey @devops authority.** This skill does NOT need @devops authority (issue creation is not a push/tag/PR operation per `agent-authority.md`). Any user may run it.

---

## Failure Recovery (v1.2.0+)

When `gh issue create` fails (network partition, 401, rate-limit, 5xx), the skill does NOT surface a hard error. Instead it **enqueues** the payload to `outputs/aiox-feedback/queue/{invocation_id}.yaml` (gitignored, local-only) and shows the user an `invocation_id`.

**On the next `/aiox-feedback` invocation**, Step 0.5 (Queue Check) detects the pending items and offers:

- `retry-all` — replay all queued items against `gh issue create`
- `retry-select` — pick a subset
- `discard-all` — drop queued items (poisoned stays)
- `skip` — proceed with a fresh submission, leave the queue as-is

**Retry outcomes:**

| Outcome | Effect |
|---------|--------|
| `gh` returns exit 0 | File deleted from `queue/`, `queue_retry_success` emitted with `issue_url` |
| `gh` fails, `attempt_count` < 3 | `attempt_count++`, `last_attempt_at` updated, `queue_retry_failed` emitted |
| `gh` fails, `attempt_count` ≥ 3 | File moved to `queue/poison/{id}.yaml`, `queue_poisoned` emitted. Poisoned items need manual review — not part of automatic retry. |

**Privacy boundary (same as FB-V2-01):**

- Queue YAML holds the REDACTED body (redaction ran in Step 6 BEFORE enqueue).
- Telemetry sink (`.synapse/metrics/aiox/session.jsonl`) carries ONLY metadata: `invocation_id`, `attempt_count`, `issue_url`. The body is NEVER logged.
- Zero phone-home. Zero daemon. Zero infra beyond the gitignored directory.

**API:** `packages/core/feedback-queue/queue.cjs` — see its README for the full module reference.

## Failure modes

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `gh: command not found` | gh CLI missing | `brew install gh` |
| `HTTP 401` from gh | Token expired | `gh auth login` |
| `HTTP 404` on repo | No access | Request from `@devops` |
| Label `user-reported` rejected | Label doesn't exist on repo | Retry without `--label`, warn user |
| Body too large (>65K chars) | Session context too long | Truncate `SESSION_CONTEXT` to 50 lines, retry |
| Transient failure (net, 401, rate-limit) | Infra blip | Auto-enqueued to `outputs/aiox-feedback/queue/` — next invocation offers retry |
| Item stuck in `queue/poison/` | 3 consecutive retry failures | Inspect `queue/poison/{id}.yaml`, fix root cause manually (bad label, body too large), re-submit by re-invoking with the saved `description` |

---

## Dev Notes → Reference: Audit Block Format (v1.4.0)

Introduced in v1.4.0 (STORY-FB-V2-06). The audit block surfaces redaction metadata — `count` + `types_detected` — directly in the issue body so triage can see at a glance which categories of secret were detected. The block is rendered by the pure helper `renderAuditBlock({ count, types_detected })` at `packages/core/redaction/render-audit.cjs` (zero deps, <30 LOC). The helper receives ONLY metadata — NEVER the redacted content.

**Format (rendered when count > 0):**

```markdown
## Privacy & Redaction Audit

- **Redactions applied:** {count}
- **PII types detected:** {types_detected.join(', ')}
- **Redaction runner:** `packages/core/redaction` (15 pattern categories)

```

**Example (count=3, types=['anthropic_key','aws_key','unix_path']):**

```markdown
## Privacy & Redaction Audit

- **Redactions applied:** 3
- **PII types detected:** anthropic_key, aws_key, unix_path
- **Redaction runner:** `packages/core/redaction` (15 pattern categories)

```

**Position in issue body:** between `## Environment` (and its closing fenced block) and `## Reported by`. This places audit info AFTER env context but BEFORE operator metadata.

**Conditional rendering:** when `count === 0` (or `count` is `undefined`/`null`), `renderAuditBlock()` returns an empty string — the section is fully omitted (no whitespace, no "no secrets detected" marker). Most issues will have zero redactions — keeping the body clean for the common case.

**Pretty-print rule:** `types_detected` is joined with `, ` (comma-space), NOT `,` (raw CSV). Example: `anthropic_key, aws_key, unix_path` — human-readable.

**Privacy boundary (NON-NEGOTIABLE):** the helper signature explicitly accepts only `{ count, types_detected }`. NEVER pass the redacted content or `pii_detected` boolean through the helper. Defense-in-depth: even if `types_detected` is accidentally mutated to contain user strings, the category-ID contract from `redact()` guarantees they are controlled identifiers from `PATTERN_REGISTRY`, not user content.

**Preview parity (Step 9):** the preview shown to the user in Step 9 includes the audit block byte-for-byte identical to what Step 10 submits. Do NOT re-render in Step 9 — reuse the Step 7 composed `{BODY}` string.

---

## Dev Notes → Reference: Spam Check Integration (v1.5.0)

Introduced in v1.5.0 (STORY-FB-V2-07). The spam heuristic runs in Step 9 BEFORE the preview rendering (9a) and surfaces a warning block when the description looks low-quality. It is WARNING-only — it never blocks submission; the user can always pick `proceed-anyway`.

**Function:** `checkSpam(text)` at `packages/core/feedback-spam/check.cjs` — pure, zero deps, <100 LOC.

**Signature:**

```js
checkSpam(text) -> { is_spam: boolean, signals: string[], severity: 'none' | 'warn' }
```

**5 signals (fixed set, stable category names):**

| Signal | Trigger |
|--------|---------|
| `too_short` | `text.trim().length < 10` |
| `single_word` | `text.trim().split(/\s+/).length < 3` |
| `all_caps` | `text.length >= 10` AND `uppercase_letters / total_letters > 0.7` (Unicode `\p{L}` / `\p{Lu}`) |
| `repeated_chars` | `/(.)\1{5,}/` matches — 6+ consecutive identical chars |
| `profanity` | word-level (case-insensitive) match against `PROFANITY_LIST` (8 hostile PT-BR+EN words) |

`signals` is returned **sorted, unique**. `is_spam === signals.length > 0`. `severity` is `'warn'` when flagged, `'none'` otherwise — **never `'block'`**.

**Example warning rendered (Step 9a):**

```
⚠️ Sua descrição ativou 2 sinais de qualidade baixa: single_word, too_short.
Feedback de baixa qualidade dificulta triagem.

Opções:
  1. edit             — reformular a descrição
  2. proceed-anyway   — submeter mesmo assim
  3. cancel           — abortar
```

**Telemetry event (v1.5.0, 4th additive extension of the emitter):**

- Event: `spam_flagged` (added to VALID_EVENTS, now 12 entries; frozen)
- Data key: `spam_signals` — CSV string of signal category names (added to ALLOWED_DATA_KEYS, now 15 entries; frozen)
- Privacy boundary: NEVER the flagged text. Only the 5 fixed category identifiers from the set above.
- Emitted when: the warning fires (regardless of user's subsequent edit/proceed/cancel choice). This captures the detection signal itself, decoupled from the user's decision.

**Re-prompt loop (UX decision):** if the user picks `edit` and the NEW description ALSO triggers `severity === 'warn'`, the flow re-enters Step 9a and re-renders the warning with the updated `signals`. There is **no auto-escape** — the loop re-prompts indefinitely until the user picks `proceed-anyway` or `cancel`. Rationale: the warning is advisory (not a block), so forcing submission after N attempts would undermine the warning's transparency. The user always has final control: submit low-quality feedback consciously (`proceed-anyway`) or abort (`cancel`).

**Profanity list conservativeness (PO condition):** `packages/core/feedback-spam/profanity-list.cjs` exports `PROFANITY_LIST` — a frozen array of 8 strongly-hostile single words (PT-BR: `merda`, `porra`, `cacete`, `caralho`; EN: `fuck`, `shit`, `damn`, `asshole`). Casual acronyms (`lol`, `omg`, `brb`, `wtf`, `lmao`, etc.) are **explicitly excluded** — they would produce false positives on legitimate terse feedback (e.g. "lol this skill broke"). Casual-but-terse content is already covered by the `single_word` + `too_short` signals.

**Zero false-positive design:** the heuristic is deliberately narrow. Length threshold (>= 10 chars) prevents `all_caps` from flagging short acronyms (`API`, `JSON`). 6-char threshold for `repeated_chars` allows legitimate words with 3-5 doubled chars. The profanity list is small and strict.

**What NOT to do:**

- NEVER pass the description text through telemetry — only `spam_signals` CSV
- NEVER set `severity: 'block'` — warning-only, user has final say
- NEVER add ML or external services — pure regex + string ops, Node stdlib only
- NEVER re-process text after the warning — the user's choice (`edit`/`proceed-anyway`/`cancel`) is final
- NEVER expand PROFANITY_LIST to include casual acronyms — they are not profanity

---

## Dev Notes → Reference: Pattern Categories (historical, v1.2.0 inline table)

This table is **REFERENCE ONLY** — the runner in `packages/core/redaction/patterns.cjs` is the executable source of truth (15 categories, frozen order). Kept here for LLM context when reviewing/auditing redaction behavior.

| Pattern | Replacement | Notes |
|---------|-------------|-------|
| `sk-ant-[A-Za-z0-9_-]{10,}` | `[REDACTED_ANTHROPIC_KEY]` | MUST run before openai_key |
| `sk-proj-[A-Za-z0-9_-]{20,}` + `sk-[A-Za-z0-9]{48}` | `[REDACTED_OPENAI_KEY]` | classic + new project keys |
| `sk_(live|test)_[A-Za-z0-9]{24,}` | `[REDACTED_STRIPE_KEY]` | underscore prefix (distinct from sk-) |
| `AKIA[0-9A-Z]{16}` | `[REDACTED_AWS_KEY]` | exactly 16 uppercase alnum |
| `AIza[A-Za-z0-9_-]{35}` | `[REDACTED_GCP_KEY]` | 35-char suffix |
| `gh[psor]_[A-Za-z0-9]{36,}` | `[REDACTED_GH_TOKEN]` | ghp_, ghs_, gho_, ghr_ |
| `SK[a-f0-9]{32}` | `[REDACTED_TWILIO_KEY]` | uppercase SK + 32 hex |
| `xox[bpoas]-[A-Za-z0-9-]{10,}` | `[REDACTED_SLACK_TOKEN]` | all xox* variants |
| `Bearer [A-Za-z0-9._~+/-]+=*` | `Bearer [REDACTED_BEARER]` | MUST run before env_secret |
| `(Authorization:\s*)[^\s]+` | `$1[REDACTED_AUTH]` | generic auth header |
| `(API_KEY\|TOKEN\|SECRET\|PASSWORD)=\S+` | `$1=[REDACTED]` | env-style assignments |
| `/Users/<name>` or `/home/<name>` | `~` | unix_path |
| `/mnt/[a-z]/Users/<name>` | `~` | wsl_path (runs BEFORE unix_path) |
| `[A-Za-z]:\\Users\\<name>` | `~` | windows_path |
| `\b(?:\d{4}[-\s]?){3}\d{4}\b` | `[REDACTED_CARD]` | credit card |

**When a new pattern is needed:** edit `packages/core/redaction/patterns.cjs` (PATTERN_REGISTRY) following the PR checklist in `packages/core/redaction/README.md`, NOT this table.

---

## References

- Anthropic reference implementation: `claude-code-main/src/components/Feedback.tsx` (`createGitHubIssueUrl`, `redactSensitiveInfo`)
- AIOX skill standards: `.claude/rules/skill-standards.md`
- Agent authority: `.claude/rules/agent-authority.md`
- Portable paths: `.claude/rules/portable-paths.md`
- Redaction runner: `packages/core/redaction/redact.cjs` (FB-V2-02, v1.3.0+)
- Audit block renderer: `packages/core/redaction/render-audit.cjs` (FB-V2-06, v1.4.0+)
- Telemetry emitter: `packages/core/telemetry/session-emitter.cjs` (FB-V2-01)
- Feedback queue: `packages/core/feedback-queue/queue.cjs` (FB-V2-03)
- Spam heuristic: `packages/core/feedback-spam/check.cjs` + `profanity-list.cjs` (FB-V2-07, v1.5.0+)

---

*AIOX Feedback v1.5.0 — infra-ops — Tier 1 inline skill*

---

## Change Log

| Version | Date | Change |
|---------|------|--------|
| 1.0.0 | 2026-04-16 | Initial release — `gh issue create` pipeline + redaction + preview + confirm |
| 1.1.0 | 2026-04-17 | FB-V2-01 integration — relevance-gated session context, telemetry emission |
| 1.2.0 | 2026-04-17 | feat: fallback queue + retry on failure (STORY-FB-V2-03). Step 0.5 Queue Check, Step 10 error path routes to `queue.enqueue()`, 6 new queue_* events, `invocation_id`/`attempt_count`/`issue_url` added to emitter ALLOWED_DATA_KEYS whitelist. |
| 1.3.0 | 2026-04-17 | feat: deterministic redaction runner (replaces inline regex) — STORY-FB-V2-02. Step 6 calls pure `redact()` from `packages/core/redaction/redact.cjs`, skill runtime emits `redaction_performed` telemetry event with `{redaction_count, pii_types_detected}` metadata (content NEVER logged). 15 pattern categories expanded from 9 (adds OpenAI sk-proj/sk-[48], Stripe, Twilio, WSL/Windows paths, credit cards). Inline regex table moved to Dev Notes → Reference for historical context. |
| 1.4.0 | 2026-04-17 | feat: pii.detected audit metadata in issue body (replaces silent redaction) — STORY-FB-V2-06. Step 6 composes `AUDIT_BLOCK` via pure helper `renderAuditBlock()` at `packages/core/redaction/render-audit.cjs` (zero deps, <30 LOC). Step 7 body template inserts `{AUDIT_BLOCK}` between Environment and Reported by. Step 9 preview reuses the same body string (byte-for-byte parity). Helper returns empty string when count=0 — section fully omitted. Fixed pre-existing stale footer literal (`v1.0.0` → `v1.4.0`). Privacy boundary preserved: helper receives ONLY metadata (count + category names), NEVER redacted content. |
| 1.5.0 | 2026-04-18 | feat: spam heuristic pre-submit (5 signals, warning-only) — STORY-FB-V2-07. Step 9 now runs `checkSpam(DESCRIPTION)` from `packages/core/feedback-spam/check.cjs` BEFORE the preview/consent. Five signals: `too_short`, `single_word`, `all_caps`, `repeated_chars`, `profanity`. When `severity === 'warn'`, an inline warning block renders above the preview and the user picks `[edit, proceed-anyway, cancel]`. Warning-only — never blocks; user always has final say. Telemetry: new `spam_flagged` event (12th in VALID_EVENTS; 4th additive extension of the emitter) carrying `spam_signals` CSV (15th ALLOWED_DATA_KEYS entry). Privacy boundary: category names only — NEVER the flagged text. Profanity list is conservative (8 hostile PT-BR+EN words, NO casual acronyms like `lol`/`omg`/`brb`/`wtf`). Re-prompt UX: if user picks `edit` and submits new text that ALSO triggers warning, the loop re-enters Step 9 spam check (no auto-escape — user always sees the warning until they pick `proceed-anyway` or `cancel`). |
