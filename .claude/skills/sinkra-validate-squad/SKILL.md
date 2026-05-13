---
name: sinkra-validate-squad
description: "3-Tier SINKRA Squad Validation with structural inventory, LLM scoring, and cross-reference investigation. Modes: quick/standard/deep."
version: "2.0.0"
owner_squad: "sinkra-squad"
sinkra_tier: Tier2
context: conversation
agent: general-purpose
user-invocable: true
argument-hint: "<squad-name> [--quick|--deep]"
depends_on: []
invokes: []
---

# SINKRA Validate Squad — 3-Tier Quality Assurance

Validates any squad against SINKRA methodology using a 3-tier progressive architecture.
Each tier adds depth. Agents read ALL files — no truncation, no sampling.

## Usage

```
/sinkra-validate-squad sinkra-squad
/sinkra-validate-squad sinkra-squad --quick
/sinkra-validate-squad sinkra-squad --deep
```

## Architecture: 3 Tiers + Parallel Agents + Task Tracking

Flow: team-lead runs Tier 1 structural inventory with Glob/Read and gates on `config.yaml`, >=1 agent, and >=1 task. Tier 2 runs 3 parallel scoring agents: dim-1-2-3 Executors/Hierarchy/Task-First (45%), dim-4-5-6 Tokens/Domains/Quality Gates (30%), and dim-7-8-9 Mandamentos/Meta-Axiomas/Infrastructure (25%), then consolidates `overall = Σ(score * weight)`. Tier 3 (`--deep`) runs 5 parallel xref agents for agents, workflows, tokens, templates, and metadata, then consolidates severity counts and structural patterns. Output is Score Card + Report written by team-lead.

## MANDATORY EXECUTION RULES (full-sdc enforcement pattern)

**This skill uses the same TeamCreate + SendMessage pattern as /full-sdc.**
Agents are spawned INTO a team, persist across tiers, and communicate via SendMessage.
This ensures compliance — not prose instructions, but tool-enforced structure.

1. **TeamCreate FIRST** — before any agent spawn, create team `"vsq-{squad_name}"`
2. **Tier 1 is a gate** — if structure is broken, do NOT spawn agents
3. **Tier 2 agents use `team_name`** — NOT `run_in_background`. They SendMessage results to team-lead.
4. **Tier 3 agents use `team_name`** — same pattern. SendMessage results.
5. **Inventory is shared** — Tier 1 inventory is prepended to every agent prompt
6. **Templates are the source of truth** — Read from `squads/sinkra-squad/templates/validate-squad/`
7. **TaskUpdate gates each tier** — Tier N TaskUpdate(completed) BEFORE Tier N+1 spawns
8. **Output schema enforced via SendMessage format** — agents MUST SendMessage structured YAML to team-lead

**WHEN CALLED BY ANOTHER SKILL (e.g., /sinkra-upgrade-squad Phase 1 or Phase 8):**
The validate pipeline MUST execute identically — TeamCreate + 3 real Agent() spawns.
Do NOT "simplify" or "estimate" because you are inside another skill's context.
The 3 agents take ~3 minutes. There is no faster alternative. Spawn them.

---

## Phase 0: Parse Arguments (team-lead, inline)

### 0.1 — Extract Arguments + Capture Start Time

```
# Capture start time FIRST (for learning log duration calculation)
start_epoch = Bash("date +%s")  # store this value

squad_name = argument[0]   # e.g., "sinkra-squad"
mode = "standard"          # default
IF "--quick" in arguments: mode = "quick"
IF "--deep" in arguments:  mode = "deep"
squad_path = "squads/{squad_name}/"
```

### 0.2 — Validate Squad Exists

```
Read("squads/{squad_name}/config.yaml")
IF file not found → ABORT: "Squad not found at squads/{squad_name}/"
```

### 0.3 — Display Banner

```
╔═══════════════════════════════════════════════════════════╗
║  /sinkra-validate-squad — {squad_name}                    ║
╠═══════════════════════════════════════════════════════════╣
║  Mode:    {mode} (Tiers: {1|1+2|1+2+3})                  ║
║  Squad:   squads/{squad_name}/                            ║
║  Pipeline:                                                ║
║    Tier 1: Structural Inventory (inline)                  ║
║    Tier 2: 9-Dimension Scoring (3 parallel agents)        ║
║    Tier 3: Forensic Cross-Ref (5 parallel agents)         ║
║    → Consolidation + Report                               ║
╚═══════════════════════════════════════════════════════════╝
```

