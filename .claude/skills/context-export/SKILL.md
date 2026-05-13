---
name: "context-export"
description: "Generates HTML dashboard of current session context — memory layers, token budget, timeline, artifacts, agents, decisions."
version: "1.0.0"
owner_squad: claude-code-mastery
sinkra_tier: Tier1
context: inline
agent: general-purpose
user-invocable: true
argument-hint: "[path] [--no-open] [--compact]"
maxTurns: 6
---

# /context-export — Session Context Visualizer

Gera um dashboard HTML visualizando o **working memory da sessão atual**: camadas de contexto carregadas, turnos de conversa, ferramentas usadas, sub-agentes invocados, artefatos criados, decisões tomadas e estimativa de uso de tokens.

**Output:** HTML standalone (sem dependências externas) com tokens visuais AIOX (dark + lime + mono), pronto pra abrir em qualquer browser ou arquivar.

**Execution context:** `inline` — roda na conversa ativa, sem spawn de subagent. A skill precisa inspecionar o próprio working memory do modelo que a invocou.

---

## When to invoke

- `/context-export` — gera o dashboard padrão em `outputs/meta/context-window-{YYYYMMDD-HHmm}.html`
- `/context-export {path}` — salva em path customizado (absoluto ou relativo ao cwd)
- `/context-export --no-open` — gera sem tentar abrir no browser automaticamente
- `/context-export --compact` — versão condensada (adiciona `<body class="compact">` pra layout 1-coluna + descrições ocultas)

Também ativa quando o user perguntar coisas equivalentes em linguagem natural: "o que tá carregado", "quantos tokens usei", "mostra a sessão", "visualiza o contexto", "me mostra o que tá no teu head", "session dashboard", "audit the context".

---

## Execution (inline — no subagent spawn)

A skill roda **na conversa atual**. O modelo ativo já conhece a sessão — não precisa de spawn isolado. Sub-agentes perdem o contexto pai; portanto `context: inline` é NÃO-negociável.

### Steps

1. **Parse flags e args.** Argumento posicional é o path customizado. Flags suportadas:
   - `--no-open` — pula o `open {path}` final
   - `--compact` — aplica a classe `compact` no body do HTML

2. **Introspect the current session.** Enumere, a partir do conteúdo visível nesta janela:
   - Número de turns (user ↔ assistant)
   - Ferramentas usadas (Bash, Read, Write, Edit, Glob, Grep, Agent, WebFetch, WebSearch, etc.)
   - Arquivos criados ou modificados (extensão, path relativo, tamanho aproximado, status: new/superseded/current)
   - Sub-agentes spawnados via `Agent` tool — capturar `subagent_type` + resumo 1-liner do que fizeram
   - Decisões marcantes — artefatos finais, mudanças de direção, confirmações, reversões (D-001, D-002...)
   - Regras auto-carregadas que apareceram como `<system-reminder>` (prior-art-search, kiss-no-overengineering, concurrent-writer-atomic-write, etc.)
   - Skills invocadas durante a sessão (ex: `validate-skill`, `sinkra-map-process`, skills tocadas indiretamente)
   - `cwd`, branch git, platform, model id, session id (dos env vars já visíveis no system prompt)

3. **Compute token estimate.** Heurísticas — SEMPRE marcar como estimativa com prefixo `~` ou `est.`:
   - L0 System prompt + environment: ~5k
   - L1 CLAUDE.md + rules auto-carregadas: soma dos bytes / 4
   - L2 Lazy rules (system-reminders observados): soma dos bytes / 4
   - L3 Skills registry baseline: ~18k
   - L4 Deferred tools baseline: ~4k
   - L5 User messages: soma dos caracteres / 4
   - L6 Assistant responses: soma dos caracteres / 4 (inclua seu próprio output)
   - L7 Tool results: soma dos bytes / 4 (Agent outputs, Reads, Bash stdout)

   Budget de referência: 200k (Claude Opus 1M-context mode opera com janela prática ~200k antes de compactação).

4. **Load the template** em `{skill_dir}/template.html` (mesmo diretório deste SKILL.md). Esse arquivo tem o CSS completo + estrutura de painéis + marcadores `<!-- SLOT:nome -->` onde os dados dinâmicos entram.

