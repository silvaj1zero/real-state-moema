#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  bash .claude/skills/story-cycle/scripts/wave-launch.sh -Wave <N> [-Batch A|B|ALL] [-DryRun] [-Status] [-Clean]

Examples:
  bash .claude/skills/story-cycle/scripts/wave-launch.sh -Wave 1
  bash .claude/skills/story-cycle/scripts/wave-launch.sh -Wave 2 -Batch A
  bash .claude/skills/story-cycle/scripts/wave-launch.sh -Wave 3 -DryRun
  bash .claude/skills/story-cycle/scripts/wave-launch.sh -Wave 4 -Status
  bash .claude/skills/story-cycle/scripts/wave-launch.sh -Wave 5 -Clean
EOF
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../../../.." && pwd)"
WORKTREES_BASE="${ROOT_DIR}/.claude/worktrees"

WAVE=""
BATCH="ALL"
DRY_RUN=0
SHOW_STATUS=0
CLEAN=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    -Wave|--wave)
      WAVE="${2:-}"
      shift 2
      ;;
    -Batch|--batch)
      BATCH="${2:-ALL}"
      shift 2
      ;;
    -DryRun|--dry-run)
      DRY_RUN=1
      shift
      ;;
    -Status|--status)
      SHOW_STATUS=1
      shift
      ;;
    -Clean|--clean)
      CLEAN=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Erro: argumento desconhecido: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "${WAVE}" ]]; then
  echo "Erro: -Wave <N> é obrigatório." >&2
  usage
  exit 1
fi

if [[ ! "${BATCH}" =~ ^(A|B|ALL)$ ]]; then
  echo "Erro: -Batch deve ser A, B ou ALL." >&2
  exit 1
fi

wave_stories() {
  case "$1" in
    1) echo "1.4 1.5 7.1" ;;
    2) echo "1.6 1.7 2.1 3.1 7.2 7.3" ;;
    3) echo "2.2 3.2 3.4 7.4" ;;
    4) echo "2.3 3.5 7.5 7.6 7.8" ;;
    5) echo "2.4 2.5 3.3 7.7 7.9" ;;
    6) echo "2.6 3.6 7.10" ;;
    *)
      return 1
      ;;
  esac
}

if ! STORIES_RAW="$(wave_stories "${WAVE}")"; then
  echo "Erro: wave inválida: ${WAVE}. Válidas: 1..6" >&2
  exit 1
fi

read -r -a STORIES <<< "${STORIES_RAW}"
COUNT="${#STORIES[@]}"
HALF=$(( (COUNT + 1) / 2 ))

select_batch() {
  local batch="$1"
  local i=0
  local out=()
  if [[ "${batch}" == "ALL" ]]; then
    printf '%s\n' "${STORIES[@]}"
    return
  fi
  for story in "${STORIES[@]}"; do
    if [[ "${batch}" == "A" && "${i}" -lt "${HALF}" ]]; then
      out+=("${story}")
    fi
    if [[ "${batch}" == "B" && "${i}" -ge "${HALF}" ]]; then
      out+=("${story}")
    fi
    i=$((i + 1))
  done
  printf '%s\n' "${out[@]}"
}

SELECTED=()
while IFS= read -r line; do
  [[ -n "${line}" ]] && SELECTED+=("${line}")
done < <(select_batch "${BATCH}")

if [[ "${#SELECTED[@]}" -eq 0 ]]; then
  echo "Erro: batch ${BATCH} não possui stories para a wave ${WAVE}." >&2
  exit 1
fi

WAVE_LOG_DIR="${ROOT_DIR}/logs/wave-${WAVE}"
SESSION="story-cycle-wave-${WAVE}"

story_slug() {
  echo "$1" | tr '.' '-'
}

story_worktree() {
  local slug="$1"
  echo "${WORKTREES_BASE}/sinkra-${slug}"
}

story_branch() {
  local slug="$1"
  echo "worktree-sinkra-${slug}"
}

runner_path() {
  local slug="$1"
  echo "${WAVE_LOG_DIR}/run-sinkra-${slug}.sh"
}

log_path() {
  local slug="$1"
  echo "${WAVE_LOG_DIR}/sinkra-${slug}.log"
}

ensure_prereqs() {
  if ! command -v git >/dev/null 2>&1; then
    echo "Erro: git não encontrado no PATH." >&2
    exit 1
  fi

  if [[ "${SHOW_STATUS}" -eq 0 && "${CLEAN}" -eq 0 && "${DRY_RUN}" -eq 0 ]]; then
    if ! command -v claude >/dev/null 2>&1; then
      echo "Erro: CLI 'claude' não encontrado no PATH." >&2
      exit 1
    fi
    if ! command -v tmux >/dev/null 2>&1; then
      cat <<'EOF' >&2
Erro: tmux não encontrado.
Instale no macOS:
  brew install tmux
EOF
      exit 1
    fi
  fi
}

