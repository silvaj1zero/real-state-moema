# Narrative Patterns

Use this reference when creating a persuasive, educational, strategic, sales, webinar, pitch, or board deck.

## Core Principle

An outline organizes information. A presentation changes belief. Convert source material into audience movement before writing slides.

## Belief Shift Template

```yaml
audience_belief_shift:
  audience: ""
  current_belief: ""
  desired_belief: ""
  resistance: ""
  proof_needed:
    - ""
  final_action: ""
```

## Deck Type Patterns

### Sales / Webinar

Use when the goal is demand creation, offer presentation, or conversion.

Arc:

1. Hook: name the expensive misconception.
2. Reframe: show why the old path is failing.
3. Stakes: quantify cost of inaction.
4. Mechanism: reveal the new operating model.
5. Proof: demo, case, artifact, before/after, data.
6. Path: show implementation steps.
7. Offer/CTA: make the next action obvious.

Recommended length: 12-16 slides for a focused webinar, 8-12 for a short sales deck.

### Executive / Board

Arc:

1. Executive answer first.
2. Context and decision required.
3. Performance facts.
4. Drivers.
5. Options.
6. Recommendation.
7. Risks and asks.

Use action titles with consequence and decision language.

### Teaching / Course

Arc:

1. Learning promise.
2. Mental model.
3. Worked example.
4. Practice or application.
5. Common mistakes.
6. Checklist.
7. Next action.

Favor clarity and retention over persuasion.

### Product / Strategy Pitch

Arc:

1. Market or user tension.
2. Existing alternatives fail.
3. Product thesis.
4. Mechanism or workflow.
5. Evidence.
6. Business model or rollout.
7. Ask.

## Slide Functions

Every slide must declare exactly one primary function:

| Function | Purpose |
|---|---|
| `hook` | Capture attention with a high-signal claim |
| `reframe` | Replace the audience's old model |
| `diagnosis` | Explain why the current problem persists |
| `stakes` | Quantify cost, upside, urgency, or risk |
| `contrast` | Compare old vs new, before vs after, option A vs B |
| `mechanism` | Explain how the proposed system works |
| `proof` | Make a claim credible through evidence |
| `demo_setup` | Prepare audience to understand a live or visual demo |
| `artifact_reveal` | Show the concrete asset, workflow, map, or system |
| `objection_handling` | Address likely resistance |
| `decision` | Force a choice or recommendation |
| `cta` | Drive the next action |
| `appendix` | Support detail, not core narrative |

Avoid `explain_topic` as a function. If a slide only explains a topic, merge, rewrite, or move to appendix.

## Action Title Rules

An action title must make a claim. Good titles include:

- what changed;
- why it matters;
- who is affected;
- magnitude, timing, or implication when available.

Weak: `Market Overview`

Strong: `AI service demand is rising, but buyers still reject vague automation pitches`

## Compression Rules

- One source section does not equal one slide.
- Merge consecutive slides with the same function.
- Move detail-heavy explanation to speaker notes or appendix.
- Prefer one strong artifact over five generic bullets.
- If a deck exceeds 18 slides, justify why the audience needs that many moments.
