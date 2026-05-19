---
name: slide-creator
description: "Self-contained narrative-first presentation deck creation skill. Use when Codex needs to create, improve, critique, or rewrite slide decks from a briefing, outline, document, webinar script, workshop, pitch, sales narrative, board update, course, or rough notes. Produces a complete deck package with narrative arc, slide-function map, design direction, slide-by-slide spec, speaker notes, QA report, and optional HTML-ready slide content without requiring the SINKRA monorepo or external squad files."
version: "1.0.0"
owner_squad: slides-creator
user-invocable: true
---

# Slide Creator

Create presentation decks as directed narrative experiences, not outline dumps. Optimize first for story, audience belief shift, editorial design, proof, and clarity. Export format is secondary.

This skill is self-contained. Do not require `squads/slides-creator`, external agents, SINKRA tasks, or private repo files. Use bundled templates and references only when needed.

The evolved slides-creator squad patterns have been absorbed as bundled contracts. Treat `templates/runtime/workflow-modes.yaml`, `templates/deck/playbook-routing.yaml`, `templates/runtime/story-arc-contract.yaml`, `templates/runtime/slide-function-map-contract.yaml`, `templates/runtime/design-direction-contract.yaml`, `templates/qa/squad-quality-rubric.yaml`, and `templates/theme/design-philosophy-routing.yaml` as the local source of truth.

## Operating Rule

Never render or draft slides directly from an outline. First produce:

`briefing -> thesis -> story arc -> slide-function map -> design direction -> deck spec -> critique -> revision -> QA`

If a user asks for quick slides, compress the workflow, but keep the narrative and design gates.

If the user provides a bad prior deck, process log, benchmark, or says a previous slide process was weak, create a regression/forward-test before generating a new full deck. The goal is to prevent the exact failure from recurring.

## Quick Workflow

1. **Normalize briefing**
   Extract audience, objective, context, constraints, source material, required CTA, tone, format, and unknowns.
   Select a workflow mode from `templates/runtime/workflow-modes.yaml` so quick asks stay light and shareable/exportable decks get full contracts.

2. **Define belief shift**
   State what the audience currently believes, what they must believe by the end, and what proof will move them.

3. **Build story arc**
   Use a narrative structure suited to the deck type. Default for persuasive decks:
   `reframe -> tension -> stakes -> mechanism -> proof -> plan -> CTA`.
   For full decks, follow `templates/runtime/story-arc-contract.yaml`.

4. **Create slide-function map**
   Each slide must have one primary function such as hook, diagnosis, contrast, proof, mechanism, demo setup, offer, objection handling, decision, or appendix. Merge slides with duplicate function unless repetition is intentional.
   Each slide also needs an `audience_movement`; "explicar/apresentar/mostrar tópico" is a blocker, not a function.

5. **Select canonical templates**
   Load `templates/index.yaml` first. Select workflow mode, deck playbook, deck template, slide-function templates, visual templates, theme profile, research route, import pipeline, runtime job, rendered-eval contract, and QA gates before drafting content. For key slides, produce a template-selection report with rejected runners-up and deck-specific rejection reasons. Use `references/template-selection-guide.md`, `references/roteiro-template-library.md`, and `references/slide-structure-library.md` only as explanatory backup.

6. **Apply bench-derived capabilities**
   Load `templates/index.yaml`, then the relevant files under `templates/research/`, `templates/import/`, `templates/runtime/`, `templates/visual/`, `templates/eval/`, and `templates/qa/` when the user asks for PPTX, API, MCP, local models, prompt-to-edit, diagrams, research, sharing, import/export, rendered QA, or product/runtime design. Use `references/bench-absorption-map.md` for rationale.

7. **Define design direction**
   Choose visual thesis, grid, type scale, density limits, motifs, layout variety, chart style, and anti-patterns before writing slide content.
   Use `templates/runtime/design-direction-contract.yaml`; design direction must define density limits, variation rules, composition rules, and audience context before slide copy.

