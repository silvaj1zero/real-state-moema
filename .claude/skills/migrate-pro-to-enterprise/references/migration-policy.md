# Migration Policy

The Enterprise migration is CLI-first and brownfield-safe. This policy belongs to AIOX Enterprise; Core and Pro only provide the CLI substrate.

## Gates

1. `--dry-run` must pass before `--apply`.
2. AIOX Core must be detected.
3. AIOX Pro must be detected.
4. Enterprise source must contain `enterprise-config.yaml`, `.aiox-sync.yaml`, `package.json` named `aiox-enterprise`, and `scripts/hub-sync.js`.
5. Apply requires `AIOX_ENTERPRISE_KEY` or `AIOX_ENTERPRISE_TEST_FIXTURE=1`.

## Preservation

These paths are preserved by default:

- `.env*`
- `workspace/businesses/**`
- `outputs/**`
- `docs/stories/**`

Hard-deny paths such as `.git/**`, `node_modules/**`, and secret/PII/founder-like filenames must never be copied, even if a broad allowlist would otherwise match.

## Apply

Apply writes `.aiox/enterprise-upgrade-manifest.yaml` in the target. Existing changed files are backed up before overwrite under `.aiox/enterprise-upgrade-backups/{timestamp}/`.

## Rollback

Rollback restores files listed in `backedUp`:

```bash
aiox enterprise upgrade rollback --manifest <target>/.aiox/enterprise-upgrade-manifest.yaml
```

Rollback is not a git operation. It restores backed-up files only.
