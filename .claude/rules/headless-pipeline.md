---
paths:
  - "squads/*/scripts/**"
  - "infrastructure/scripts/runner-lib/**"
---
# Headless Pipeline Rules — Claude Code Runtime Constraints

Applies when building or running shell pipelines that invoke `claude -p` (headless mode).
Derived from 212 business rules extracted from Claude Code CLI source code.

Source: `outputs/decoded/claude-code-cli/` (Phases 0-5, 2026-03-31)

## R1: Headless Auto-Deny (BR-PERM-065)

> In headless/background mode with no hook decision, tool use is **auto-denied**.

**Impact:** `claude -p` without `--dangerously-skip-permissions` will silently deny ALL tool calls (Read, Write, Bash, etc.). The LLM asks to use a tool, nobody is there to approve, permission defaults to DENY.

**Rule:** Every pipeline runner MUST use `--dangerously-skip-permissions` for `claude -p` calls.

## R2: Safety Checks Are Bypass-Immune (BR-PERM-053)

> Safety checks for `.git/`, `.claude/`, `.vscode/`, and shell configs prompt **even in bypassPermissions mode**.

**Impact:** Even with `--dangerously-skip-permissions`, writing to `.claude/` dirs or modifying `.gitconfig`, `.zshrc`, etc. will attempt to prompt — which blocks in headless mode.

**Rule:** Pipeline runners MUST NOT instruct the LLM to write to protected paths. Use `--allowedTools` to restrict Write targets if needed.

**Protected files:** `.gitconfig`, `.gitmodules`, `.bashrc`, `.bash_profile`, `.zshrc`, `.zprofile`, `.profile`, `.ripgreprc`, `.mcp.json`, `.claude.json`
**Protected dirs:** `.git`, `.vscode`, `.idea`, `.claude`

## R3: Tool Availability by Agent Type (BR-TOOL-001, BR-TOOL-003, BR-TOOL-004)

> Different agent types have different tool sets. Async agents get ~15 tools. Coordinators get 4.

| Agent Type | Available Tools | Implication for Pipelines |
|-----------|----------------|--------------------------|
| Main session | ALL tools | `claude -p` in main = full access |
| Async agent (spawned via Agent tool) | ~15 whitelisted | Subagents in roundtable/wave-execute have LIMITED tools |
| Coordinator | Agent, TaskStop, SendMessage, SyntheticOutput ONLY | Never use coordinator mode for pipeline work |
| In-process teammate | Async + Task/Message tools | TeamCreate-spawned agents have more than async but less than main |

**Rule:** Always specify `--allowedTools` explicitly in pipeline runners. Never assume the default tool set is sufficient.

## R4: Use --allowedTools Explicitly (BR-TOOL-001)

> Certain tools are blocked for ALL agent types: TaskOutput, ExitPlanMode, EnterPlanMode, AskUserQuestion, TaskStop.

**Impact:** If your `--allowedTools` includes blocked tools, they silently fail. If you DON'T specify `--allowedTools`, the default set may not include what you need.

**Rule:** Pipeline runners MUST declare `--allowedTools` with the exact set needed:
```bash
--allowedTools "Read,Write,Glob,Grep,Bash(ls),Bash(wc),Bash(head)"
```

## R5: Output Size Limits (BR-CONST-001, BR-CONST-002)

> Max Tool Result = 50,000 characters OR 100,000 tokens. Bytes per token = 4.

**Impact:** If the LLM reads a file >50K chars, the result is **truncated**. If prior phase outputs are too large, they get cut off when injected.

**Rule:**
- Prior context injection: truncate each file to ~3KB (~750 tokens)
- If source files are large, guide the LLM to read specific sections (offset + limit)
- Pipeline outputs >50K chars may not be fully readable in subsequent phases

## R6: Denial Tracking Stops the Pipeline (BR-PERM-DENY-001, BR-PERM-DENY-002)

> IF consecutive denials ≥ 3, THEN fallback to prompting. IF total denials ≥ 20, THEN fallback.

**Impact:** If `--dangerously-skip-permissions` is missing or a safety check triggers, the pipeline accumulates denials. After 3 consecutive, Claude Code changes behavior. After 20 total, it degrades further.

**Rule:** Fix permission issues at the source (correct flags, correct `--allowedTools`). Never let denials accumulate — they compound.

## R7: Compound Commands >50 Subcommands Are Rejected (BR-BASH-PERM-LIMIT)

> IF a compound command has >50 subcommands, reject without evaluating.

**Impact:** Pipeline scripts that generate long compound bash commands (e.g., chained validation) will be rejected by the permission system before execution.

**Rule:** Break compound commands into multiple Bash calls. Never chain >50 subcommands.

## R8: JSON Metadata in stdout (BR-PERM-065 + Runtime Behavior)

> When max-turns is hit, `claude -p` emits a JSON result summary on stdout: `{"type":"result","subtype":"error_max_turns",...}`

**Impact:** This is NOT LLM output — it's session metadata. If the script saves raw stdout, it saves JSON garbage instead of analysis.

**Rule:** Always filter JSON metadata from `claude -p` output:
```bash
echo "$raw_output" | grep -v '^{"type":"result"' | grep -v '^{"error":'
```

## R9: Read Before Write Enforcement (BR-PROMPT-006)

> Agent MUST read a file BEFORE modifying it. Write tool will error if file was not read first.

**Impact:** In headless mode, Haiku sometimes tries to Write without Read. The tool returns an error, the LLM retries, burns turns.

**Rule:** Pipeline prompts should instruct: "Read source files FIRST, then write artifacts." Budget turns accordingly (reads before writes).

## R10: One-Time Approval ≠ Standing Authorization (BR-PERM-017, BR-PROMPT-017)

> A user approving an action once does NOT mean they approve it in all contexts.

**Impact:** In headless mode with `--dangerously-skip-permissions`, this is bypassed. But if any hook or safety check triggers a prompt, the LLM may assume prior approval carries over — it does not.

**Rule:** Never rely on prior session approvals. Each `claude -p` invocation is a fresh session with no memory of prior approvals.

---

## Quick Reference: Pipeline Runner Flags

```bash
claude -p \
  --model "$MODEL" \
  --max-turns "$MAX_TURNS" \
  --allowedTools "Read,Write,Glob,Grep,Bash(ls),Bash(wc),Bash(head)" \
  --dangerously-skip-permissions \
  "$PROMPT"
```

| Flag | Why Required | Source Rule |
|------|-------------|------------|
| `--dangerously-skip-permissions` | Without it, ALL tools auto-denied in headless (R1) | BR-PERM-065 |
| `--allowedTools` | Explicit > default. Some tools blocked for all agents (R4) | BR-TOOL-001 |
| `--max-turns` | Without limit, LLM reads entire codebase (learned from B12) | BR-CONST-001 |
| `--model` | Turn budget varies by model (haiku=12, sonnet=10, opus=15) | Operational |

---

*Headless Pipeline Rules v1.0 — Derived from Claude Code CLI domain extraction*
*Source: outputs/decoded/claude-code-cli/ (212 rules, 89.8% SBVR compliant)*
