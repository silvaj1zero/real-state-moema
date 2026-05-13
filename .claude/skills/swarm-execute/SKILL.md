---
name: "swarm-execute"
description: "Executa batches de tasks em paralelo via Swarm OS nativo com circuit"
version: "2.0.0"
agent: "swarm-execute"
user-invocable: true
maxTurns: 25
---

# swarm-execute

Primitiva de baixo nivel para execucao paralela de tasks. Routing automatico: swarm nativo para tasks complexas (effort >= 3), legacy para triviais (effort < 3).

Skills de alto nivel (wave-execute, story-cycle, roundtable) consomem esta primitiva internamente — usuarios normais nao precisam chamar diretamente.

## Fase 0: Circuit Breaker + Effort Routing (OBRIGATORIO — antes de tudo)

### Step 1: Feature Flag

1. Leia `swarm_team_create` em `.aiox-core/core/config/swarm-feature-flags.yaml`
2. Se `swarm_team_create: false` ou campo ausente:
   - Informe: "Swarm Native desativado. Executando em modo Legacy."
   - Para cada task no input, execute `Agent(subagent_type=task.agent, prompt=task.prompt, run_in_background=true)`
   - Aguarde resultados e consolide. FIM.

### Step 2: Effort Routing (so executa se swarm_team_create: true)

1. Para cada task, resolver effort:
   - Se task tem campo `effort` explicito (1-10) → usar
   - Senao, default = 3 (moderate)
2. Calcular `max_effort = max(task.effort para todas tasks)`
3. Decisao:
   - Se `max_effort < 3` (trivial/simple) → **Legacy** — overhead de ~60s do swarm nao justifica
   - Se `max_effort >= 3` (moderate+) → **Swarm Nativo**
4. Log: "Effort maximo: {max_effort} → modo {escolhido}"

### Escala de Effort (alinhada com CC)

| Valor | Nome | Tempo tipico | Modo |
|-------|------|-------------|------|
| 1 | trivial | <30s | Legacy |
| 2 | simple | 30s-2min | Legacy |
| 3 | moderate | 2-10min | **Swarm** |
| 4-5 | complex | 10-30min | **Swarm** |
| 6-10 | very-complex | 30min+ | **Swarm** |

## Fase 1: Validacao e Restricoes

