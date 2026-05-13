---
name: "create-runner"
description: "Scaffolds a new runner from the canonical runner-lib templates and guardrails."
version: "1.0.0"
owner_squad: runner-ops
sinkra_tier: Tier1
context: inline
agent: "create-runner"
user-invocable: true
maxTurns: 25
---

# Create Runner

Criar runners novos a partir dos templates canônicos da `runner-lib`, evitando reimplementar runtime, estado, métricas e sessão.

## Input

Receber do usuário:

- nome do runner
- squad de destino
- tipo de output
- fases mínimas

Se algum dado faltar, inferir o mínimo seguro a partir do contexto local antes de perguntar.

## Execution Protocol

1. Ler `squads/sinkra-squad/tasks/create-runner.md`.
2. Copiar os templates:
   - `infrastructure/scripts/runner-lib/templates/runner-template.sh`
   - `infrastructure/scripts/runner-lib/templates/pipeline-phases-template.yaml`
   - `infrastructure/scripts/runner-lib/templates/prompt-template.md`
3. Substituir placeholders pelos dados do runner.
4. Manter `RUNNER_LIB_RUNTIME=true`, `SESSION_TRACKING=true`, `state_init()`, `state_phase_update()`, `filter_llm_output()` e `check_cost_cap()` no scaffold.
5. Validar o scaffold com `bash -n` e, se existir, `infrastructure/scripts/runner-lib/validate-runner.sh <path>`.

## Output

Runner scaffold criado com:

- script principal
- arquivo de fases
- prompt template
- validação inicial do scaffold
