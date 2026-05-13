---
name: advisory-council
description: |
  Advisory Council — spawns 5 cognitively-diverse advisors via Agent Teams for strategic
  decision-making with anonymized synthesis. Advisors: Contrarian (steel-man + attack),
  First Principles (ground-up reasoning), Expansion (unseen opportunities), Outsider
  (zero internal context, web-only), Executor (pure practicality). Team Lead anonymizes
  all responses, synthesizes blind, then de-anonymizes in final report.

  Use when: strategic decisions, architecture choices, product direction, investment
  analysis, or any decision that benefits from cognitively diverse perspectives.
  NOT for: domain-expert review (use /roundtable), code review (use /coderabbit-review),
  story validation (use /review-story).

  Complementary to /roundtable: roundtable uses domain-expert lenses (@architect, @cso, etc.),
  advisory-council uses cognitive-diversity lenses (contrarian, first principles, etc.).
version: "1.0.0"
owner_squad: sinkra-squad
sinkra_tier: Tier2
context: conversation
agent: general-purpose
user-invocable: true
argument-hint: "[topic, question, or file path] [--fast] [--no-confirm]"
depends_on: []
---

# Advisory Council

> **Roundtable Origin:** RT-AC-001 (2026-04-27) — 5/5 agents PROCEED_WITH_CONDITIONS (6.3/10)
> **IDS Decision:** CREATE — differences with /roundtable too substantial for preset (IDS G3 formal analysis)
> **Report:** docs/architecture/roundtable-advisory-council-skill-2026-04-27.md

## Overview

Orquestra um conselho consultivo de 5 advisors cognitivamente diversos via Agent Teams.
Cada advisor analisa o mesmo problema de um ângulo cognitivo fundamentalmente diferente.
As respostas são anonimizadas antes da síntese pelo Team Lead para reduzir anchoring bias.

**Diferença chave vs /roundtable:**
- `/roundtable` = domain-expert lenses (o que @architect pensa? o que @cso pensa?)
- `/advisory-council` = cognitive-diversity lenses (o que o contrarian encontra? o que first principles revela?)

**Posição no fluxo:** Standalone, upstream do SDC. Invocável antes de decisões arquiteturais,
story creation, materialização. NÃO dentro de develop→review→close.

---

## Anonymization Protocol (Heurística Anti-Anchoring)

> **RT-AC-001 D3:** Anonymization é heurística anti-anchoring, NÃO garantia técnica hermética.
> O Team Lead conhece os cognitive lenses e pode correlacionar estilo de escrita com identidade.
> O valor está em reduzir viés de ancoragem, não eliminá-lo.

### Protocolo

1. Coletar todas as 5 análises via SendMessage
2. Remover auto-referências (frases como "As the Contrarian...", "From first principles...")
3. Atribuir labels aleatórios (Advisor A-E) — ordem shuffled a cada execução
4. Team Lead sintetiza o set anonimizado
5. **EXCEÇÃO:** Findings BLOCKER/CRITICAL são de-anonymized ANTES do verdict para rastreabilidade
6. Relatório final inclui mapeamento label→advisor para auditoria

---

## Outsider Isolation Contract (NON-NEGOTIABLE)

> **RT-AC-001 D4:** Outsider Isolation Contract formal — aprovado 5/5 unanimous.

### Regras do Orchestrator (Team Lead)

O Team Lead NUNCA pode incluir no prompt do Outsider:
- Paths de arquivos internos
- Nomes de squads, agents, ou skills
- Referências a SINKRA, AIOX, ou framework interno
- Dados de registries (service-catalog, ecosystem-registry)
- Código-fonte ou configurações do repositório
- Decisões internas anteriores

O prompt do Outsider contém APENAS:
- O enunciado do problema/decisão em linguagem neutra
- Contexto de negócio genérico (indústria, escala, constraints)

### Regras do Outsider Advisor

- PROIBIDO usar Read, Grep, Glob, Bash — APENAS WebSearch + SendMessage
- PROIBIDO referenciar arquivos, paths, ou estrutura interna
- Se WebSearch falhar ou retornar < 2 fontes externas: `outsider_status: degraded`
- Outsider com status degraded NÃO é computado no verdict final

