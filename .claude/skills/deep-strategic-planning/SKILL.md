---
name: "deep-strategic-planning"
description: "Executa o pipeline Deep Strategic Planning para decisões complexas com análise de 14+ futuros usando 12 lentes mentais e scoring metodizado"
version: "1.0.0"
agent: "deep-strategic-planning"
user-invocable: true
maxTurns: 25
---

# Deep Strategic Planning

> *"Quantos futuros voce viu?" - "14.000.605" - "Em quantos vencemos?" - "Um."*
> — Dr. Estranho, Avengers: Infinity War

Pipeline multi-agente para analise estrategica profunda usando Teams com agentes AIOX.

## Overview

```
/deep-strategic-planning "descricao da decisao estrategica"

Phase 1: Crystallize     → @analyst           → 01-crystal.md
Phase 2: Generate        → @analyst           → 02-futures.md
Phase 3: Analyze         → 3× @analyst [PAR]  → 03a/03b/03c.md
Phase 4: Synthesize      → @analyst           → 04-synthesis.md
Phase 5: Action Plan     → @pm                → 05-action-plan.md
```

## Input Collection

Collect from user (use AskUserQuestion if needed):

1. **Decision**: Qual e a decisao estrategica a ser analisada?
2. **Stakes**: O que esta em jogo? (tempo, dinheiro, reputacao, etc.)
3. **Constraints**: Quais sao os limites nao-negociaveis?
4. **Time Horizon**: Em quanto tempo saberemos se deu certo?
5. **Success Definition**: Como medimos sucesso objetivamente?

If the user already provided sufficient context in arguments, skip collection and start directly.

## Setup

### Artifact Directory

Create artifact output directory:

```
outputs/strategic/{slug}/
```

Where `{slug}` is the decision name in snake_case (e.g., `microservices_migration`, `product_launch`).

### Team Creation

```
TeamCreate(team_name: "strategic-{slug}")
```

### Task Creation (with dependencies)

Create 5 sequential tasks:

| ID | Task | Agent | Blocked By |
|----|------|-------|------------|
| 1 | Crystallize - Problem definition and validation | analyst | - |
| 2 | Generate - Futures matrix creation (7-10 scenarios) | analyst | 1 |
| 3 | Analyze - Multi-lens parallel analysis (3 clusters) | 3x analyst | 2 |
| 4 | Synthesize - Ranking, patterns, and "O Um" selection | analyst | 3 |
| 5 | Action Plan - Concrete execution plan with kill switch | pm | 4 |

## AGENT_MAP

```yaml
# Mapeamento: role -> subagent_type
AGENT_MAP:
  analyst: "analyst"
  pm: "pm"
```

## Context Loading (Automatic)

Each AIOX agent wrapper (`.claude/agents/*.md`) automatically loads:
- Git status, branch, permissions
- Gotchas filtered by domain
- Technical preferences
- Project status

**No need to include context loading instructions in prompts** - the wrappers handle it.

## Execution Pattern (CRITICAL)

### How Agent Waiting Works

The `Task` tool has **native blocking behavior** - it automatically waits for the agent to complete before returning. You do NOT need any manual waiting mechanism.

### Sequential Phases (1, 2, 4, 5)

```
# Task tool WITHOUT run_in_background = BLOCKS until agent completes
Task(prompt: "...", subagent_type: "analyst", ...)
# ↑ This line does NOT return until the agent finishes
# ↓ When execution reaches here, the agent is DONE
TaskUpdate(taskId: "X", status: "completed")
```

### Parallel Phase (3 - Multi-Lens Analysis)

```
# Spawn ALL 3 lens cluster agents in a SINGLE message with run_in_background: true
Task(prompt: "Fundamentals cluster...", run_in_background: true)  → returns id_1
Task(prompt: "Consequences cluster...", run_in_background: true)  → returns id_2
Task(prompt: "Durability cluster...", run_in_background: true)    → returns id_3

# Then wait for each using TaskOutput (blocks until agent completes)
TaskOutput(task_id: "id_1", block: true)
TaskOutput(task_id: "id_2", block: true)
TaskOutput(task_id: "id_3", block: true)
```

### NEVER DO THIS (Anti-Patterns)

