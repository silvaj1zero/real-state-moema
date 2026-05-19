# Bench Absorption Map

Use this reference whenever the task touches capabilities already covered by the slide benchmarks. Do not reinvent the workflow. Absorb the pattern, not the external code.

Sources synthesized from:

- `docs/bench/slides-creator-open-source-absorption/`
- `docs/bench/slides-creator-open-source-absorption/slide-creator-skill-blueprint.md`
- `docs/bench/presenton-vs-gamma/`

Canonical bench artifact: `slide-creator-skill-blueprint.md`. This file is the packaged skill-local version.

## Core Composition

No single project is the model. Use class winners by layer:

| Layer | Primary inspiration | Secondary inspiration | Absorb |
|---|---|---|---|
| App/product | Presenton | presentation-ai, Gamma | self-hosting, API, MCP, providers, editor/share UX |
| Skill/agentic reasoning | PPTAgent | slide creator skill | planning, reflection, critique, QA routing |
| Renderer/runtime | ppt-master | powerpoint-skill | native editable PPTX, template import, editability QA |
| Prompt-to-edit | banana-slides | presentation-ai, ppt-master | region/block edit UX, preview, diff, approval |
| Research/multimodal | PresentAgent-2 | PPTAgent | query -> research -> grounded deck, Q&A future |
| CLI/local | slide-deck-ai | Presenton | simple command path, provider abstraction, Ollama |

## What To Absorb By Project

### Presenton

Absorb:

- self-hosted runtime;
- `generate/review/export` API shape;
- MCP tools: `slides.generate`, `slides.review`, `slides.export`;
- provider registry with BYOK, Ollama, OpenAI-compatible models;
- provider capability routing across text, image, vision, research, local model, and fallback needs;
- source-of-truth policy: live tool/deck state beats stale memory;
- schema validation before saving or claiming slide updates;
- automatic retry/shortening for schema length failures;
- model-pull/download state for local Ollama-style workflows;
- workspace per deck run;
- template upload/import idea.

Use when:

- user asks for local/private operation;
- user asks to turn skill into product/API/MCP;
- user asks for automations or batch generation.

Do not absorb:

- full UI before core contracts;
- rigid dependency on one web renderer;
- desktop/cloud packaging before the headless workflow works.

### Gamma

Absorb as UX benchmark, not as implementation:

- low-friction creation flow;
- import from many sources;
- editor + present + share in one loop;
- analytics/distribution expectations;
- reduced design cognitive load for non-designers.

Use when:

- user asks "como ficar à altura do Gamma";
- sharing, analytics, collaboration, or commercial polish matters.

### ppt-master

Absorb:

- native editable PPTX as a first-class requirement;
- template replication/import from existing PPTX;
- lightweight PPTX template manifest extraction: slide size, theme fonts/colors, backgrounds, assets, placeholders, text samples, and page type;
- constrained visual/native IR before export;
- render-lock anti-drift pattern: execution contract separate from design rationale;
- Primary + Modifier visual composition grammar for image-heavy slides;
- runners-up audit trail for chart/template decisions;
- editability QA report;
- AI image type routing as a layer separate from slide layout: background, hero, portrait, typography, infographic, flowchart, framework, matrix, cycle, funnel, pyramid, comparison, timeline, map, scene;
- live preview/annotation pattern for later editor UX;
- narration/animation only as future layer.

Use when:

- output must be PowerPoint-editable;
- client will modify slides;
- template fidelity matters;
- B2B delivery quality matters.

Hard rule:

- never let the LLM generate PPTX directly. Generate a valid spec/IR and let a renderer convert it.

### PPTAgent

Absorb:

- explicit planner before generation;
- research/design specialist mental split;
- reflection history;
- critique pass and revision pass;
- PPTEval-like dimensions: content, design, coherence.
- manuscript-first `Planner -> Research -> PPTAgent` flow for research-heavy decks;
- rendered slide evaluation from images, not only text specs;
- structured document extraction with headings, metadata, image captions, and table captions;
- HTML-to-PPTX conversion rules for placeholders, locked slide size, overflow, and rasterized complex CSS.
- non-default induced template packs (`beamer`, `cip`, `hit`, `thu`, `ucas`) and media-area statistics.
- slide layout constraints: suggested characters, variable-length layout mappings, local media validation, and rewrite of overlong text.
- speaker notes preservation during PPTX reconstruction.

Use when:

- deck quality matters more than speed;
- user asks to improve a weak deck;
- slide-by-slide reasoning and critique are needed.

