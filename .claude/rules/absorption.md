---
paths:
  - "docs/stories/epic-112/**"
  - "docs/architecture/absorption-contracts.md"
  - "packages/core/**"
---

# Absorption — EPIC-112 Ruflo Surgical Absorption

Applies when porting code from external repositories (Ruflo or other sources) into Synkra Hub.

> Status: ACTIVE | Epic: 112 | Approved by Roundtable (5 agents, 7.9/10) + Thiago (2026-04-10)

## Decision Tree

```
Código externo sendo portado para o Hub?
│
├── Está na NO_ABSORB list?
│   └── SIM → BLOCK. Sem exceção. Retornar ao desenvolvedor.
│
├── Tem story em docs/stories/epic-112/?
│   └── NÃO → BLOCK. Criar story antes de portar.
│
├── Contém import/require de @ruvector/*?
│   └── SIM → BLOCK. Remover dependência antes de continuar.
│
├── Tipos foram adaptados para Hub conventions?
│   └── NÃO → BLOCK. Adaptar tipos (PascalCase, kebab-case files, Hub entity types).
│
├── Testes escritos com >80% coverage?
│   └── NÃO → BLOCK. Escrever testes antes de merge.
│
└── Rollback path documentado na story?
    └── NÃO → BLOCK. Documentar rollback antes de merge.
```

## Regras de Absorção (NON-NEGOTIABLE)

**R1 — Story-Driven Port:** Todo módulo portado DEVE ter story em `docs/stories/epic-112/`. Sem story = sem port.

**R2 — Zero Dependências @ruvector/*:** Nenhum import/require/referência a `@ruvector/*`. Substituir por pure-TS antes do port. Validação: `grep -r "@ruvector" packages/core/src/` deve retornar 0.

**R3 — Tipos Adaptados:** Tipos Ruflo (`MemoryEntry`, `SwarmConfig`, etc.) NÃO importados diretamente. Cada módulo define tipos alinhados com Hub: kebab-case files, PascalCase types, compatíveis com `kg_entities` schema.

**R4 — Testes Obrigatórios:** Unit tests >80% line coverage + 1 integration test end-to-end. Localização: `packages/core/src/__tests__/{module}/`. Script `npm run test:absorption`.

**R5 — NO_ABSORB List:** Bloqueados unanimemente:

| Item | Razão |
|------|-------|
| `@claude-flow/neural` (inteiro) | Depende de @ruvector/sona |
| `consensus/byzantine.ts` | Complexidade sem use case |
| `@ruvector/*` (qualquer pacote) | Dependency chain tóxica |
| `@claude-flow/browser` | Fora do scope do Hub |
| `@claude-flow/plugins` | Modelo incompatível com SINKRA |
| Guidance engine (como replacement do SYNAPSE) | SYNAPSE é canonical |
| `unified-coordinator.ts` (como coordination engine) | Paradigma incompatível (in-process TS vs LLM-native Agent tool) |

**Exceção:** Patterns e conceitos do Guidance (gates, continue-gate, optimizer) SÃO absorbíveis como SYNAPSE extensions. O engine em si NÃO.

**R6 — Rollback Path Documentado:** Cada story documenta: arquivos criados (delete), modificados (git revert), consumers atualizados (revert imports), branch com estado pre-port.

## Validation Commands

```bash
# Nenhum @ruvector ref no codebase
grep -r "@ruvector" packages/core/src/ && echo "FAIL" || echo "PASS"

# Coverage check
npm run test:absorption
```

## Reference

- Contracts: `docs/architecture/absorption-contracts.md`
- Epic: `docs/stories/epic-112/EPIC-112-RUFLO-SURGICAL-ABSORPTION.md`

---

*Absorption v2.0 — EPIC-112 | Merged governance + rules 2026-04-13*
