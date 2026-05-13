# Output Quality Checklist — Per-Phase Minimum Checks

## Phase 0: Scoping
- [ ] `scope-document.yaml` exists and > 500 bytes
- [ ] Contains `quality_scenarios` with at least 3 scenarios
- [ ] Contains `boundaries.included` and `boundaries.excluded`
- [ ] Contains `stakeholders` with at least 1 entry
- [ ] Contains `view_selection` mapping scenarios to views
- [ ] Contains `tool_plan` based on stack detection

## Phase 1: Context Recovery
- [ ] `c4-context.md` contains valid Mermaid `C4Context` syntax
- [ ] Diagram has a `title`
- [ ] At least 1 `Person` and 1 `System` element
- [ ] All external systems have technology labels
- [ ] All relationships have verb + protocol
- [ ] `tech-inventory.yaml` lists detected technologies

## Phase 2: Static Extraction
- [ ] `fact-database.yaml` exists and > 1000 bytes
- [ ] `dependency-graph.md` contains Mermaid graph or tool output
- [ ] `er-diagram.md` contains Mermaid erDiagram (if DB detected)
- [ ] `api-surface.yaml` lists endpoints (if API detected)
- [ ] Each file has `[CONFIDENCE: HIGH|MEDIUM|LOW]` tag
- [ ] Tool-extracted data marked HIGH, LLM-inferred marked MEDIUM/LOW

## Phase 3: View Fusion
- [ ] `c4-container.md` contains valid Mermaid `C4Container` syntax
- [ ] Every container has name + technology + description
- [ ] System boundary defined with `System_Boundary`
- [ ] External systems shown outside boundary
- [ ] `view-consistency.yaml` cross-references Phase 1 and Phase 2

## Phase 4: Dynamic Analysis (if not skipped)
- [ ] At least 1 sequence diagram in Mermaid syntax
- [ ] `entry-points.yaml` catalogs main/handler/route files
- [ ] If skipped: `SKIPPED.md` exists with reason

## Phase 5: Domain & Data Recovery
- [ ] `domain-map.yaml` lists bounded contexts
- [ ] `rule-catalog.yaml` classifies rules by Ross taxonomy
- [ ] Each rule has: name, type, source (file:line), confidence
- [ ] `decision-model.yaml` contains at least 1 decision table
- [ ] `sbvr-rules.md` expresses rules in natural language

## Phase 6: Architecture Synthesis
- [ ] `arc42-architecture.md` > 2000 bytes
- [ ] At least §3 (Context), §5 (Building Blocks), §9 (Decisions) populated
- [ ] C4 diagrams from Phase 1+3 embedded in correct sections
- [ ] `atam-analysis.yaml` maps scenarios to architectural approaches
- [ ] `risk-inventory.yaml` lists sensitivity/tradeoff points
- [ ] `G3-signoff.md` template created

## Phase 7: Validation & Conformance
- [ ] `conformance-report.yaml` contains convergences, divergences, absences
- [ ] Every module from Phase 3 appears in mapping
- [ ] Divergences have severity classification (HIGH/MEDIUM/LOW)
- [ ] Divergences have category (structural/interface/layering/convention)
- [ ] Drift ratio calculated
- [ ] `risk-inventory-final.yaml` merges ATAM + conformance risks

## Phase 8: Documentation & Decisions
- [ ] `arc42-final.md` integrates conformance findings
- [ ] `adr/` directory has at least 1 ADR in MADR format
- [ ] `executive-summary.md` is under 500 words
- [ ] `fitness-functions.yaml` defines automated checks
