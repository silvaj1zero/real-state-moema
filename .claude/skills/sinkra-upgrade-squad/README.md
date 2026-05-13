# /sinkra-upgrade-squad — SINKRA-Native Squad Upgrade

Transforms a SINKRA-compliant squad into a SINKRA-native squad via 8-phase pipeline with review-fix loop.

## Quick Start

```bash
/sinkra-upgrade-squad movement          # Full upgrade (default — all waves, all phases)
/sinkra-upgrade-squad spy --wave 2      # Resume from wave 2 (rare)
/sinkra-upgrade-squad db-sage --scope token_bridge  # Only token upgrade vector
```

## Pipeline Overview

```mermaid
graph TD
    START(["/sinkra-upgrade-squad {name}"]) --> P0["Phase 0: Parse + Find History"]
    P0 --> HIST{"Validation<br/>exists < 1h?"}
    HIST -->|Yes| REUSE["Reuse score-card<br/>as Phase 1"]
    HIST -->|No| P1["Phase 1: Run<br/>/sinkra-validate-squad --deep"]
    REUSE --> GATE1{"Score >= 50?"}
    P1 --> GATE1
    GATE1 -->|No| ABORT["ABORT:<br/>Squad too far<br/>from compliant"]
    GATE1 -->|Yes| P2["Phase 2: Gap Diagnosis<br/>(8 dimensions + 3 vectors)"]
    P2 --> P3["Phase 3: SINKRA<br/>Brownfield Mapping"]
    P3 --> GATE3{"PV_BS_001<br/>qa >= 80?"}
    GATE3 -->|VETO| P3
    GATE3 -->|APPROVE| LOOP["Phase 4-7:<br/>Review-Fix Loop"]
    LOOP --> P8["Phase 8: Re-validate<br/>/sinkra-validate-squad --deep"]
    P8 --> GATE8{"Score >= 80<br/>0 CRITICAL?"}
    GATE8 -->|PASS| DONE(["Upgrade Complete"])
    GATE8 -->|FAIL iter < 2| P8
    GATE8 -->|FAIL iter >= 2| ESCALATE["ESCALATE<br/>to user"]

    style START fill:#2d5a27,color:#fff
    style DONE fill:#2d5a27,color:#fff
    style ABORT fill:#8b0000,color:#fff
    style ESCALATE fill:#8b4513,color:#fff
    style LOOP fill:#1a3a5c,color:#fff
```

## Phase 4-7: Review-Fix Loop (QG Pattern)

The core of the upgrade. Two persistent agents (Reviewer + Executor) iterate until PASS or circuit breaker (3 rounds).

```mermaid
sequenceDiagram
    participant TL as Team Lead (inline)
    participant R as Reviewer (persistent)
    participant E as Executor (persistent)

    TL->>R: "Review squad against SINKRA"
    activate R
    R-->>TL: Verdict: FAIL, Score: 55, Findings: [...]
    deactivate R

    loop Max 3 iterations
        TL->>TL: Classify findings<br/>[STRUCTURAL] vs [COSMETIC]
        TL->>E: "Fix these STRUCTURAL items"
        activate E
        E->>E: Read files, Edit, Validate YAML
        E-->>TL: "Fixes applied: 12 files, YAML valid"
        deactivate E

        TL->>TL: npm run validate:yaml:changed
        
        TL->>R: "Re-review modified files"
        activate R
        R->>R: Full re-review (all 9 dimensions)
        R-->>TL: Verdict: REVIEW, Score: 78, Findings: [...]
        deactivate R

        alt Verdict == PASS
            TL->>TL: Break loop
        else Verdict == FAIL && iteration < 3
            TL->>TL: Next iteration
        else Verdict == FAIL && iteration >= 3
            TL->>TL: ESCALATE to user
        end
    end
```

## Full Phase Architecture