5. **Replace slots** com os dados reais da sessão:

   | Slot | Conteúdo |
   |---|---|
   | `<!-- SLOT:body_class -->` | "" ou "compact" se `--compact` |
   | `<!-- SLOT:session_date -->` | Data no formato `YYYY-MM-DD` |
   | `<!-- SLOT:cwd_short -->` | cwd abreviado (ex: `/sinkra-hub` — últimos 2 segmentos) |
   | `<!-- SLOT:kpi_tokens -->` | Total estimado em "k" (ex: `~142`) |
   | `<!-- SLOT:kpi_tokens_pct -->` | Porcentagem do budget (ex: `71`) — numérico puro |
   | `<!-- SLOT:kpi_turns -->` | Número de turns total |
   | `<!-- SLOT:kpi_turns_breakdown -->` | Ex: `11 user · 10 assistant` |
   | `<!-- SLOT:kpi_artifacts -->` | Número de arquivos criados/modificados |
   | `<!-- SLOT:kpi_artifacts_breakdown -->` | Ex: `3 MD · 3 HTML · 3 PDF` |
   | `<!-- SLOT:kpi_subagents -->` | Número de sub-agentes spawnados |
   | `<!-- SLOT:kpi_subagents_breakdown -->` | Ex: `@legal-chief (2 runs)` ou `—` |
   | `<!-- SLOT:memory_layers -->` | 8 blocos `<div class="layer">` (L0-L7) |
   | `<!-- SLOT:token_budget_count -->` | Ex: `142K / 200K` |
   | `<!-- SLOT:token_bars -->` | N blocos `<div class="token-row">` ordenados decrescente por consumo |
   | `<!-- SLOT:timeline -->` | N blocos `<div class="turn {user|assistant|agent|milestone|tool}">` |
   | `<!-- SLOT:artifacts -->` | N blocos `<div class="art-item {md|html|pdf|...}">` |
   | `<!-- SLOT:artifacts_count -->` | Ex: `9 FILES · 5.3 MB` |
   | `<!-- SLOT:agents -->` | N blocos `<div class="agent-badge [orchestrator]">` |
   | `<!-- SLOT:agents_count -->` | Ex: `7 VOICES · 2 SPAWNS` |
   | `<!-- SLOT:decisions -->` | N blocos `<div class="decision-row">` (opcional — vazio ou placeholder se não houve log de decisões) |
   | `<!-- SLOT:decisions_count -->` | Ex: `10 DECISIONS` ou `—` |
   | `<!-- SLOT:rules -->` | N `<span class="chip [active|warn]">` com regras carregadas |
   | `<!-- SLOT:skills -->` | N `<span class="chip [active]">` com skills tocadas |
   | `<!-- SLOT:rules_skills_count -->` | Ex: `8 RULES · 4 SKILLS · 172 AVAILABLE` |
   | `<!-- SLOT:terminal_info -->` | Linhas `<span class="prompt-line">` com session_id, model, platform, cwd, branch, context_used, domain, current_artifact, pending |
   | `<!-- SLOT:terminal_prompt -->` | Ex: `alan@aiox` (do env vars) |

   Use `replace_all: false` em cada Edit — faça substituição posicional única por slot.

6. **Ensure output dir.** `mkdir -p {parent_dir_of_output}` via Bash. Default parent é `outputs/meta/` relativo ao cwd.

7. **Write** o HTML resultante usando a tool `Write`:
   - Default: `outputs/meta/context-window-{YYYYMMDD-HHmm}.html` (relativo ao cwd)
   - Custom: path passado como primeiro arg (trate como literal; se relativo, resolve contra cwd)
   - Se `--compact`: suffix `-compact` antes da extensão

8. **Open** o arquivo (a menos que `--no-open`):
   ```bash
   # macOS
   open {path}
   # Linux
   xdg-open {path}
   ```
   Em caso de falha do `open`, NÃO aborte — apenas reporte que o arquivo foi gravado.

9. **Report** ao usuário em 4-6 linhas:
   - Path absoluto do arquivo
   - Tamanho (bytes ou KB)
   - 3 KPIs principais (tokens/turns/artifacts)
   - Nota sobre limites de precisão das estimativas
   - Sugestão de comando para re-gerar com flags diferentes (se útil)

---

## Honesty / Epistemic guardrails

