#!/usr/bin/env bash
set -uo pipefail

# test-route.sh — Bateria de testes para route.sh
# Testa apenas a camada de validacao (nao executa CLIs reais).
# Usa --cli fake para forcar o script a falhar APOS a validacao,
# confirmando que toda logica pre-execucao funcionou.

SCRIPT=".agents/skills/cli-router/route.sh"
PASS=0
FAIL=0
TOTAL=0

# --- Helpers ---

assert_exit() {
  local desc="$1" expected="$2" actual="$3" stderr="$4"
  TOTAL=$((TOTAL + 1))
  if [[ "$actual" -eq "$expected" ]]; then
    PASS=$((PASS + 1))
    printf "  [PASS] %s\n" "$desc"
  else
    FAIL=$((FAIL + 1))
    printf "  [FAIL] %s (esperado exit=%s, obteve exit=%s)\n" "$desc" "$expected" "$actual"
    [[ -n "$stderr" ]] && printf "         stderr: %s\n" "$stderr"
  fi
}

assert_stderr_contains() {
  local desc="$1" pattern="$2" stderr="$3" exit_code="$4" expected_exit="${5:-1}"
  TOTAL=$((TOTAL + 1))
  if [[ "$exit_code" -eq "$expected_exit" ]] && echo "$stderr" | grep -qi "$pattern"; then
    PASS=$((PASS + 1))
    printf "  [PASS] %s\n" "$desc"
  else
    FAIL=$((FAIL + 1))
    printf "  [FAIL] %s\n" "$desc"
    printf "         exit: %s (esperado %s)\n" "$exit_code" "$expected_exit"
    printf "         pattern: '%s'\n" "$pattern"
    printf "         stderr: %s\n" "$stderr"
  fi
}

run() {
  local stderr
  stderr=$("$SCRIPT" "$@" 2>&1 1>/dev/null)
  local rc=$?
  echo "$stderr"
  return $rc
}

# --- 1. ARGUMENTOS OBRIGATORIOS ---

echo ""
echo "=== 1. Argumentos obrigatorios ==="

out=$(run 2>&1); rc=$?
assert_stderr_contains "Sem argumentos: exige --agent" "agent.*obrigatoria" "$out" "$rc"

out=$(run --agent qa 2>&1); rc=$?
assert_stderr_contains "Sem instrucao: exige instrucao" "instrucao.*obrigatoria" "$out" "$rc"

out=$(run "so instrucao" 2>&1); rc=$?
assert_stderr_contains "Sem --agent: exige --agent" "agent.*obrigatoria" "$out" "$rc"

# --- 2. REQUIRE_VALUE (flags sem valor) ---

echo ""
echo "=== 2. Flags sem valor ==="

out=$(run --agent 2>&1); rc=$?
assert_stderr_contains "--agent sem valor" "agent.*requer" "$out" "$rc"

out=$(run --task 2>&1); rc=$?
assert_stderr_contains "--task sem valor" "task.*requer" "$out" "$rc"

out=$(run --cli 2>&1); rc=$?
assert_stderr_contains "--cli sem valor" "cli.*requer" "$out" "$rc"

out=$(run --agent --task qa "teste" 2>&1); rc=$?
assert_stderr_contains "--agent seguido de outra flag" "agent.*requer" "$out" "$rc"

out=$(run --agent qa --task --cli codex "teste" 2>&1); rc=$?
assert_stderr_contains "--task seguido de outra flag" "task.*requer" "$out" "$rc"

out=$(run --agent qa --cli --task qa-gate "teste" 2>&1); rc=$?
assert_stderr_contains "--cli seguido de outra flag" "cli.*requer" "$out" "$rc"

# --- 3. SANITIZACAO (path traversal, caracteres especiais) ---

echo ""
echo "=== 3. Sanitizacao de nomes ==="

out=$(run --agent "../../etc/passwd" "teste" 2>&1); rc=$?
assert_stderr_contains "Path traversal em --agent" "agente invalido" "$out" "$rc"

out=$(run --agent "qa;rm -rf /" "teste" 2>&1); rc=$?
assert_stderr_contains "Injection com ; em --agent" "agente invalido" "$out" "$rc"

out=$(run --agent 'qa$(whoami)' "teste" 2>&1); rc=$?
assert_stderr_contains "Command substitution em --agent" "agente invalido" "$out" "$rc"

out=$(run --agent "qa qa" "teste" 2>&1); rc=$?
assert_stderr_contains "Espaco em --agent" "agente invalido" "$out" "$rc"

out=$(run --agent qa --task "../../etc/shadow" "teste" 2>&1); rc=$?
assert_stderr_contains "Path traversal em --task" "task invalido" "$out" "$rc"

out=$(run --agent qa --task 'gate;ls' "teste" 2>&1); rc=$?
assert_stderr_contains "Injection com ; em --task" "task invalido" "$out" "$rc"

# Nomes validos com hifen e underscore devem passar a sanitizacao
out=$(run --agent data-engineer --cli fake "teste" 2>&1); rc=$?
assert_stderr_contains "Hifen em nome aceito (data-engineer)" "cli.*nao encontrada" "$out" "$rc"

