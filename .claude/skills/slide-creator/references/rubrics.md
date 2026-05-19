# Rubrics

Use this reference for QA, critique, scoring, or revision.

## Weighted Score

| Dimension | Weight | Pass |
|---|---:|---:|
| Narrative | 30 | >=85 |
| Editorial design | 25 | >=85 |
| Proof and credibility | 15 | >=80 |
| Didactic clarity | 10 | >=85 |
| CTA/conversion | 10 | >=80 |
| Technical deliverability | 10 | >=80 |

Weighted score:

`sum(dimension_score * weight) / 100`

## Narrative Rubric

Score 0-100:

- Clear belief shift: 20
- Strong governing thought: 15
- Coherent story arc: 20
- MECE structure: 10
- Slide functions move the audience: 20
- Action titles make claims: 15

Failure triggers:

- slide order follows source document order without transformation;
- titles are topic labels;
- multiple slides repeat the same function;
- deck lacks decision, CTA, or audience transformation.

## Editorial Design Rubric

Score 0-100:

- Visual thesis and motif: 15
- Hierarchy and readability: 20
- Density control: 20
- Structure-template fit and layout variety: 15
- Evidence visualization: 15
- Brand depth, not skinning: 15

Failure triggers:

- card wall;
- brand colors applied to weak wireframes;
- unreadable screenshots/charts;
- too many blocks;
- no visual difference between hook, proof, mechanism, and CTA slides.
- slides do not declare structure IDs from the template library.
- important decks skip the key-slide gate before full render.

## Template Fit Rubric

Score 0-100:

- Correct roteiro selected for deck type: 25
- Secondary modules added only when justified: 10
- Every slide declares a structure ID: 20
- Structure fits slide function: 25
- No more than 2 consecutive slides use equivalent structures: 10
- Weak/noisy templates are rejected with rationale: 10

Failure triggers:

- deck sequence is invented despite a matching roteiro template;
- slides use generic cards because no structure was selected;
- structure selection happens after visible copy;
- template is chosen for aesthetics rather than rhetorical job.

## Proof and Credibility Rubric

Score 0-100:

- Claims have evidence or explicit assumption label: 35
- Sources are attributable: 20
- Proof is placed at the right narrative moment: 20
- Examples are specific: 15
- Caveats are visible when needed: 10

## Didactic Clarity Rubric

Score 0-100:

- Concept progression is simple: 25
- Examples support abstraction: 20
- Jargon is controlled: 15
- Speaker notes carry nuance: 15
- Audience can retell the core idea: 25

## CTA / Conversion Rubric

Score 0-100:

- Next action is explicit: 30
- Value of action is clear: 25
- Friction and objection are handled: 20
- CTA timing fits the story: 15
- Follow-up artifact is specified: 10

## Technical Deliverability Rubric

Score 0-100:

- Consistent 16:9 framing: 15
- Export/render target is clear: 10
- Assets are identified: 15
- Accessibility and contrast considered: 20
- Content can be converted to HTML/PPT/Google Slides: 15
- File/package structure is clear: 10
- If PPTX is requested, editability report exists: 15

## Bench Absorption Rubric

Use when the output claims product/runtime capability.

Score 0-100:

- Correct source pattern selected from `bench-absorption-map.md`: 25
- Required artifacts named: 20
- License/risk handled: 15
- QA/reporting contract included: 20
- Scope avoids copying full external product prematurely: 20

## Regression / Forward-Test Rubric

Use when improving a known bad deck or process.

Score 0-100:

- Old failure modes are named with evidence: 20
- Each failure maps to a concrete new gate: 25
- Expected skill outputs are machine-checkable: 20
- Key-slide gate exists before full render: 15
- QA threshold is higher than the previous process: 10
- Remaining gaps are explicit: 10

Failure triggers:

- postmortem stays descriptive and does not become a gate;
- new process can repeat the old bypass;
- visual output is produced before the regression gate;
- success is claimed without thresholds.

## Critique Protocol

Before final answer:

1. Score each dimension.
2. List top 5 issues by severity.
3. Revise the deck spec, not just the wording.
4. Record what changed.
5. If score remains below 85, label as draft and name the blocker.

## QA Report Template

```yaml
qa_report:
  weighted_score: 0
  verdict: "PASS | REVIEW | FAIL"
  scores:
    narrative: 0
    editorial_design: 0
    proof_credibility: 0
    didactic_clarity: 0
    cta_conversion: 0
    technical_deliverability: 0
  killer_issues:
    - ""
  revisions_applied:
    - ""
  residual_risks:
    - ""
```
