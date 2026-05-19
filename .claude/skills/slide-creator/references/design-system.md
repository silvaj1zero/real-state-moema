# Design System

Use this reference before drafting visible slide content or when improving a weak deck.

## Design Direction Template

```yaml
design_direction:
  visual_thesis: ""
  audience_feel: ""
  format: "16:9"
  grid: ""
  type_scale:
    title: ""
    body: ""
    label: ""
  palette:
    background: ""
    text: ""
    accent: ""
    support: []
  motifs:
    - ""
  layout_rules:
    - ""
  density_limits:
    default_visible_words: 45
    max_blocks_per_slide: 4
  anti_patterns:
    - ""
```

## Editorial Design Principles

1. Start with hierarchy, not decoration.
2. Make the audience see the claim before reading details.
3. Use whitespace as structure.
4. Keep repeated components consistent, but vary composition by narrative function.
5. Treat charts, diagrams, matrices, demos, and screenshots as primary evidence, not ornaments.
6. Never use brand colors as superficial skin when the composition is weak.

## Layout Patterns

For full template selection, use `slide-structure-library.md`. The table below is only a compact starter set.

| Pattern | Use For | Avoid When |
|---|---|---|
| Big claim + proof artifact | Hook, proof, decision | Claim is vague |
| Split contrast | Before/after, old/new | More than 2 comparison axes |
| Mechanism diagram | Process, system, model | Steps are not causal |
| Evidence wall | Case proof, testimonials, logos | Sources are weak |
| Matrix | Prioritization, positioning | Axes are unclear |
| Timeline | Phases, rollout | No sequence or dates |
| Scorecard | Evaluation, benchmark | Too many metrics |
| Demo frame | Product/process walkthrough | Screenshot is unreadable |
| CTA panel | Offer, next step | CTA is not specific |

## Density Rules

- Default: <=45 visible words per slide.
- Title: <=16 words.
- Body blocks: <=4.
- Bullets per block: <=3.
- No paragraph should exceed 2 lines.
- Speaker notes can hold nuance; slide surface carries the argument.

## Layout Variety Rule

No more than 2 consecutive slides with the same layout pattern unless the repetition is intentionally used as a sequence, such as `three objections` or `three proof cases`.

## Typography Rules

- Use a clear type hierarchy: title, subhead, body, label, metadata.
- Do not use tiny explanatory text as a crutch.
- Do not rely on all caps for long content.
- If a slide needs text smaller than 18px in 16:9, it is too dense for presentation.

## Visual Quality Checks

Ask:

1. Can the audience identify the main claim in 3 seconds?
2. Does the layout express the slide function?
3. Does the visual system create memory, not just decoration?
4. Is any element present only because the slide looked empty?
5. Would the slide still work in a live room from the back row?
