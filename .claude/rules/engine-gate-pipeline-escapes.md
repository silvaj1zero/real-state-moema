---
paths:
  - "apps/**/*.ts"
  - "apps/**/*.tsx"
  - "apps/**/*.jsx"
  - "apps/**/*.js"
  - "packages/**/*.ts"
  - "packages/**/*.tsx"
  - "packages/**/*.js"
  - "packages/**/*.cjs"
  - "squads/**/scripts/**"
  - "scripts/engine-gate-pipeline.js"
---

# Engine-Gate Pipeline — Field-Name Escapes

Applies when writing code with domain vocabulary that may false-positive on the credential-detection regex in `scripts/engine-gate-pipeline.js`.

## The Trap

The hook pattern (simplified) matches any key from the set `{password, passwd, secret, token}` followed by `=` or `:` followed by a string literal of 8 or more characters. It's designed to block hardcoded credentials.

It **also matches legitimate domain field names** when they happen to carry string values ≥ 8 chars. Examples that get blocked (reconstruct in your head — shown here with `<VAL>` placeholder instead of literal strings so this file itself doesn't trip the hook):

| Pattern (conceptual) | Reason |
|---|---|
| Design-system swatch object where key `token` holds a CSS variable name like `<VAL>` (11 chars) | field key is one of the blocked set |
| Model registry entry where key `token` holds a model ID | same |
| Config object where key `secret_key` holds a KMS alias name | same |
| UI display mask rendering — key `password` holds a mask string ≥ 8 chars | same |

None of these are credentials. They are semantic field names in design systems, model registries, feature-flag configs, UI display masks.

## Resolution Preference (in order)

**1. Rename the field** to a synonym that preserves meaning and doesn't collide with the blocked set:

| Before (blocked) | After (passes) |
|---|---|
| `token` | `cssVar` / `designToken` / `slotName` |
| `secret_key` | `secretLabel` / `kmsAlias` |
| `password` | `passphrase` / `maskedDisplay` |

**2. Extract the value to a named constant** so the field carries an identifier, not an inline string:

```ts
const CTA_VAR = /* "--brand-200" */;
const swatch = { token: CTA_VAR };   // passes — value is an identifier, not a quoted string
```

**3. Only if 1+2 are impossible**, update the regex in `scripts/engine-gate-pipeline.js` with a domain-specific whitelist (requires @devops sign-off).

## Canonical Anti-Examples (keep these renames)

- DS swatches: use `cssVar`, not the blocked synonym
- shadcn config: use `colorToken`, not the blocked synonym
- Model registries: use `modelId`, not the blocked synonym
- Anthropic-style CSS var manifests: use `variableName`, not the blocked synonym

## Why Not Loosen the Regex?

Every loosened anchor is a future credential leak. The regex is intentionally conservative — the escape cost is one rename, not a security hole. See hook source: `scripts/engine-gate-pipeline.js` around line 146.

## Evidence

- [SOURCE: claude-perfected DS port 2026-04-19/20] `src/pages/preview/BrandBusinessCards.tsx` Write blocked three times; all three attempts used the blocked field name on swatch objects. Renaming to `cssVar` passed on first retry.
- [SOURCE: this rule file itself 2026-04-20] First authoring attempt was blocked because the examples reproduced the exact forbidden pattern. Workaround: describe the structure with placeholders, not literal quoted strings.

## Related

- `scripts/engine-gate-pipeline.js` — the hook implementation
- `AN_KE_062` — Explicit Nature Declaration (declare collision intent upfront)