```mermaid
graph LR
    subgraph "Phase 0: Setup"
        P0A["Parse args"] --> P0B["Find validation history<br/>(last 3 runs)"]
        P0B --> P0C["Classify scale<br/>(small/large)"]
        P0C --> P0D["Display banner"]
    end

    subgraph "Phase 1: Assessment"
        P1A{"Recent<br/>validate?"}
        P1A -->|Yes| P1B["Reuse score-card"]
        P1A -->|No| P1C["Run /sinkra-validate-squad<br/>3 parallel agents"]
        P1C --> P1D["score-card.yaml<br/>+ remediation-plan.yaml"]
        P1B --> P1E["Gate: score >= 50"]
        P1D --> P1E
    end

    subgraph "Phase 2: Diagnosis"
        P2A["Analyze 8 dimensions"] --> P2B["Define 3 upgrade vectors<br/>V1: Pipeline<br/>V2: Tokens<br/>V3: Composition"]
        P2B --> P2C["Heuristic checks<br/>(AN_KE_085, PV_PA_028, etc)"]
        P2C --> P2D["Prioritize:<br/>persistent > new > resolved"]
    end

    subgraph "Phase 3: Mapping"
        P3A["Brownfield *map-process"] --> P3B["7-phase SINKRA pipeline"]
        P3B --> P3C["Checkpoint PV_BS_001<br/>qa >= 80"]
    end

    subgraph "Phase 4-7: Review-Fix Loop"
        P47A["Spawn Reviewer + Executor"] --> P47B["Reviewer: initial review"]
        P47B --> P47C{"Verdict?"}
        P47C -->|PASS| P47D["Exit loop"]
        P47C -->|FAIL| P47E["Executor: fix STRUCTURAL"]
        P47E --> P47F["YAML validation gate"]
        P47F --> P47G["Reviewer: re-review"]
        P47G --> P47C
    end

    subgraph "Phase 8: Re-validate"
        P8A["Run /sinkra-validate-squad<br/>3 parallel agents"] --> P8B["score-card.yaml v2"]
        P8B --> P8C["Comparison dashboard<br/>Phase 1 vs Phase 8"]
        P8C --> P8D["Gate: SINKRA_QA_GATE<br/>score >= 80, 0 CRITICAL"]
    end

    P0D --> P1A
    P1E --> P2A
    P2D --> P3A
    P3C --> P47A
    P47D --> P8A
```

## Validation History Integration

The upgrade reads the last 3 validation runs to identify persistent, new, and resolved issues.

```mermaid
graph TD
    subgraph "Validation History"
        R1["Run 1: 78.25<br/>FAIL<br/>10 CRITICAL"]
        R2["Run 2: 83.50<br/>REVIEW<br/>4 CRITICAL"]
        R3["Run 3: 83.50<br/>REVIEW<br/>4 CRITICAL"]
    end

    R1 --> ANALYSIS["Diff Analysis"]
    R2 --> ANALYSIS
    R3 --> ANALYSIS

    ANALYSIS --> PERSISTENT["Persistent (2+ runs):<br/>Ghost agents, agent concentration<br/>Priority: P0"]
    ANALYSIS --> RESOLVED["Resolved (in R2 not R3):<br/>Broken paths, phantom tasks<br/>Action: SKIP"]
    ANALYSIS --> NEW["New (only in R3):<br/>Checklist drift<br/>Priority: P1"]

    PERSISTENT --> PHASE2["Phase 2 Diagnosis:<br/>Persistent = P0 priority"]
    RESOLVED --> PHASE2
    NEW --> PHASE2

    style PERSISTENT fill:#8b0000,color:#fff
    style RESOLVED fill:#2d5a27,color:#fff
    style NEW fill:#1a3a5c,color:#fff
```

## Scoring Pipeline (Phase 1 + Phase 8)

Both Phase 1 and Phase 8 use the same 3-agent parallel scoring pipeline from `/sinkra-validate-squad`.

```mermaid
graph TD
    subgraph "Tier 1: Structural (inline)"
        T1A["7 Globs (parallel)"] --> T1B["Read config.yaml"]
        T1B --> T1C["Build inventory string"]
        T1C --> T1D{"Gate: config exists<br/>>= 1 agent, >= 1 task?"}
    end

    subgraph "Tier 2: Dimensional (3 parallel agents)"
        T2A["dim-1-2-3<br/>Executors + Hierarchy<br/>+ Task-First<br/>(45% weight)"]
        T2B["dim-4-5-6<br/>Tokens + Domains<br/>+ Quality Gates<br/>(30% weight)"]
        T2C["dim-7-8-9<br/>Mandamentos + Axiomas<br/>+ Infrastructure<br/>(25% weight)"]
    end

    T1D -->|PASS| T2A
    T1D -->|PASS| T2B
    T1D -->|PASS| T2C

    T2A --> CONSOLIDATE["Consolidate:<br/>overall = sum(score * weight)"]
    T2B --> CONSOLIDATE
    T2C --> CONSOLIDATE

    CONSOLIDATE --> OUTPUT["Write to outputs/squad-validations/<br/>score-card.yaml<br/>remediation-plan.yaml<br/>compliance-report.md"]

    style T2A fill:#1a3a5c,color:#fff
    style T2B fill:#1a3a5c,color:#fff
    style T2C fill:#1a3a5c,color:#fff
```

## Output Impact Classification

Every finding is tagged by real-world impact, not just compliance score.

