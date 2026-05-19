# Output Contracts

Use these contracts when the user asks for a complete deck package, machine-readable outputs, or reusable artifacts.

## Full Package Structure

```text
slide-creator-output/
  briefing-normalized.yaml
  audience-belief-shift.yaml
  story-arc.yaml
  slide-function-map.yaml
  roteiro-template-selection.yaml
  slide-structure-selection.yaml
  visual-template-selection.yaml
  template-selection-report.yaml
  theme-profile-selection.yaml
  render-lock.yaml
  runtime-job-selection.yaml
  job-state.yaml
  source-of-truth-policy.yaml
  research-route-selection.yaml
  import-pipeline-selection.yaml
  template-import-report.yaml
  rendered-eval-selection.yaml
  bench-capability-selection.yaml
  design-direction.yaml
  deck-spec.yaml
  chart-datasets/
  diagrams/
  diagram-manifest.yaml
  image-resource-list.yaml
  source-ledger.yaml
  planning-reflection.jsonl
  key-slide-gate.yaml
  speaker-notes.md
  qa-report.yaml
  rendered-eval.yaml
  package-validation-report.json
  editability-report.yaml
  revision-notes.md
  forward-test.yaml
```

If writing files, place them in a user-specified directory. If no directory is specified in this repository, use `outputs/slide-creator/{deck-slug}/`.

When writing machine-readable files, prefer YAML for core deck artifacts and JSON for validation reports. Before final delivery, run:

```bash
python scripts/build_evidence_ledger.py slide-creator-output/deck-spec.yaml --output slide-creator-output/source-ledger.yaml
python scripts/run_regression_fixtures.py slide-creator-output --json > slide-creator-output/regression-fixture-report.json
python scripts/validate_rendered_eval.py slide-creator-output/rendered-eval.yaml --package-root slide-creator-output --json > slide-creator-output/rendered-eval.validation.json
python scripts/validate_runtime_contracts.py slide-creator-output --json > slide-creator-output/runtime-contracts.validation.json
python scripts/validate_deck_package.py slide-creator-output --json > slide-creator-output/package-validation-report.json
```

`validate_deck_package.py` uses `--profile full` by default. Use `--profile minimal` only for smoke tests or partial drafts that are not being delivered as a complete skill package.

Use paths relative to the skill folder when running bundled scripts directly, or pass absolute paths when running from another working directory.

## Briefing Normalized

```yaml
briefing_normalized:
  title: ""
  deck_type: "sales | webinar | board | pitch | course | workshop | report | other"
  audience: ""
  objective: ""
  desired_action: ""
  duration_minutes: null
  slide_count_target: null
  tone: ""
  source_material:
    - ""
  constraints:
    - ""
  unknowns:
    - ""
```

## Story Arc

```yaml
story_arc:
  deck_id: ""
  arc_type: "educational_workshop | executive_pitch | sales_narrative | thought_leadership | product_demo | board_update | case_study | webinar | financial_update | strategy_memo"
  governing_thought: ""
  audience_belief_shift:
    from: ""
    to: ""
  beats:
    - beat_id: "b01"
      beat_type: "hook | tension | reframe | proof | mechanism | demo_payoff | artifact_reveal | cta"
      narrative_function: ""
      slides_estimated: 1
      source_topics: []
      evidence_refs: []
      design_hints: []
```

Story arc must include opening/tension, reframe/thesis, proof/mechanism/payoff, and close/CTA. Keep beats at 8 or fewer.

## Slide Function Map

```yaml
slide_function_map:
  deck_id: ""
  story_arc_ref: "story-arc.yaml"
  entries:
    - slide_id: "s01"
      beat_ref: "b01"
      function: "cover | reframe | proof | contrast | mechanism_step | demo_setup | demo_payoff | artifact_reveal | objection_neutralize | synthesis | tension_amplify | emotional_anchor | quiet_pause | cta_concrete | close | appendix"
      audience_movement: ""
      slide_type: ""
      density_target: "low | medium | high"
      merged_from_topics: []
      could_be_cut_if: ""
      action_title_draft: ""
      proof_requirement: ""
```

`audience_movement` must state a belief, question, confidence, or decision shift. Do not use topic verbs such as "explicar", "apresentar", "mostrar", "listar", "explain", "present", or "show".

## Design Direction

```yaml
design_direction:
  deck_id: ""
  visual_reference:
    type: "provided_brand | provided_screenshot | imported_pptx | existing_design_system | bundled_theme | design_philosophy_fallback"
    rationale: ""
    paths: []
    must_follow: []
    must_avoid: []
  dominant_motif: ""
  density_limits:
    max_governing_claims_per_slide: 1
    max_supporting_claims_per_slide: 3
    max_visible_words_default: 45
    max_visual_elements: 5
    forbidden_patterns:
      - dense_bullet_wall
      - repeated_two_column_monotony
      - identity_as_skin
  variation_rules:
    layout_count_min: 5
    layout_repetition_max: 2
    quiet_slide_ratio_min: 0.15
    accent_color_density: "sparse"
    motion_policy: "none unless output is web/native motion"
  composition_rules:
    grid_columns: 12
    baseline_padding_pt: 32
    title_anchor: "top_left_or_deliberately_centered"
    footer_policy: ""
    slide_number_policy: ""
    safe_area_pct: 6
  audience_context:
    audience: ""
    viewing_context: ""
    expected_reading_mode: ""
```