7.5. **Lock execution**
   For full decks or any PPTX/exportable deck, produce `render-lock.yaml` before rendering/exporting. Treat it as the execution source of truth for colors, fonts, chart palette, image style, visual composition, forbidden features, and asset status.

8. **Draft deck spec**
   Produce one spec per slide with action title, function, key message, layout, visible copy, visual treatment, speaker notes, evidence, and QA checklist.

9. **Run key-slide gate**
   For important decks, draft and critique the 5 decisive slides before full production: cover, reframe, mechanism, proof/demo, and CTA. If these fail, revise the deck spec before rendering the rest.

10. **Critique before delivery**
   Run narrative, design, proof, clarity, CTA, and technical checks. Revise once before showing final output.

11. **Package**
   Deliver a deck package: `briefing-normalized`, `story-arc`, `slide-function-map`, `design-direction`, `deck-spec`, `speaker-notes`, `qa-report`, and optional HTML-ready slides.

12. **Use deterministic helpers when writing files**
   When producing reusable artifacts, prefer bundled scripts over hand-built repetitive output:
   `scripts/build_template_examples.py`, `scripts/build_evidence_ledger.py`, `scripts/run_regression_fixtures.py`, `scripts/validate_rendered_eval.py`, `scripts/validate_runtime_contracts.py`, `scripts/validate_deck_package.py`, `scripts/validate_design_mastery.py`, `scripts/validate_design_capability.py`, `scripts/validate_narrative_capability.py`, `scripts/validate_narrative_design_capability.py`, `scripts/validate_runtime_gap_capability.py`, `scripts/validate_delivery_capability.py`, `scripts/check_pptx_placeholders.py`, and `scripts/validate_chart_data.py`.

## Decision Tree