### 0.4 — Create Team + Tasks (full-sdc pattern)

```
# Create team FIRST — agents will be spawned into this team
TeamCreate(
  team_name: "vsq-{squad_name}",
  description: "SINKRA Validate Squad: {squad_name} ({mode} mode)"
)

# Create visual tasks
TaskCreate(title: "Tier 1: Structural Inventory", description: "Glob + Read to inventory squad filesystem")
IF mode != "quick":
  TaskCreate(title: "Tier 2: 9-Dimension Scoring (3 agents)", description: "Parallel LLM scoring of 9 SINKRA dimensions")
IF mode == "deep":
  TaskCreate(title: "Tier 3: Forensic Cross-Reference (5 agents)", description: "Parallel cross-referential investigation")
TaskCreate(title: "Consolidation: Score Card + Report", description: "Calculate verdict, generate output files")
```

---

## Phase 1: Tier 1 — Structural Inventory (team-lead, inline)

Execute directly — no agent spawn needed. This is lightweight filesystem inspection.

### 1.1 — 7 Parallel Globs (ONE message)

```
Glob("squads/{squad_name}/agents/*.md")
Glob("squads/{squad_name}/tasks/*.md")
Glob("squads/{squad_name}/workflows/*.yaml")
Glob("squads/{squad_name}/templates/**/*")
Glob("squads/{squad_name}/data/*")
Glob("squads/{squad_name}/checklists/*")
Glob("squads/{squad_name}/scripts/*")
```

### 1.2 — Read Config

```
Read("squads/{squad_name}/config.yaml", limit: 200)
Extract: pack.name, entry_agent, status, version
```

### 1.3 — Build Inventory String

Construct this text (will be prepended to all agent prompts):

```
## Squad Inventory (from Tier 1 — trust this, do NOT re-inventory)
Squad: {squad_name} at squads/{squad_name}/
Version: {version}
Entry Agent: {entry_agent}

Agents ({count}): {comma-separated list of filenames}
Tasks ({count}): {comma-separated list of filenames}
Workflows ({count}): {comma-separated list of filenames}
Templates ({count}): {comma-separated list of filenames}
Data ({count}): {comma-separated list of filenames}
Checklists ({count}): {comma-separated list of filenames}
Scripts ({count}): {comma-separated list of filenames}
```

### 1.4 — Gate Check

```
IF config.yaml missing → ABORT("Squad has no config.yaml")
IF 0 agents → ABORT("Squad has no agent files")
IF 0 tasks → ABORT("Squad has no task files")
```

### 1.5 — Quick Mode Exit

```
IF mode == "quick":
  Present inventory table to user
  TaskUpdate(tier1, completed)
  TaskUpdate(consolidation, completed)
  DONE — no further tiers
```

TaskUpdate(tier1, completed)

---

## Phase 2: Tier 2 — 9-Dimension Scoring (3 parallel agents)

### 2.1 — Load Templates

```
Read("squads/sinkra-squad/templates/validate-squad/tier2-dim-1-2-3.md")
Read("squads/sinkra-squad/templates/validate-squad/tier2-dim-4-5-6.md")
Read("squads/sinkra-squad/templates/validate-squad/tier2-dim-7-8-9.md")
```

### 2.2 — Build Prompts

For each template:
1. Replace `{{squad_name}}` with actual squad name
2. Replace `{{squad_path}}` with actual squad path
3. Replace `{{inventory}}` with the inventory string from Phase 1.3

### 2.3 — Spawn 3 Scoring Agents into Team (full-sdc pattern)

Spawn all 3 agents into the team created in Phase 0.4. Each agent MUST SendMessage results to team-lead.
If mode == deep, ALSO Read the 5 Tier 3 templates in the SAME message.

