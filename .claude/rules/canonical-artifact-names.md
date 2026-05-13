---
paths:
  - "workspace/_system/config.yaml"
  - "workspace/businesses/**/document-registry.yaml"
  - "squads/**/config.yaml"
  - "squads/**/squad-io.yaml"
  - "scripts/sinkra/**"
  - "scripts/validate-artifact-refs.js"
  - "scripts/validate-file-refs.js"
---

# Canonical Artifact Name Policy (CANP) — Sinkra Hub

Applies when renaming, creating, or referencing workspace artifacts (L0-L4).

## Rule (NON-NEGOTIABLE)

**Artifact names are stable contracts. Once an artifact reaches POPULATED state in `document-registry.yaml`, its name freezes.**

A rename of a POPULATED artifact requires:
1. A migration story in `docs/stories/`
2. Alias entry in `workspace_artifact_registry` with `alias_ttl` ≤ 90 dias
3. Execution via `sinkra:rename-artifact` CLI (nunca manual)

## Why

Renaming `brandbook.yaml` → `brand-platform.yaml` cost 113 edits across 32 files with 5 failed attempts. Analysis of 10 codebases showed that **NONE has rename CLI** — prevention through naming stability is the universal pattern (Helm values.yaml, Claude Code skills, Pulumi resources).

Benchmarks:
- **Claude Code**: dir name = ID, never changes (filesystem convention)
- **Helm**: values.yaml fields never renamed (convention)
- **gStack**: template compilation eliminates the need to rename paths
- **Pulumi**: aliases are migration bridges with TTL, not permanent
- **GSD-OG**: 743 refs of ROADMAP.md proves the cost of naming instability

## Artifact Name Lifecycle

```
CREATED (PLACEHOLDER) → ACTIVE (DRAFT) → STABLE (POPULATED) → FROZEN (VALIDATED+)
                                              |
                                              └─ Rename requires CANP compliance
```

| State | Rename allowed? | Migration required? |
|-------|----------------|---------------------|
| PLACEHOLDER | Sim | Nao |
| DRAFT | Sim | Nao |
| POPULATED | Apenas via CANP | Sim (alias + migration story) |
| VALIDATED | Apenas via CANP | Sim |
| APPROVED | Bloqueado sem ADR | Sim + ADR + aprovacao |

## Alias Lifecycle (Pulumi Pattern)

Aliases em `workspace_artifact_registry` sao **migration bridges temporarios**, nao permanentes.

```
CREATED → ACTIVE (in use) → EXPIRING (TTL < 30 dias) → EXPIRED → REMOVED
```

| Phase | Duration | Validator Behavior |
|-------|----------|-------------------|
| ACTIVE | alias_ttl > now + 30d | PASS |
| EXPIRING | alias_ttl - now <= 30d | INFO (visible in reports) |
| EXPIRED | alias_ttl <= now | WARN (or ERROR in --strict) |
| REMOVED | After validator confirms zero usage | Manual removal from registry |

**Default TTL:** 90 dias. Configurable per alias.

## Enforcement

| Check | Validator | Mode |
|-------|-----------|------|
| Alias TTL expiration | `validate:artifact-refs` | Advisory default; `--strict` for blocking |
| Hardcoded paths (should use `artifact_ref`) | `validate:artifact-refs` | Advisory |
| Broken refs cross-file | `validate:file-refs` | Advisory |
| Registry drift (registry vs filesystem) | `validate:artifact-refs --check` | Blocking in CI |

## Anti-Patterns

- **NUNCA** renomear artefato POPULATED sem alias + migration story
- **NUNCA** criar alias sem `alias_ttl` (acumulam como "symlink rot")
- **NUNCA** estender `alias_ttl` em vez de migrar consumers para canonical ID
- **NUNCA** editar arquivos manualmente para renomear — sempre usar `sinkra:rename-artifact`

## Command Reference

```bash
# Rename artifact (atomic, rollback on failure)
npm run sinkra:rename-artifact -- --from <old> --to <new> --squad <name>

# Resolve artifact ID to physical path
npm run sinkra:resolve-artifact <id> <business> [--product <slug>]

# Validate artifact_ref usage + drift + alias TTL
npm run validate:artifact-refs          # advisory
npm run validate:artifact-refs -- --check    # drift check (CI)
npm run validate:artifact-refs -- --strict   # alias TTL blocking

# Validate cross-file references (broken links)
npm run validate:file-refs
```

## Reference

- ADR: `docs/adrs/ADR-015-artifact-path-indirection.md`
- Epic: `docs/stories/epic-124/`
- Registry: `workspace/_system/config.yaml` `workspace_artifact_registry`
- Heuristic: AN_KE_153 (Artifact Path Indirection via Registry)