```
# ❌ WRONG: Sleep loops
Bash("sleep 30")
Bash("sleep 60")

# ❌ WRONG: Polling loops
while not done:
    Bash("sleep 10")
    check_if_file_exists()

# ❌ WRONG: Periodic file checking
Read("output_file")  # hoping it appeared
Bash("sleep 30")
Read("output_file")  # checking again

# ❌ WRONG: Asking teammate for status via SendMessage polling
SendMessage("hey, are you done yet?")

# ❌ WRONG: Scoring without methodology
# Don't make up scores - ALWAYS reference scoring-methodology.md
score = 75  # opinion-based, no justification

# ❌ WRONG: Futures too similar
# Each future must occupy a DIFFERENT cell in the 3x3 matrix
# Don't create variations of the same scenario

# ❌ WRONG: Synthesis without confrontation
# Don't ignore contradictions between lenses
# Must explicitly resolve conflicting assessments

# ❌ WRONG: Vague kill switch
kill_switch = "abandon if things go bad"  # Too vague
# CORRECT: "Abandon if CAC > $50 after 30 days of data"
```

The Task tool handles ALL waiting automatically. Trust the blocking mechanism.

---

## Phase Execution

### Phase 1: Crystallize (@analyst)

Spawn 1 agent via Task tool:
- `subagent_type`: "analyst"
- `team_name`: "strategic-{slug}"
- `name`: "crystallize"
- `mode`: "bypassPermissions"

**Agent prompt:**

```
## Mission: crystallize

## Context
{decision description provided by user}

## Mission
Transform the user's input into a structured problem crystal. This is the foundation
for all subsequent analysis - precision here prevents wasted effort later.

### Required Output Structure (problem_crystal)

```yaml
problem_crystal:
  decision: |
    [REQUIRED: >= 50 characters]
    The specific decision being analyzed, stated as a clear choice between alternatives.
  stakes: |
    [REQUIRED]
    What is at risk? Quantify where possible (time, money, reputation, relationships).
  constraints: |
    [REQUIRED]
    Non-negotiable boundaries that limit possible futures.
  time_horizon: |
    [REQUIRED]
    When will we know if the decision was correct? (weeks, months, years)
  success_definition: |
    [REQUIRED]
    Objective, measurable criteria for success. No vague outcomes.
```

### Validation (Veto Conditions)

Before saving, verify:
- [ ] `decision` is >= 50 characters and clearly states alternatives
- [ ] `stakes` are quantified where possible
- [ ] `constraints` are non-negotiable (not preferences)
- [ ] `time_horizon` is specific (not "soon" or "eventually")
- [ ] `success_definition` is measurable (numbers, not feelings)

**If ANY field is missing or vague**: Use AskUserQuestion to get clarification before proceeding.
Do NOT proceed with incomplete problem_crystal.

### Elicitation Guide

If user input is insufficient, ask about:
- "What are the 2-3 main alternatives you're considering?"
- "What's the worst that could happen if you choose wrong?"
- "What constraints are absolutely non-negotiable?"
- "In 1 year, how will you know this was the right decision?"

## Output
Save complete result to: outputs/strategic/{slug}/01-crystal.md

Format:
# Problem Crystal - {decision name}

## Executive Summary
One paragraph capturing the essence of the decision.

## Structured Crystal
```yaml
problem_crystal:
  decision: ...
  stakes: ...
  constraints: ...
  time_horizon: ...
  success_definition: ...
```

## Decision Statement
A single sentence: "Decide between [A] vs [B] vs [C], where success = [metric], within [timeframe]."

## Validation Checklist
- [x] Decision >= 50 chars
- [x] Stakes quantified
- [x] Constraints non-negotiable
- [x] Time horizon specific
- [x] Success measurable

---
*"Antes de ver 14 milhoes de futuros, o Dr. Estranho precisava saber exatamente o que procurar."*

After saving, send a message to the team lead with:
- The decision statement (1 line)
- Validation status (5/5 or issues found)
```

The Task tool call above **blocks automatically** until the analyst agent completes.
When control returns to you, the agent is done. Then:
1. `TaskUpdate(taskId: "1", status: "completed")`
2. `TaskUpdate(taskId: "2", status: "in_progress")` (unblock next phase)
3. Proceed immediately to Phase 2.

---

### Phase 2: Generate Futures (@analyst)

Spawn 1 agent via Task tool:
- `subagent_type`: "analyst"
- `team_name`: "strategic-{slug}"
- `name`: "generate"
- `mode`: "bypassPermissions"

**Agent prompt:**

