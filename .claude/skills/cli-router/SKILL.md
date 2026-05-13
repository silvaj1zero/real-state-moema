---
name: cli-router
description: Roteia tarefas para a persona/agente correto via CLI (Gemini, Claude, Codex), atuando como ponte entre o assistente ativo e especialistas do projeto.
---

# CLI Router

## Proposito
Esta skill permite que voce (o agente ativo atual) atue como um **Orchestrator**.
Seu papel e analisar o pedido do usuario, escolher qual especialista e o mais qualificado, e despachar a tarefa via `route.sh`.

## Quando usar
- Quando voce precisa delegar uma tarefa para um **processo externo** (outra CLI/LLM) para economizar tokens no contexto atual.
- Quando o usuario pede explicitamente: "Manda pro Gemini", "Roda no Codex", "Chama o DevOps pra revisar isso".
- Quando voce quer paralelizar: despachar work num CLI separado enquanto continua trabalhando.

## Quando NAO usar
- Quando voce mesmo ja e o especialista adequado para a tarefa.
- Quando o Task tool do Claude Code ja resolve (sub-agentes nativos).
- Para tasks que precisam de interacao multi-turno (o pipe e one-shot).

## Como funciona

### Passo 1: Escolher o agente
Selecione o agente que mais se alinha com a tarefa:

| Agente | Quando usar |
|--------|-------------|
| `architect` | Arquitetura, tech stack, decisoes tecnicas |
| `dev` | Implementacao, debug, refactoring |
| `devops` | Git push, CI/CD, infra, releases |
| `qa` | Testes, quality gates, reviews |
| `pm` | PRDs, epics, estrategia de produto |
| `po` | Backlog, acceptance criteria, priorizacao |
| `sm` | Stories, sprint planning, ceremonies |
| `analyst` | Pesquisa, analise competitiva, discovery |
| `data-engineer` | Schema, migrations, queries, RLS |
| `ux-design-expert` | UI/UX, design systems, wireframes |
| `squad-creator` | Criar e gerenciar squads |
| `aiox-master` | Orquestracao geral, qualquer tarefa |

Se nao souber quais agentes existem, descubra com:
```bash
.agents/skills/cli-router/route.sh --list-agents
```

### Passo 2: Descobrir a task (opcional)
Tasks sao workflows pre-definidos que dao ao agente um roteiro estruturado. Nem toda delegacao precisa de task — use quando existir um workflow especifico para o que voce quer.

Para ver as tasks disponiveis para um agente:
```bash
.agents/skills/cli-router/route.sh --list-tasks --agent <AGENTE>
```

Para ver todas as tasks:
```bash
.agents/skills/cli-router/route.sh --list-tasks
```

### Passo 3: Formular a instrucao
Escreva um prompt claro e especifico para o especialista, incluindo contexto relevante (caminhos de arquivos, escopo, objetivo).

### Passo 4: Executar via route.sh
```bash
# Modo simples (auto-detect CLI)
.agents/skills/cli-router/route.sh --agent <AGENTE> "<INSTRUCAO>"

# Modo com task
.agents/skills/cli-router/route.sh --agent <AGENTE> --task <TASK> "<INSTRUCAO>"

# Forcando uma CLI especifica
.agents/skills/cli-router/route.sh --agent <AGENTE> --cli codex "<INSTRUCAO>"
```

O script cuida de: validar agente/task, detectar CLI disponivel, montar o pipe correto para cada CLI, e executar.

### Exemplos

Descobrir o que o QA sabe fazer:
```bash
.agents/skills/cli-router/route.sh --list-tasks --agent qa
```

Review de arquitetura (simples, sem task):
```bash
.agents/skills/cli-router/route.sh --agent architect "Revise a arquitetura dos componentes em apps/dashboard/src/components/ui/"
```

QA gate (com task estruturada):
```bash
.agents/skills/cli-router/route.sh --agent qa --task qa-gate "Execute o QA gate na feature de cli-router."
```

Refactoring via Codex:
```bash
.agents/skills/cli-router/route.sh --agent dev --task dev-suggest-refactoring --cli codex "Analise .agents/skills/cli-router/SKILL.md e sugira refactorings."
```

## Apos despachar
1. Apresente ao usuario a resposta exata do terminal (o stdout da CLI).
2. Nao reescreva nem embeleze a resposta. Sua funcao foi rotear, nao interpretar.