---

## Advisors (5 Atoms)

Cada advisor é um Atom com executor=Agent(sonnet), trabalhando em ISOLAMENTO total.

### ATM-AC-001: The Contrarian Advisor

**Cognitive lens:** Encontrar falhas fatais via steel-man + attack
**Tools:** Read, Grep, Glob, SendMessage (full repo access)

**Protocolo:**
1. STEEL-MAN primeiro: articular a versão MAIS FORTE da proposta
2. ATACAR a versão steel-manned: encontrar falhas genuinamente fatais
3. Para cada falha: evidência específica, não especulação
4. Se rejeitar: DEVE propor alternativa concreta
5. Foco APENAS em falhas fatais/críticas — ignorar estilo, preferência, melhorias menores
6. Se a ideia sobreviver ao melhor ataque: admitir e marcar APPROVED

**Output format:**
```
## Contrarian Analysis
### Lens adherence: HIGH/MEDIUM/LOW — [justificativa]
### Steel-Man Summary
(A versão mais forte desta proposta)
### Fatal Flaw Analysis
| # | Flaw | Severity | Evidence | Alternative |
### Verdict: APPROVED / REJECTED
### Confidence: HIGH / MEDIUM / LOW
### Key Risk: (sentença única — o maior perigo)
```

### ATM-AC-002: First Principles Thinker Advisor

**Cognitive lens:** Decompor até fundamentos, raciocinar ground-up
**Tools:** Read, Grep, Glob, SendMessage (full repo access)

**Protocolo:**
1. Identificar o PROBLEMA FUNDAMENTAL (não a solução proposta)
2. Listar verdades irredutíveis — o que SABEMOS com certeza?
3. Raciocinar para CIMA a partir dessas verdades — que solução emerge organicamente?
4. Comparar solução ground-up com a proposta
5. Onde DIVERGEM: explicar por que first principles sugerem diferente
6. Onde CONVERGEM: isso fortalece confiança na proposta

**Output format:**
```
## First Principles Analysis
### Lens adherence: HIGH/MEDIUM/LOW — [justificativa]
### Fundamental Problem
(O que está realmente sendo resolvido, livre de premissas)
### Irreducible Truths
1. (fato que não pode ser decomposto mais)
### Ground-Up Solution
(O que emerge do raciocínio bottom-up)
### Divergence Analysis
| Aspect | Proposal Says | First Principles Says | Implication |
### Verdict: ALIGNED / PARTIALLY_ALIGNED / MISALIGNED
### Confidence: HIGH / MEDIUM / LOW
### Key Insight: (sentença única — a verdade mais importante descoberta)
```

### ATM-AC-003: The Expansion Advisor

**Cognitive lens:** Identificar oportunidades não vistas e possibilidades adjacentes
**Tools:** Read, Grep, Glob, SendMessage (full repo access)

**Protocolo:**
1. Aceitar a proposta como ponto de partida (NÃO criticar)
2. "Que oportunidades isso CRIA que não foram mencionadas?"
3. "Que capacidades adjacentes se tornam possíveis se isso tiver sucesso?"
4. "Qual é a versão 10x desta ideia?"
5. "Que conexões cross-domain estão sendo perdidas?"
6. Mapear pelo menos 3 oportunidades de expansão com esforço/impacto

**Output format:**
```
## Expansion Analysis
### Lens adherence: HIGH/MEDIUM/LOW — [justificativa]
### Opportunity Map
| # | Opportunity | Effort | Impact | Adjacent To |
### The 10x Version
(Se esta ideia fosse 10x mais ambiciosa, como seria?)
### Cross-Domain Connections
(Que padrões de outros domínios se aplicam aqui?)
### Verdict: EXPAND / GOOD_AS_IS / THINK_BIGGER
### Confidence: HIGH / MEDIUM / LOW
### Key Opportunity: (sentença única — a maior oportunidade não vista)
```

### ATM-AC-004: The Outsider Advisor

