# Business Data Isolation

Applies when committing or pushing under any path matching `workspace/businesses/{slug}/`.

## Scope

This rule is **repo-conditional**. It applies ONLY when the active git repository is a **multi-tenant framework distribution** — specifically `AIOXsquad/AIOX-enterprise` and any future repo declared multi-tenant in CODEOWNERS.

In **single-tenant repos** (a licensee's own private repo, a sinkra-hub clone owned by one operator, etc.), this rule does not apply — `workspace/businesses/{slug}/` is the operator's own data and committing it is the intended workflow.

## Detection

Check the origin URL:

```bash
ORIGIN=$(git config --get remote.origin.url)
if echo "$ORIGIN" | grep -qE 'AIOXsquad/AIOX-enterprise(\.git)?$'; then
  # Multi-tenant — apply this rule
fi
```

## Rule (NON-NEGOTIABLE in scope)

When inside a multi-tenant framework repo:

1. `workspace/businesses/*` is gitignored except `_template/` (per ADR-051).
2. Any file tracked under `workspace/businesses/{slug}/` (other than `_template/`) is a violation — must be `git rm --cached` and the data moved to the operator's private repo.
3. `git push` operations that include diff content under those paths are blocked by `.claude/hooks/pre-push-validation.sh`.
4. `npm run validate:business-isolation` audits the tracked tree.

## Why

The Enterprise repo serves multiple licensees under NDA. Business-private data (pricing, ICPs, friend tax flags, commercial strategy) for any licensee must not be visible to other licensees who clone or `git pull` the same repo. ADR-051 fixed the file-tracking layer; this rule is the live operational guardrail.

The 15-vector audit in [issue #45](https://github.com/AIOXsquad/AIOX-enterprise/issues/45) (closed) catalogs the original incident.

## Enforcement points (only inside multi-tenant repo)

| Layer | Mechanism | Vector # in #45 |
|---|---|---|
| File tracking | `.gitignore workspace/businesses/*` + allowlist `_template/` | 2 |
| Tracked-tree audit | `scripts/validate-business-data-isolation.js` | 12 |
| Pre-push diff inspection | `.claude/hooks/pre-push-validation.sh` (gated by origin URL) | 6 |
| Branch protection | GitHub Ruleset 16001549 + CODEOWNERS | 4 |
| Agent persona | `@devops` "Multi-Tenant Boundary Awareness" principle | 5 |

## Out of scope

- **Client's own private repo** — operator pushes their `workspace/businesses/{slug}/` freely
- **`sinkra-hub`** — single-owner repo (founder), business workspaces commit normally
- **Branch protection** in client repos — clients decide their own
- **README "do not edit X"** advice — that's about framework files (`squads/`, `.aiox-core/`), not business data

## Anti-patterns

- Universal `Bash(git add workspace/businesses/*)` deny in `settings.json` — would break clients in their own repos. Use repo-conditional checks instead.
- Hardcoded path-blocking in `@devops` persona without origin-URL gate — ditto.
- Treating ADR-051 as "all business data is forbidden everywhere" — it's "forbidden in this multi-tenant repo only."

## Related

- ADR-051 — Repo Distribution Model (`docs/architecture/adrs/ADR-051-REPO-DISTRIBUTION-MODEL.md`)
- Issue #45 — Boundary violation audit (closed via ADR-051)
- `.claude/rules/artifact-classification.md` — what goes where (file-type level)
- `.claude/rules/hub-governance.md` — business isolation (governance level)