```
Agent(
  name: "dim-1-2-3",
  team_name: "vsq-{squad_name}",
  description: "Score D1 Executors + D2 Hierarchy + D3 Task-First",
  prompt: built_prompt_1_2_3 + "

    When done, SendMessage to 'team-lead' with YAML:
    - dimension_id: four_executors
      score: <0-100>
      findings: [{type: PASS|FAIL|WARN, detail: '...', impact: STRUCTURAL|COSMETIC}]
    - dimension_id: compositional_hierarchy
      ...
    - dimension_id: task_first
      ...",
  run_in_background: true
)
Agent(
  name: "dim-4-5-6",
  team_name: "vsq-{squad_name}",
  description: "Score D4 Tokens + D5 Domains + D6 Quality Gates",
  prompt: built_prompt_4_5_6 + "

    When done, SendMessage to 'team-lead' with YAML (same format as dim-1-2-3).",
  run_in_background: true
)
Agent(
  name: "dim-7-8-9",
  team_name: "vsq-{squad_name}",
  description: "Score D7 Mandamentos + D8 Meta-Axiomas + D9 Infrastructure",
  prompt: built_prompt_7_8_9 + "

    When done, SendMessage to 'team-lead' with YAML (same format as dim-1-2-3).",
  run_in_background: true
)

# Pre-load Tier 3 templates during Tier 2 execution (if deep mode)
IF mode == "deep":
  Read("squads/sinkra-squad/templates/validate-squad/tier3-xref-agents-tasks-config.md")
  Read("squads/sinkra-squad/templates/validate-squad/tier3-xref-workflows-checkpoints.md")
  Read("squads/sinkra-squad/templates/validate-squad/tier3-xref-tokens-registries.md")
  Read("squads/sinkra-squad/templates/validate-squad/tier3-xref-templates-scripts.md")
  Read("squads/sinkra-squad/templates/validate-squad/tier3-xref-task-metadata.md")
```

### 2.4 — Wait for SendMessage from all 3 agents (full-sdc pattern)

Each agent sends results via SendMessage to team-lead. Wait for ALL 3 before proceeding.
Team-lead processes each SendMessage and extracts dimension scores.

**This is the ENFORCEMENT POINT:** You cannot proceed to 2.5 until all 3 agents have sent
their SendMessage. The tool blocks. No estimation, no skipping.

Each agent sends structured YAML per dimension:
```yaml
dimension_id: <id>
score: <0-100>
findings:
  - type: PASS|FAIL|WARN
    detail: "evidence-based finding"
    impact: STRUCTURAL|COSMETIC
    cross_ref: []  # connected dimension IDs (optional)
```

### 2.5 — Calculate Overall Score

```
Weights:
  four_executors: 0.15
  compositional_hierarchy: 0.15
  task_first: 0.15
  tokens: 0.10
  domains: 0.10
  quality_gates: 0.10
  ten_mandamentos: 0.10
  meta_axiomas: 0.10
  infrastructure: 0.05

overall = Σ(dimension_score * weight)
```

TaskUpdate(tier2, completed)

IF mode == "standard": proceed to Phase 4 (Consolidation)

---

## Phase 3: Tier 3 — Forensic Cross-Reference (5 parallel agents) [--deep ONLY]

### 3.1 — Templates Already Loaded (pre-loaded in Phase 2.3)

If deep mode: templates were pre-loaded during Tier 2 execution. Do NOT re-read them.
If standard mode was upgraded to deep mid-execution: Read templates now.

### 3.2 — Build Prompts (same pattern as Tier 2)

Replace `{{squad_name}}`, `{{squad_path}}`, `{{inventory}}` in each template.

### 3.3 — Spawn 5 Investigators (ONE message, ALL parallel)

```
Agent(name: "xref-agents", description: "XRef agents/tasks/config", prompt: ..., run_in_background: true)
Agent(name: "xref-workflows", description: "XRef workflows/checkpoints", prompt: ..., run_in_background: true)
Agent(name: "xref-tokens", description: "XRef tokens/registries/data", prompt: ..., run_in_background: true)
Agent(name: "xref-templates", description: "XRef templates/checklists/scripts", prompt: ..., run_in_background: true)
Agent(name: "xref-metadata", description: "XRef task metadata consistency", prompt: ..., run_in_background: true)
```

### 3.4 — Wait + Collect

Each investigator returns structured YAML:
```yaml
inconsistencies:
  - severity: CRITICAL|HIGH|MEDIUM|LOW
    location: "file:line"
    expected: "what should be"
    found: "what actually is"
    impact: "consequence"
```

### 3.5 — Consolidate Forensic Findings (EXACT — no estimates)