Design direction is a blocker-level artifact. It must be written before deck copy so the design system controls content density, layout variation, and visual rhythm.

## Roteiro Template Selection

```yaml
roteiro_template_selection:
  primary_template: ""
  secondary_template: ""
  reason: ""
  modules_added:
    - ""
  modules_removed:
    - ""
  target_slide_count: 0
```

## Slide Structure Selection

Every slide must declare one structure from `references/slide-structure-library.md`.

```yaml
slide_structure_selection:
  slides:
    - slide: 1
      function: ""
      structure_id: "H01"
      structure_name: "Big claim hero"
      why_this_structure: ""
      avoid_risk: ""
```

## Template Selection Report

Use this for every full deck and every key slide. A template choice is incomplete until rejected alternatives are documented.

```yaml
template_selection_report:
  deck_id: ""
  selections:
    - slide_id: "s01"
      slide_function: ""
      selected:
        id: ""
        name: ""
        source_registry: ""
        source_quote: ""
      selected_reason: ""
      rejected_runners_up:
        - id: ""
          name: ""
          rejected_reason: ""
        - id: ""
          name: ""
          rejected_reason: ""
      constraints_checked: [slot_count, text_length, media_area, evidence_visibility, pptx_editability]
      final_confidence: "high | medium | low"
      qa_status: "pass | warn | fail"
```

## Render Lock

Use this as the execution lock before rendering/exporting. It prevents visual drift across long decks.

```yaml
render_lock:
  canvas:
    aspect_ratio: "16:9"
    width_px: 1920
    height_px: 1080
  colors:
    background: ""
    text: ""
    accent: ""
  typography:
    heading_family: ""
    body_family: ""
    body_px: 28
  image_style_lock:
    rendering_family: "editorial_photo | vector_illustration | 3d_isometric | none"
    palette_policy: "native_theme | brand_exact"
    text_policy_default: "native_overlay"
  slide_visual_locks:
    - slide_id: "s01"
      composition_pattern: "C01"
      image_type: ""
      native_overlay_plan: ""
```

## Job State

Use this when work is resumable, batched, exported, or exposed by CLI/API/MCP.

```yaml
job_id: ""
run_id: ""
job_type: "full_generation | source_document_generation | improve_existing_deck | prompt_to_edit | export_only | batch_generation"
status: "queued | running | waiting | completed | failed | cancelled | partial"
inputs: {}
task_records:
  - task_id: ""
    type: ""
    status: ""
progress_events:
  - event: "task_started"
    task_id: ""
artifacts:
  - artifact_id: ""
    kind: "deck_spec"
    path_or_url: ""
    status: "created | verified | failed"
policy:
  continue_on_error: false
  timeout_sec: 1800
final_verdict: "pass | warn | fail | blocked"
```

## Source Of Truth Policy

Use this when multiple sources, previous decks, imported templates, process logs, or memory can conflict.

```yaml
source_of_truth_policy:
  precedence_order:
    - latest_verified_export
    - latest_deck_spec
    - explicit_user_instruction_current_turn
    - source_ledger
    - imported_template_manifest
    - briefing_normalized
    - research_notes
    - prior_chat_or_memory
conflict_resolution: []
```

## Deck Spec

Use this for each slide:

```yaml
slides:
  - number: 1
    function: ""
    structure_id: ""
    structure_name: ""
    action_title: ""
    visible_copy:
      headline: ""
      subhead: ""
      blocks:
        - label: ""
          text: ""
    visual:
      layout_pattern: ""
      primary_asset: ""
      chart_or_diagram: ""
      design_notes: ""
    speaker_notes: ""
    evidence:
      - claim: ""
        source: ""
        status: "sourced | assumption | validate"
        freshness: "unknown"
    qa:
      visible_word_count: 0
      passes_density: true
      has_action_title: true
      has_clear_function: true
```

## Source Ledger

Generate after `deck-spec.yaml` exists.

```yaml
evidence_ledger:
  source: "deck-spec.yaml"
  claim_count: 0
  claims:
    - claim_id: "s01-c1"
      slide_id: "s01"
      claim: ""
      evidence_type: "official_source | benchmark_result | academic_paper | product_documentation | user_provided_document | screenshot_or_media | internal_artifact | explicit_assumption"
      source: ""
      confidence: "high | medium | low"
      visible_or_speaker_notes: "visible | speaker_notes"
      risk: "none | needs_source"
      freshness: "unknown"
  blockers: []
```

## Package Validation Report

Generate before final delivery when files were created.

```json
{
  "package": "slide-creator-output",
  "slide_count": 0,
  "status": "pass",
  "errors": [],
  "warnings": []
}
```

## Key-Slide Gate

Use before full visual production for important decks.