Required artifact:

```json
{"phase":"design","slide":"s05","issue":"chart too dense","decision":"split into two slides","delta_expected":"readability + design"}
```

### presentation-ai

Absorb:

- outline-first review;
- theme picker and reusable themes;
- editor/present/share loop;
- local model support with Ollama/LM Studio;
- public sharing as later product layer.
- serialized template examples inside prompts;
- per-outline template overrides;
- history snapshots for slide/theme/full changes and rate-limited same-slide edits;
- undo/redo semantics with restore guard, future clearing, and merged rapid same-slide changes;
- rich visual DSL covering bullets, columns, process, compare, charts, stats, media, and infographic blocks.
- chart-data editor contracts for label-value, xy, xyz, multi-series, range, waterfall, OHLC, box-plot, hierarchical, flow, funnel, heatmap, histogram, and gauge data.

Use when:

- user wants a daily editing workflow;
- brand/theme iteration matters;
- non-technical users must adjust decks.

### banana-slides

Absorb:

- prompt-to-edit UX;
- slide/block/region targeted edits;
- resumable job lifecycle: task ids, progress events, polling, export policy, and batch job records;
- preview before applying;
- style-reference mental model;
- reverse editable-PPTX extraction from rendered images as an import/rescue capability;
- video only as future direction.

License caution:

- treat as black-box inspiration because AGPL can be incompatible with private product use. Do not copy code or structure verbatim without legal decision.

Prompt-to-edit contract:

```yaml
edit_operation:
  target:
    slide_id: "s04"
    region_id: "chart_area"
  intent: "make the chart easier to read"
  before: ""
  after: ""
  qa_required: ["visual", "readability"]
  approval: "pending"
```

### powerpoint-skill

Absorb:

- OMML/math native output;
- Mermaid, Graphviz, TikZ, and diagram engines;
- five-layer diagram routing: Graphviz for architecture/flow/dependencies, Mermaid for sequence/gantt/state/ER, TikZ for math/geometric figures, native shapes for annotations, and PDF extraction for sourced paper figures;
- deterministic technical QA;
- strict text-fit, math, diagram, figure, overlap, clipping, and rendered-density rules;
- fallback rules for unsupported renderer capabilities;
- distinction between PowerPoint vs LibreOffice validation limits.

Use when:

- deck is academic, technical, scientific, financial, engineering, or diagram-heavy.

### slide-deck-ai

Absorb:

- minimal CLI smoke-test path;
- provider abstraction via LiteLLM-like interface;
- offline/Ollama smoke tests;
- simple Python/PPTX baseline only for prototypes.

Use when:

- the user asks for a quick local baseline;
- CI/smoke test matters more than design quality.

### PresentAgent-2

Absorb:

- query -> research -> source document -> refined document -> deck;
- research grounding before slides;
- separate retrieval routes for HTML source pages, direct motion media, scholar/benchmark evidence, and local uploaded files;
- source usefulness checks before adding material to the manuscript;
- media usefulness checks before using video/GIF/demo assets;
- slide-level evidence ledger for claims, source confidence, freshness, and use in visible copy or speaker notes;
- multimodal preservation as future product layer;
- interactive Q&A grounded in deck sources as future layer.

Use when:

- source material is a broad question;
- deck needs research before narrative;
- user asks for video/narrated/interactive presentation.

### deepH

Absorb:

- typed handoffs between stages;
- traceable runtime flows;
- multiverse review + synthesis for high-stakes critique;
- focused working set principle: pass only the useful context to each stage;
- validation before claiming completion;
- regression fixtures that turn known process failures into named forward tests.

Use when:

- the slide process itself must be shareable, repeatable, and auditable;
- multiple evaluators or perspectives are useful before final synthesis;
- user asks why a process failed and how to prevent recurrence.

## Capability Selection Matrix

