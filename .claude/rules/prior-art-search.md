---
paths:
  - "squads/**/tasks/**"
  - "squads/**/skills/**"
  - ".claude/skills/**"
  - "docs/stories/**"
  - "docs/adrs/**"
---

# Prior-Art Search — Universal Rule

Applies to any agent, skill, or process claiming that something is missing, absent, or needs to be CREATE'd.

## Rule (NON-NEGOTIABLE)

**Before declaring any artifact, script, task, capability, or pattern as "missing" — you MUST PROVE absence with a documented search.** Unverified gaps fossilize into fictional architecture and downstream work. Burden of proof is on the claimant.

## Why

Observed in `/sinkra-map-process` run on "criacao-slides-ia" (2026-04-20):
- Process-discoverer declared 5 gaps, backed each with a Prior-Art row (Grep/Glob command, match count, verdict)
- Infrastructure-mapper declared 6 CREATE items, backed each with Prior-Art showing no existing candidate
- Score_card flagged this discipline as key reason for 92/100 map-readiness

Without Prior-Art Search:
- Agents hallucinate gaps that already have solutions (REUSE violated)
- Stories get created for work already done elsewhere (waste)
- New scripts/tasks/artifacts get CREATE'd when ADAPT would suffice (duplication)
- `.claude/rules/ids-principles.md` (REUSE > ADAPT > CREATE) becomes aspiration without mechanism

## Required Evidence Format

Every claim of "X is missing / X does not exist / X needs to be created" MUST have a Prior-Art row:

```yaml
- claim: "X is missing"
  search_performed:
    tool: Grep | Glob | Bash(find/ls)
    pattern: "<regex or glob>"
    scope: "<paths searched, e.g. squads/** scripts/** .aiox-core/**>"
  matches: <count>
  match_samples: [<top 3 paths or "none">]
  verdict: CONFIRMED_ABSENT | PARTIAL_MATCH_ADAPT | FOUND_REUSE | FOUND_ALREADY_DONE
  rationale: "<why this verdict, 1 sentence>"
```

## Where to Run

Minimum search scope before declaring absence:
1. `squads/**` (all squad definitions, agents, tasks, workflows, scripts, data)
2. `scripts/**` (repo-wide scripts)
3. `.aiox-core/**` (framework core)
4. `.claude/**` (rules, skills, agents, commands)
5. `packages/**` (if claiming a package/module is missing)
6. `apps/**` (if claiming an app/route is missing)
7. `infrastructure/**` (if claiming infra is missing)

Scopes can be reduced ONLY with justification (e.g. "business-specific artifact, scope limited to `workspace/businesses/{slug}/`").

## When Required

| Activity | Prior-Art required? |
|---|---|
| Declaring a GAP in process discovery | **Yes** — mandatory per row |
| Marking a task as CREATE in executor/infra classification | **Yes** — mandatory per task |
| Proposing a new script, package, rule, or agent | **Yes** |
| Proposing a new ADR or module | **Yes** |
| Claiming "no existing pattern exists" anywhere | **Yes** |
| Continuing existing, documented work | No |
| Bug fix where the bug is already reproduced | No |

## Admissibility

Any claim of absence WITHOUT a Prior-Art row:
- In discovery artifacts (`as_is_doc.md`, `process_map.yaml`) → MUST be removed or backed
- In gap analyses (`capability_gaps.md`, `gap_analysis.md`) → INADMISSIBLE (CREATE tag void)
- In stories (`docs/stories/`) → requires `@po` challenge during validation
- In ADRs → requires `@architect` challenge during review

## Integration

| Skill/Task | Prior-Art enforcement point |
|---|---|
| `/sinkra-map-process` P01 | `gap count declared == Prior-Art rows count` (chief check) |
| `/sinkra-map-process` P07a | `CREATE count == Prior-Art rows count` (chief check) |
| `/validate-story-draft` | PO scans story for absence claims without evidence |
| `/review-story` | QA flags CREATE stories that lack Prior-Art in context |
| `full-sdc` | Executor must cite Prior-Art before CREATE'ing any helper |

## Heuristic (for agents)

When you would write "this does not exist" / "there is no" / "we need to create":
1. STOP
2. Run the Grep/Glob/Bash search
3. Document it
4. Write the claim ONLY if the verdict supports it

## Related

- `.claude/rules/ids-principles.md` — REUSE > ADAPT > CREATE (this rule is the evidence layer for IDS)
- `.claude/rules/epistemic-standards.md` — confidence tagging (Prior-Art is one form)
- `squads/sinkra-squad/tasks/discover-process.md` — P01 prior-art protocol (first formalization)
- `squads/sinkra-squad/tasks/map-infrastructure.md` — P07a prior-art protocol

## Anti-Patterns

- **"I think X is missing"** — opinion without search. Inadmissible.
- **"Grep returned 0 results in squads/sinkra-squad/"** — scope too narrow; not repo-wide.
- **"It's new, so no prior-art"** — novelty doesn't exempt; search for similar patterns that could ADAPT.
- **"Obviously missing"** — obvious to whom? Document search anyway; 10 minutes saves a week.

---

*Origin: DEV-2026-001 review + criacao-slides-ia score_card.yaml findings (2026-04-20).*