```yaml
key_slide_gate:
  required: true
  slides:
    - role: "cover"
      slide: 1
      pass_condition: "promise is understood in under 5 seconds"
      status: "pass | revise | fail"
    - role: "reframe"
      slide: 2
      pass_condition: "old belief and new belief are visually obvious"
      status: "pass | revise | fail"
    - role: "mechanism"
      slide: 0
      pass_condition: "method is memorable without long explanation"
      status: "pass | revise | fail"
    - role: "proof_or_demo"
      slide: 0
      pass_condition: "audience can see proof or expected artifact"
      status: "pass | revise | fail"
    - role: "cta"
      slide: 0
      pass_condition: "next action is concrete and low-friction"
      status: "pass | revise | fail"
  blockers:
    - ""
```

## Bench Capability Selection

Use when the user asks for runtime, export, editor, API, MCP, prompt-to-edit, research, or local operation.

```yaml
bench_capability_selection:
  capabilities:
    - capability: "native_editable_pptx"
      source_pattern: "ppt-master"
      reason: ""
      artifacts_required:
        - "native-slide-ir.yaml"
        - "editability-report.yaml"
    - capability: "api_mcp_runtime"
      source_pattern: "Presenton"
      reason: ""
      artifacts_required:
        - "workspace"
        - "provider-registry"
```

## Template Import Report

Use when a concrete PPTX/template deck is imported.

```yaml
template_import_report:
  source_file: ""
  status: "pass | partial | fail"
  manifest_file: "manifest.json"
  summary_file: "summary.md"
  asset_dir: "assets"
  slide_size: ""
  theme_fonts_detected: []
  theme_colors_detected: []
  reusable_layouts: 0
  reusable_assets: 0
  partial_layouts: []
  unsupported_features: []
  fidelity_checks:
    rendered_reference_compared: false
    notes: []
```

## Chart Dataset

Use for every chart before visual styling or export.

```yaml
chart_dataset:
  id: "chart-s01-01"
  slide_id: "s01"
  mode: "label-value | xy | xyz | multi-series | range | waterfall | ohlc | box-plot | hierarchical | flow | funnel | heatmap | histogram | gauge"
  title: ""
  source: ""
  unit: ""
  rows:
    - label: ""
      value: 0
  validation_report: "chart-s01-01.validation.json"
```

Validate with:

```bash
python scripts/validate_chart_data.py slide-creator-output/chart-datasets/chart-s01-01.yaml --json > slide-creator-output/chart-datasets/chart-s01-01.validation.json
```

## Diagram Manifest

Use for architecture, sequence, mathematical, or sourced figure diagrams.

```yaml
diagram_manifest:
  output_dir: "diagrams"
  diagrams:
    - diagram_id: "d01"
      slide_id: "s01"
      engine: "graphviz | mermaid | tikz | native_shapes | pdf_figure_extraction"
      source_file: ""
      output_file: ""
      editable_level: "native | source_editable | raster_only"
      attributed: false
      qa:
        rendered: false
        fits_container: false
        legible_at_thumbnail: false
        issues: []
  blockers: []
```

## Image Resource List

Use when AI/stock/generated visuals are part of the deck.

```yaml
image_resource_list:
  images:
    - image_id: "img-s01-01"
      slide_id: "s01"
      image_type: "hero | background | portrait | typography | infographic | flowchart | framework | matrix | cycle | funnel | pyramid | comparison | timeline | map | scene"
      role: "decorative | explanatory | evidentiary | product_representational"
      container: "hero_large | evidence_panel | icon_or_support | full_canvas"
      text_policy: "none | embedded"
      prompt: ""
      output_file: ""
      qa:
        no_critical_embedded_text: true
        fits_container: false
        source_or_generation_model: ""
```

## Forward Test

Use when improving a known weak deck/process.

```yaml
forward_test:
  case_id: ""
  source_inputs:
    - ""
  old_failure_modes:
    - failure: ""
      evidence: ""
      blocked_by_gate: ""
  expected_outputs:
    - "briefing-normalized"
    - "story-arc"
    - "slide-function-map"
    - "slide-structure-selection"
    - "design-direction"
    - "deck-spec"
    - "key-slide-gate"
    - "qa-report"
  pass_thresholds:
    weighted_score_minimum: 90
  current_gap: ""
```

## Planning Reflection

```jsonl
{"phase":"narrative","slide":"s03","issue":"action title is generic","decision":"rewrite as claim","expected_delta":"narrative"}
{"phase":"design","slide":"s05","issue":"layout repeats previous two slides","decision":"switch to mechanism diagram","expected_delta":"editorial_design"}
```

## Editability Report

Use when PPTX is required.

```yaml
editability_report:
  overall_editability_score: 0.0
  native_object_count: 0
  raster_object_count: 0
  editable_text_count: 0
  killer_items:
    - ""
```

## Final Answer Format

For a full deck in chat, use:

```markdown
## Deck Thesis

...

## Design Direction

...

## Slide Plan

| # | Function | Action Title | Visual |
|---:|---|---|---|

## Deck Spec

### Slide 1
...

## QA

...
```