1. Verifique que nao existe team ativo (BR-SWARM-001: 1 team por leader). **Se existir team anterior ativo, execute TeamDelete para limpa-lo antes de continuar.** Isso evita o erro "Already leading team" quando swarm-execute e chamado em sequencia (ex: Wave 1 seguida de Wave 2).
2. Parse o input JSON: lista de `{agent, prompt, mode: "read"|"write", effort?: number, file_set?: string[], template?: string, checklist?: string}`
3. Valide:
   - Cada `agent` corresponde a um subagent_type valido (built-in ou registrado em squads/*/agents/)
   - Input nao esta vazio
   - Campos obrigatorios presentes (agent, prompt, mode)
   - Se `template` ou `checklist` fornecidos, verificar se arquivo existe. Se NAO existir: log warning "⚠️ Template/Checklist not found: {path}" mas NAO bloquear execucao (advisory only)

### Resolucao de Nomes de Agents (IMPORTANTE)

O campo `agent` DEVE ser o ID exato do subagent_type conforme registrado no sistema. Convencao:
- Agents de squad: `{squad}--{agent-name}` (ex: `copy--todd-brown`, `hormozi--hormozi-chief`)
- Agents built-in: `general-purpose`, `Explore`, `Plan`

Erros comuns a evitar:
- `alex-hormozi` → ERRADO. Correto: `copy--alex-hormozi` (squad copy) ou `hormozi--hormozi-chief` (squad hormozi) — sao agents DIFERENTES com personas distintas
- `todd-brown` → ERRADO. Correto: `copy--todd-brown`
- `copy-chief` → ERRADO. Correto: `copy--copy-chief`

Na duvida, verifique o agent ID consultando os agents disponveis no sistema.

## Fase 2: Instanciacao (Swarm Nativo)

A sequencia correta — TeamCreate aceita `team_name` (obrigatorio) + `description` e `agent_type` (opcionais):

### Step 2a: Criar Team

```
TeamCreate({ "team_name": "swarm-{timestamp}" })
```
- Parametro obrigatorio: `team_name` (com underscore, NAO `name` — usar `name` causa "Invalid tool parameters")
- Parametros opcionais: `description` (string), `agent_type` (string)
- NAO passar `members`, `config`, ou campos nao-documentados
- Max 1 team por leader — se team anterior existe, TeamDelete() primeiro
- Team cleanup automaticamente registrado (BR-SWARM-007)

### Step 2b: Spawnar Workers

Para cada task, spawnar worker via Agent tool com `team_name`:
```
Agent({
  "description": "{descricao curta da task}",
  "name": "{task.agent}",
  "team_name": "swarm-{timestamp}",
  "subagent_type": "{task.agent}",
  "prompt": "{task.prompt}"
})
```
- `name` e `team_name` sao obrigatorios para que o worker entre no team
- `subagent_type` usa o agent ID do squad para manter persona
- Spawnar todos workers ANTES de enviar SendMessage (workers precisam existir para receber)

Regras inviolaveis:
- Workers sao peers, nao hierarquicos — flat roster (BR-COORD-002: coordinator delegate-only)
- Workers nao spawnam sub-workers (BR-AGENT-024: fork recursion guard; BR-COORD-003: workers sem AgentTool)
- Workers nao podem escalar permissoes acima do leader (BR-COORD-010: parent high-risk modes always win)
- Workers async auto-deny permissions — nao podem mostrar UI (BR-COORD-011)

## Fase 3: Dispatch e Execucao

1. Envie tasks via SendMessage para cada worker:
   ```
   SendMessage(
     to=task.agent,
     message=task.prompt,
     summary="[swarm-execute] {descricao curta da task}"  # OBRIGATORIO (BR-SWARM-029)
   )
   ```

### Template & Checklist Injection (SWARM.8)

Antes de enviar cada task, se `template` ou `checklist` presentes, CONCATENAR ao prompt:

```
{prompt original do task}

---
TEMPLATE DE OUTPUT (OBRIGATORIO): Leia e preencha o template em `{task.template}`. Use-o como estrutura de output.
CHECKLIST DE VALIDACAO: Antes de entregar, valide seu output contra `{task.checklist}`. Reporte quais itens passaram.
---
```

- Se apenas `template` presente → incluir so a linha TEMPLATE
- Se apenas `checklist` presente → incluir so a linha CHECKLIST
- Se nenhum → prompt original inalterado (backward compatible)

2. Regras de paralelismo (BR-COORD-023 — serial PER FILE SET, nao global):
   - Tasks com `mode: "read"` — executam TODAS em paralelo
   - Tasks com `mode: "write"` E `file_set` disjunto — podem ser paralelas entre si
   - Tasks com `mode: "write"` E `file_set` sobreposto (ou sem file_set) — executam seriais entre si
   - Na duvida (sem file_set declarado): write tasks executam seriais (safe default)

3. Se um worker para (stopped): envie SendMessage para re-acordar (BR-SWARM-026: auto-resume via message)

4. Se um worker falha: log o erro, continue com os demais (nao abortar wave). Worker exit → tasks do worker resetadas para pending (BR-SWARM-030: unassign on exit)

5. Colete resultados via task-notification XML:
   ```xml
   <task-notification>
     <task-id>{agentId}</task-id>
     <status>completed|failed|killed</status>
     <summary>{outcome}</summary>
     <result>{agent response}</result>
     <usage><total_tokens>N</total_tokens><tool_uses>N</tool_uses><duration_ms>N</duration_ms></usage>
   </task-notification>
   ```

## Fase 4: Consolidacao e Cleanup

1. Agregue resultados de todos workers em summary
2. Apresente ao usuario com status por task (completed/failed/killed)
3. Inclua token usage agregado (leader + todos workers) para visibilidade de custo real
4. Inclua modo escolhido e justificativa: `Modo: {Swarm Nativo|Legacy} (effort maximo: {N})`
5. OBRIGATÓRIO (BR-SWARM-001): Quando todos os workers finalizarem e o relatório for consolidado, você MUST chamar `TeamDelete()` (sem parametros — usa contexto da sessao) para limpar a sessão da memória e destravar o coordenador para próximas waves. NOTA: TeamDelete falha se houver membros ativos — garanta que todos shutdowns completaram antes.

### Shutdown de Workers (IMPORTANTE — evita erro de broadcast)

NAO usar SendMessage com `to: "*"` para shutdown — mensagens estruturadas nao podem ser broadcast (BR-SWARM-010).

Procedimento correto:
1. Aguardar workers completarem naturalmente (task-notification com status terminal)
2. Se precisar encerrar workers ativos, enviar shutdown request **individualmente** por nome:
   ```
   SendMessage(to="worker-name-1", message={"type": "shutdown_request", "reason": "swarm complete"})
   SendMessage(to="worker-name-2", message={"type": "shutdown_request", "reason": "swarm complete"})
   ```
3. NAO tentar broadcast shutdown — causa erro "structured messages cannot be broadcast"
4. Se worker ja completou e esta idle, nao precisa de shutdown — team cleanup cuida

## Restricoes de Memoria

- Cada teammate tem cap de 50 mensagens na UI (BR-SWARM-013/014). Para tasks longas, mensagens antigas sao descartadas.
- Cada teammate tem AbortController independente — kill de um nao afeta outros (BR-SWARM-031)
- Kill cascade ordenado: abort → cleanup → status=killed → clear callbacks → remove (BR-SWARM-032)

## Exemplos

### Effort explicito (routing automatico)
```
/swarm-execute [{"agent": "general-purpose", "prompt": "Diga: teste", "mode": "read", "effort": 1}, {"agent": "general-purpose", "prompt": "Diga: teste 2", "mode": "read", "effort": 1}]
```
→ max_effort=1 → Legacy (mesmo com swarm_team_create: true)

### Effort alto (swarm nativo)
```
/swarm-execute [{"agent": "copy--david-ogilvy", "prompt": "Escreva headline para landing page", "mode": "write", "effort": 5, "file_set": ["outputs/copy/headline.md"]}, {"agent": "sinkra-qa", "prompt": "Valide ACs da story SWARM.2", "mode": "read", "effort": 4}]
```
→ max_effort=5 → Swarm Nativo

### Sem effort (default = 3 = moderate = swarm)
```
/swarm-execute [{"agent": "copy-ops-worker", "prompt": "Revise headline", "mode": "write"}, {"agent": "sinkra-qa", "prompt": "Valide ACs", "mode": "read"}]
```
→ max_effort=3 (default) → Swarm Nativo

### Com template e checklist (chief delegation)
```
/swarm-execute [
  {"agent": "brand--keller-brand-equity", "prompt": "CBBE diagnosis para AIOX",
   "mode": "write", "effort": 5,
   "template": "squads/brand/templates/brandbook-tmpl.yaml",
   "checklist": "squads/brand/checklists/brand-naming-checklist.md",
   "file_set": ["outputs/brand/cbbe-report.md"]},
  {"agent": "brand--aaker-brand-identity", "prompt": "Identity architecture para AIOX",
   "mode": "write", "effort": 5,
   "file_set": ["outputs/brand/identity-architecture.md"]}
]
```
→ Workers recebem template/checklist injection no prompt. Segundo worker sem template funciona normalmente.
