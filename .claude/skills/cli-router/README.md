# CLI Router

Skill que transforma o assistente ativo (Claude, Codex, Gemini) em um **Orchestrator** que delega tarefas para agentes especializados via pipe no terminal.

## Por que existe?

Ao inves de carregar 12 personas na janela de contexto e saturar o modelo, o CLI Router mantem os agentes como arquivos `.md` no disco e injeta apenas o necessario via `stdin` UNIX. Resultado: economia de tokens, respostas mais focadas e separacao clara de responsabilidades.

## Arquitetura

```
.agents/skills/cli-router/
  SKILL.md       — instrucoes que a IA segue (escolher agente, descobrir task, chamar route.sh)
  route.sh       — logica deterministica (validar, detectar CLI, montar pipe, executar)
  test-route.sh  — bateria de 51 testes
  README.md      — este arquivo
  HANDOFF.md     — contexto de sessao para continuidade
```

A separacao e intencional: o que e **deterministico** (validar nomes, detectar CLI, montar pipe) fica no script. O que e **nao-deterministico** (escolher agente, formular prompt) fica na IA.

## Uso

### Discovery (sem execucao)

```bash
# Listar agentes disponiveis
./route.sh --list-agents

# Listar todas as tasks
./route.sh --list-tasks

# Listar tasks de um agente especifico
./route.sh --list-tasks --agent qa
```

### Execucao

```bash
# Modo simples — agente + instrucao (auto-detect CLI)
./route.sh --agent architect "Revise a arquitetura de apps/dashboard/"

# Com task estruturada
./route.sh --agent qa --task qa-gate "Execute o QA gate na feature cli-router."

# Forcando uma CLI especifica
./route.sh --agent dev --task dev-suggest-refactoring --cli codex "Analise route.sh"

# Instrucao que comeca com hifen
./route.sh --agent qa -- "-v analise completa do route.sh"
```

### Flags

| Flag | Obrigatoria | Descricao |
|------|-------------|-----------|
| `--agent <nome>` | Sim (execucao) | Agente a usar. Ex: `qa`, `dev`, `architect` |
| `--task <nome>` | Nao | Task/workflow a injetar junto com a persona |
| `--cli <cli>` | Nao | Forca uma CLI. Se omitido, auto-detecta (gemini > claude > codex) |
| `--list-agents` | — | Lista agentes e sai |
| `--list-tasks` | — | Lista tasks e sai. Com `--agent`, filtra por prefixo |
| `--` | — | Fim de flags. Util quando a instrucao comeca com `-` |
| `--help` | — | Mostra uso |

## CLIs Suportadas

| CLI | Comando headless | Stdin | Ordem de preferencia |
|-----|-----------------|-------|----------------------|
| Gemini | `gemini -p "<prompt>"` | Pipe direto | 1 (padrao) |
| Claude | `claude -p "<prompt>"` | Pipe direto | 2 |
| Codex | `codex exec -` | Tudo via stdin (usar `-`) | 3 |

## Validacoes

O script valida antes de executar:

1. **Args obrigatorios** — `--agent` e instrucao presentes
2. **Sanitizacao** — nomes de agente/task aceitam apenas `[a-zA-Z0-9_-]` (bloqueia path traversal)
3. **Agente existe** — checa `agents/<nome>.md`, lista disponiveis se nao encontra
4. **Task existe** — warning se nao encontra, continua sem task
5. **CLI disponivel** — checa via `command -v`, erro se nenhuma encontrada

## Testes

```bash
./test-route.sh
```

51 testes cobrindo: args obrigatorios, flags sem valor, sanitizacao (path traversal, injection, espacos), agente inexistente, task inexistente, CLI invalida, flags desconhecidas, instrucao duplicada, separador `--`, help, todos os 12 agentes validos, ordem de flags, discovery (`--list-agents`, `--list-tasks`).

## Quando usar / Quando nao usar

**Usar quando:**
- Precisa delegar para processo externo (outra CLI/LLM) para economizar tokens
- Usuario pede explicitamente ("manda pro Gemini", "roda no Codex")
- Quer paralelizar: despachar work num CLI separado

**Nao usar quando:**
- Voce ja e o especialista adequado para a tarefa
- O Task tool do Claude Code ja resolve (sub-agentes nativos)
- A tarefa precisa de interacao multi-turno (o pipe e one-shot)