out=$(run --agent ux-design-expert --cli fake "teste" 2>&1); rc=$?
assert_stderr_contains "Multiplos hifens aceitos (ux-design-expert)" "cli.*nao encontrada" "$out" "$rc"

# --- 4. AGENTE INEXISTENTE ---
# Ordem de validacao: agente → task → CLI.
# --cli fake so falha DEPOIS da validacao do agente (que e o que testamos).

echo ""
echo "=== 4. Agente inexistente ==="

out=$(run --agent fantasma --cli fake "teste" 2>&1); rc=$?
assert_stderr_contains "Agente inexistente lista disponiveis" "disponiveis:" "$out" "$rc"

out=$(run --agent fantasma --cli fake "teste" 2>&1); rc=$?
assert_stderr_contains "Lista contem 'dev'" "dev" "$out" "$rc"

out=$(run --agent fantasma --cli fake "teste" 2>&1); rc=$?
assert_stderr_contains "Lista contem 'qa'" "qa" "$out" "$rc"

# --- 5. TASK INEXISTENTE (warning, nao erro) ---
# Ordem: agente (qa existe) → task (fantasma, emite AVISO) → CLI (fake, falha).
# O AVISO ja foi emitido quando a CLI falha — capturamos tudo com 2>&1.

echo ""
echo "=== 5. Task inexistente ==="

out=$("$SCRIPT" --agent qa --task task-fantasma --cli fake "teste" 2>&1); rc=$?
assert_stderr_contains "Task inexistente gera AVISO" "aviso.*task.*nao encontrada" "$out" "$rc"

# --- 6. CLI INVALIDA ---

echo ""
echo "=== 6. CLI invalida ==="

out=$(run --agent qa --cli naoexiste "teste" 2>&1); rc=$?
assert_stderr_contains "CLI inexistente" "cli.*nao encontrada" "$out" "$rc"

out=$(run --agent qa --cli "" "teste" 2>&1); rc=$?
assert_stderr_contains "CLI vazia" "cli.*requer" "$out" "$rc"

# --- 7. FLAGS DESCONHECIDAS ---

echo ""
echo "=== 7. Flags desconhecidas ==="

out=$(run --agent qa --verbose "teste" 2>&1); rc=$?
assert_stderr_contains "Flag --verbose desconhecida" "flag desconhecida" "$out" "$rc"

out=$(run --agent qa -x "teste" 2>&1); rc=$?
assert_stderr_contains "Flag -x desconhecida" "flag desconhecida" "$out" "$rc"

# --- 8. INSTRUCAO DUPLICADA ---

echo ""
echo "=== 8. Instrucao duplicada ==="

out=$(run --agent qa "arg1" "arg2" 2>&1); rc=$?
assert_stderr_contains "Dois argumentos posicionais" "instrucao duplicada" "$out" "$rc"

# --- 9. SEPARADOR -- ---

echo ""
echo "=== 9. Separador -- ==="

# Com --, tudo apos vira instrucao (vai falhar na CLI fake, mas passou o parse)
out=$(run --agent qa --cli fake -- "-instrucao com hifen" 2>&1); rc=$?
assert_stderr_contains "-- permite instrucao com hifen" "cli.*nao encontrada" "$out" "$rc"

# --- 10. HELP ---

echo ""
echo "=== 10. Help ==="

out=$("$SCRIPT" --help 2>&1); rc=$?
TOTAL=$((TOTAL + 1))
if [[ "$rc" -eq 0 ]] && echo "$out" | grep -q "Uso:"; then
  PASS=$((PASS + 1))
  printf "  [PASS] --help retorna uso e exit 0\n"
else
  FAIL=$((FAIL + 1))
  printf "  [FAIL] --help retorna uso e exit 0 (exit=%s)\n" "$rc"
fi

out=$("$SCRIPT" -h 2>&1); rc=$?
TOTAL=$((TOTAL + 1))
if [[ "$rc" -eq 0 ]] && echo "$out" | grep -q "Uso:"; then
  PASS=$((PASS + 1))
  printf "  [PASS] -h retorna uso e exit 0\n"
else
  FAIL=$((FAIL + 1))
  printf "  [FAIL] -h retorna uso e exit 0 (exit=%s)\n" "$rc"
fi

# --- 11. AGENTES VALIDOS (todos os 12 devem passar validacao) ---

echo ""
echo "=== 11. Todos os 12 agentes validos ==="

for agent in aiox-master analyst architect data-engineer dev devops pm po qa sm squad-creator ux-design-expert; do
  out=$(run --agent "$agent" --cli fake "teste" 2>&1); rc=$?
  # Deve falhar na CLI (fake), NAO na validacao do agente
  assert_stderr_contains "Agente '$agent' valido" "cli.*nao encontrada" "$out" "$rc"
done

# --- 12. ORDEM DE FLAGS (posicional antes/depois de flags) ---

echo ""
echo "=== 12. Ordem de flags ==="

out=$(run "instrucao" --agent qa --cli fake 2>&1); rc=$?
assert_stderr_contains "Instrucao antes de flags" "cli.*nao encontrada" "$out" "$rc"

