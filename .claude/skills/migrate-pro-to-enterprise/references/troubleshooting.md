# Troubleshooting

## Core Not Detected

Error: `AIOX Core installation not detected`

Check the target path. The detector expects `.aiox-core/`, an installed Core manifest, a Core package, or an `aiox-core` bin marker.

## Pro Not Detected

Error: `AIOX Pro activation not detected`

Check for `pro-installed-manifest.yaml`, `pro-version.json`, `.aiox-core/pro-config.yaml`, `.aiox-core/feature-registry.yaml`, an installed `@aiox-squads/pro` package, or a `pro/` submodule.

## Enterprise Source Invalid

Error: `AIOX Enterprise source not detected`

Use a sanitized Enterprise source that contains:

- `enterprise-config.yaml`
- `.aiox-sync.yaml`
- `package.json` with name containing `aiox-enterprise`
- `scripts/hub-sync.js`

## Entitlement Missing

Error: `Enterprise entitlement required`

Set `AIOX_ENTERPRISE_KEY` for real migrations. Use `AIOX_ENTERPRISE_TEST_FIXTURE=1` only in hermetic tests.

## File Conflict

Changed files are backed up before overwrite when the manifest policy allows overwrite. Files with `copy-if-missing`, `preserve`, or `deny` are not overwritten.

## Doctor Failure

If `aiox doctor --json` is available in the target, its result is captured in `.aiox/enterprise-upgrade-manifest.yaml`. Treat doctor failures as local gate failures before DevOps publication.