```
## Mission: generate-futures

## Input from Previous Phase (Crystal)
Read the file: outputs/strategic/{slug}/01-crystal.md

## Reference: Scoring Methodology
Read: ~/.claude/skills/deep-strategic-planning/references/scoring-methodology.md
Use this for base score assignment based on matrix position.

## Mission
Generate 7-10 distinct futures using the Futures Matrix methodology.

### The Futures Matrix

| Mercado \ Execucao | Perfeita | Mediana | Falha |
|---|---|---|---|
| Favoravel | Futuro 1 Best, 70-80% | Futuro 2 Good, 50-60% | Futuro 3 Waste, 20-30% |
| Neutro | Futuro 4 Solid, 55-65% | Futuro 5 Base, 35-45% | Futuro 6 Bad, 15-25% |
| Adverso | Futuro 7 Survive, 35-45% | Futuro 8 Tough, 20-30% | Futuro 9 Worst, 5-15% |

Add Futuro 10: Black Swan (5-10% base, imprevisto que muda tudo).

### For Each Future, Document:

1. **Name**: Memorable nickname (e.g., "The Unicorn", "The Grind", "The Pivot")
2. **Matrix Position**: [Market Condition] + [Execution Quality]
3. **Base Score**: From scoring-methodology.md based on position
4. **Narrative**: What happens in this future? (2-3 sentences)
5. **Triggers**: Early signals that indicate we're heading toward this future
6. **Key Assumptions**: What must be true for this future to occur?

### Validation (Veto Conditions)

Before saving, verify:
- [ ] >= 7 distinct futures generated
- [ ] Matrix coverage: at least 6 of 9 cells have a future
- [ ] Black Swan future (10th) is present and genuinely unpredictable
- [ ] Each future has unique narrative (no duplicates or near-duplicates)
- [ ] Base scores align with scoring-methodology.md
- [ ] Futures span the full range of outcomes (not clustered in one area)

**If matrix coverage < 6/9**: Generate additional futures to fill gaps.

## Output
Save complete result to: outputs/strategic/{slug}/02-futures.md

Format:
# Futures Matrix - {decision name}

## Matrix Overview
[ASCII matrix showing which cells are populated]

## Futures Catalog

### Future 1: {Name} - [Favorable/Perfect]
- **Base Score**: {X}%
- **Narrative**: ...
- **Triggers**: ...
- **Key Assumptions**: ...

[Repeat for all 7-10 futures]

### Future 10: {Name} - [Black Swan]
- **Base Score**: 5-10%
- **Narrative**: The unexpected event that changes everything...
- **Triggers**: Difficult to predict, but watch for...
- **Key Assumptions**: ...

## Matrix Coverage
- Cells populated: X/9
- Black Swan: Present/Absent

## Validation Checklist
- [x] >= 7 futures
- [x] Matrix 6/9+ cells
- [x] Black Swan present
- [x] No duplicate narratives
- [x] Scores from methodology

---
*"Cada um desses futuros e real, existindo em algum ponto do multiverso."*

After saving, send a message to the team lead with:
- Number of futures generated
- Matrix coverage (X/9)
- Black Swan summary (1 line)
```

The Task tool call above **blocks automatically** until the analyst agent completes.
When control returns to you, the agent is done. Then:
1. `TaskUpdate(taskId: "2", status: "completed")`
2. `TaskUpdate(taskId: "3", status: "in_progress")` (unblock next phase)
3. Proceed immediately to Phase 3.

---

### Phase 3: Multi-Lens Analysis (3× @analyst in PARALLEL)

This phase is **parallel** - spawn 3 agents simultaneously, each analyzing through 4 lenses.

The 12 lenses are grouped into 3 cognitive clusters for efficiency:

| Cluster | Lenses | Focus |
|---------|--------|-------|
| **Fundamentals** | First Principles, Steel Man, Inversion, Via Negativa | Validating logical foundation |
| **Consequences** | Pre-Mortem, Second-Order, Goodhart, Skin in the Game | Analyzing risks and effects |
| **Durability** | Circle of Competence, Lindy Effect, Antifragility, Interdisciplinary | Evaluating longevity |

Spawn 3 agents in parallel via Task tool, all with:
- `subagent_type`: "analyst"
- `team_name`: "strategic-{slug}"
- `mode`: "bypassPermissions"

Each prompt follows this structure:

#### Agent 1: Fundamentals Cluster
- `name`: "lens-fundamentals"
- Lenses: First Principles, Steel Man, Inversion, Via Negativa

**Agent prompt:**