- If the user provides only a topic, ask up to 3 missing questions unless they requested speed. Minimum needed: audience, desired outcome, slide count/time.
- If the user provides a long document, load `templates/import/document-extraction.yaml`, then extract sections, metadata, claims, evidence, tables, and media; do not preserve document order by default.
- If the user provides a bad deck, diagnose against `references/rubrics.md`, then produce a revised slide-function map before rewriting.
- If the user asks for design improvement, load `references/design-system.md`.
- If the user asks for a full deck artifact, load `references/output-contracts.md`, plus `templates/runtime/export-contract.yaml` when a real file export is expected.
- If deciding how heavy the process should be, load `templates/runtime/workflow-modes.yaml`.
- If choosing the presentation scenario, load `templates/deck/playbook-routing.yaml`.
- If the deck is sales/webinar/pitch, load `references/narrative-patterns.md`.
- If selecting deck sequence, load `references/roteiro-template-library.md`.
- If selecting per-slide structure, load `references/slide-structure-library.md`.
- If choosing among many templates or avoiding repetition, load `references/template-selection-guide.md`.
- If the user asks for a full deck, benchmark deck, sales deck, webinar, VSL, offer deck, board update, financial deck, product strategy deck, or deck rewrite, load `templates/index.yaml`.
- If the deck depends on factual research, source selection, motion media, scholar evidence, or local files, load `templates/research/source-routing.yaml`.
- If factual claims, benchmarks, market statements, financial numbers, case studies, or technical comparisons appear, load `templates/research/evidence-ledger.yaml`.
- If importing or deriving behavior from existing PPTX/template families, load `templates/import/induced-layout-packs.yaml`.
- If importing a concrete PPTX template or brand deck, load `templates/import/pptx-template-manifest.yaml` and produce a template import report before promising fidelity.
- If matching a known source deck family without relying on external repos, load `templates/import/source-deck-fixtures.yaml` and select the closest fixture pack before selecting visual templates.
- If claiming best-in-class template import or brand deck replication, load `templates/import/template-import-regression-corpus.yaml`; the claim must map to source-family cases and fidelity checks.
- If user asks for local models, BYOK, Ollama, LM Studio, OpenAI-compatible APIs, image providers, or privacy-preserving generation, load `templates/runtime/provider-routing.yaml`.
- If the deck is research-heavy, technical, strategic, educational, or the prior process failed from outline-to-slide literalism, load `templates/runtime/manuscript-pipeline.yaml`.
- If building a story arc, load `templates/runtime/story-arc-contract.yaml`.
- If claiming narrative superiority or improving a weak deck process, load `templates/runtime/narrative-regression-corpus.yaml` and map the deck to a narrative case with an executable failure test.
- If creating or validating a slide-function map, load `templates/runtime/slide-function-map-contract.yaml`.
- If moving from narrative/design into renderable execution, load `templates/runtime/storyboard-render-bridge.yaml` before export or implementation.
- If the deck quality depends on premium narrative + design fit, load `templates/runtime/narrative-design-moment-grammar.yaml` and assign a moment archetype to every key slide.
- If defining visual direction, load `templates/runtime/design-direction-contract.yaml`.
- If the goal is premium visual quality, brand fidelity, imported template replication, or "gabaritar Design", load `templates/visual/design-mastery-contract.yaml` and treat Design as a measurable release gate, not subjective taste.
- If the goal is brand fidelity, matching a reference deck, or closing Design benchmark gaps, load `templates/visual/brand-fidelity-playbooks.yaml` and produce a brand fidelity report before claiming template/brand replication.
- If explaining or updating Design benchmark scores, load `templates/runtime/design-score-evidence.yaml` and cite the concrete evidence behind each score band.
- If claiming theme/runtime superiority, load `templates/runtime/theme-runtime-snapshot-suite.yaml` and verify that tokens reach charts, diagrams, tables, media, metadata, and export fallbacks.
- If `design-mastery-contract.yaml` is selected, produce `brand-template-manifest.yaml`, `design-mastery-report.yaml`, `key-slide-render-review.yaml`, and `visual-regression-checklist.yaml`; run `scripts/validate_design_mastery.py` before final delivery when files exist.
- Use `examples/design-100-fixture/` as the minimum passing reference for Design 100 package shape and evidence depth.
- If the visual brief is weak and there is no brand/reference/imported template, load `templates/theme/design-philosophy-routing.yaml`.
- If slide templates must guide the model directly, load `templates/runtime/template-example-routing.yaml`.
- If selected slide templates must be injected into a prompt, run `scripts/build_template_examples.py` where practical.
- If selecting templates for key slides or charts, load `templates/runtime/template-selection-report.yaml` and record rejected runners-up.
- If the deck is long, exported, branded, image-heavy, or PPTX-bound, load `templates/runtime/render-lock.yaml`.
- If speaker notes, recorded delivery, narration, video, async pitch, or webinar replay matter, load `templates/runtime/speaker-notes-narration-contract.yaml`.
- If improving non-design/non-narrative benchmark gaps, load `templates/runtime/runtime-gap-absorption-corpus.yaml` and do not raise runtime scores without acceptance artifacts.
- If the deck must be shared, handed off, published, analyzed, or packaged for another person/tool, load `templates/runtime/delivery-package-contract.yaml` and produce `delivery-manifest.yaml`.
- If the process must run as CLI, API, MCP, batch, or reusable automation, load `templates/runtime/api-mcp-cli-contract.yaml`; CLI/API/MCP must share the same job-state semantics.
- If the process is resumable, batched, exposed as CLI/API/MCP, or has export tasks, load `templates/runtime/job-state.schema.yaml` and produce `job-state.yaml`.
- If multiple sources, older decks, imported templates, memory, or process logs can conflict, load `templates/runtime/source-of-truth-policy.yaml`.
- If editing an existing deck or producing prompt-to-edit output, load `templates/runtime/edit-history.yaml`.
- If editing should preserve story, visual rhythm, selected regions, or render-lock, load `templates/runtime/storyboard-edit-contract.yaml` before applying the edit.
- If the slide process must be audited, shared, debugged, or improved across runs, load `templates/runtime/trace-handoff.yaml`.
- If the deck needs generated images, hero scenes, visual concepts, or internal image composition, load `templates/visual/ai-image-type-routing.yaml` and `templates/visual/composition-patterns.yaml`; separate image type from slide layout and declare Primary + Modifier composition.
- If the deck includes chart datasets or a chart editor contract, load `templates/visual/chart-data-contracts.yaml`; run `scripts/validate_chart_data.py` where practical.
- If the deck needs architecture diagrams, sequence diagrams, mathematical figures, sourced paper figures, or technical visual rendering, load `templates/runtime/diagram-rendering.yaml`.
- If authoring in HTML/CSS before PPTX/PDF, load `templates/runtime/html-to-pptx.yaml`.
- If exporting PPTX/PDF/screenshots/thumbnails, load `templates/runtime/export-contract.yaml`.
- If generating or validating PPTX, load `templates/qa/pptx-technical-gates.yaml`; run `scripts/check_pptx_placeholders.py` when a PPTX file exists and placeholder safety matters.
- If scoring a full deck, load `templates/qa/squad-quality-rubric.yaml`; killer items block release regardless of aggregate score.
- If key slides are rendered or the user complains the deck looks bad, load `templates/eval/rendered-eval.yaml`.
- If claiming high visual/rendered quality or "Design 100", load `templates/eval/rendered-design-fixture-set.yaml` and select the fixture set that matches the deck job.
- If claiming Design category leadership, load `templates/eval/design-regression-corpus.yaml` and run `scripts/validate_design_capability.py` when updating the skill or bench.
- If `rendered-eval.yaml` exists, run `scripts/validate_rendered_eval.py` or rely on `scripts/validate_deck_package.py` to enforce rendered score thresholds.
- If a prior failure mode is known, load `templates/qa/regression-fixtures.yaml`.
- If the user asks for editable PPTX, native runtime, or "real .pptx output", route through `slides-renderer` (Native IR → DrawingML via `packages/slides-renderer`); never emit raster as default.
- If the user asks for real deck generation (not just spec), set `provider.mode = "codex"` in the runtime call. `provider.mode = "dummy"` is smoke-only and is forced when `CI=true`. On codex failure the runtime falls back to the structured composer (`composeStructuredFallback`), never the 5-slide crude stub. Surface `job_state.errors[]` `provider_fallback:*` entries to the operator.
- If the user asks for "an API for this", "an MCP for this", "expose this as a service", or "run this in CI/batch", route to `apps/squad-engine` REST (`/api/v1/slides/*`), `slides-mcp` tools (`slides.generate|review|export|edit|show`), or `scripts/sinkra/slides-cli.mjs` — all three share `slides-core` so parity is mandatory.
- If you generate a deck via runtime and the user requests premium/Design 100, run `scripts/validate_design_100_runtime.py outputs/slides-creator/{run_id} --strict` and respect the verdict (`DESIGN_100` only when overall >= 95 and zero blockers).
- If the runtime touches any of CLI/API/MCP, run `scripts/validate_runtime_parity.py` before publishing — surfaces drift = release block.
- If a forward test or previous failure mode exists, run `scripts/run_regression_fixtures.py` before final delivery.
- If updating or packaging narrative capability, run `scripts/validate_narrative_capability.py`.
- If updating narrative/design integration or storyboard edit capability, run `scripts/validate_narrative_design_capability.py`.
- If updating runtime/editor/export/distribution/multimedia capability, run `scripts/validate_runtime_gap_capability.py`.
- If updating delivery, sharing, API, MCP, CLI, or packaging capability, run `scripts/validate_delivery_capability.py`.
- If writing a machine-readable deck package, run `scripts/build_evidence_ledger.py` after `deck-spec.yaml` exists, then `scripts/validate_runtime_contracts.py` and `scripts/validate_deck_package.py` before final delivery.
- If updating or packaging this skill, run `scripts/validate_skill_independence.py .` from the skill directory to ensure no external squad path is required.
- If selecting deck sequence, load `templates/deck/route-map.yaml` and `templates/deck/copy-derived.yaml` before using legacy reference libraries.
- If selecting per-slide structures, load `templates/slide/function-library.yaml`.
- If choosing visual layouts, diagrams, charts, media, or matrix behavior, load the relevant files in `templates/visual/`.
- If choosing style, load `templates/theme/theme-tokens.yaml`.
- If the user asks "how should this work as product/runtime" or mentions PPTX/API/MCP/editor/prompt-to-edit/local models, load `templates/runtime/` and `references/bench-absorption-map.md`.
- If the user asks for QA/review, load `references/rubrics.md`.
- If the user asks to improve a weak process/deck or mentions a prior bad run, load `references/regression-test-protocol.md`.

