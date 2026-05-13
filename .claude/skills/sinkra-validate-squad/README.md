# /sinkra-validate-squad — 3-Tier SINKRA Squad Validation

Validates any squad against SINKRA methodology using progressive depth tiers: structural checks, 9-dimension LLM scoring, and forensic cross-reference investigation.

## Quick Start

```bash
/sinkra-validate-squad spy                 # Standard (Tier 1+2, ~3min)
/sinkra-validate-squad spy --deep          # Deep (Tier 1+2+3, ~10min)
/sinkra-validate-squad spy --quick         # Quick (Tier 1 only, <30s)
```

## 3-Tier Architecture

```mermaid
graph TD
    START(["/sinkra-validate-squad {name}"]) --> T1

    subgraph "Tier 1: Structural (inline, <15s)"
        T1["7 Parallel Globs<br/>agents, tasks, workflows,<br/>templates, data, checklists, scripts"]
        T1 --> T1B["Read config.yaml<br/>Extract: name, version, entry_agent"]
        T1B --> T1C["Build inventory string"]
        T1C --> GATE1{"Gate: config exists?<br/>>= 1 agent, >= 1 task?"}
    end

    GATE1 -->|FAIL| ABORT(["ABORT: structure broken"])
    GATE1 -->|PASS + quick| DONE_QUICK(["Quick mode: show inventory"])
    GATE1 -->|PASS| T2

    subgraph "Tier 2: Dimensional Scoring (3 parallel agents, ~3min)"
        T2["Load 3 templates<br/>tier2-dim-*.md"]
        T2 --> T2A["Agent dim-1-2-3<br/>Executors + Hierarchy<br/>+ Task-First<br/>(45% weight)"]
        T2 --> T2B["Agent dim-4-5-6<br/>Tokens + Domains<br/>+ Quality Gates<br/>(30% weight)"]
        T2 --> T2C["Agent dim-7-8-9<br/>Mandamentos + Axiomas<br/>+ Infrastructure<br/>(25% weight)"]
    end

    T2A --> CONSOLIDATE["Consolidate:<br/>overall = sum(score * weight)"]
    T2B --> CONSOLIDATE
    T2C --> CONSOLIDATE

    CONSOLIDATE -->|standard| OUTPUT
    CONSOLIDATE -->|deep| T3

    subgraph "Tier 3: Forensic (5 parallel agents, ~5min)"
        T3["Load 5 templates<br/>tier3-xref-*.md"]
        T3 --> T3A["xref-agents<br/>Ghost agents,<br/>orphans"]
        T3 --> T3B["xref-workflows<br/>State machines,<br/>I/O chains"]
        T3 --> T3C["xref-tokens<br/>Registries,<br/>broken refs"]
        T3 --> T3D["xref-templates<br/>Thresholds,<br/>orphans"]
        T3 --> T3E["xref-metadata<br/>Domains,<br/>naming"]
    end

    T3A --> FORENSIC["Consolidate forensic:<br/>severity counts + patterns"]
    T3B --> FORENSIC
    T3C --> FORENSIC
    T3D --> FORENSIC
    T3E --> FORENSIC

    FORENSIC --> OUTPUT

    subgraph "Output"
        OUTPUT["Write artifacts"] --> SC["score-card.yaml"]
        OUTPUT --> CR["compliance-report.md"]
        OUTPUT --> FF["forensic-findings.yaml<br/>(deep only)"]
        OUTPUT --> RP["remediation-plan.yaml<br/>(if not PASS)"]
        OUTPUT --> LL["learning-log.yaml"]
    end

    style START fill:#2d5a27,color:#fff
    style ABORT fill:#8b0000,color:#fff
    style DONE_QUICK fill:#555,color:#fff
    style T2A fill:#1a3a5c,color:#fff
    style T2B fill:#1a3a5c,color:#fff
    style T2C fill:#1a3a5c,color:#fff
    style T3A fill:#4a1a5c,color:#fff
    style T3B fill:#4a1a5c,color:#fff
    style T3C fill:#4a1a5c,color:#fff
    style T3D fill:#4a1a5c,color:#fff
    style T3E fill:#4a1a5c,color:#fff
```

## 9 Dimensions (Tier 2)

Each dimension is scored 0-100 using countable facts, not subjective assessment.