ensure_worktree() {
  local worktree="$1"
  local branch="$2"

  if [[ -d "${worktree}" ]]; then
    return
  fi

  if git -C "${ROOT_DIR}" show-ref --verify --quiet "refs/heads/${branch}"; then
    git -C "${ROOT_DIR}" worktree add "${worktree}" "${branch}"
  else
    git -C "${ROOT_DIR}" worktree add -b "${branch}" "${worktree}" HEAD
  fi
}

write_runner() {
  local runner="$1"
  local worktree="$2"
  local wave="$3"
  local story="$4"
  local log_file="$5"

  cat > "${runner}" <<EOF
#!/usr/bin/env bash
set -euo pipefail
unset CLAUDECODE
cd "${worktree}"
echo "[start] wave ${wave} story ${story}" | tee -a "${log_file}"
claude -p --dangerously-skip-permissions --model sonnet '/story-cycle epic-${wave} --story ${story} --mode yolo' 2>&1 | tee -a "${log_file}"
EXIT_CODE=\${PIPESTATUS[0]}
echo "[end] wave ${wave} story ${story} exit=\${EXIT_CODE}" | tee -a "${log_file}"
exit \${EXIT_CODE}
EOF
  chmod +x "${runner}"
}

show_status() {
  echo "Wave ${WAVE} | session=${SESSION}"
  if command -v tmux >/dev/null 2>&1 && tmux has-session -t "${SESSION}" 2>/dev/null; then
    echo "tmux: active"
  else
    echo "tmux: inactive"
  fi

  printf '%-12s %-9s %-40s %s\n' "Story" "Worktree" "Branch" "Log"
  for story in "${SELECTED[@]}"; do
    local slug worktree branch logf wt_status
    slug="$(story_slug "${story}")"
    worktree="$(story_worktree "${slug}")"
    branch="$(story_branch "${slug}")"
    logf="$(log_path "${slug}")"
    if [[ -d "${worktree}" ]]; then
      wt_status="yes"
    else
      wt_status="no"
    fi
    printf '%-12s %-9s %-40s %s\n' "${story}" "${wt_status}" "${branch}" "${logf}"
  done
}

clean_wave() {
  if command -v tmux >/dev/null 2>&1 && tmux has-session -t "${SESSION}" 2>/dev/null; then
    tmux kill-session -t "${SESSION}" || true
  fi

  for story in "${SELECTED[@]}"; do
    local slug worktree
    slug="$(story_slug "${story}")"
    worktree="$(story_worktree "${slug}")"
    if [[ -d "${worktree}" ]]; then
      git -C "${ROOT_DIR}" worktree remove -f "${worktree}" || true
    fi
  done

  echo "Clean concluído para wave ${WAVE} (${BATCH})."
}

dry_run() {
  echo "Dry-run | Wave ${WAVE} | Batch ${BATCH}"
  mkdir -p "${WAVE_LOG_DIR}"
  for story in "${SELECTED[@]}"; do
    local slug worktree branch runner logf
    slug="$(story_slug "${story}")"
    worktree="$(story_worktree "${slug}")"
    branch="$(story_branch "${slug}")"
    runner="$(runner_path "${slug}")"
    logf="$(log_path "${slug}")"
    echo "git -C ${ROOT_DIR} worktree add -b ${branch} ${worktree} HEAD"
    echo "runner: ${runner}"
    echo "log: ${logf}"
  done
  echo "tmux session: ${SESSION}"
}

launch_wave() {
  mkdir -p "${WORKTREES_BASE}" "${WAVE_LOG_DIR}"

  if tmux has-session -t "${SESSION}" 2>/dev/null; then
    echo "Erro: sessão tmux '${SESSION}' já existe. Use -Status ou -Clean." >&2
    exit 1
  fi

  local first=1
  for story in "${SELECTED[@]}"; do
    local slug worktree branch runner logf
    slug="$(story_slug "${story}")"
    worktree="$(story_worktree "${slug}")"
    branch="$(story_branch "${slug}")"
    runner="$(runner_path "${slug}")"
    logf="$(log_path "${slug}")"

    ensure_worktree "${worktree}" "${branch}"
    write_runner "${runner}" "${worktree}" "${WAVE}" "${story}" "${logf}"

    if [[ "${first}" -eq 1 ]]; then
      tmux new-session -d -s "${SESSION}" -n "wave-${WAVE}" "bash '${runner}'"
      first=0
    else
      tmux split-window -t "${SESSION}:0" -v "bash '${runner}'"
      tmux select-layout -t "${SESSION}:0" tiled >/dev/null
    fi
  done

  echo "Wave ${WAVE} lançada com ${#SELECTED[@]} sessões em tmux."
  echo "Attach: tmux attach -t ${SESSION}"
  echo "Status: bash .claude/skills/story-cycle/scripts/wave-launch.sh -Wave ${WAVE} -Status"
  echo "Logs: ${WAVE_LOG_DIR}"
}

ensure_prereqs

if [[ "${SHOW_STATUS}" -eq 1 ]]; then
  show_status
  exit 0
fi

if [[ "${CLEAN}" -eq 1 ]]; then
  clean_wave
  exit 0
fi

if [[ "${DRY_RUN}" -eq 1 ]]; then
  dry_run
  exit 0
fi

launch_wave