**Cognitive lens:** Zero contexto interno, perspectiva puramente externa
**Tools:** WebSearch + SendMessage APENAS (NO Read/Grep/Glob/Bash)

**Protocolo:**
1. Ler APENAS o enunciado do problema fornecido
2. Pesquisar o tópico via web search (padrões da indústria, best practices, abordagens de competidores, pesquisa acadêmica)
3. Fornecer recomendações baseadas PURAMENTE em conhecimento externo
4. Sinalizar qualquer coisa na proposta que pareça incomum da perspectiva da indústria
5. Comparar com como empresas/projetos top resolvem o mesmo problema
6. Citar pelo menos 2 fontes externas — se não conseguir, declarar `outsider_status: degraded`

**Output format:**
```
## Outsider Analysis
### Lens adherence: HIGH/MEDIUM/LOW — [justificativa]
### outsider_status: nominal / degraded
### External Perspective
(O que a indústria diz sobre este tipo de problema?)
### Industry Comparison
| Approach | Used By | Pros | Cons |
### Red Flags (da perspectiva externa)
(O que parece incomum ou arriscado comparado a normas da indústria?)
### Verdict: STANDARD / UNCONVENTIONAL / CONCERNING
### Confidence: HIGH / MEDIUM / LOW
### Key External Insight: (sentença única — o que olhos frescos veem que insiders não)
```

### ATM-AC-005: The Executor Advisor

**Cognitive lens:** Pura praticidade — o que precisa ser FEITO
**Tools:** Read, Grep, Glob, SendMessage (full repo access)

**Protocolo:**
1. Para cada decisão/proposta, produzir PLANO DE AÇÃO concreto
2. Estimar esforço por passo (horas/dias, não story points)
3. Identificar dependências e blockers
4. Identificar quem deve executar cada passo
5. Identificar o que pode ser paralelizado
6. Definir a implementação MÍNIMA VIÁVEL (20% que dá 80%)
7. Sinalizar qualquer coisa que soa bem na teoria mas é impraticável de executar

**Output format:**
```
## Executor Analysis
### Lens adherence: HIGH/MEDIUM/LOW — [justificativa]
### Action Plan
| # | Step | Effort | Dependencies | Executor | Parallelizable? |
### Blockers
| Blocker | Severity | Mitigation |
### Minimum Viable Path
(A menor coisa que podemos fazer para validar que funciona)
### Verdict: FEASIBLE / FEASIBLE_WITH_CHANGES / IMPRACTICAL
### Confidence: HIGH / MEDIUM / LOW
### Key Reality Check: (sentença única — a parte mais difícil que ninguém está discutindo)
```

---

## Execution Flow

### PHASE 1: Parse & Confirm

1. Analisar input (arquivo, pergunta, ou sessão atual)
2. Formular o enunciado do problema em linguagem neutra (para o Outsider)
3. Apresentar ao usuário para confirmação (skip com `--no-confirm`)

### PHASE 2: Create Team & Spawn Advisors

```
TeamCreate(team_name: "advisory-council-{id}")
```

Spawnar TODOS os 5 advisors em UMA ÚNICA mensagem (paralelo):

```
Agent(name: "contrarian", team_name: "advisory-council-{id}", model: "sonnet")
Agent(name: "first-principles", team_name: "advisory-council-{id}", model: "sonnet")
Agent(name: "expansion", team_name: "advisory-council-{id}", model: "sonnet")
Agent(name: "outsider", team_name: "advisory-council-{id}", model: "sonnet")
Agent(name: "executor", team_name: "advisory-council-{id}", model: "sonnet")
```

**CRITICAL para Outsider:** O prompt do Outsider contém APENAS o enunciado neutro do problema.
Seguir o Outsider Isolation Contract estritamente.

### PHASE 3: Collect Analyses

Aguardar todas as 5 análises via SendMessage. Mensagens chegam automaticamente.

**Quality gate:** Verificar cada resposta:
- `Lens adherence: LOW` → marcar como `insufficient`, não computar no verdict
- Outsider com `outsider_status: degraded` → não computar no verdict
- Resposta < 300 tokens → marcar como `insufficient`