```mermaid
graph LR
    subgraph "Group 1 (45% weight)"
        D1["D1: Four Executors<br/>Human/Agent/Worker/Clone<br/>Weight: 0.15"]
        D2["D2: Compositional Hierarchy<br/>Token>Atom>Molecule>Organism<br/>Weight: 0.15"]
        D3["D3: Task-First / 8 Fields<br/>Mandamento 1+2<br/>Weight: 0.15"]
    end

    subgraph "Group 2 (30% weight)"
        D4["D4: Tokens<br/>9 families, flow<br/>Weight: 0.10"]
        D5["D5: Domains<br/>Strategic/Tactical/Operational<br/>Weight: 0.10"]
        D6["D6: Quality Gates<br/>Numeric thresholds<br/>Weight: 0.10"]
    end

    subgraph "Group 3 (25% weight)"
        D7["D7: 10 Mandamentos<br/>Enforcement mechanisms<br/>Weight: 0.10"]
        D8["D8: Meta-Axiomas<br/>Truth/Completeness/Coherence<br/>Weight: 0.10"]
        D9["D9: Infrastructure<br/>Map, gaps, staleness<br/>Weight: 0.05"]
    end

    D1 --> SCORE["overall = sum(score * weight)"]
    D2 --> SCORE
    D3 --> SCORE
    D4 --> SCORE
    D5 --> SCORE
    D6 --> SCORE
    D7 --> SCORE
    D8 --> SCORE
    D9 --> SCORE

    SCORE --> VERDICT{"Verdict"}
    VERDICT -->|">= 80 + 0 CRIT"| PASS["PASS"]
    VERDICT -->|">= 70"| REVIEW["REVIEW"]
    VERDICT -->|"< 70"| FAIL["FAIL"]

    style PASS fill:#2d5a27,color:#fff
    style REVIEW fill:#8b4513,color:#fff
    style FAIL fill:#8b0000,color:#fff
```

## 5 Forensic Investigators (Tier 3)

Each investigator cross-references files against each other to find inconsistencies the dimension scoring misses.

```mermaid
graph TD
    subgraph "xref-agents"
        XA1["Task Agente field<br/>↔ actual agent files"]
        XA2["Config composition_mapping<br/>↔ filesystem"]
        XA3["Pipeline phases<br/>↔ agent assignments"]
        XA4["Task ID uniqueness"]
    end

    subgraph "xref-workflows"
        XW1["Workflow task_refs<br/>↔ task files"]
        XW2["Checkpoint names<br/>across config/workflow/chief"]
        XW3["Input/output chains<br/>between phases"]
        XW4["parallel_with vs<br/>depends_on contradictions"]
    end

    subgraph "xref-tokens"
        XR1["Token registry<br/>↔ config families"]
        XR2["Data files<br/>↔ instances.paths"]
        XR3["Ecosystem registry<br/>counts ↔ filesystem"]
        XR4["Cross-file path<br/>reference validity"]
    end

    subgraph "xref-templates"
        XT1["Template ↔ task<br/>references"]
        XT2["Checklist thresholds<br/>↔ config thresholds"]
        XT3["Output paths<br/>↔ artifact-classification"]
        XT4["Orphan scripts<br/>detection"]
    end

    subgraph "xref-metadata"
        XM1["Domain: metadata table<br/>↔ standalone line"]
        XM2["atomic_layer<br/>↔ composition_mapping"]
        XM3["8-field schema<br/>naming consistency"]
        XM4["Data file naming<br/>convention"]
    end

    XA1 --> FINDINGS["All findings merged<br/>Deduplicated by location<br/>Counted by severity"]
    XW1 --> FINDINGS
    XR1 --> FINDINGS
    XT1 --> FINDINGS
    XM1 --> FINDINGS

    FINDINGS --> PATTERNS["Structural Patterns<br/>Root cause diagnosis"]

    style FINDINGS fill:#8b4513,color:#fff
    style PATTERNS fill:#8b0000,color:#fff
```

## Comparison Dashboard (Phase 5.0)

Automatically detects previous validation runs and shows delta per dimension.

```mermaid
sequenceDiagram
    participant S as Skill
    participant FS as Filesystem
    participant U as User

    S->>FS: Glob("outputs/squad-validations/{name}/*/score-card.yaml")
    FS-->>S: [run1.yaml, run2.yaml]
    S->>FS: Read latest previous score-card
    S->>S: Calculate delta per dimension

    alt Previous run exists
        S->>U: Show delta table + "What Changed"
    else No previous run
        S->>U: "First validation — no comparison"
    end

    alt Previous used different mode
        S->>U: Note: "Previous was standard, current is deep"
    end
```