Deduplication rules:
- Two findings with the SAME file:line AND same issue description = 1 finding (keep higher severity)
- Two findings about the SAME root cause but different files = 2 separate findings (group under structural pattern)
- Use `~` prefix NEVER. Count must be EXACT. If unsure, recount.

Consolidation steps:
1. Merge all 5 investigator outputs into one list
2. Sort by severity (CRITICAL first)
3. Deduplicate by location+issue
4. Group connected findings into structural patterns (root cause diagnosis)
5. Count EXACT severities: {critical: N, high: N, medium: N, low: N}

TaskUpdate(tier3, completed)

---

## Phase 4: Consolidation + Report (team-lead, inline)

### 4.1 — Determine Verdict

```
IF mode includes Tier 2:
  PASS:   overall >= 80 AND EVERY dimension >= its minimum threshold (see table below)
  REVIEW: overall >= 70 OR (overall >= 80 BUT any dimension below its minimum)
  FAIL:   overall < 70 OR any dimension < 40

IMPORTANT: A squad scoring 91.25 overall but D7=82 (min=90) is REVIEW, not PASS.
The "no dimension below minimum" rule is NON-NEGOTIABLE. Check EVERY dimension.

IF mode == "deep" (includes Tier 3):
  Any CRITICAL finding → verdict cannot be PASS (max REVIEW)
  > 5 HIGH findings → verdict degrades one level

IF previous run used different mode (e.g., standard vs deep):
  Add note to verdict_rationale: "Previous run was {mode} (no Tier 3). Verdict change
  is partially driven by forensic findings new in deep mode, not necessarily regression."
```

Dimension minimum thresholds:
```
four_executors: 60, compositional_hierarchy: 85, task_first: 85,
tokens: 60, domains: 60, quality_gates: 70, ten_mandamentos: 90,
meta_axiomas: 70, infrastructure: 60
```

Per-dimension status labels (use in report table):
```
score >= minimum_threshold     → PASS
score >= minimum_threshold - 20 AND score < minimum_threshold → PARTIAL
score < minimum_threshold - 20 → BELOW FLOOR
score < 40                     → CRITICAL
```

Example: D3 Task-First minimum=85. Score 72 → 85-72=13 < 20 → PARTIAL. Score 60 → 85-60=25 > 20 → BELOW FLOOR.

### 4.2 — Generate Output Files

```
timestamp = Bash("date +%Y%m%d-%H%M%S")
output_dir = "outputs/squad-validations/{squad_name}/{timestamp}/"
Bash("mkdir -p {output_dir}")

Write("{output_dir}/score-card.yaml")       — MANDATORY: scores + verdict + findings + forensic + remediation
Write("{output_dir}/sinkra-compliance-report.md")  — MANDATORY: human-readable report with tables

NOTE: score-card.yaml is the SINGLE SOURCE OF TRUTH. It contains scores, findings,
forensic data, and remediation items. Do NOT create separate forensic-findings.yaml
or remediation-plan.yaml — all data lives in score-card.yaml.
The compliance-report.md is a human-friendly rendering of the same data.

# Update latest symlink (replaces stale runner symlink)
Bash("ln -sfn {timestamp} outputs/squad-validations/{squad_name}/latest")

# Cleanup empty dirs from failed/incomplete runs
Bash("find outputs/squad-validations/{squad_name} -maxdepth 1 -type d -empty -delete 2>/dev/null || true")
```

### Report Quality Checklist (self-verify before writing)

Before writing the compliance report, verify it includes ALL of these:

```
MUST HAVE (report is incomplete without these):
[ ] Header table with Squad, Path, Mode, Date, Duration, Agents Spawned
[ ] Dimension score table with Score, Min, Weight, Status columns
[ ] Verdict rationale explaining WHY (not just the verdict)
[ ] If deep: Forensic summary table (CRITICAL/HIGH/MEDIUM/LOW counts)
[ ] If deep: Structural patterns with root cause descriptions
[ ] If deep: Top CRITICAL findings with exact file:line
[ ] Remediation waves table (Wave 1-4 with actions and file counts)
[ ] Each finding tagged with impact: [STRUCTURAL] or [COSMETIC]
[ ] Output files section at the end

MUST EXECUTE AFTER WRITING FILES (Phase 5 sub-steps — NON-NEGOTIABLE):
[ ] Phase 5.0: Load previous validation + show comparison dashboard
[ ] Phase 5.1: Present results with dimension table to user
[ ] Phase 5.2: Write learning log with MEASURED duration (date +%s delta)
[ ] Phase 5.4: Display "### Next Steps" — THE LAST THING USER SEES

THE OUTPUT IS NOT DONE UNTIL "### Next Steps" IS DISPLAYED.
If you wrote the files but did not show Next Steps, GO BACK and show them now.

Output files are EXACTLY 2:
  1. score-card.yaml (ALL data: scores, findings, forensic, remediation)
  2. sinkra-compliance-report.md (human-readable rendering)
Do NOT create separate forensic-findings.yaml or remediation-plan.yaml.
```