### PHASE 4: Anonymize & Shuffle

1. Remover auto-referências de cada análise
2. Shufflar ordem aleatoriamente
3. Atribuir labels: Advisor A, B, C, D, E
4. **EXCEÇÃO:** Findings BLOCKER/CRITICAL → de-anonymize imediatamente

### PHASE 5: Blind Synthesis (Team Lead)

Processar o set anonimizado:
1. Identificar consensos (2+ advisors concordam)
2. Identificar conflitos (advisors divergem)
3. Identificar insights únicos
4. Produzir verdict

**Verdict Model:**

| Verdict | Significado | Quando |
|---------|-------------|--------|
| **PROCEED** | Consenso forte, sem falhas fatais, caminho claro | 4+ advisors suportam, Contrarian APPROVED |
| **PROCEED_WITH_CONDITIONS** | Boa direção mas condições devem ser atendidas | Maioria suporta com caveats |
| **RETHINK** | Problemas fundamentais, precisa redesign | First Principles MISALIGNED ou Contrarian achou falha fatal |
| **ABANDON** | Proposta fatalmente falha ou impraticável | Múltiplos advisors rejeitam, Executor diz IMPRACTICAL |
| **INCONCLUSIVE** | Dados insuficientes para verdict confiável | < 3 advisors com respostas válidas |

### PHASE 6: De-anonymize & Report

1. Revelar mapeamento label→advisor
2. Gerar relatório completo com atribuição
3. Persistir em `outputs/sinkra-squad/advisory-council/{YYYY-MM}/{date}-advisory-council.md` ou `docs/architecture/` se ADR

### PHASE 7: Cleanup

```
SendMessage(to: "contrarian", message: { type: "shutdown_request" })
SendMessage(to: "first-principles", message: { type: "shutdown_request" })
SendMessage(to: "expansion", message: { type: "shutdown_request" })
SendMessage(to: "outsider", message: { type: "shutdown_request" })
SendMessage(to: "executor", message: { type: "shutdown_request" })
TeamDelete()
```

---

## Report Template

```markdown
# Advisory Council — {subject}

> **Date:** {date}
> **Council ID:** AC-{YYYY-MM-DD}-{seq}
> **Verdict:** {verdict} ({score}/10)
> **Advisors:** 5 (Contrarian, First Principles, Expansion, Outsider, Executor)
> **Anonymization:** Heurística anti-anchoring (respostas shuffled antes da síntese)

---

## Executive Summary
(Síntese cega do Team Lead — escrita ANTES da de-anonymization)

## Verdict Breakdown
| Advisor | Verdict | Confidence | Lens Adherence | Key Insight |

## Consensus Points
(Findings mencionados por 2+ advisors)

## Conflicts
(Onde advisors divergem fundamentalmente)

## Unique Insights
(Findings valiosos de apenas 1 advisor)

## Expansion Opportunities
(Do Expansion Advisor)

## External Perspective
(Do Outsider Advisor — com outsider_status)

## Action Plan
(Do Executor Advisor, refinado pelo Team Lead)

## Final Verdict
**{verdict}** ({score}/10)
**Conditions:** {condições se houver}
**Next step:** {próxima ação concreta}

---
*Generated by Advisory Council skill v1.0*
*Anonymization: respostas shuffled antes da síntese (heurística anti-anchoring)*
```

---

## Usage Examples

```bash
# Decisão estratégica
/advisory-council "Should we migrate from REST to GraphQL for our API?"

# Analisar um ADR
/advisory-council docs/architecture/ADR-045.md

# Decisão de produto
/advisory-council "Is MaaS viable as a standalone product line?"

# Quick council (sem confirmação)
/advisory-council --no-confirm "Quick gut check on this pricing strategy"

# Fast mode (timeout reduzido)
/advisory-council --fast "Should we adopt this new framework?"
```

---

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| v1.0.0 | 2026-04-27 | Initial release — 5 advisors, blind synthesis, Outsider isolation. RT-AC-001. |