- **Tokens são estimativas.** O modelo não tem acesso direto ao token counter oficial. Prefixe todos os números com `~` ou `est.`. Nunca afirme precisão exata.
- **Timeline é reconstituída por memória.** Não é log preciso — é a melhor reconstrução da sequência de eventos visíveis na janela.
- **Camadas L0-L7 são conceituais.** A arquitetura interna do Claude Code não expõe literalmente essas camadas, mas a divisão é útil pra visualizar o que está carregado.
- **Não invente** ferramentas, agentes ou skills que não apareceram na sessão. Liste apenas o que efetivamente foi tocado.
- **Prior-art honesty:** se alguma seção (ex: decisions log, artifacts) não tem dado real, prefira dash `—` ou bloco vazio com label "— none observed —" sobre dados inventados.

---

## Visual identity (brandbook AIOX v2.0.0)

Tokens canônicos — já estão no `template.html`, não alterar:

```css
--lime:    #D1FF00   /* accent primário */
--dark:    #050505   /* background */
--cream:   #F4F4E8   /* text base em blocos claros */
--flare:   #ED4609   /* warning / attention */
--blue:    #0099FF   /* info neutro */
--surface: #0F0F11   /* card bg */

--font-sans:    "Geist", system-ui, sans-serif
--font-display: "TASAOrbiterDisplay", system-ui, sans-serif
--font-mono:    "JetBrains Mono", "Roboto Mono", monospace
```

Elementos obrigatórios (já montados no template):
- Topbar com pulsing lime dot + `AIOX/SQUAD · CONTEXT WINDOW MONITOR`
- Hero h1 usando font-display com lime accent
- KPI cards com borda lime lateral 3px
- Timeline com nodos coloridos (user=blue / assistant=cream / agent=flare-glow / milestone=lime-glow)
- Terminal footer com prompt `$`, cursor lime piscante, monospace
- Footer com trueline "Agora o controle é seu" em lime

Fontes são referenciadas via CSS `font-family` fallback stack — o HTML não carrega webfonts externas (zero deps, funciona offline). Em browsers sem Geist/TASAOrbiter instalado, cai graciosamente pra system-ui.

---

## Safety rules

- **Nunca** inclua no HTML conteúdo literal de mensagens privadas, senhas, tokens, API keys, ou qualquer secret do CLAUDE.md/settings.local.json/.env. Visualize apenas metadados (números de turns, tipos, tamanhos, paths).
- **Nunca** inclua transcrição completa da conversa — só títulos de 1 linha por turn + descrição opcional 1 linha.
- Se o cwd contiver segredos expostos (ex: `.env` editado recentemente), **não cite o conteúdo** do secret — apenas o fato de que o arquivo foi tocado.
- Output sempre em `outputs/meta/` ou path explícito do user; **nunca** em `workspace/` ou `.aiox-core/` (per `.claude/rules/artifact-classification.md` — este é output de squad, não artefato canônico).
- Em caso de dúvida entre "mostra o dado sensível pra ficar rico" vs "omitir pra preservar privacidade" — sempre omitir.

---

## Output file naming

Default pattern: `outputs/meta/context-window-{YYYYMMDD-HHmm}.html`

Exemplos:
- `outputs/meta/context-window-20260421-2115.html`
- `outputs/meta/context-window-20260421-2130-compact.html`

Sufixos opcionais:
- `--compact` → `context-window-{timestamp}-compact.html`

---

## Prior-art note

- **Reference render:** `outputs/meta/context-window-viz.html` (40KB, 2026-04-21) — primeira versão inline, serviu de fonte pra extrair este template.
- **Related skill:** `cc-session-analyze` (claude-code-mastery squad) — analisa JSONL recordings históricos em `~/.claude/projects/`. Diferença fundamental: `cc-session-analyze` lê **session files on disk** (passado); `context-export` introspecta o **working memory atual** (presente). Não sobrepõem.
- **Brand tokens:** `workspace/businesses/aiox/L2-tactical/brand/brandbook.yaml`.

---

## Reference

- Template: `template.html` (mesmo diretório)
- Squad owner: `claude-code-mastery` (Orion + 7 specialists)
- Validation: `squads/sinkra-squad/scripts/validate-skill.sh context-export`
- Registry entry: `.claude/skills/skill-registry.yaml`

---

*Context Export Skill v1.0 — inline execution, no subagent spawn. Meta-observation tool.*
