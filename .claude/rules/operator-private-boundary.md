# Operator Private Boundary

Applies to every git operation, PR workflow, search/remediation workflow, and agent skill that can move content from a licensee checkout into the multi-tenant `AIOXsquad/AIOX-enterprise` repository.

## Contract

The multi-tenant repository may contain framework code, templates, generic squads, generic apps, services, packages, governance rules, validators, and docs.

Operator-private content is private by default and must not be committed, pushed, opened in PRs, copied into issue bodies, or referenced in comments against the multi-tenant repository. Business workspaces resolve through `AIOX_BUSINESS_WORKSPACE_ROOT` when set, with `workspace/businesses/` only as a local fallback. This includes:

- `workspace/businesses/{slug}/` except `_template/`
- generated `outputs/`
- private/custom `squads/` and `apps/`
- `.ai/`, `.aiox/`, `.synapse/`, and `private/` runtime state
- audit reports, decision logs, research outputs, story cards, secrets, customer lists, pricing, ICPs, and operator-specific prompts

## Required Checks

Before any push or PR creation, run:

```bash
npm run validate:operator-boundary
```

Before any automated workflow reads or writes business data, configure:

```bash
export AIOX_BUSINESS_WORKSPACE_ROOT="$HOME/aiox-private/workspace/businesses"
npm run sinkra:operator -- set <slug>
```

Framework code should resolve business paths through `packages/core/workspace-root/resolve.cjs`, not by assuming the multi-tenant checkout is the physical root.

Remote mutation must go through the wrappers:

```bash
AIOX_ACTIVE_AGENT=devops node scripts/aiox-safe-push.js <remote> <branch>
AIOX_ACTIVE_AGENT=devops node scripts/aiox-safe-pr.js --title "..." --body "..."
```

`origin` may point to the multi-tenant repository. Pushes to that origin require `AIOX_ALLOW_MULTITENANT_PUSH=1` and must be framework-only. Operator backup pushes must target the operator private remote.

## Incident Rule

If private content reaches a PR, issue, commit, comment, fork, or search index, stop normal workflow and use `docs/runbooks/operator-private-leak-incident-response.md`. Closing or redacting an issue is not sufficient; PR `/files`, PR commits, comments by other parties, forks, and timeline edit history can remain visible without owner/GitHub Support action.

## Related

- `docs/architecture/adrs/ADR-051-REPO-DISTRIBUTION-MODEL.md`
- `docs/architecture/adrs/ADR-FRAMEWORK-PRIVATE-BOUNDARY.md`
- `.claude/rules/business-data-isolation.md`
- `docs/runbooks/operator-workspace-root-contract.md`
- `scripts/validate-nda-boundary.js`
- `scripts/validate-protected-squads-sync.js`
