---
paths:
  - "squads/**/tasks/**"
  - "squads/**/skills/**"
  - ".claude/skills/**"
  - ".claude/commands/**"
---

# CLI Next Command Flow

Thin lazy-loaded rule. Promoted from heuristic AN_KE_080 (archived as UX convention, not cognitive heuristic).

## When to Load

Load this rule only when you are about to:

- Finalize an interactive CLI execution (epic execution, story cycle, pipeline run)
- Write `*next` style guidance after completing a command in conversation
- Design output of multi-phase commands

If running in autonomy/yolo mode (where user delegated full execution), skip this rule — autonomy means no need for next-step guidance.

## Rule

**SE** finalizando execução de comando interativo complexo **ENTÃO** fornecer o próximo comando CLI exato em codeblock no final da resposta. Ex:

```bash
# Próximo passo
/full-sdc story-X.Y --interactive
```

**EXCETO** em autonomy mode (operador disse "yolo", "vai", "manda", "faz tudo até o fim") — nesse caso execute o próximo passo, não pergunte.

## Why

Reduz fricção heurística — operador não precisa lembrar/buscar qual comando vem depois. Pipelines multi-fase (epic → story → develop → review → deploy → close) são longos, fluxo explícito sustenta cadência.

## Anti-Pattern

- Terminar resposta com "agora você deve fazer X" sem comando exato
- Esquecer de oferecer próximo passo após pipeline parcialmente completo
- Continuar oferecendo `*next` em modo autonomy (vai contra contrato)

## When Not to Apply

- Autonomy mode declarado (ver AN_KE_130 — Autonomous Execution = Contract)
- Tarefa one-shot sem fluxo continuação
- Resposta a pergunta exploratória (não execução)

## Source

- Original heuristic: AN_KE_080 (archived 2026-04-27 v3.13.0 — CLI UX convention, not cross-domain cognitive heuristic)
- Archived L3 doc: `minds/alan_nicolas/heuristics/_archived/AN_KE_080-archived-v3.13.0-cli-ux-convention.md`
- Related: AN_KE_130 (Autonomous Execution = Contract) — when NOT to apply this rule
