# Regression Test Protocol

Use this reference when improving an existing deck process, testing the skill, or preventing a known failure from recurring.

## Purpose

A regression test converts a bad slide creation process into a reusable quality gate. It answers:

1. What went wrong?
2. What should the skill produce instead?
3. What artifacts prove the process is now better?
4. What must block rendering or delivery?

## When To Use

Use this protocol when:

- the user says a deck “ficou ruim”;
- there is a process log, bad output, or postmortem;
- the skill is being hardened;
- a benchmark has identified best practices that must become gates;
- a deck is important enough that repeating the same error is unacceptable.

## Required Regression Artifact

```yaml
regression_test:
  case_id: ""
  source_inputs:
    - ""
  old_failure_modes:
    - failure: ""
      evidence: ""
      blocked_by_gate: ""
  expected_skill_outputs:
    - "briefing-normalized"
    - "audience-belief-shift"
    - "roteiro-template-selection"
    - "slide-function-map"
    - "slide-structure-selection"
    - "design-direction"
    - "deck-spec"
    - "qa-report"
  key_slide_gate:
    required: true
    slides:
      - "cover"
      - "reframe"
      - "mechanism"
      - "proof/demo"
      - "cta"
  pass_threshold:
    weighted_score: 90
  render_blockers:
    - ""
```

## Hard Gates

- Do not render a full deck before the key-slide gate is defined.
- Do not deliver visual slides without a QA report.
- Do not accept a deck spec where slides lack function, action title, and structure ID.
- Do not treat brand tokens as design quality.
- Do not use an outline as slide sequence unless the roteiro template supports it.

## Forward-Test Output

For a real case, produce:

1. `forward-test.md`: human-readable diagnosis and expected behavior.
2. `forward-test.yaml`: machine-readable gates and thresholds.
3. `revision-notes.md`: what changed in the skill or process.

## Scoring

A regression passes only if:

- the old failure modes are explicitly mapped to new gates;
- the new output has a stronger slide-function map than the old outline;
- key slides are identified before full production;
- QA thresholds are higher than the previous output;
- remaining gaps are named instead of hidden.