out=$(run --agent qa "instrucao" --cli fake 2>&1); rc=$?
assert_stderr_contains "Instrucao entre flags" "instrucao duplicada\|cli.*nao encontrada" "$out" "$rc"

# --- 13. DISCOVERY: --list-agents ---

echo ""
echo "=== 13. Discovery: --list-agents ==="

out=$("$SCRIPT" --list-agents 2>&1); rc=$?
TOTAL=$((TOTAL + 1))
if [[ "$rc" -eq 0 ]] && echo "$out" | grep -q "qa"; then
  PASS=$((PASS + 1))
  printf "  [PASS] --list-agents retorna lista com 'qa'\n"
else
  FAIL=$((FAIL + 1))
  printf "  [FAIL] --list-agents retorna lista com 'qa' (exit=%s)\n" "$rc"
fi

count=$(echo "$out" | wc -l | tr -d ' ')
TOTAL=$((TOTAL + 1))
if [[ "$count" -eq 12 ]]; then
  PASS=$((PASS + 1))
  printf "  [PASS] --list-agents retorna 12 agentes\n"
else
  FAIL=$((FAIL + 1))
  printf "  [FAIL] --list-agents retorna 12 agentes (obteve %s)\n" "$count"
fi

# Nao exige --agent nem instrucao
TOTAL=$((TOTAL + 1))
if echo "$out" | grep -q "dev" && echo "$out" | grep -q "architect"; then
  PASS=$((PASS + 1))
  printf "  [PASS] --list-agents nao exige --agent nem instrucao\n"
else
  FAIL=$((FAIL + 1))
  printf "  [FAIL] --list-agents nao exige --agent nem instrucao\n"
fi

# --- 14. DISCOVERY: --list-tasks ---

echo ""
echo "=== 14. Discovery: --list-tasks ==="

# Todas as tasks
out=$("$SCRIPT" --list-tasks 2>&1); rc=$?
count=$(echo "$out" | wc -l | tr -d ' ')
TOTAL=$((TOTAL + 1))
if [[ "$rc" -eq 0 ]] && [[ "$count" -gt 100 ]]; then
  PASS=$((PASS + 1))
  printf "  [PASS] --list-tasks sem filtro retorna %s tasks\n" "$count"
else
  FAIL=$((FAIL + 1))
  printf "  [FAIL] --list-tasks sem filtro (exit=%s, count=%s)\n" "$rc" "$count"
fi

# Filtrado por agente qa
out=$("$SCRIPT" --list-tasks --agent qa 2>&1); rc=$?
count=$(echo "$out" | wc -l | tr -d ' ')
TOTAL=$((TOTAL + 1))
if [[ "$rc" -eq 0 ]] && [[ "$count" -gt 5 ]] && echo "$out" | grep -q "qa-gate"; then
  PASS=$((PASS + 1))
  printf "  [PASS] --list-tasks --agent qa retorna %s tasks (inclui qa-gate)\n" "$count"
else
  FAIL=$((FAIL + 1))
  printf "  [FAIL] --list-tasks --agent qa (exit=%s, count=%s)\n" "$rc" "$count"
fi

# Filtrado por agente dev
out=$("$SCRIPT" --list-tasks --agent dev 2>&1); rc=$?
TOTAL=$((TOTAL + 1))
if [[ "$rc" -eq 0 ]] && echo "$out" | grep -q "dev-suggest-refactoring"; then
  PASS=$((PASS + 1))
  printf "  [PASS] --list-tasks --agent dev inclui dev-suggest-refactoring\n"
else
  FAIL=$((FAIL + 1))
  printf "  [FAIL] --list-tasks --agent dev (exit=%s)\n" "$rc"
fi

# Filtrado nao inclui tasks de outro agente
out=$("$SCRIPT" --list-tasks --agent qa 2>&1); rc=$?
TOTAL=$((TOTAL + 1))
if ! echo "$out" | grep -q "dev-"; then
  PASS=$((PASS + 1))
  printf "  [PASS] --list-tasks --agent qa nao inclui tasks dev-*\n"
else
  FAIL=$((FAIL + 1))
  printf "  [FAIL] --list-tasks --agent qa inclui tasks dev-* indevidamente\n"
fi

# Agente sem tasks prefixadas retorna vazio
out=$("$SCRIPT" --list-tasks --agent aiox-master 2>&1); rc=$?
TOTAL=$((TOTAL + 1))
if [[ "$rc" -eq 0 ]]; then
  PASS=$((PASS + 1))
  printf "  [PASS] --list-tasks --agent aiox-master sai com exit 0\n"
else
  FAIL=$((FAIL + 1))
  printf "  [FAIL] --list-tasks --agent aiox-master (exit=%s)\n" "$rc"
fi

# --- RESULTADO FINAL ---

echo ""
echo "==============================="
printf "Total: %d | Pass: %d | Fail: %d\n" "$TOTAL" "$PASS" "$FAIL"
echo "==============================="

[[ "$FAIL" -eq 0 ]] && exit 0 || exit 1
