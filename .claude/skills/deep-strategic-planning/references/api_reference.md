# Deep Strategic Planning - Integration Guide

## Multi-Lens Framework Integration

Esta skill depende do Multi-Lens Framework para aplicação das 12 lentes.

### Localização do Framework
```
squads/multi-lens-framework/
├── data/lens-catalog.yaml      # Definições das 12 lentes
├── tasks/apply-lens.md         # Task de aplicação individual
├── domains/                    # Customizações por domínio
│   ├── books.yaml
│   ├── architecture.yaml
│   └── code-review.yaml
└── agents/lens-orchestrator.md # Agente orquestrador
```

### Invocação Direta

Para análise individual de uma lente:
```
/lens *single-lens {lens-name} "{topic}"
```

Para análise completa de 12 lentes:
```
/lens *analyze {domain} "{topic}"
```

### Consulta a Clones (MMOS)

Para decisões que beneficiam de múltiplas perspectivas de "personalidades":
```
/lens *consult @{clone} "{problem}"
/lens *council "{problem}"
```

Clones disponíveis: @naval, @munger, @taleb, @dalio, @bezos, @thiel, e 75+ outros.

---

## Workflow de Execução

### 1. Trigger da Skill

A skill é ativada quando o usuário menciona:
- "deep strategic planning"
- "modo dr. estranho"
- "análise de cenários/futuros"
- "decisão estratégica complexa"
- Ou explicitamente: `/deep-strategic-planning`

### 2. Coleta de Contexto

Elicitar do usuário:
```yaml
decision: "Qual decisão precisa tomar?"
context: "Qual o contexto? (empresa, projeto, pessoal)"
constraints: "Quais são os limites?"
timeline: "Em quanto tempo precisa decidir?"
success_metric: "Como sabe se deu certo?"
```

### 3. Execução do Workflow

```
Phase 1: Cristalização → problem_crystal
Phase 2: Geração → 7-10 futuros na matriz
Phase 3: Análise → 12 lentes × N futuros
Phase 4: Síntese → ranking + padrões + contradições
Phase 5: Ação → plano concreto do vencedor
```

### 4. Output

Entregar relatório seguindo o template em SKILL.md, incluindo:
- Decisão cristalizada
- Futuros analisados
- Análise detalhada por lente
- Síntese com ranking
- Caminho vencedor identificado
- Plano de ação com marcos e kill switch

---

## Comandos Relacionados

| Comando | Descrição | Quando usar |
|---------|-----------|-------------|
| `/deep-strategic-planning` | Esta skill completa | Decisões estratégicas complexas |
| `/lens *analyze` | Multi-lens em um tópico | Análise profunda de um item |
| `/lens *quick-lens` | 3 lentes essenciais | Análise rápida |
| `/lens *council` | Consulta múltiplos clones | Quando quer perspectivas variadas |

---

## Limitações

1. **Intensivo em tokens** - Análise completa (12 lentes × 10 futuros) é extensa
2. **Requer contexto** - Decisões sem contexto suficiente geram cenários genéricos
3. **Não substitui julgamento** - O output é suporte, não substituto para decisão humana
4. **Viés de disponibilidade** - Cenários são limitados pela criatividade do momento

## Quando NÃO Usar

- Decisões triviais (usar *quick-lens)
- Urgência extrema (não há tempo para análise completa)
- Informação insuficiente (primeiro coletar dados)
- Decisões reversíveis facilmente (just do it)
