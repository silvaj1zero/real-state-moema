---
name: migrate-pro-to-enterprise
description: Use to migrate an existing AIOX Core + Pro project to AIOX Enterprise with CLI-first dry-run, approval, transactional apply, validation, rollback, and DevOps handoff.
---

# Migrate Pro To Enterprise

Use this skill from the AIOX Enterprise source repository. Core and Pro projects should not receive this skill until an Enterprise upgrade has been explicitly planned, approved, and applied.

## Workflow

### 1. Diagnose

Confirm the target is the project to migrate, then run:

```bash
aiox enterprise upgrade --target <target> --enterprise-source <enterprise-source> --dry-run --plan <target>/outputs/enterprise-upgrade-plan.yaml
```

Do not proceed if the command reports missing Core, missing Pro, or invalid Enterprise source.

### 2. Plan

Read the generated plan. Check:

- `mode: dry-run`
- `installedCore.detected: true`
- `installedPro.detected: true`
- `enterprise.valid: true`
- `migrationManifest.allowlistCount`
- `blockedOps` contains `.env*`, `workspace/businesses/**`, `outputs/**`, `docs/stories/**`

### 3. Approve

Before apply, get explicit human approval for the plan. Enterprise entitlement must be present through `AIOX_ENTERPRISE_KEY`, except in test fixtures where `AIOX_ENTERPRISE_TEST_FIXTURE=1` is allowed.

### 4. Apply

After approval:

```bash
aiox enterprise upgrade --target <target> --enterprise-source <enterprise-source> --apply
```

The CLI is the source of truth. Do not reimplement copy, merge, backup, checksum, or rollback logic in the skill.

### 5. Validate

Inspect `<target>/.aiox/enterprise-upgrade-manifest.yaml` and verify it includes:

- `status: success`
- `copied`
- `merged`
- `preserved`
- `denied`
- `backedUp`
- `validated`
- `errors: []`

Confirm `pro/`, `pro-installed-manifest.yaml`, and `pro-version.json` still exist.

### 6. Rollback Or Handoff

If validation fails:

```bash
aiox enterprise upgrade rollback --manifest <target>/.aiox/enterprise-upgrade-manifest.yaml
```

After local gates pass, hand publication to `@devops`. Only `@devops` should push, open PRs, or release.

## References

- [Migration Policy](references/migration-policy.md)
- [Troubleshooting](references/troubleshooting.md)