```
## Mission: lens-fundamentals

## Previous Phase Inputs
Read: outputs/strategic/{slug}/01-crystal.md
Read: outputs/strategic/{slug}/02-futures.md

## Reference: Lens Catalog
Read: ~/.claude/skills/deep-strategic-planning/references/lens-catalog.md
Focus on these 4 lenses from Category 1-2:
- First Principles (Aristotle/Musk)
- Steel Man (inverse of Straw Man)
- Inversion (Munger)
- Via Negativa (Taleb)

## Reference: Scoring Methodology
Read: ~/.claude/skills/deep-strategic-planning/references/scoring-methodology.md
Use for score adjustments (-15 to +15 per lens).

## Mission
Apply the 4 FUNDAMENTALS lenses to EACH future from 02-futures.md.

### For Each Future × Each Lens:

1. **Apply lens question** to the future
2. **Generate insight** (1-2 sentences following the lens's Output Pattern)
3. **Assign score adjustment** (-15 to +15) with justification
4. **Note anti-patterns** if the future violates the lens's principles

### Output Format per Future:

```markdown
## Future X: {Name}

### First Principles
- **Question**: "Qual a tese fundamental reduzida aos atomos?"
- **Insight**: {1-2 sentences}
- **Score Adjustment**: +/- X (because...)
- **Anti-Patterns**: {any violations}

### Steel Man
- **Question**: "Qual a versao MAIS FORTE deste argumento?"
- **Insight**: {1-2 sentences}
- **Score Adjustment**: +/- X (because...)
- **Anti-Patterns**: {any violations}

### Inversion
- **Question**: "O que devo EVITAR? Inverta o conselho."
- **Insight**: {1-2 sentences}
- **Score Adjustment**: +/- X (because...)
- **Anti-Patterns**: {any violations}

### Via Negativa
- **Question**: "O que PARAR de fazer? Subtraia, nao adicione."
- **Insight**: {1-2 sentences}
- **Score Adjustment**: +/- X (because...)
- **Anti-Patterns**: {any violations}

### Cluster Summary
- **Total Adjustment**: +/- X
- **Strongest Insight**: ...
- **Biggest Concern**: ...
```

### Validation (Veto Conditions)
- [ ] ALL 4 lenses applied to EACH future
- [ ] All scores in -15 to +15 range
- [ ] Scores have explicit justification (not opinion-based)
- [ ] Output Pattern from lens-catalog.md followed

## Output
Save complete result to: outputs/strategic/{slug}/03a-fundamentals.md

Format:
# Fundamentals Analysis - {decision name}

## Executive Summary
Key insights from the fundamentals cluster across all futures.

## Analysis by Future
[Full analysis for each future using template above]

## Aggregated Scores
| Future | First Principles | Steel Man | Inversion | Via Negativa | Total |
|--------|------------------|-----------|-----------|--------------|-------|
| 1 | +X | +X | -X | +X | +X |
| ... | ... | ... | ... | ... | ... |

---
*"Reduzido aos atomos, o que resta?"*

After saving, send a message to the team lead with:
- Number of futures analyzed
- Total score adjustments range (min to max)
- Top insight from this cluster
```

#### Agent 2: Consequences Cluster
- `name`: "lens-consequences"
- Lenses: Pre-Mortem, Second-Order, Goodhart, Skin in the Game

**Agent prompt:**

```
## Mission: lens-consequences

## Previous Phase Inputs
Read: outputs/strategic/{slug}/01-crystal.md
Read: outputs/strategic/{slug}/02-futures.md

## Reference: Lens Catalog
Read: ~/.claude/skills/deep-strategic-planning/references/lens-catalog.md
Focus on these 4 lenses from Category 3-4:
- Pre-Mortem (Gary Klein)
- Second-Order Thinking (Howard Marks)
- Goodhart's Law (Charles Goodhart)
- Skin in the Game (Taleb)

## Reference: Scoring Methodology
Read: ~/.claude/skills/deep-strategic-planning/references/scoring-methodology.md
Use for score adjustments (-15 to +15 per lens).

## Mission
Apply the 4 CONSEQUENCES lenses to EACH future from 02-futures.md.

### For Each Future × Each Lens:

1. **Apply lens question** to the future
2. **Generate insight** (1-2 sentences following the lens's Output Pattern)
3. **Assign score adjustment** (-15 to +15) with justification
4. **Note anti-patterns** if the future violates the lens's principles

### Output Format per Future:

```markdown
## Future X: {Name}