```mermaid
graph TD
    FINDING["Finding detected"] --> CLASSIFY{"Impact?"}
    
    CLASSIFY -->|STRUCTURAL| S["Affects real output<br/>or operator experience"]
    CLASSIFY -->|COSMETIC| C["Raises score only<br/>No practical impact"]
    CLASSIFY -->|COUNTER-PRODUCTIVE| X["Fix would introduce<br/>new risk or drift"]

    S --> FIX["ALWAYS fix<br/>Priority: P0-P1"]
    C --> MAYBE["Fix only if<br/>cost < 30min"]
    X --> SKIP["DO NOT fix<br/>Document as intentional"]

    style S fill:#8b0000,color:#fff
    style C fill:#8b4513,color:#fff
    style X fill:#555,color:#fff
    style FIX fill:#2d5a27,color:#fff
    style SKIP fill:#555,color:#fff
```

## Agent Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Phase1_Agents: Phase 1 (validate)
    Phase1_Agents --> Die1: Agents complete, die

    Die1 --> Phase4_Reviewer: Phase 4 (review)
    Die1 --> Phase4_Executor: Phase 4 (executor)

    state "Review-Fix Loop" as LOOP {
        Phase4_Reviewer --> FixRequest: Findings
        FixRequest --> Phase4_Executor: SendMessage
        Phase4_Executor --> ReReview: Fixes done
        ReReview --> Phase4_Reviewer: SendMessage
        Phase4_Reviewer --> FixRequest: Still FAIL
        Phase4_Reviewer --> LoopDone: PASS
    }

    LoopDone --> Die2: Agents complete, die

    Die2 --> Phase8_Agents: Phase 8 (re-validate)
    Phase8_Agents --> Die3: Agents complete, die

    Die3 --> [*]

    note right of LOOP
        Reviewer + Executor persist
        across loop iterations (max 3).
        SendMessage for communication.
    end note
```

## Execution Modes

| Mode | Command | Behavior |
|------|---------|----------|
| **Full (default)** | `/sinkra-upgrade-squad spy` | All waves, all phases, re-validate at end |
| **Wave** | `/sinkra-upgrade-squad spy --wave 2` | Only wave 2 items (rare — resume after partial) |
| **Scope** | `/sinkra-upgrade-squad spy --scope token_bridge` | Only V2 upgrade vector |

## Comparison with Other Skills

```mermaid
graph LR
    VS["/sinkra-validate-squad"] -->|"generates"| SC["score-card.yaml<br/>+ remediation-plan.yaml"]
    SC -->|"consumed by"| US["/sinkra-upgrade-squad"]
    US -->|"Phase 8 calls"| VS

    style VS fill:#1a3a5c,color:#fff
    style US fill:#2d5a27,color:#fff
    style SC fill:#8b4513,color:#fff
```

| Aspect | /sinkra-validate-squad | /sinkra-upgrade-squad |
|--------|----------------------|----------------------|
| Purpose | Assess quality | Fix issues + validate |
| Duration | ~10min (deep) | ~20-30min (full) |
| Input | Squad path | Squad path (auto-validates) |
| Output | Score + Report + Plan | Fixes applied + Re-validation |
| Loop | None | Review→Fix→Re-review (max 3x) |
| Agents | 3 scoring + 5 forensic | 3 scoring + 2 persistent (reviewer + executor) |

## Gate Checkpoints

```mermaid
graph LR
    G1["Phase 1 Gate<br/>score >= 50"] --> G3["Phase 3 Gate<br/>PV_BS_001<br/>qa >= 80"]
    G3 --> G47["Phase 4-7 Gate<br/>YAML valid<br/>per round"]
    G47 --> G8["Phase 8 Gate<br/>SINKRA_QA_GATE<br/>score >= 80<br/>0 CRITICAL"]

    style G1 fill:#8b4513,color:#fff
    style G3 fill:#8b4513,color:#fff
    style G47 fill:#8b4513,color:#fff
    style G8 fill:#8b4513,color:#fff
```

## Results (tested squads)

| Squad | Before | After | Delta | Time | Verdict |
|-------|--------|-------|-------|------|---------|
| movement | 37 | 82 | +45 | 27min | PASS |
| db-sage | 55 | 80 | +25 | 10min | PASS |
| copy | 66 | 84 | +18 | 18min | REVIEW |
| sinkra-squad | 78 | 84 | +6 | 13min | REVIEW |

## Files

| File | Purpose |
|------|---------|
| `SKILL.md` | Skill definition (531 lines) |
| `README.md` | This documentation |
| `squads/sinkra-squad/tasks/sinkra-native-upgrade.md` | Task anatomy (8 SINKRA fields) |
| `squads/sinkra-squad/workflows/wf-sinkra-native-upgrade.yaml` | Workflow definition |
| `squads/sinkra-squad/checklists/sinkra-native-upgrade-checklist.md` | Pre/post checklist |
| `squads/sinkra-squad/templates/validate-squad/tier2-dim-*.md` | Scoring agent prompts (Tier 2) |
| `squads/sinkra-squad/templates/validate-squad/tier3-xref-*.md` | Forensic agent prompts (Tier 3) |
