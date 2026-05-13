---
paths:
  - "docs/stories/**"
  - ".aiox/**"
  - "squads/**/tasks/**"
---

# Task Lifecycle Rules — Sinkra Hub

Applies when managing task status transitions, starting tasks, or validating readiness.

## Source Heuristics

- `source_heuristic: PV_KE_012` — VMT como Gate Formal entre Qualified e Ready
- `source_heuristic: PV_KE_003` — Commit Debt (uncommitted changes threshold)

## VMT Gate: Qualified → Ready (PV_KE_012)

Toda task passando de `qualified → ready` DEVE executar VMT (Validation-Materialization-Test):

1. **Validate:** Inputs e dependências existem e estão acessíveis
2. **Materialize:** Pré-requisitos criados/disponibilizados
3. **Test:** Readiness confirmada — task pode começar

**Regra:** Dependências DEVEM ser re-verificadas no momento da execução, não apenas na validação inicial. Dependências podem ter sido resolvidas ou invalidadas entre validação e start.

**Anti-pattern:** Assumir que dependências validadas no passado ainda são válidas. Task começa com dependência não resolvida → bloqueia durante execução.

**Auto-move:** VMT GO → task auto-move para status `ready`.

## Commit Debt Threshold (PV_KE_003)

SE sessão tem > 20 arquivos modificados sem commit OU sessão > 2h com mudanças não commitadas:
ENTÃO parar implementação e commitar antes de continuar.

**Anti-pattern:** Acumular mudanças sem checkpoint — perda de trabalho em crash, dificuldade de rollback, PRs gigantes que ninguém revisa.

## Status Transitions (Unified Workflow)

```
captured → qualified → ready → doing → review → done
                                 ↓
                              blocked → (resolve) → doing
                                 ↓
                             cancelled
```

Transitions que requerem gates:
- `qualified → ready`: VMT obrigatório
- `doing → review`: Testes passando, PR criado
- `review → done`: QA sign-off

## Close-Task Registry Update (PV_KE_121)

SE task marcada como `done` → ENTÃO atualizar registries afetados ANTES de declarar conclusão.

**Regra:** Done sem registry update não é done. Registries que DEVEM ser verificados:
- `service-catalog.yaml` — se task modificou serviços/apps
- `document-registry.yaml` — se task criou/modificou documentos workspace
- `infrastructure-map.yaml` — se task afetou infraestrutura
- `clickup-tokenization.yaml` — se task materializou estruturas ClickUp
- `ecosystem-registry.yaml` — se task criou/modificou squads

**Anti-pattern:** Task "done" no ClickUp mas infrastructure-map desatualizado — serviço deployado mas não registrado. Drift silencioso acumulado.

---

*Task Lifecycle Rules v1.1 — Sinkra Hub*
*Source: PV_KE_012 (VMT), PV_KE_003 (Commit Debt), PV_KE_121 (Close-Task Registries)*
*RT-HEURISTICS-001 Ação 3*