### Pre-Mortem
- **Question**: "Se isto falhar completamente, o que causou?"
- **Insight**: {1-2 sentences}
- **Score Adjustment**: +/- X (because...)
- **Anti-Patterns**: {any violations}

### Second-Order Thinking
- **Question**: "Quais as consequencias das consequencias?"
- **Insight**: {1st, 2nd, 3rd order effects}
- **Score Adjustment**: +/- X (because...)
- **Anti-Patterns**: {any violations}

### Goodhart's Law
- **Question**: "Se isto virar meta, como se corrompe?"
- **Insight**: {1-2 sentences}
- **Score Adjustment**: +/- X (because...)
- **Anti-Patterns**: {any violations}

### Skin in the Game
- **Question**: "Quem criou isto pratica? Tem risco pessoal?"
- **Insight**: {1-2 sentences}
- **Score Adjustment**: +/- X (because...)
- **Anti-Patterns**: {any violations}

### Cluster Summary
- **Total Adjustment**: +/- X
- **Biggest Risk Identified**: ...
- **Hidden Consequence**: ...
```

### Validation (Veto Conditions)
- [ ] ALL 4 lenses applied to EACH future
- [ ] All scores in -15 to +15 range
- [ ] Scores have explicit justification (not opinion-based)
- [ ] Second-Order shows at least 3 orders of effects
- [ ] Pre-Mortem identifies specific failure cause

## Output
Save complete result to: outputs/strategic/{slug}/03b-consequences.md

Format:
# Consequences Analysis - {decision name}

## Executive Summary
Key risks and consequences identified across all futures.

## Analysis by Future
[Full analysis for each future using template above]

## Aggregated Scores
| Future | Pre-Mortem | Second-Order | Goodhart | Skin in Game | Total |
|--------|------------|--------------|----------|--------------|-------|
| 1 | -X | +X | -X | +X | +X |
| ... | ... | ... | ... | ... | ... |

---
*"A falha que voce nao previu e a que vai acontecer."*

After saving, send a message to the team lead with:
- Number of futures analyzed
- Biggest risk identified
- Future with most negative adjustment
```

#### Agent 3: Durability Cluster
- `name`: "lens-durability"
- Lenses: Circle of Competence, Lindy Effect, Antifragility, Interdisciplinary

**Agent prompt:**

```
## Mission: lens-durability

## Previous Phase Inputs
Read: outputs/strategic/{slug}/01-crystal.md
Read: outputs/strategic/{slug}/02-futures.md

## Reference: Lens Catalog
Read: ~/.claude/skills/deep-strategic-planning/references/lens-catalog.md
Focus on these 4 lenses from Category 5-6:
- Circle of Competence (Buffett/Munger)
- Lindy Effect (Taleb)
- Antifragility (Taleb)
- Conexoes Interdisciplinares (Munger)

## Reference: Scoring Methodology
Read: ~/.claude/skills/deep-strategic-planning/references/scoring-methodology.md
Use for score adjustments (-15 to +15 per lens).

## Mission
Apply the 4 DURABILITY lenses to EACH future from 02-futures.md.

### For Each Future × Each Lens:

1. **Apply lens question** to the future
2. **Generate insight** (1-2 sentences following the lens's Output Pattern)
3. **Assign score adjustment** (-15 to +15) with justification
4. **Note anti-patterns** if the future violates the lens's principles

### Output Format per Future:

```markdown
## Future X: {Name}

### Circle of Competence
- **Question**: "Onde e expert? Onde extrapola alem da competencia?"
- **Insight**: Within/Outside circle: ...
- **Score Adjustment**: +/- X (because...)
- **Anti-Patterns**: {any violations}

### Lindy Effect
- **Question**: "O que vai durar 100 anos? O que e moda passageira?"
- **Insight**: Lindy/Non-Lindy: ...
- **Score Adjustment**: +/- X (because...)
- **Anti-Patterns**: {any violations}

### Antifragility
- **Question**: "Isto melhora com estresse ou quebra?"
- **Insight**: Antifragile/Fragile/Robust: ...
- **Score Adjustment**: +/- X (because...)
- **Anti-Patterns**: {any violations}

### Interdisciplinary
- **Question**: "Que campos nao relacionados validam ou contradizem isto?"
- **Insight**: Parallel in [field]: ... / Contradiction in [field]: ...
- **Score Adjustment**: +/- X (because...)
- **Anti-Patterns**: {any violations}