```
### Evolution (vs 2026-04-12 15:28)

| Dimension | Previous | Current | Delta | Trend |
|-----------|----------|---------|-------|-------|
| D1        | 72       | 72      | 0     | Stable |
| D5        | 72       | 88      | +16   | handoffs recognized |
| D9        | 55       | 75      | +20   | scoring calibration |
| Overall   | 78.25    | 83.50   | +5.25 | |
```

## Output Impact Classification

Every finding is tagged by real-world impact.

```mermaid
graph TD
    F["Finding"] --> Q1{"Affects real output<br/>or operator experience?"}
    
    Q1 -->|Yes| S["[STRUCTURAL]<br/>ALWAYS fix"]
    Q1 -->|No| Q2{"Raises score<br/>only?"}
    
    Q2 -->|Yes| C["[COSMETIC]<br/>Fix if < 30min"]
    Q2 -->|No| Q3{"Would fix<br/>create new risk?"}
    
    Q3 -->|Yes| X["[COUNTER-PRODUCTIVE]<br/>DO NOT fix"]
    Q3 -->|No| C

    S --> P0["Priority: P0-P1"]
    C --> P2["Priority: P2-P3"]
    X --> DOC["Document as<br/>intentional deviation"]

    style S fill:#8b0000,color:#fff
    style C fill:#8b4513,color:#fff
    style X fill:#555,color:#fff
```

**Role-dependent classification:**
- **FRAMEWORK squads** (sinkra-squad): need ALL governance artifacts
- **GENERATOR squads** (squad-creator): need parseable constraints for output quality
- **OPERATIONAL squads** (spy, books): prose-based rules sufficient when consumed by LLM

## Scoring Methodology (Deterministic)

Scores derived from countable facts, not subjective assessment. Ensures ±3 point stability between runs.

```
Example scoring chain (D1 Four Executors):

  26 tasks total
  ├── 4 canonical types present:       +20 base
  ├── 0 Hybrid/varies:                 +20 (no violations)
  ├── Distribution: Agent=73% (>60%):  -10
  ├── Human=1, Clone=1 (under-rep):    -5
  └── Profile alignment: 24/26:        -3
  
  Score: 100 - 10 - 5 - 3 = 82
```

## Verdict Rules

```mermaid
graph TD
    SCORE["Overall Score"] --> CHECK1{"score >= 80?"}
    
    CHECK1 -->|No| CHECK_FAIL{"score < 70?"}
    CHECK1 -->|Yes| CHECK_DIM{"All dimensions<br/>above minimum?"}
    
    CHECK_DIM -->|Yes| CHECK_CRIT{"0 CRITICAL<br/>findings?"}
    CHECK_DIM -->|No| REVIEW["REVIEW"]
    
    CHECK_CRIT -->|Yes| PASS["PASS"]
    CHECK_CRIT -->|No| REVIEW
    
    CHECK_FAIL -->|Yes| FAIL["FAIL"]
    CHECK_FAIL -->|No| REVIEW

    REVIEW --> MOD{"Deep mode<br/>forensic modifier?"}
    MOD -->|"Any CRITICAL"| CAP["Cannot be PASS<br/>(max REVIEW)"]
    MOD -->|">5 HIGH"| DEGRADE["Degrade one level"]

    style PASS fill:#2d5a27,color:#fff
    style REVIEW fill:#8b4513,color:#fff
    style FAIL fill:#8b0000,color:#fff
```

**Per-dimension status labels:**

| Score vs Minimum | Status |
|------------------|--------|
| score >= minimum | PASS |
| minimum - 20 <= score < minimum | PARTIAL |
| score < minimum - 20 | BELOW FLOOR |
| score < 40 | CRITICAL |

## Next Steps (always displayed)

```mermaid
graph TD
    V["Verdict"] --> VP{"PASS?"}
    VP -->|Yes| NP["No remediation needed.<br/>Run periodically for drift."]
    VP -->|No| VR{"REVIEW?"}
    VR -->|Yes| NR["/sinkra-upgrade-squad {name}"]
    VR -->|No| NF["/sinkra-upgrade-squad {name}<br/>(full 8-phase pipeline)"]

    style NP fill:#2d5a27,color:#fff
    style NR fill:#8b4513,color:#fff
    style NF fill:#8b0000,color:#fff
```

