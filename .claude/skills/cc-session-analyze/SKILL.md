---
name: cc-session-analyze
description: "Analyzes Claude Code session recordings (~/.claude/projects/*/*.jsonl) for usage report — skills invoked, tools used, cleanup recommendations."
version: "1.0.0"
owner_squad: claude-code-mastery
sinkra_tier: Tier1
context: inline
agent: general-purpose
user-invocable: true
argument-hint: "[days=14] [output=markdown|json|html]"
maxTurns: 10
---

# CC Session Analyze

Thin wrapper around `squads/claude-code-mastery/scripts/session-usage-report.py` (982 LOC, mature). Surfaces a usage report from Claude Code's own session JSONL recordings at `~/.claude/projects/`.

Cross-repo learning from `aiox-enterprise` (ADR-015): Claude Code already writes full session transcripts. A custom telemetry hook would duplicate that data at ~35-85ms/tool-call overhead. Use the existing CC recordings as canonical source.

---

## When to use

- You want to see which skills / agents / commands you actually used in the last N days
- Auditing session volume, tool frequency, cleanup candidates (unused skills)
- Generating a report for review (markdown inline OR HTML shareable file)
- Validating a design hypothesis ("was /X skill actually invoked?")

## When NOT to use

- If you need per-tool-call latency metrics → this reports event counts, not per-event timing
- If you want live streaming → this is a batch/report tool, not a watcher
- If you want cross-project aggregation with privacy filtering → none exists yet; raw files have full content

---

## Data Source

- **Primary:** `~/.claude/projects/{project-slug}/{session-uuid}.jsonl` — written by Claude Code on every session
- **Secondary:** `git log --since={days}` in `--repo` paths — commit categorization
- **Tertiary:** `.claude/skills/`, `.claude/agents/` — inventory cross-reference to identify unused assets

---

## Usage

```bash
# Default: last 14 days, markdown output to stdout
/cc-session-analyze

# Last 7 days, HTML report file
/cc-session-analyze days=7 output=html

# Last 30 days, JSON for programmatic consumption
/cc-session-analyze days=30 output=json

# Custom project dir (e.g. analyzing another machine's CC recordings)
/cc-session-analyze projects-dir=/path/to/their/.claude/projects
```

---

## Pipeline

### 1. Preflight

Verify the Python script exists:

```bash
test -f "$CLAUDE_PROJECT_DIR/squads/claude-code-mastery/scripts/session-usage-report.py"
```

If missing → abort with instruction to check squad integrity.

### 2. Parse arguments

Extract from `$ARGUMENTS`:
- `days=N` (default 14)
- `output=markdown|json|html` (default markdown)
- `projects-dir=PATH` (default `~/.claude/projects`)
- `html-file=PATH` (only if output=html)

### 3. Invoke the script

Build command with sensible repo-relative defaults:

```bash
REPO="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
python3 "$REPO/squads/claude-code-mastery/scripts/session-usage-report.py" \
  --days "${DAYS:-14}" \
  --output "${OUTPUT:-markdown}" \
  --repo "$REPO" \
  ${PROJECTS_DIR:+--projects-dir "$PROJECTS_DIR"} \
  ${HTML_FILE:+--html-file "$HTML_FILE"}
```

The script handles caching (`session-meta/facet caches`), so re-runs are fast after the first invocation (~1-2min initial, <10s cached).

### 4. Surface results

- **markdown (default):** pipe stdout directly to the user in the conversation. Show the first ~100 lines inline, offer to save if longer.
- **json:** save to `outputs/cc-session-analyze/{YYYYMMDD}-{HHmmss}.json` for programmatic consumption. Show summary count + file path.
- **html:** save to the path specified by `html-file` (or default `outputs/cc-session-analyze/report-{timestamp}.html`). Show file path — user opens in browser.

### 5. Brief summary to user

Regardless of format, always show in the conversation:
- Total sessions analyzed
- Top 5 skills invoked (by count)
- Top 5 tools called (by count)
- Cleanup candidates count (skills/agents not used in the period)
- Output file path if HTML/JSON

---

## Example output (markdown truncated)

```
# Claude Code Session Usage Report — last 14 days

## Summary
- Sessions analyzed: 47 across 3 projects
- Tool calls: 12,341 · User prompts: 892 · /commands: 156

## Top skills invoked
1. /commit (42 invocations)
2. /validate-story-draft (18)
3. /vault-graph (7)
...

## Top tools
1. Edit (4,821)
2. Read (3,102)
3. Bash (2,108)
...

## Cleanup candidates (unused in period)
- Skills: N of 133 unused
- Agents: M of N unused
...
```

---

## Privacy boundary

The script reads **raw CC session JSONL files** — which contain full prompts, responses, and tool I/O. Reports are local-only (`outputs/cc-session-analyze/`). The script does NOT send data anywhere.

If you need to share a report:
- **markdown/html:** review before sharing — may contain snippets of prompts
- **json:** aggregated counts are safe; raw session data is NOT in the JSON output by default

For sensitive projects, run with `--no-cache` to avoid persisting intermediate artifacts.

---

## Dependencies

- Python 3.8+ (script uses stdlib only — no `pip install` needed)
- `git` (for commit categorization when `--repo` is passed)
- `squads/claude-code-mastery/scripts/session-usage-report.py` + 13 sibling modules (all already in repo)

---

## Failure modes

| Symptom | Cause | Fix |
|---------|-------|-----|
| "No session files found" | Wrong `--projects-dir` or CC has rotated files | Verify `ls ~/.claude/projects/` shows session dirs |
| Python traceback | Missing stdlib module (ancient Python) | Upgrade to Python 3.8+ |
| HTML output broken links | `--html-file` path resolution issue | Use absolute path |
| Slow first run | Cache cold start — script indexes all sessions | Expected; subsequent runs < 10s |
| Report shows stale counts | Cache hit on old data | Re-run with `--refresh-cache` |

---

## References

- Script: `squads/claude-code-mastery/scripts/session-usage-report.py` (982 LOC, `--help` for full CLI)
- Supporting modules: `session_usage_report_*.py` (14 files total — cache, facets, HTML, markdown, adapters, pipeline, recommendations, usage, inventory, Claude-adapter, mock-insights)
- ADR on why we avoid building a duplicate telemetry hook: `docs/adrs/ADR-019-cc-session-analyze-adopt-cross-repo.md`
- Cross-repo learning: `aiox-enterprise` repo ADR-015 documents full rationale for pausing a telemetry hook in favor of this analysis path

---

## Change Log

| Date | Actor | Action |
|------|-------|--------|
| 2026-04-18 | oalanicolas + team-lead | Initial skill — replicated from aiox-enterprise (cross-repo parity). Adopts the canonical usage-analysis path via session-usage-report.py. |

---

*cc-session-analyze v1.0.0 — claude-code-mastery squad — Tier 1 inline skill*