### Cluster Summary
- **Total Adjustment**: +/- X
- **Durability Assessment**: [Will last / Temporal / Fragile]
- **Cross-Domain Validation**: ...
```

### Validation (Veto Conditions)
- [ ] ALL 4 lenses applied to EACH future
- [ ] All scores in -15 to +15 range
- [ ] Scores have explicit justification (not opinion-based)
- [ ] Circle of Competence clearly distinguishes inside/outside
- [ ] Interdisciplinary references at least 2 different fields

## Output
Save complete result to: outputs/strategic/{slug}/03c-durability.md

Format:
# Durability Analysis - {decision name}

## Executive Summary
Longevity assessment across all futures.

## Analysis by Future
[Full analysis for each future using template above]

## Aggregated Scores
| Future | Circle | Lindy | Antifragility | Interdisciplinary | Total |
|--------|--------|-------|---------------|-------------------|-------|
| 1 | +X | -X | +X | +X | +X |
| ... | ... | ... | ... | ... | ... |

---
*"O que sobreviveu 100 anos provavelmente sobrevivera mais 100."*

After saving, send a message to the team lead with:
- Number of futures analyzed
- Most durable future identified
- Most fragile future identified
```

**Parallel Execution (CRITICAL - follow Execution Pattern above):**

1. Spawn ALL 3 agents in a **single message** using 3 `Task` calls with `run_in_background: true`
2. Collect the 3 `task_id` values returned
3. Use `TaskOutput(task_id: "id", block: true)` for each to wait (blocks until agent completes)
4. After all 3 TaskOutput calls return, all agents are done

Then update tasks:
1. `TaskUpdate(taskId: "3", status: "completed")`
2. `TaskUpdate(taskId: "4", status: "in_progress")` (unblock next phase)
3. Proceed immediately to Phase 4.

---

### Phase 4: Synthesize (@analyst)

Spawn 1 agent via Task tool:
- `subagent_type`: "analyst"
- `team_name`: "strategic-{slug}"
- `name`: "synthesize"
- `mode`: "bypassPermissions"

**Agent prompt:**

```
## Mission: synthesize

## Inputs from ALL Previous Phases
Read ALL files in: outputs/strategic/{slug}/
- 01-crystal.md (problem definition)
- 02-futures.md (scenario catalog)
- 03a-fundamentals.md (lenses 1-4 analysis)
- 03b-consequences.md (lenses 5-8 analysis)
- 03c-durability.md (lenses 9-12 analysis)

## Reference: Scoring Methodology
Read: ~/.claude/skills/deep-strategic-planning/references/scoring-methodology.md
Use for final score calculation and interpretation.

## Mission
Synthesize all lens analyses into a final ranking and identify "O Um" (The One).

### 1. Aggregate Scores

For each future, calculate:
```
Final Score = Base Score (from 02-futures.md)
            + Fundamentals Total (from 03a)
            + Consequences Total (from 03b)
            + Durability Total (from 03c)