Always ends with a copy-paste command. Zero prose. Zero fatigue.

## When Called by /sinkra-upgrade-squad

The validate pipeline executes identically when called as Phase 1 or Phase 8 of the upgrade skill.

```mermaid
sequenceDiagram
    participant US as /sinkra-upgrade-squad
    participant VS as /sinkra-validate-squad
    participant A1 as Agent dim-1-2-3
    participant A2 as Agent dim-4-5-6
    participant A3 as Agent dim-7-8-9

    US->>VS: Phase 1: "validate {squad}"
    VS->>VS: Tier 1 inventory (inline)
    VS->>A1: Spawn (background)
    VS->>A2: Spawn (background)
    VS->>A3: Spawn (background)
    A1-->>VS: D1=72, D2=92, D3=88
    A2-->>VS: D4=82, D5=72, D6=88
    A3-->>VS: D7=82, D8=78, D9=55
    VS->>VS: Consolidate + Write score-card.yaml
    VS-->>US: baseline_score = 78.25

    Note over US: Phases 2-7 execute...

    US->>VS: Phase 8: "re-validate {squad}"
    VS->>A1: Spawn NEW (background)
    VS->>A2: Spawn NEW (background)
    VS->>A3: Spawn NEW (background)
    A1-->>VS: D1=72, D2=95, D3=88
    A2-->>VS: D4=82, D5=88, D6=85
    A3-->>VS: D7=82, D8=78, D9=75
    VS->>VS: Consolidate + Write score-card.yaml (new timestamp)
    VS->>VS: Comparison dashboard (Phase 1 vs Phase 8)
    VS-->>US: final_score = 83.50, delta = +5.25
```

## Output Files

| File | Tiers | Description |
|------|-------|-------------|
| `score-card.yaml` | 1+2 | Scores, findings, verdict |
| `sinkra-compliance-report.md` | 2 | Human-readable report with tables |
| `forensic-findings.yaml` | 3 | Cross-ref inconsistencies (deep only) |
| `remediation-plan.yaml` | 2 | Wave-prioritized fix plan (if not PASS) |
| `learning-log.yaml` | all | Execution metadata with measured duration |

## Score Stability

```
Run-to-run delta on same squad (no file changes):
  Overall delta < 3: noise (ignore)
  Overall delta 3-10: likely real or calibration shift
  Overall delta > 10: investigate — scoring methodology drift
```

**Confidence calculation:**

| Condition | Confidence |
|-----------|-----------|
| No previous run | MEDIUM |
| delta <= 3 | HIGH |
| 3 < delta <= 8 | MEDIUM |
| delta > 8 | LOW |
| Different mode (standard vs deep) | MEDIUM |

## Results (tested squads)

| Squad | Tasks | Score | Verdict | Duration |
|-------|-------|-------|---------|----------|
| sinkra-squad | 26 | 83.50 | REVIEW | ~13min (deep) |
| squad-creator | 140 | 70.70 | FAIL | ~16min (deep) |
| spy | 42 | 64.25 | FAIL | ~13min (deep) |
| movement | 48 | 37.0 | FAIL | ~10min (standard) |

## Files

| File | Purpose |
|------|---------|
| `SKILL.md` | Skill definition (~780 lines) |
| `README.md` | This documentation |
| `squads/sinkra-squad/templates/validate-squad/tier2-dim-1-2-3.md` | Tier 2 scoring prompt (D1-D3) |
| `squads/sinkra-squad/templates/validate-squad/tier2-dim-4-5-6.md` | Tier 2 scoring prompt (D4-D6) |
| `squads/sinkra-squad/templates/validate-squad/tier2-dim-7-8-9.md` | Tier 2 scoring prompt (D7-D9) |
| `squads/sinkra-squad/templates/validate-squad/tier3-xref-agents-tasks-config.md` | Tier 3 investigator |
| `squads/sinkra-squad/templates/validate-squad/tier3-xref-workflows-checkpoints.md` | Tier 3 investigator |
| `squads/sinkra-squad/templates/validate-squad/tier3-xref-tokens-registries.md` | Tier 3 investigator |
| `squads/sinkra-squad/templates/validate-squad/tier3-xref-templates-scripts.md` | Tier 3 investigator |
| `squads/sinkra-squad/templates/validate-squad/tier3-xref-task-metadata.md` | Tier 3 investigator |
