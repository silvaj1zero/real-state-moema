---
paths:
  - ".claude/settings*"
  - ".claude/hooks/**"
  - "squads/claude-code-mastery/**"
  - "infrastructure/scripts/runner-lib/**"
---
# Claude Code Internals — Permission & Security Reference

Applies when diagnosing permission denials, writing hooks, configuring allowedTools, or debugging why a command was blocked.

Source: Domain Decoder extraction of Claude Code CLI (212 rules, 2026-03-31).
Full data: `squads/claude-code-mastery/data/cc-permission-rules.yaml`

## Permission Decision Pipeline

The permission system evaluates in this order. First match wins:

```
1. Safety Check     → Dangerous files/dirs/interpreters → ALWAYS prompt (any mode)
2. Headless Mode    → No interactive user → auto-deny unless allowlisted
3. Bypass Mode      → bypassPermissions → auto-allow (step 1 still fires)
4. Denylist Match   → Explicit deny rules → block
5. Allowlist Match  → Explicit allow or flag-based → auto-allow
6. Classifier       → LLM yoloClassifier → allow/deny/ask
7. User Prompt      → No rule matched → ask user
```

## Files That ALWAYS Trigger Prompt

Even in `bypassPermissions` or `--dangerously-skip-permissions`:

```
Files: .gitconfig, .gitmodules, .bashrc, .bash_profile, .zshrc,
       .zprofile, .profile, .ripgreprc, .mcp.json, .claude.json

Dirs:  .git, .vscode, .idea, .claude
```

## Commands That ALWAYS Trigger Prompt

Dangerous interpreters — cannot be auto-approved:

```
python, python3, node, deno, ruby, perl, php, lua,
npx, bunx, bash, sh, ssh, npm/yarn/pnpm/bun run
```

## Why a Bash Command Gets Blocked (Top 10 Causes)

| # | Rule | What Triggers It | Diagnostic |
|---|------|-----------------|------------|
| 1 | BR-BASH-SEC-035 | Control characters (0x00-0x08 etc.) in command | Check for hidden chars: `cat -v` |
| 2 | BR-BASH-SEC-012 | `$()`, `${}`, backticks in unquoted content | Quote all variable expansions |
| 3 | BR-BASH-RO-002 | ANY `$` in tokens after command name | No vars in flag-validated commands |
| 4 | BR-BASH-RO-031 | `cd` AND `git` in same compound command | Split into separate commands |
| 5 | BR-BASH-PERM-004 | PATH, LD_PRELOAD, NODE_OPTIONS in env | These vars are never stripped |
| 6 | BR-BASH-SEC-017 | `$IFS` anywhere in command | IFS manipulation always prompts |
| 7 | BR-BASH-PERM-LIMIT | Compound command with >50 subcommands | Split into smaller commands |
| 8 | BR-PERM-036 | Classifier can't parse response | Internal error — retry |
| 9 | BR-PERM-DENY-002 | 3 consecutive denials for same tool+input | Change approach |
| 10 | BR-PERM-DENY-003 | 4 total denials (any pattern) | Agent blocked entirely |

## Denial Escalation

```
Denial 1-2: Individual denials, agent can try different approach
Denial 3:   Same tool+input 3x → auto-deny future identical calls
Denial 4:   4 total denials → agent blocked entirely
```

## allowedTools Syntax for Headless Mode

```bash
# Allow specific tools
--allowedTools "Read,Write,Glob,Grep"

# Allow Bash with specific commands only
--allowedTools "Bash(ls),Bash(wc),Bash(head),Bash(git status)"

# Allow all file tools + limited bash
--allowedTools "Read,Write,Edit,Glob,Grep,Bash(ls),Bash(cat)"
```

**Note:** `--allowedTools` maps to step 5 (Allowlist Match) in the pipeline. Step 1 (Safety Check) still fires — dangerous files/dirs/interpreters still prompt even with allowedTools.

## Agent Types and Tool Access

| Agent Type | Can use Agent tool? | Can use Write? | Can use Bash? |
|-----------|--------------------:|:--------------:|:-------------:|
| Main Session | Yes | Yes | Yes |
| Async Agent (ant) | Yes | Yes | Yes |
| Async Agent (external) | No | Yes | Yes |
| In-Process Teammate (ant) | Yes | Yes | Yes |
| Coordinator | No | No | No (only Agent, TaskStop, SendMessage) |