### 4.3 — Score Card Schema (v2.0)

```yaml
validation:
  squad_name: "{squad_name}"
  squad_path: "squads/{squad_name}/"
  validated_by: "/sinkra-validate-squad v2.0 (pure LLM orchestration)"
  validated_date: "{ISO-8601}"
  mode: "{quick|standard|deep}"
  workflow_version: "2.0.0"

tiers_executed: [1, 2]  # or [1, 2, 3] for deep

scores:
  four_executors:         {score: 0, max: 100, weight: 0.15, findings: []}
  compositional_hierarchy: {score: 0, max: 100, weight: 0.15, findings: []}
  task_first:             {score: 0, max: 100, weight: 0.15, findings: []}
  tokens:                 {score: 0, max: 100, weight: 0.10, findings: []}
  domains:                {score: 0, max: 100, weight: 0.10, findings: []}
  quality_gates:          {score: 0, max: 100, weight: 0.10, findings: []}
  ten_mandamentos:        {score: 0, max: 100, weight: 0.10, findings: []}
  meta_axiomas:           {score: 0, max: 100, weight: 0.10, findings: []}
  infrastructure:         {score: 0, max: 100, weight: 0.05, findings: []}

overall:
  score: 0
  max: 100
  verdict: ""  # PASS | REVIEW | FAIL

forensic:  # only if mode == deep
  severity_counts: {critical: 0, high: 0, medium: 0, low: 0}
  structural_patterns: []
  verdict_modifier: ""

remediation_items:
  - dimension: ""
    finding: ""
    action: ""
    priority: ""  # P0 | P1 | P2 | P3
    wave: 1       # 1=quick, 2=structural, 3=completeness, 4=polish
```

TaskUpdate(consolidation, completed)

---

## Phase 5: Present Results + Learning Log (team-lead, inline)

### 5.0 — Load Previous Validation for Comparison (if exists)

Before presenting results, check for previous validations to enable delta dashboard:

```
# Search for BOTH naming conventions (skill v2.0 uses kebab, runner uses underscore)
skill_runs = Glob("outputs/squad-validations/{squad_name}/*/score-card.yaml")
runner_runs = Glob("outputs/squad-validations/{squad_name}/*/score_card.yaml")
all_runs = skill_runs + runner_runs

Sort by directory name (timestamp). Take the LAST one that is NOT the current run.

IF previous exists:
  Read previous score card (whichever name it has)

  # DETECT FORMAT — runner vs skill v2.0
  IF score card has "scores.final" (integer /10 scale):
    # Runner format (legacy) — convert to /100 scale
    previous_overall = scores.final * 10
    previous_dimensions = {runner dimension names mapped to SINKRA dimensions where possible}
    previous_verdict = scores.verdict  # CONDITIONAL, PASS, FAIL
    NOTE: "Previous run used runner format (/10 scale) — scores converted to /100 for comparison"

  IF score card has "overall.score" (float /100 scale):
    # Skill v2.0 format — use directly
    previous_overall = overall.score
    previous_dimensions = scores.*
    previous_verdict = overall.verdict

  Calculate delta per dimension: current - previous (only for matching dimension names)
  Calculate overall delta: current_overall - previous_overall
  Store as comparison_data for display in 5.1
```

### 5.1 — Display Summary with Comparison Dashboard

```
## Resultado: /sinkra-validate-squad {squad_name} ({mode})

### Overall: {score}/100 — {verdict}
```

**IF previous validation exists, show comparison dashboard:**

