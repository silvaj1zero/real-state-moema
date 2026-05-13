---
name: materialize-doc
description: "Publishes workspace YAML artifacts (product-spec, offerbook, syllabus, lean-canvas, BMC, ICP, pricing) as readable ClickUp Docs in Markdown."
version: "1.0.0"
context: fork
agent: general-purpose
user-invocable: true
argument-hint: "<yaml-path> [--task-id <clickup-task-id>]"
---

# Materialize Doc

Transforma artefatos YAML do workspace em ClickUp Docs visuais para consumo humano.

## Quick Start

```
/materialize-doc workspace/allfluence/L1-strategy/offerbook.yaml
/materialize-doc workspace/allfluence/L1-strategy/icp.yaml --task-id abc123
```

## Workflow

Parse `$ARGUMENTS` to extract:
- `yaml_path` (required) -- path to the YAML artifact
- `--task-id` (optional) -- ClickUp task ID to link the Doc URL in a Custom Field

### Phase 1: Read and Parse YAML

1. Read the YAML file using the `Read` tool
2. Parse YAML content, extracting the frontmatter/metadata block:
   - `version` -- artifact version
   - `state` -- document lifecycle state (DRAFT, VALIDATED, APPROVED, etc.)
   - `owner` or `owner_squad` -- responsible squad
   - `layer` -- workspace layer (L0-L4)
   - `last_updated` -- last modification date
   - `document_id` -- registry ID if present
3. Identify the artifact type from the filename or a `type` field (e.g., offerbook, icp, bmc, lean-canvas, product-spec, syllabus, pricing-strategy, reverse-revenue-plan)
4. Detect any vocabulary constraints in the YAML (e.g., `vocabulary`, `terminology`, `glossary` fields) -- these MUST be respected in the output

### Phase 2: Transform YAML to Visual Markdown

Run `scripts/materialize-doc.js` which:

1. Reads the YAML file
2. Calls the Claude API (`@anthropic-ai/sdk`) with the style guide (from `references/style-guide.md`) as system prompt
3. Sends the raw YAML content as user message with transformation instructions
4. Receives polished Markdown back

**Style Guide Principles** (detailed in `references/style-guide.md`):

- **Structure** (visual-knowledge): Clear hierarchy with H1/H2/H3, visual separators, summary boxes at top
- **Language** (copy-squad): Active voice, concise, no jargon -- translate technical YAML keys to human-readable labels
- **Narrative** (storytelling-squad): Lead with context ("Por que este documento existe"), group related data into coherent sections
- **PT-BR**: Always use correct Portuguese accents
- **Vocabulary**: Honor any `vocabulary` or `terminology` constraints from the artifact (e.g., "sincronizar" not "automatizar" for cohort domain)

**Transformation Rules:**

- YAML keys become readable headers (e.g., `revenue_model` becomes "Modelo de Receita")
- Arrays become bulleted lists or tables depending on structure
- Nested objects become subsections
- Metadata becomes a styled header box with version, state, owner, layer, last_updated
- Empty/null values are omitted, never shown as "null" or "~"
- Monetary values formatted with R$ and thousands separator
- Percentages formatted with % symbol
- Dates formatted as DD/MM/YYYY

### Phase 3: Publish to ClickUp

1. Call `createDocWithContent()` from `services/clickup/docs.js`:
   ```javascript
   const { createDocWithContent } = require('../../services/clickup/docs');
   const result = await createDocWithContent({
     name: docTitle,       // e.g., "Offerbook AllFluence v2.1"
     content: markdown,    // transformed Markdown
     visibility: 'PRIVATE'
   });
   ```
2. The function returns `{ doc, page, url, id }`
3. Print the Doc URL for the user

### Phase 4: Link to Task (optional)

If `--task-id` was provided:

1. Use `services/clickup/custom-fields.js` to set the Doc URL in a text Custom Field on the task
2. Append a Journey Log entry to the task description:
   ```
   - [ENTREGA] Doc materializado: {doc_title} -- URL: {doc_url} (Pedro Valerio via materialize-doc)
   ```

## Environment Requirements

The script requires these environment variables:
- `ANTHROPIC_API_KEY` -- for Claude API calls
- `CLICKUP_API_KEY` -- for ClickUp Docs API
- `CLICKUP_TEAM_ID` -- ClickUp workspace ID

## Error Handling

- If YAML is malformed, report the parse error and stop
- If Claude API fails, retry once then report error
- If ClickUp API fails, save the generated Markdown to `docs/materialized/{filename}.md` as fallback
- If task_id is invalid, publish the Doc but warn about the linking failure

## VETO Conditions

- **VETO_NO_YAML**: `$ARGUMENTS` does not contain a valid .yaml or .yml path -- STOP and ask for path
- **VETO_EMPTY_YAML**: YAML file is empty or has no parseable content -- STOP and report
- **VETO_NO_API_KEY**: Missing ANTHROPIC_API_KEY or CLICKUP_API_KEY -- STOP and report which key is missing

## Resources

### scripts/materialize-doc.js

Main execution script. Reads YAML, calls Claude API for transformation, publishes to ClickUp.
Run with: `node .claude/skills/materialize-doc/scripts/materialize-doc.js <yaml-path> [--task-id <id>]`

### references/style-guide.md

Style guide for YAML-to-Markdown transformation. Loaded as system prompt for the Claude API call.
Contains principles from visual-knowledge, copy-squad, and storytelling-squad.
