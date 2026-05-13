# Post-Execution Learning

Write to: `.aiox/learning/logs/slide-creator/slide-creator-{deck_slug}-{YYYYMMDD}-{HHmmss}.yaml`

```yaml
schema_version: "1.0"
skill_id: "slide-creator"
timestamp: "{ISO-8601}"
deck_title: "{deck_title}"
deck_slug: "{deck_slug}"
mode: "{interactive|yolo}"
gate_mode: "{hard|advisory}"
skip_narrative: {true|false}
duration_minutes: {N}

phases:
  p00_intake:        {status: completed}
  p01_narrative:     {d01_verdict: approved, mece_pass: true, gap_count: N}
  p02_structure:     {d02_verdict: approved, vertical_test: PASS}
  p03_design:        {d03_verdict: approved, palette: canonical|override, wcag_pass: true}
  p04_specification: {slides: N, spec_words: N}
  p05_qa:            {verdict: PASS, narrative_dim: X, ppteval: Y}
  p06_release:       {deliverables: 5, render_state: materialized|handoff_only}

checkpoint_retries: {N}
deviations_logged: []
errors: []
outcome: "{completed|halted|failed|escalated}"

epilogue:
  what_worked: ""
  what_failed: ""
  confidence: "HIGH|MEDIUM|LOW"
  source_type: "skill_execution"
```