```
### Evolucao de Score (vs {previous_date})

| Dimensao | Previous | Current | Delta | Tendencia |
|----------|----------|---------|-------|-----------|
| D1 Four Executors | {prev} | {curr} | {delta:+d} | {explanation if |delta| > 5} |
| D2 Compositional Hierarchy | {prev} | {curr} | {delta:+d} | ... |
| ... | ... | ... | ... | ... |
| **Overall** | **{prev_overall}** | **{curr_overall}** | **{delta:+.1f}** | |
| **Verdict** | {prev_verdict} | {curr_verdict} | | |

### What Changed Between Runs

List any known remediations applied between previous and current validation.
Check git log for commits touching `squads/{squad_name}/` between the two timestamps:
  Bash("git log --oneline --since='{previous_date}' -- squads/{squad_name}/")

If remediation-plan.yaml exists from previous run, check which items were marked done.

### Score Stability Analysis

For EACH dimension where |delta| > 10:
- Is this a real change (files modified) or scoring variance?
- Evidence: cite specific findings that changed between runs
- If variance: note "scoring instability — agents assessed differently despite no file changes"
```

**IF no previous validation exists:**

```
### First Validation

No previous validation found for comparison. Future runs will show delta dashboard.
```

**Then show current results (always):**

```
### Dimension Scores

| Dimensao | Score | Min | Status |
|----------|-------|-----|--------|
| D1 Four Executors | {score} | 60 | {PASS/PARTIAL/BELOW FLOOR} |
| D2 Compositional Hierarchy | {score} | 85 | ... |
| ... | ... | ... | ... |

### Top Remediation Items (P0/P1):
1. [STRUCTURAL] ...
2. [STRUCTURAL] ...
3. [COSMETIC] ...  ← lower priority, only if time permits

### Forensic Summary (if deep):
CRITICAL: {N} | HIGH: {N} | MEDIUM: {N} | LOW: {N}
Structural Patterns: ...

### Output Files:
- outputs/squad-validations/{squad_name}/{timestamp}/score-card.yaml
- outputs/squad-validations/{squad_name}/{timestamp}/sinkra-compliance-report.md
- outputs/squad-validations/{squad_name}/{timestamp}/forensic-findings.yaml  [if deep]
```

### 5.2 — Post-Execution Learning (MANDATORY)

Create learning log at `.aiox/learning/logs/validate-squad/validate-squad-{squad_name}-{timestamp}.yaml`.

**Timing:** Record start_time at Phase 0 (before banner). Record end_time here. Calculate `duration_seconds = end - start`. Do NOT estimate — measure via Bash(`date +%s`) at start and end.

```yaml
schema_version: "1.0"
skill_id: "sinkra-validate-squad"
timestamp: "{ISO-8601}"
squad_name: "{squad_name}"
mode: "{quick|standard|deep}"
start_time: "{ISO-8601}"  # captured at Phase 0
end_time: "{ISO-8601}"    # captured here
duration_seconds: {measured — end_time minus start_time}
tiers_executed: [1, 2, 3]
agents_spawned: {0|3|8}
overall_score: {N}
verdict: "{PASS|REVIEW|FAIL}"
dimension_scores:
  four_executors: {N}
  compositional_hierarchy: {N}
  task_first: {N}
  tokens: {N}
  domains: {N}
  quality_gates: {N}
  ten_mandamentos: {N}
  meta_axiomas: {N}
  infrastructure: {N}
forensic_counts: {critical: 0, high: 0, medium: 0, low: 0}
remediation_applied: false
outcome: "{completed|aborted|failed}"
confidence: "{calculated — see rules below}"
source_type: "skill_execution"
```

**Confidence calculation:**
```
IF no previous run exists: confidence = "MEDIUM" (no baseline to compare)
IF previous run exists AND |overall_delta| <= 3: confidence = "HIGH" (stable)
IF previous run exists AND |overall_delta| > 3 AND |overall_delta| <= 8: confidence = "MEDIUM"
IF previous run exists AND |overall_delta| > 8: confidence = "LOW" (high variance)
IF previous mode != current mode (e.g., standard vs deep): confidence = "MEDIUM" (different scope)
```
```

### 5.3 — Generate Remediation Plan (MANDATORY if verdict != PASS)

If verdict is REVIEW or FAIL, generate a remediation-plan.yaml in the same output directory.
This plan is the CONTRACT between validation and remediation — a future `/sinkra-remediate-squad` skill will consume it.

```
IF verdict != "PASS":
  Write("{output_dir}/remediation-plan.yaml")