## Required Outputs

For full deck creation, produce these sections or files:

1. `briefing-normalized`
2. `audience-belief-shift`
3. `story-arc`
4. `slide-function-map`
5. `design-direction`
6. `roteiro-template-selection`
7. `slide-structure-selection`
8. `visual-template-selection`
9. `template-selection-report`
10. `theme-profile-selection`
11. `render-lock`
12. `runtime-job-selection`
13. `job-state`
14. `source-of-truth-policy`
15. `research-route-selection`
16. `import-pipeline-selection`
17. `rendered-eval-selection`
18. `bench-capability-selection`
19. `deck-spec`
20. `speaker-notes`
21. `qa-report`
22. `revision-notes`
23. `forward-test` when improving a known weak process
24. `source-ledger` when the deck contains factual or comparison claims
25. `package-validation-report` when files are created
26. `design-mastery-report` when the user requests premium/reference-level design or Design 100
27. `delivery-manifest` when the output must be shared, handed off, published, or consumed by another tool/runtime

Use Markdown by default. Use JSON/YAML only when the user asks for machine-readable output or when generating assets for code.

## Non-Negotiable Gates

- **Narrative compression:** slides are moments, not topics.
- **Narrative capability corpus:** narrative leadership claims require a matched narrative regression case with current belief, desired belief, proof standard, and failure test.
- **Storyboard bridge:** full decks must connect story arc, slide function, visual template, density, proof, and render risk before implementation.
- **Narrative-design moment:** key slides must declare the moment archetype they perform, including audience state before/after, density budget, proof visibility, visual move, and failure mode.
- **Workflow fit:** use micro, standard, full-package, repair, benchmark, or export mode according to the request; do not produce full-package overhead for a quick critique.
- **Playbook routing:** choose a deck playbook before selecting slide templates so the deck follows a proven scenario arc.
- **Slide function:** every slide has a job in the audience journey.
- **Audience movement:** every slide states the belief, question, confidence, or decision state it changes.
- **No explain-topic functions:** `explicar`, `apresentar`, `mostrar`, `listar`, and equivalent English verbs are blockers when used as slide movement.
- **Action title:** every title makes a claim; no generic topic labels.
- **Density:** default max 45 visible words per slide, except tables/appendices.
- **Layout variety:** no more than 2 consecutive slides with the same structure.
- **Template selection:** every slide must declare one structure template and why that template fits the slide function.
- **Selection audit:** key slide/template/chart decisions must include rejected runners-up with deck-specific reasons.
- **Template registry first:** use `templates/` contracts before drafting full decks. Do not rely only on free-form Markdown references.
- **Render lock:** full decks and exportable decks must lock colors, fonts, chart palette, image style, visual composition, and forbidden features before rendering.
- **Provenance:** when a template is selected, keep its absorbed source visible in the reasoning when useful.
- **Visual grammar:** charts and diagrams must match data shape, not aesthetic preference.
- **Bench absorption:** when solving a known capability, reuse the mapped benchmark pattern rather than inventing a new one.
- **Research routing:** HTML sources, motion media, scholar evidence, and local files use different routes.
- **Evidence ledger:** high-stakes factual or comparison claims must be mapped to sources, confidence, freshness, and slide use.
- **Induced pack selection:** imported templates are selected by deck job, media behavior, and audience, not by aesthetics alone.
- **Provider routing:** local/privacy/provider requirements must be explicit before selecting model, image, vision, or research capability.
- **Manuscript-first:** research-heavy or failed-process decks must create a manuscript before slide copy.
- **Edit history:** prompt edits must produce scoped diffs and rerun local QA for changed slides.
- **Storyboard-safe edits:** prompt edits must preserve belief shift, source truth, render-lock, design moment, and unselected regions unless the user explicitly overrides them.
- **Traceable handoffs:** reusable processes must keep compact stage traces and revision decisions.
- **Source-of-truth:** when deck state, source ledger, briefing, imported templates, memory, or user instructions conflict, declare which source wins.
- **Job state:** resumable, batch, CLI, API, MCP, or export jobs must record task state, progress events, artifacts, policy, and verdict.
- **Delivery package:** shareable outputs must declare artifacts, permissions, export targets, validation reports, known blockers, and follow-up signals when analytics exist.
- **Automation parity:** CLI, API, and MCP surfaces must map to the same commands, job states, safety boundaries, and artifacts.
- **Regression fixtures:** known failure modes become forward tests before the process is called improved.
- **Rendered evaluation:** important final decks must evaluate rendered key slides, not only source text.
- **Verified export:** never claim PPTX/PDF export success before output-path verification.
- **Native runtime parity:** CLI/API/MCP surfaces MUST share `slides-core`. A behavioral difference between surfaces is a release blocker — enforced by `validate_runtime_parity.py`.
- **Design 100 runtime gate:** any deck claiming Design 100 MUST emit `design-mastery-report.yaml` with verdict `DESIGN_100`, editability_score ≥ 95, and zero BLOCKER findings. Subjective taste is not evidence.
- **PPTX technical safety:** no residual placeholders, unsafe math, overlap, clipping, theme-mismatched diagrams, or unverified text fit.
- **Image type routing:** AI image prompts must declare internal composition, container size, text policy, and whether the visual is decorative, explanatory, evidentiary, or product-representational.
- **Visual composition:** image-heavy slides must declare Primary + Modifier composition and native overlay plan.
- **Chart data validation:** chart data shape must match the selected chart mode before visual styling.
- **Diagram engine routing:** technical diagrams must declare Graphviz, Mermaid, TikZ, native shapes, or extracted-figure policy before rendering.
- **Template import honesty:** imported PPTX templates produce metadata/manifests first; fidelity claims require render comparison.
- **Executable helpers:** when a bundled script exists for a repeated artifact, use it instead of recreating the artifact by hand.
- **Skill independence:** runtime must not require `squads/`, squad agents, or private source paths; absorbed patterns must be bundled locally.
- **Proof:** factual claims need source, artifact, example, demo, or explicit assumption label.
- **Design direction:** visual system must exist before draft and must not be just brand colors applied as a skin.
- **Design mastery:** premium deck design requires template/brand manifest, layout variety, theme runtime, rendered proof, and explicit anti-pattern checks before final delivery.
- **Design 100 validation:** when Design 100 is requested, final delivery must include the four Design artifacts and pass `validate_design_mastery.py` if a package directory is available.
- **Design capability corpus:** Design leadership claims require template import corpus, rendered fixture corpus, and theme runtime snapshot suite; validate them with `validate_design_capability.py`.
- **Killer items:** use `templates/qa/squad-quality-rubric.yaml`; any killer item blocks final release.
- **Key-slide gate:** important decks must validate cover, reframe, mechanism, proof/demo, and CTA before full render.
- **Regression gate:** if a prior process failed, map old failure modes to new blockers before rerendering.
- **Critique loop:** final answer must include what was improved after critique.

