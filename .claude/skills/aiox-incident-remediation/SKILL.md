---
name: "aiox-incident-remediation"
description: "Use for operator-private leak incident response in the multi-tenant AIOX Enterprise repository: freeze workflows, audit GitHub PR residue, prepare Support evidence, and verify closeout."
version: "1.0.0"
activation_type: "manual"
user-invocable: true
effort: "high"
maxTurns: 30
---

# AIOX Incident Remediation

Use this skill when operator-private content may have reached a branch, PR, issue, comment, fork, search result, or GitHub-managed historical surface in the multi-tenant `AIOXsquad/AIOX-enterprise` repository.

## Non-Negotiables

- Stop push, deploy, full-sdc, story-cycle, and agent-team workflows in the affected checkout.
- Do not paste raw private file contents, secret values, customer data, or unredacted file lists into multi-tenant issues.
- Preserve private work only in an operator-owned private remote.
- Treat PR `/files`, PR commits, PR diff/patch media views, timeline edit history, repository events, direct SHA URLs, and forks as separate cleanup surfaces.
- Escalate GitHub-managed historical refs/caches to the repository owner and GitHub Support.

## Workflow

1. Read `docs/runbooks/operator-private-leak-incident-response.md`.
2. Capture the affected repo, PRs, issues, branches, tags, forks, and first known exposure window.
3. Run local prevention checks:

   ```bash
   npm run validate:operator-boundary
   ```

4. Generate a read-only GitHub residue audit:

   ```bash
   node scripts/aiox-incident-remediation.js audit \
     --repo AIOXsquad/AIOX-enterprise \
     --prs <comma-separated-prs> \
     --commits <comma-separated-shas> \
     --issues <comma-separated-issues> \
     --diff-patch \
     --traffic
   ```

   The audit suppresses PR head branch names by default and reports diff/patch status plus byte counts without printing diff contents. Add `--include-head-refs` only for private Support evidence, not for multi-tenant issue comments.

5. Remove active exposure that repo admins can mutate: close unsafe PRs, delete unsafe branches/tags after private backup, redact issue/PR bodies, delete or minimize comments where authorized, and remove revealing labels/milestones.
6. File or update a GitHub Support request for support-only residue. Include counts and refs from the audit, not raw private content.
7. Track all remaining support-only blockers in one issue until Support confirms cleanup or the owner explicitly dispositions the residue.
8. Before closing the parent incident, re-run the audit with `--fail-on-residue` and confirm every affected surface is cleaned or explicitly dispositioned.

## Evidence Format

Prefer concise issue comments:

- what was cleaned
- what remains
- exact owner of the remaining action
- command/check that produced the evidence
- timestamp in UTC

Use `docs/guides/onboarding/fork-policy-addendum.md` when the incident involves forks.
