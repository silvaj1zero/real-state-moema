#!/usr/bin/env bash
set -euo pipefail

# route.sh — Logica deterministica do CLI Router
# Detecta CLI, valida agente/task, monta e executa o pipe.

readonly AGENTS_DIR=".aiox-core/development/agents"
readonly TASKS_DIR=".aiox-core/development/tasks"
readonly CLI_PREFERENCE=("gemini" "claude" "codex")

# --- Helpers ---

die() { echo "ERRO: $1" >&2; exit 1; }

require_value() {
  if [[ -z "${2:-}" || "$2" == --* ]]; then
    die "$1 requer um valor."
  fi
}

usage() {
  cat <<'EOF'
Uso: route.sh --agent <nome> [--task <nome>] [--cli <cli>] [--] "<instrucao>"
      route.sh --list-agents
      route.sh --list-tasks [--agent <nome>]

Opcoes:
  --agent        Nome do agente (obrigatorio para execucao). Ex: qa, dev, architect
  --task         Nome da task (opcional). Ex: qa-gate, dev-develop-story
  --cli          CLI a usar (opcional). Ex: gemini, claude, codex
                 Se omitido, usa a primeira disponivel (gemini > claude > codex)
  --list-agents  Lista agentes disponiveis e sai
  --list-tasks   Lista tasks disponiveis e sai. Com --agent, filtra por prefixo
  --             Fim de flags. Util se a instrucao comeca com -

Exemplos:
  route.sh --list-agents
  route.sh --list-tasks
  route.sh --list-tasks --agent qa
  route.sh --agent qa "Revise a skill cli-router"
  route.sh --agent qa --task qa-gate --cli codex "Execute o QA gate"
EOF
  exit 0
}

# --- Discovery ---

list_agents() {
  for f in "$AGENTS_DIR"/*.md; do
    [[ -f "$f" ]] || continue
    basename "$f" .md
  done
  exit 0
}

list_tasks() {
  local prefix="$1"
  for f in "$TASKS_DIR"/*.md; do
    [[ -f "$f" ]] || continue
    local name
    name=$(basename "$f" .md)
    if [[ -z "$prefix" ]] || [[ "$name" == "${prefix}-"* ]] || [[ "$name" == "${prefix}" ]]; then
      echo "$name"
    fi
  done
  exit 0
}

# --- Parse args ---

AGENT=""
TASK=""
CLI=""
INSTRUCTION=""
LIST_AGENTS=0
LIST_TASKS=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --agent)       require_value "--agent" "${2:-}";  AGENT="$2";  shift 2 ;;
    --task)        require_value "--task" "${2:-}";    TASK="$2";   shift 2 ;;
    --cli)         require_value "--cli" "${2:-}";     CLI="$2";    shift 2 ;;
    --list-agents) LIST_AGENTS=1; shift ;;
    --list-tasks)  LIST_TASKS=1;  shift ;;
    --help|-h)     usage ;;
    --)            shift; INSTRUCTION="$*"; break ;;
    -*)            die "Flag desconhecida: $1" ;;
    *)
      if [[ -n "$INSTRUCTION" ]]; then
        die "Instrucao duplicada. Use aspas para instrucoes com espacos."
      fi
      INSTRUCTION="$1"; shift ;;
  esac
done

# --- Discovery mode (sai antes da validacao) ---

[[ "$LIST_AGENTS" -eq 1 ]] && list_agents
[[ "$LIST_TASKS" -eq 1 ]]  && list_tasks "$AGENT"

# --- Validacao de execucao ---

[[ -z "$AGENT" ]] && die "Flag --agent e obrigatoria. Use --help para ver uso."
[[ -z "$INSTRUCTION" ]] && die "Instrucao e obrigatoria. Passe como ultimo argumento."

# --- Sanitizar nomes ---

[[ "$AGENT" =~ ^[a-zA-Z0-9_-]+$ ]] || die "Nome de agente invalido: '$AGENT'. Use apenas letras, numeros, - e _."
[[ -z "$TASK" || "$TASK" =~ ^[a-zA-Z0-9_-]+$ ]] || die "Nome de task invalido: '$TASK'. Use apenas letras, numeros, - e _."

# --- Passo 1: Validar agente ---

AGENT_FILE="$AGENTS_DIR/${AGENT}.md"
if [[ ! -f "$AGENT_FILE" ]]; then
  AVAILABLE=""
  for f in "$AGENTS_DIR"/*.md; do
    [[ -f "$f" ]] || continue
    name=$(basename "$f" .md)
    AVAILABLE="${AVAILABLE:+$AVAILABLE, }$name"
  done
  [[ -z "$AVAILABLE" ]] && AVAILABLE="(nenhum)"
  die "Agente '$AGENT' nao encontrado. Disponiveis: $AVAILABLE"
fi

# --- Passo 2: Validar task (opcional) ---

TASK_FILE=""
if [[ -n "$TASK" ]]; then
  TASK_FILE="$TASKS_DIR/${TASK}.md"
  if [[ ! -f "$TASK_FILE" ]]; then
    echo "AVISO: Task '$TASK' nao encontrada em $TASKS_DIR/. Continuando sem task." >&2
    TASK_FILE=""
  fi
fi

# --- Passo 3: Detectar CLI ---

detect_cli() {
  if [[ -n "$CLI" ]]; then
    command -v "$CLI" >/dev/null 2>&1 || die "CLI '$CLI' nao encontrada no PATH."
    return
  fi
  for candidate in "${CLI_PREFERENCE[@]}"; do
    if command -v "$candidate" >/dev/null 2>&1; then
      CLI="$candidate"
      return
    fi
  done
  die "Nenhuma CLI encontrada (gemini, claude, codex). Instale ao menos uma."
}

detect_cli

# --- Passo 4: Montar e executar pipe ---

build_stdin() {
  cat "$AGENT_FILE"
  if [[ -n "$TASK_FILE" ]]; then
    printf '\n---\n'
    cat "$TASK_FILE"
  fi
}

case "$CLI" in
  gemini|claude)
    build_stdin | "$CLI" -p "$INSTRUCTION"
    ;;
  codex)
    (build_stdin; printf '\nTAREFA: %s\n' "$INSTRUCTION") | codex exec -
    ;;
  *)
    die "CLI '$CLI' nao suportada. Use gemini, claude ou codex."
    ;;
esac
