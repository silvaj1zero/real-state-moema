# Phase Gates G0-G4 — Quality Gate Checklist
# Blocker B1 resolution: G3 human-blocking signoff requirement
# RT-DD-V2-001 Decision D5 + @qa findings F1, F2

## Gate G0: Scope → Extraction

**Type:** non-blocking
**Between:** Phase 0 (Scoping) → Phase 1+2 (Context + Static)

- [ ] Scope document exists and > 200 words
- [ ] Q1-Q5 all answered (target, type, format, contexts, depth)
- [ ] Source code accessible: `ls outputs/decoded/{slug}/source/` returns > 0 files
- [ ] Stack detected (package.json, requirements.txt, go.mod, Cargo.toml, or manual)

**On fail:** Request clarification from user. Do not proceed.

---

## Gate G1: Extraction → Fusion

**Type:** blocking
**Between:** Phase 1+2 → Phase 3 (View Fusion)

- [ ] Context Recovery output exists: `ls outputs/decoded/{slug}/phase-1-context/`
- [ ] Static Extraction output exists: `ls outputs/decoded/{slug}/phase-2-extraction/`
- [ ] Each output file > 1000 bytes: `wc -c > 1000`
- [ ] No VETO/BLOCKED/FAILED in outputs: `grep -rl "VETO\|BLOCKED\|FAILED"` returns empty
- [ ] Dependency graph has edges: extracted dependency data contains relationships (N_edges > 10 for non-trivial repos, or justified for small repos)
- [ ] Cross-reference: technologies in Phase 1 context match files found in Phase 2 extraction

**On fail:** Re-run failed phase. If static tools failed (exit code != 0), fall back to LLM-only extraction with `[CONFIDENCE: REDUCED]` flag.

---

## Gate G2: Fusion → Synthesis

**Type:** blocking
**Between:** Phase 3 (View Fusion) → Phase 6 (Architecture Synthesis)

- [ ] Composed view output exists: `ls outputs/decoded/{slug}/phase-3-fusion/`
- [ ] Each output file > 1000 bytes
- [ ] No VETO/BLOCKED/FAILED
- [ ] All components in Phase 3 view exist in Phase 2 extraction (cross-reference check)
- [ ] No orphan components (components in view without source evidence)
- [ ] YAML schema valid (if output is YAML)
- [ ] C4 L2 diagram references at least 3 components

**On fail:** Review fusion logic. Orphan components must be either justified (inferred from runtime) or removed.

---

## Gate G3: Synthesis → Validation

**Type:** HUMAN-BLOCKING (NON-NEGOTIABLE)
**Between:** Phase 6 (Architecture Synthesis) → Phase 7 (Validation)
**Requires:** `requires_human_signoff: true`

### Why Human-Blocking

LLM hallucination in architecture synthesis is mathematically inevitable (proven via
diagonalization). 70% accuracy on structural classification means 30% of architecture
claims may be incorrect. Human domain expert review is the ONLY reliable mitigation
for this failure mode.

### Signoff Protocol

1. Pipeline generates Phase 6 output (Arc42 architecture document)
2. Pipeline creates signoff template: `outputs/decoded/{slug}/phase-6-synthesis/G3-signoff.md`
3. **HALT** — Pipeline pauses and notifies user
4. Human reviews Phase 6 output and fills G3-signoff.md:
   ```markdown
   # G3 Signoff — Architecture Synthesis Review
   
   **Reviewer:** {name}
   **Date:** {date}
   **Verdict:** APPROVED | APPROVED_WITH_NOTES | REJECTED
   
   ## Notes
   {reviewer notes, corrections, concerns}
   
   ## Corrections Applied
   - [ ] {correction 1}
   - [ ] {correction 2}
   ```
5. Pipeline verifies signoff file exists and verdict != REJECTED
6. If REJECTED → return to Phase 6 with reviewer notes as input

### Automated Checks (run BEFORE human review)

- [ ] Arc42 output has >= 6 of 12 sections filled
- [ ] System context diagram (§3) has >= 3 components
- [ ] Building block view (§5) references modules from Phase 2
- [ ] No section marked `[LLM-INFERRED]` without supporting evidence from earlier phases
- [ ] Cross-reference: architectural patterns claimed in §4 have evidence in §5

**On fail (automated):** Flag issues to reviewer. Do NOT block — human decides.
**On fail (human REJECTED):** Return to Phase 6 with correction notes.

---

## Gate G4: Validation → Documentation

**Type:** blocking
**Between:** Phase 7 (Validation) → Phase 8 (Documentation)

- [ ] Conformance report exists: `ls outputs/decoded/{slug}/phase-7-validation/`
- [ ] Each output file > 500 bytes
- [ ] No VETO/BLOCKED/FAILED
- [ ] Risk inventory has >= 3 risks identified (proves validation was actually executed)
- [ ] Conformance/drift analysis completed (file present)
- [ ] Technical debt items catalogued (if any found)

**On fail:** Phase 7 must be re-run with broader scope. Empty risk inventory suggests validation was superficial.

---

## Phase 4 Opt-Out Criteria

Phase 4 (Dynamic Analysis) is **optional** with explicit opt-out:

**MANDATORY when:**
- System has async/concurrent code patterns (detected in Phase 2)
- System uses microservices architecture (detected in Phase 3)
- System uses event-driven patterns (message queues, pub/sub)
- System has complex runtime behavior not visible in static analysis

**OPTIONAL (can skip) when:**
- System is a static site, CLI tool, or library
- System has no async patterns
- No runtime environment available for instrumentation
- User explicitly opts out in Phase 0 scope

**Skip documentation:** If Phase 4 is skipped, document reason in `outputs/decoded/{slug}/phase-4-dynamic/SKIPPED.md`

---

*Phase Gates v1.0 — RT-DD-V2-001*
*@qa findings F1 (G3 human-blocking), F2 (measurable criteria), F3 (Phase 4 opt-out)*
