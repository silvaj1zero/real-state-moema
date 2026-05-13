# Readiness Checklist — Governance Pipeline (ATM-GP-003)

Pre-pipeline validation. ALL checks must PASS before proceeding.

## Checks

- [ ] **RC-1: Has Decisions** — Input contains at least 1 decision or actionable next_step
- [ ] **RC-2: Source Type Identified** — Input classified as roundtable | handoff | research | sinkra_output
- [ ] **RC-3: No Blocking Vetos** — No V-conditions from input that block pipeline start
- [ ] **RC-4: Has Participants** — At least 1 stakeholder/participant identified

## Scoring

- 4/4 = PASS (proceed to ARCHITECTING)
- 3/4 = WARN (proceed with warning about missing item)
- 2/4 or below = HALT (present missing items, ask user to provide or abort)

## On HALT

Present to user:

```
Governance Pipeline readiness check FAILED.

Missing:
- [ ] {missing items}

Options:
  [1] Provide missing information
  [2] Proceed anyway (with documented risk)
  [3] Abort pipeline
```