Apply caps: Minimum 5%, Maximum 95%
```

### 2. Create Final Ranking

| Rank | Future | Base | Fund. | Cons. | Dur. | Final | Classification |
|------|--------|------|-------|-------|------|-------|----------------|
| 1 | {Name} | X% | +X | +X | +X | Y% | [High/Mod/Low] |
| ... | ... | ... | ... | ... | ... | ... | ... |

### 3. Identify Patterns

- **Success Factors**: What factors appear in multiple high-scoring futures?
- **Failure Factors**: What risks are consistent in low-scoring futures?
- **Lens Agreement**: Where do all 12 lenses converge?
- **Lens Divergence**: Where do lenses contradict each other?

### 4. Resolve Contradictions

For each contradiction between lenses:
- State the conflict: "Lens A says X, but Lens B says Y"
- Analyze root cause: Why do they disagree?
- Resolution: How to reconcile (or which to prioritize and why)

### 5. Select "O Um" - The One

The future with the highest Final Score is the candidate.
But verify:

1. **Gap Check**: Is score > 15% above 2nd place? (Confidence)
2. **Contradiction Resolution**: Are all major conflicts resolved?
3. **Fallback Viability**: Is 2nd place a valid contingency?

If gap < 15%, consider:
- Hybrid approach (combine elements)
- Staged approach (start conservative, evolve)
- Barbell strategy (invest in extremes)

### Validation (Veto Conditions)
- [ ] All futures have final scores calculated
- [ ] "O Um" selection has NUMERIC justification
- [ ] All major contradictions explicitly resolved
- [ ] Scoring formula matches scoring-methodology.md

## Output
Save complete result to: outputs/strategic/{slug}/04-synthesis.md

Format:
# Strategic Synthesis - {decision name}

## Executive Summary
The winning path and why, in 3-5 sentences.

## Final Ranking

| Rank | Future | Base | Fund | Cons | Dur | Final | Class |
|------|--------|------|------|------|-----|-------|-------|
| 1 | ... | ... | ... | ... | ... | ... | ... |

## Score Calculations
[Show math for top 3 futures]

## Emergent Patterns
### Success Factors
### Failure Factors
### Lens Convergence
### Lens Divergence

## Contradiction Resolution
[For each major contradiction]

## "O UM" - THE ONE

> **FUTURO {X}: {NAME}**
>
> Final Score: {Y}%
> Classification: {High Confidence / Moderate / etc.}
> Gap to 2nd Place: {Z}%
>
> ### Why This Is The Path
> 1. {Reason from specific lens/pattern}
> 2. {Reason from specific lens/pattern}
> 3. {Reason from specific lens/pattern}
>
> ### What Must Go Right
> - {Critical success factor}
> - {Critical success factor}
>
> ### Contingency (2nd Place)
> Futuro {Y}: {Name} - ready as fallback if {trigger}

## Validation Checklist
- [x] All futures scored
- [x] "O Um" numerically justified
- [x] Contradictions resolved
- [x] Methodology followed

---
*"Em 14 milhoes de futuros, este e o em que vencemos."*

After saving, send a message to the team lead with:
- "O Um" and its final score
- Gap to 2nd place
- Key contradiction resolved
```

The Task tool call above **blocks automatically** until the analyst agent completes.
When control returns to you, the agent is done. Then:
1. `TaskUpdate(taskId: "4", status: "completed")`
2. `TaskUpdate(taskId: "5", status: "in_progress")` (unblock next phase)
3. Proceed immediately to Phase 5.

---

### Phase 5: Action Plan (@pm)

Spawn 1 agent via Task tool:
- `subagent_type`: "pm"
- `team_name`: "strategic-{slug}"
- `name`: "pm"
- `mode`: "bypassPermissions"

**Agent prompt:**

```
## Mission: action-plan

## Inputs from ALL Previous Phases
Read ALL files in: outputs/strategic/{slug}/
- 01-crystal.md (problem definition with success_definition)
- 02-futures.md (all scenarios for contingency awareness)
- 03a-fundamentals.md, 03b-consequences.md, 03c-durability.md (risk awareness)
- 04-synthesis.md (winning path and contingency)

## Mission
Convert the strategic synthesis into a concrete, actionable plan.

### 1. Immediate Actions (Next 48-72 hours)

List 3-5 specific actions to begin executing "O Um":
- [ ] Action 1: {specific, measurable, assignable}
- [ ] Action 2: {specific, measurable, assignable}
- [ ] Action 3: {specific, measurable, assignable}

Each action must have:
- Owner (who executes)
- Deadline (when)
- Success criteria (how to know it's done)

### 2. Validation Milestones (REQUIRED: >= 3)

| Milestone | Timeframe | Success Signal | Pivot Signal |
|-----------|-----------|----------------|--------------|
| Milestone 1 | Week 1 | {positive indicator} | {warning sign} |
| Milestone 2 | Month 1 | {positive indicator} | {warning sign} |
| Milestone 3 | {from time_horizon} | {success metric from crystal} | {failure metric} |

### 3. Contingency Plan

When to activate the contingency (2nd place future):
- Trigger 1: {specific, measurable condition}
- Trigger 2: {specific, measurable condition}

How to pivot:
- Step 1: {action}
- Step 2: {action}
- Resource implications: {what changes}

### 4. Kill Switch (CRITICAL)

**Abandon this path COMPLETELY if:**
- {Specific condition 1 with numbers/dates}
- {Specific condition 2 with numbers/dates}

Example of GOOD kill switch:
- "CAC exceeds $50 after 30 days of consistent data"
- "Churn rate > 15% for 2 consecutive months"
- "Key team member departure AND no replacement within 3 weeks"

Example of BAD kill switch (DO NOT USE):
- "If things go badly"
- "When we feel it's not working"
- "If the market doesn't respond"

### Validation (Veto Conditions)
- [ ] >= 3 validation milestones defined
- [ ] Kill switch is SPECIFIC (numbers, dates, conditions)
- [ ] Kill switch is NOT vague or feeling-based
- [ ] Immediate actions have owners and deadlines
- [ ] Contingency connects to 2nd place future from synthesis

## Output
Save complete result to: outputs/strategic/{slug}/05-action-plan.md

Format:
# Action Plan - {decision name}
## Path: {O Um - Future Name}

## Executive Summary
This plan executes [Future Name] through [approach summary].

## Immediate Actions (48-72h)
- [ ] **Action 1**: {description}
  - Owner: {who}
  - Deadline: {when}
  - Done when: {criteria}
[Continue for all actions]

## Validation Milestones

| # | Milestone | Timeframe | Success | Pivot |
|---|-----------|-----------|---------|-------|
| 1 | ... | ... | ... | ... |
| 2 | ... | ... | ... | ... |
| 3 | ... | ... | ... | ... |

## Contingency Plan
### Trigger Conditions
### Pivot Actions
### Resource Implications

## Kill Switch

**STOP EVERYTHING AND ABANDON IF:**

1. {Specific condition with numbers}
2. {Specific condition with numbers}

These are non-negotiable exit conditions.

## Resource Requirements
- Team: {who/how many}
- Budget: {if applicable}
- Timeline: {from crystal time_horizon}

## Risk Mitigation
[Key risks from consequences analysis and how to address]

## Validation Checklist
- [x] >= 3 milestones
- [x] Kill switch specific (has numbers)
- [x] All actions have owners
- [x] Connects to synthesis conclusions

---
*"Sabemos o caminho. Agora, execute."*

After saving, send a message to the team lead with:
- Number of immediate actions
- First validation milestone
- Kill switch summary (1 line)
```