| User asks for | Use pattern from | Required artifact |
|---|---|---|
| "Gere slides localmente" | Presenton + slide-deck-ai | provider registry + workspace |
| "Quero API/MCP" | Presenton | API/MCP contract |
| "Quero BYOK/local/Ollama" | Presenton + presentation-ai | provider routing report |
| "Preciso PPTX editável" | ppt-master | native IR + editability report |
| "Preciso validar PPTX" | powerpoint-skill | pptx technical gate + placeholder check |
| "Use meu template PowerPoint" | ppt-master + Presenton | template import report |
| "Extraia padrões desse PPTX" | ppt-master | template manifest + summary + assets |
| "Melhore esse deck ruim" | PPTAgent | planning-reflection + critique report |
| "Edite esse slide por prompt" | banana-slides + presentation-ai | edit operation diff |
| "Quero histórico/diff de edição" | Presenton + presentation-ai | edit history + scoped diff |
| "Crie apresentação financeira" | powerpoint-skill + ppt-master | charts/tables/native editability |
| "Use fórmula/diagrama" | powerpoint-skill | diagram source + technical QA |
| "Renderize arquitetura/sequence/math" | powerpoint-skill | diagram manifest + engine-specific source |
| "Crie imagem com IA" | ppt-master image templates | image resource list + text policy |
| "Valide dados de gráfico" | presentation-ai chart editor | chart dataset + validation report |
| "Pesquise e gere deck" | PresentAgent-2 + PPTAgent | source ledger + refined doc |
| "Preciso de pesquisa profunda" | PresentAgent-2 DeepResearch | source route report + manuscript |
| "Quero vídeo/demo no slide" | PresentAgent-2 media route | playable media ledger |
| "Importe documento longo" | PPTAgent document extractor | document tree + claim/evidence inventory |
| "Use esse template existente" | PPTAgent induced packs | pack selection + media area policy |
| "Evite drift visual em deck grande" | ppt-master spec_lock | render-lock.yaml |
| "Explique por que escolheu esse template" | ppt-master + PPTAgent | template-selection-report.yaml |
| "Preciso retomar/ver progresso" | banana-slides | job-state.yaml |
| "Fontes antigas conflitarem com estado atual" | Presenton | source-of-truth-policy.yaml |
| "Preserve minhas notas do apresentador" | PresentAgent-2 | speaker-notes preservation gate |
| "Esse claim precisa ser confiável" | PresentAgent-2 + PPTAgent | evidence ledger |
| "Renderizei e ficou ruim" | PPTAgent PPTEval + powerpoint-skill | rendered-eval report |
| "HTML para PPTX/PDF" | PPTAgent html2pptx + Presenton export | render/export task + overflow report |
| "Torne o processo repetível" | deepH | trace + typed handoff contract |
| "Não repetir o erro anterior" | deepH + PPTEval + powerpoint-skill | regression fixture report |
| "Compartilhe por link" | Gamma + presentation-ai | publication/permissions artifact |
| "Quero analytics" | Gamma benchmark + PostHog/Umami/Plausible pattern | analytics event map |

## Artifact Contracts To Prefer

### Workspace

```text
outputs/slide-creator/{deck_id}/
  inputs/
  briefing-normalized.yaml
  story-arc.yaml
  slide-function-map.yaml
  design-direction.yaml
  deck-spec.yaml
  planning-reflection.jsonl
  qa-report.yaml
  exports/
```

### Native IR

Use when PPTX editability matters:

```yaml
native_slide_ir:
  schema: "native-slide-ir.v1"
  canvas:
    width_pt: 960
    height_pt: 540
    ratio: "16:9"
  slides:
    - id: "s01"
      elements:
        - id: "headline"
          type: "text_box"
          role: "action_title"
          content: ""
          fit: "shrink_to_bounds"
          raster_allowed: false
```

### Editability Report

```yaml
editability_report:
  overall_editability_score: 0.0
  slides:
    - slide_id: "s01"
      native_objects: 0
      raster_objects: 0
      editable_text_boxes: 0
      unsupported_features: []
```

### Publication

Use only when the user needs web/share:

```yaml
deck_publication:
  visibility: "private | public | restricted"
  permissions: []
  analytics_events:
    - "deck_opened"
    - "slide_viewed"
    - "cta_clicked"
```

## Priority Rules

1. Narrative/design quality gates first for this skill.
2. If user requires B2B delivery, add ppt-master-style native PPTX/editability.
3. If user requires productization, add Presenton-style API/MCP/provider/workspace.
4. If user requires daily editing, add presentation-ai/banana prompt-to-edit contracts.
5. If user requires technical/academic slides, add powerpoint-skill math/diagram rules.
6. If user starts from a question, add PresentAgent-2 research grounding before slides.

## Do Not Copy

- AGPL code or uniquely structured implementation from banana-slides without legal review.
- Full product UI before artifact contracts are stable.
- Screenshot-only PPTX as a final B2B answer.
- Direct PPTX generation by the LLM.
- SaaS-only assumptions when user asks for privacy/local-first.
