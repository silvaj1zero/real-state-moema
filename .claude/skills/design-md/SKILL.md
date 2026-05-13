---
name: design-md
description: Extract a Google-spec DESIGN.md from any public URL using the canonical design-ops static extraction pipeline. Produces DESIGN.md, tokens.json, tokens-extended.json, render-contract.json, preview.html, provenance, quality score, drift report, and downstream sidecars for design generation. Triggers — "extract design from URL", "get DESIGN.md from URL", "design-md URL", "drift check this URL against my DESIGN.md", "rip the design system from a site".
version: 1.1.0
---

# /design-md — URL → DESIGN.md Pipeline

Extract a Google-spec `DESIGN.md` from any public URL using static HTML/CSS analysis plus a provider-agnostic LLM step. The slash skill is a thin launcher; the implementation source of truth is `squads/design-ops/scripts/extract-from-url/`.
Legacy snapshot files may remain under `.claude/skills/design-md/` during transition, but they are not authoritative. Do not edit or call them for extractor behavior.

## When To Invoke

- User asks to extract design from a public URL.
- User wants tokens, component properties, motion, stack/style fingerprints, or a render contract from a site.
- User wants drift detection between a live URL and a local `DESIGN.md`.
- User wants a downstream contract for UI generation tools such as Tailwind, shadcn, v0, Lovable, Cursor, or internal design-gallery surfaces.

Skip if the user wants finished TSX components directly; use the relevant build/generation workflow after `/design-md` has produced the contract.

## Quick Run

```bash
node .claude/skills/design-md/run.cjs --url https://www.anthropic.com/
```

The launcher delegates to:

```bash
node squads/design-ops/scripts/extract-from-url/run.cjs --url https://www.anthropic.com/
```

## Outputs

Output lands in `outputs/design-ops/url-extracts/{company}/` or `history/{timestamp}/` depending on promotion scoring.

```text
DESIGN.md                  # canonical visual source of truth
tokens.json                # parsed frontmatter plus deterministic enrichment
tokens-extended.json       # deeper extracted sidecar: components, shadows, motion, layout, dark slots
render-contract.json       # stable internal contract for rendering/generation
extraction-log.yaml        # provenance and confidence summary
lint-report.json           # @google/design.md lint result
quality-score.json         # A-F quality breakdown
agent-prompt.txt           # compact prompt for downstream UI agents
preview.html               # standalone visual preview
drift-report.json          # only with --compare
inputs/css-collected.css
inputs/tokens-detected.json
inputs/css-vars-detected.json
inputs/font-faces.json
inputs/embedded-fonts.json
inputs/component-properties.json
inputs/motion.json
inputs/token-usage-graph.json
inputs/theme-default.json
inputs/stack-summary.json
inputs/style/diagnostic sidecars
```

## Flags

| Flag | Notes |
|---|---|
| `--url <url>` | Required public `http(s)` URL |
| `--out <dir>` | Override output directory |
| `--prompt <file>` | Override prompt template |
| `--compare <file>` | Emit drift report against local `DESIGN.md` |
| `--provider <id>` | `claude-cli`, `codex-cli`, `openrouter`, `openai`, `anthropic-api`, or `generic-http` |
| `--model <id>` | Provider-specific model override |
| `--budget <tier>` | `cheap`, `standard`, or `premium` profile |
| `--max-cache-age <h>` | Static phase reuse TTL |
| `--max-llm-cache-age <h>` | LLM phase reuse TTL |
| `--scaffold` | Emit a v2.2 design.md scaffold from extracted sidecars |
| `--gallery` / `--bundle-force` | Opt into derived `apps/design` materialization |
| `--no-content-gate` | Rare override for thin-content gate |
| `--no-llm-retry` | CI mode: fail hard on first LLM failure |

## Contract For Downstream Generators

Downstream HTML/Tailwind/gold-standard builders should consume `/design-md` as the evidence layer, not re-scrape or reinterpret the brand. Use this priority:

1. `render-contract.json` for theme mode, renderable component props, and warnings.
2. `tokens.json.preview_tokens` for concrete visual values used in live previews.
3. `tokens-extended.json` for extracted candidates, states, motion, shadows, spacing, and dark slots.
4. `inputs/component-properties.json`, `inputs/motion.json`, `inputs/font-faces.json`, and `inputs/css-collected.css` only when a generator needs raw evidence.
5. `DESIGN.md` for human-readable design intent, Do/Don't rules, and prompt context.

For Tailwind v4 Browser-CDN consumers:

- Emit literal values in `@theme`; do not use `var()` alias chains.
- Preserve commas inside arbitrary values such as `linear-gradient(...)` and `rgba(...)`.
- Prefer plain scoped CSS for component classes when `@apply` depends on custom theme tokens.
- Restore Tailwind preflight casualties intentionally: headings, lists, margins, and form control defaults.

## Tests

Run the canonical test suite:

```bash
node --test squads/design-ops/scripts/extract-from-url/lib/*.test.cjs \
  squads/design-ops/scripts/extract-from-url/lib/providers/*.test.cjs \
  squads/design-ops/scripts/extract-from-url/run.test.cjs
```

## Anti-Patterns

- Do not maintain a second implementation inside `.claude/skills/design-md/`; the launcher must delegate to `squads/design-ops/scripts/extract-from-url/`.
- Do not add browser automation to this extractor. Visual diffing and screenshot validation are downstream workflows.
- Do not write canonical business data to `workspace/` from this skill; extracted runs live under `outputs/design-ops/url-extracts/`.
- Do not fabricate fallback tokens. Missing evidence should remain explicit as an extraction gap.

## References

- Maintenance source: `squads/design-ops/scripts/extract-from-url/`
- Task contract: `squads/design-ops/tasks/extract-design-md-from-url.md`
- Tailwind consumption rule: `.claude/rules/tailwind-v4-rules.md`
- Schema: `squads/design-ops/templates/design-md.schema.json`
- Regression set: `squads/design-ops/data/regression-ds-set.yaml`