```

The remediation plan MUST include:
```yaml
schema_version: "1.0.0"
source_validation: "{output_dir}/score-card.yaml"
pre_remediation_score: {overall_score}
verdict: "{REVIEW|FAIL}"
target_score: 80  # minimum for PASS

waves:
  - id: wave_1
    name: "Quick Fixes (P0)"
    items:
      - id: "W1-01"
        finding_ref: "CRIT-001"  # reference to forensic finding
        action: "description of what to fix"
        files: ["path/to/file"]
        acceptance_criteria: "how to verify the fix"
        estimated_effort: "30min"
    gate: "npm run validate:yaml:changed"

  - id: wave_2
    name: "Structural (P1)"
    items: [...]
    gate: "/sinkra-validate-squad {squad_name} --quick"

  - id: wave_3
    name: "Completeness (P2)"
    items: [...]

  - id: wave_4
    name: "Polish (P3)"
    items: [...]

execution_protocol:
  per_wave: "Execute all items → run gate → if gate passes, advance to next wave"
  final: "/sinkra-validate-squad {squad_name} to measure delta"
```

### 5.4 — Display Next Steps (MANDATORY)

ALWAYS end with actionable next steps. This is NON-NEGOTIABLE — the user must know what to do next.

```
### Next Steps

IF verdict == "PASS":
  Squad is SINKRA-compliant. No remediation needed.
  - Run `/sinkra-validate-squad {squad_name}` periodically to catch drift
  - Remediation plan: not generated (squad passed)

IF verdict == "REVIEW":
  ```
  ### Next Steps
  1. `/sinkra-upgrade-squad {squad_name}`              (8-phase pipeline, consumes this diagnosis)
  
  Plan: {output_dir}/remediation-plan.yaml
  Note: upgrade-squad runs /sinkra-validate-squad --deep as Phase 8 (re-validation built-in).
  ```

IF verdict == "FAIL":
  ```
  ### Next Steps
  1. `/sinkra-upgrade-squad {squad_name}`              (full 8-phase upgrade pipeline)
  
  Plan: {output_dir}/remediation-plan.yaml
  Note: upgrade-squad runs /sinkra-validate-squad --deep as Phase 8 (re-validation built-in).
  ```

Remediation plan: {output_dir}/remediation-plan.yaml

IMPORTANT: The default `/sinkra-upgrade-squad` runs ALL waves in ALL 8 phases. 
The correct Next Steps command is always:
  /sinkra-upgrade-squad {squad_name}
No --wave flag needed. Re-validation is built into Phase 8.
(--wave N exists for rare resume cases but is NEVER the default suggestion.)

### After Remediation (if user executes fixes)

After ANY wave of fixes is applied, ALWAYS suggest re-validation:
"Fixes applied. Re-validate to measure delta: `/sinkra-validate-squad {squad_name} --deep`"

When user says "fix all" or "execute wave N":
1. Execute fixes per wave (P0 first, then P1, then P2)
2. Validate YAML after EACH wave: `node -e "require('js-yaml').load(...)"`
3. After ALL waves complete, re-validate: suggest `/sinkra-validate-squad {squad_name} --deep`
4. If agents were used for fixes, VERIFY their changes with Grep/Read before marking done
```

---

## Output Impact Classification (NON-NEGOTIABLE)

Every finding MUST be classified by its impact on ACTUAL OUTPUT QUALITY, not just compliance score:

```
STRUCTURAL: Gap that impacts real output, operator experience, or downstream consumers
  Example: "No error_handling in wf-create-squad → when pipeline fails mid-execution,
  operator has no recovery path"
  Example: "Generator squad has no composition-rules.yaml → generated squads may
  violate containment rules because generator infers instead of enforcing"
  → ALWAYS remediate

COSMETIC: Gap that raises score but changes nothing in practice
  Example: "Agent lacks swarm.allowed_tools block → agent functions correctly,
  Claude Code has its own guardrails"
  → Remediate only if cost < 30min. Otherwise accept as deviation.