The Task tool call above **blocks automatically** until the PM agent completes.
When control returns to you, the agent is done. Then:
1. `TaskUpdate(taskId: "5", status: "completed")`
2. Proceed to Finalization.

---

## Finalization

After Phase 5 completes:

1. **Present summary** to user:
   - Links to all generated artifacts
   - "O Um" and final score
   - First action items
   - Kill switch reminder

2. **Cleanup**:
   - Send structured `shutdown_request` individually to each active agent (NOT broadcast to "*")
   - Wait for shutdown responses, then execute `TeamDelete()` (no params — uses session context; fails if active members remain)

3. **Final summary format**:

```markdown
## Deep Strategic Planning Complete: {decision name}

> *"Em 14 milhoes de futuros, este e o em que vencemos."*

### Generated Artifacts
- `outputs/strategic/{slug}/01-crystal.md` - Problem definition
- `outputs/strategic/{slug}/02-futures.md` - 7-10 scenarios
- `outputs/strategic/{slug}/03a-fundamentals.md` - Lenses 1-4
- `outputs/strategic/{slug}/03b-consequences.md` - Lenses 5-8
- `outputs/strategic/{slug}/03c-durability.md` - Lenses 9-12
- `outputs/strategic/{slug}/04-synthesis.md` - Ranking & "O Um"
- `outputs/strategic/{slug}/05-action-plan.md` - Execution plan

### The Winning Path
**{O Um}: {Future Name}**
- Final Score: {X}%
- Classification: {High Confidence / Moderate / etc.}
- Gap to 2nd: {Y}%

### Start Now
1. {First immediate action}
2. {Second immediate action}

### Kill Switch
{One-line reminder of abandonment condition}

### Next Steps
1. Execute immediate actions (48-72h)
2. Track validation milestones
3. Monitor for pivot signals
4. Review progress at Milestone 1
```

## References

For detailed documentation on the frameworks used:
- `references/lens-catalog.md` - Complete catalog of 12 mental lenses with processes, outputs, and anti-patterns
- `references/scoring-methodology.md` - Probability scoring system with base scores, adjustments, and interpretation

## Implementation Notes

- Each spawned agent runs in its own context (no shared memory)
- Communication between phases is via FILES (not messages)
- The team lead coordinates and ensures quality between phases
- If an agent fails, recreate the task and re-spawn the agent
- Phase 3 agents run in PARALLEL for efficiency (3 clusters simultaneously)
- Always use `mode: "bypassPermissions"` for agents that need to read/write files
- The lens-catalog.md and scoring-methodology.md are the single sources of truth
- Veto conditions are HARD stops - do not proceed if validation fails
- Kill switch must be specific - reject vague conditions