## Quality Bar

Score the deck with this weighting:

| Dimension | Weight |
|---|---:|
| Narrativa | 25 |
| Design editorial | 25 |
| Acurácia/prova | 20 |
| Editabilidade | 10 |
| Brand | 10 |
| Técnica/export | 10 |

If the weighted score is below 85, revise. If below 75, do not present it as final; present it as a diagnostic draft.

## Bundled References

- `scripts/build_template_examples.py`: converts selected slide-function templates into compact Markdown/XML prompt examples.
- `scripts/build_evidence_ledger.py`: extracts slide evidence from `deck-spec.yaml` into `source-ledger.yaml`.
- `scripts/validate_deck_package.py`: validates required package files, basic slide shape, repeated structures, and sourced evidence.
- `scripts/run_regression_fixtures.py`: runs forward-test fixtures for narrative, design, research, render, and template-selection failure modes.
- `scripts/validate_rendered_eval.py`: validates rendered slide scores, blockers, descriptions, revision actions, and referenced image paths.
- `scripts/validate_runtime_contracts.py`: validates render-lock, template-selection-report, job-state, source-of-truth-policy, and speaker-notes preservation.
- `scripts/validate_design_capability.py`: validates bundled Design corpora for regression coverage, source-family coverage, and theme runtime snapshots.
- `scripts/validate_narrative_capability.py`: validates bundled narrative regression cases across deck jobs, belief shifts, proof standards, and failure tests.
- `scripts/validate_runtime_gap_capability.py`: validates storyboard, speaker-note/narration, and remaining runtime gap acceptance contracts.
- `scripts/check_pptx_placeholders.py`: checks PPTX slide XML for residual placeholders such as `{{MATH:`.
- `scripts/validate_chart_data.py`: validates chart datasets against label-value, xy, multi-series, range, waterfall, OHLC, box-plot, hierarchical, flow, funnel, heatmap, histogram, and gauge modes.
- `scripts/validate_skill_independence.py`: validates that the skill does not require external squad files at runtime.
- `scripts/validate_design_100_runtime.py`: bridges runtime artifacts (Native IR + editability-report) with the design-mastery contracts; emits `design-mastery-report.yaml` and refuses Design 100 unless overall ≥ 95 and zero blockers.
- `scripts/validate_runtime_parity.py`: smoke-runs the CLI/API/MCP surfaces against the same dummy briefing and proves the three produce identical artifact shapes (CLI ↔ API ↔ MCP parity gate).
- `templates/index.yaml`: canonical template registry and routing order.
- `templates/deck/route-map.yaml`: deck roteiro templates for benchmarks, webinars, finance, sales, board, product strategy, and discovery.
- `templates/deck/copy-derived.yaml`: offer, VSL, cohort launch, and investor pitch templates absorbed from SINKRA copy and pitch squads.
- `templates/deck/playbook-routing.yaml`: fast scenario routing for benchmark, webinar, sales, VSL, finance, product, investor, and course/workshop decks.
- `templates/slide/function-library.yaml`: slide-function templates with slots, constraints, and QA.
- `templates/visual/`: chart, chart-data, AI-image, diagram, layout family, and media-fit rules absorbed from benchmark projects.
- `templates/visual/chart-data-contracts.yaml`: chart dataset modes, required fields, editor-mode mapping, and validation blockers.
- `templates/visual/ai-image-type-routing.yaml`: AI image composition types, purpose routing, text policy, and container-size rules.
- `templates/visual/composition-patterns.yaml`: Primary + Modifier visual composition grammar, native overlays, PPTX fallbacks, and audit ids.
- `templates/visual/aiox-brandbook-deep-patterns.yaml`: AIOX editorial spreads, proof walls, pitch components, category creation, roadmap, offer and problem sections.
- `templates/visual/redpine-deep-patterns.yaml`: Redpine report grid, palette stack, component/a11y manifest cards, status rows, decision panels, tabs, and briefing fields.
- `templates/theme/theme-tokens.yaml`: theme profiles separated from slide structure.
- `templates/theme/brand-systems.yaml`: Redpine and AIOX Brandbook theme profiles extracted from local design-system sources.
- `templates/theme/design-philosophy-routing.yaml`: 20 fallback design philosophies across 5 schools for visually vague briefs.
- `templates/runtime/`: generation, edit, batch, import, and prompt-to-edit job contracts.
- `templates/runtime/workflow-modes.yaml`: process depth selector for micro replies, standard specs, full packages, repairs, benchmarks, and exportable decks.
- `templates/runtime/story-arc-contract.yaml`: deck arc types, beat schema, validation, and anti-patterns.
- `templates/runtime/slide-function-map-contract.yaml`: function enum, audience movement rules, density targets, and compression rules.
- `templates/runtime/design-direction-contract.yaml`: visual reference, motif, density, variation, composition, and audience-context contract.
- `templates/runtime/render-lock.yaml`: anti-drift execution contract for colors, typography, chart palette, image style, forbidden features, and slide visual locks.
- `templates/runtime/template-selection-report.yaml`: selected template/chart plus rejected runners-up and deck-specific rationale.
- `templates/runtime/job-state.schema.yaml`: resumable job state, progress events, artifacts, export policy, and final verdict.
- `templates/runtime/source-of-truth-policy.yaml`: precedence and conflict-resolution policy for long or source-heavy deck jobs.
- `templates/runtime/manuscript-pipeline.yaml`: planner, research manuscript, claim/evidence, and renderer handoff pipeline.
- `templates/runtime/html-to-pptx.yaml`: browser-rendered HTML to PPTX/PDF conversion, placeholder extraction, overflow, and rasterization rules.
- `templates/runtime/export-contract.yaml`: reproducible export task, worker response, output verification, and preview contract.
- `templates/runtime/template-example-routing.yaml`: selected template examples and per-outline template override routing.
- `templates/runtime/trace-handoff.yaml`: traceable stage flow, typed handoffs, review universes, and synthesis report.
- `templates/runtime/provider-routing.yaml`: provider, local model, image, vision, research, and fallback capability routing.
- `templates/runtime/edit-history.yaml`: undo/redo-inspired edit snapshots, diff summaries, and local QA reruns.
- `templates/runtime/diagram-rendering.yaml`: Graphviz, Mermaid, TikZ, native-shape, and PDF-figure extraction routing.
- `templates/research/source-routing.yaml`: separate routes for HTML sources, motion media, scholar/benchmark evidence, and local files.
- `templates/research/evidence-ledger.yaml`: slide-level claim/source/confidence/freshness ledger.
- `templates/import/document-extraction.yaml`: structured document extraction, captions, metadata, claim/evidence inventory.
- `templates/import/induced-layout-packs.yaml`: PPTAgent-derived pack selection for academic, technical, institutional, and UI decks.
- `templates/import/pptx-template-manifest.yaml`: PPTX template manifest extraction, placeholder geometry, theme metadata, assets, and import report.
- `templates/eval/rendered-eval.yaml`: multimodal rendered slide scoring for vision, content, logic, and technical integrity.
- `templates/qa/regression-fixtures.yaml`: forward tests for narrative, design, research, render, and template-selection failures.
- `templates/qa/pptx-technical-gates.yaml`: PPTX overlap, clipping, text-fit, math, diagram, density, and scoring gates.
- `templates/qa/squad-quality-rubric.yaml`: self-contained 6-dimension score, killer items, release criteria, and corrective actions.
- `templates/qa/`: narrative, visual, template-selection, and copy gates.
- `templates/wireframes/`: simple HTML visual references for matrix, mechanism, proof, and webinar flow.
- `references/narrative-patterns.md`: deck types, story arcs, slide functions.
- `references/template-selection-guide.md`: template routing by deck job and slide function.
- `references/roteiro-template-library.md`: 45 complete deck roteiro templates by use case.
- `references/slide-structure-library.md`: 240+ slide structure templates with use/avoid rules.
- `references/bench-absorption-map.md`: what to absorb from Presenton, Gamma, ppt-master, PPTAgent, presentation-ai, banana-slides, powerpoint-skill, slide-deck-ai, and PresentAgent-2.
- `references/design-system.md`: visual direction, layout patterns, density rules.
- `references/rubrics.md`: QA scoring and critique protocol.
- `references/output-contracts.md`: reusable artifact schemas and final package format.
- `references/anti-patterns.md`: known failure modes, especially outline-to-deck literalism.
- `references/regression-test-protocol.md`: forward-test format for preventing known deck/process failures from recurring.

Load only the reference needed for the current task.

## Default Final Response

When returning work to the user, keep it concise:

- State the recommended deck thesis.
- Show slide list with function + action title.
- Mention design direction.
- Mention QA score and the main remaining risk.
- Provide the generated artifact or file path when files were created.
