# Extracted from: .claude/skills/wave-execute/SKILL.md (ATM-WE-002 — Validate Story Drafts)
# Part of: SP-WAVE-EXECUTE process
# Version: 1.1.0

# Story Validation — 10-Point Checklist

Used by **@po** during ATM-WE-002 (MOL-WE-001: Story Validation).
Minimum validation score for PASS: **TK-WE-003 (8.0)**.

## Checklist

Validate Story `{id}` against 10-point checklist:

1. [ ] Title follows naming convention (`STORY-{epic}.{N}-KEBAB-CASE.md`)
2. [ ] All ACs are testable and verifiable (concrete pass/fail criteria)
3. [ ] `executor` field is non-empty
4. [ ] `quality_gate` field is non-empty AND different from executor
5. [ ] `depends_on` references exist and are Done or from prior completed wave
6. [ ] Effort estimate present and reasonable (flag if > TK-WE-017 hours)
7. [ ] `repo_target` present and matches epic/wave target
8. [ ] Tasks list non-empty with logical sequence
9. [ ] `dev_notes` provide sufficient context for executor to implement
10. [ ] No duplicate ACs with sibling stories in same wave

## Wave-Aware Enrichment (applied after checklist)

- Update ACs based on prior wave results (decisions made, packages published, etc.)
- Apply effort calibration from retrospective or TK-WE-019
- Verify all `depends_on` stories are Done (or from prior completed wave)
- Apply corrections directly to story file
- Mark story status: `Ready`
- Log in Change Log: `{date} | @po | Validated for Wave {N}`

## Governance Checkpoints (CHK-1 / CHK-2 / CHK-3)

- **CHK-1:** Story status must be Draft or Ready (not InProgress by another)
- **CHK-2:** `executor` and `quality_gate` fields non-empty
- **CHK-3:** Sensitive domain check — see `data/sensitive-domain-mapping.yaml`

## On Failure

Story fails validation -> status stays Draft, user notified with specific issues.