COUNTER-PRODUCTIVE: "Fix" that introduces new risk or doesn't match squad context
  Example: "Duplicate pipeline phases in config.yaml for a squad with 24 workflows
  → creates second source of truth that WILL drift"
  → DO NOT remediate. Document as intentional.

IMPORTANT: Impact classification depends on the ROLE of the squad:
  - FRAMEWORK squads (sinkra-squad): need ALL governance artifacts because they DEFINE rules
  - GENERATOR squads (squad-creator): need composition rules + execution logs because
    their OUTPUT quality depends on having parseable constraints, not just prose
  - OPERATIONAL squads (spy, books): may not need the same depth — prose-based
    rules are sufficient when the squad is consumed by LLM, not by parsers
```

When presenting remediation items, ALWAYS tag each as [STRUCTURAL], [COSMETIC], or [COUNTER-PRODUCTIVE].
The user should never waste time fixing cosmetic gaps when structural gaps remain.

### Gold Standard Comparison (optional Tier 4)

When the user asks "compare with X" or "where does this squad peca compared to Y":
1. Read the reference squad's config.yaml, agents, data files
2. Compare structurally: what does reference have that target lacks?
3. For EACH gap, apply the Output Impact Classification above
4. Present only STRUCTURAL gaps as actionable — flag COSMETIC and COUNTER-PRODUCTIVE honestly

The reference squad for SINKRA methodology is `squads/sinkra-squad/` (gold standard).

## Score Stability Guidelines

Tier 2 agents are stochastic — scores may vary ±5-8 points between runs on the same squad.
To minimize variance:
- Agents MUST cite specific file:line evidence for every FAIL/WARN finding
- Scoring should be based on COUNTABLE facts (e.g., "36/140 tasks missing field" = 74%) not subjective assessment
- If two consecutive runs differ by > 10 points on ANY dimension, investigate: the squad changed, or the scoring was subjective

When comparing runs:
- Overall delta < 3 points = noise (ignore)
- Overall delta 3-10 points = likely real improvement or regression
- Overall delta > 10 points = either significant changes applied or scoring methodology drift

---

## Error Handling

### ABORT Conditions (pipeline stops immediately)

| Condition | Phase | Action |
|-----------|-------|--------|
| Squad not found | 0 | ABORT before any tier |
| config.yaml missing | 1 | ABORT after inventory |
| 0 agents or 0 tasks | 1 | ABORT after inventory |
| Agent spawn failure | 2/3 | Degrade: skip failed tier, report based on available tiers |
| Agent timeout | 2/3 | Degrade: skip timed-out agent, score with partial data |

### Recovery

On any agent failure:
- Other parallel agents continue
- Partial results are consolidated — missing dimensions show as "N/A"
- Learning log records the failure

### Phase 6: Shutdown (full-sdc pattern)

After all outputs are written and Next Steps displayed:

```
# Team cleanup — prevents orphan teams accumulating across sessions
# The team was created in Phase 0.4 and agents were spawned into it
# After consolidation is complete, the team is no longer needed
```

This happens automatically when the conversation ends, but explicit awareness
prevents confusion if the skill is called multiple times in the same session.

### Circuit Breakers

| Breaker | Limit | Action |
|---------|-------|--------|
| Agent timeout | 5 min per agent | Skip agent, use partial results |
| Total execution | 15 min | Force consolidation with available data |

---

## Comparison with Existing Tools

| Tool | What It Does | What This Adds |
|------|-------------|----------------|
| `sinkra-validate.sh` (runner) | Deterministic checks + 3 Haiku rubrics (truncated 5KB) | Full-file deep reads, 9 dimensions, forensic cross-refs |
| `*validate-squad` (chief command) | Delegated to this skill | This IS the skill |
| `/full-sdc` | Story lifecycle orchestration | Same Agent() pattern but for squad validation, not stories |

---

## References

- **Prompt templates:** `squads/sinkra-squad/templates/validate-squad/` (8 files)
- **Task anatomy:** `squads/sinkra-squad/tasks/validate-sinkra-squad.md` (v2.0)
- **Workflow:** `squads/sinkra-squad/workflows/sinkra-validation.yaml` (v2.0)
- **Runner (CI only):** `squads/sinkra-squad/scripts/sinkra-validate.sh --no-remediation`
- **Session origin:** 2026-04-12 forensic analysis that found 72 inconsistencies in sinkra-squad
