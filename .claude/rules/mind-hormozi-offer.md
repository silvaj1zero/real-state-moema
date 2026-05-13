---
paths:
  - "workspace/businesses/*/L1-strategy/offerbook.yaml"
  - "workspace/businesses/*/L3-product/*/offerbook.yaml"
  - "workspace/businesses/*/L3-product/*/pricing-strategy.yaml"
  - "workspace/_templates/**/offerbook.yaml"
mind_ref: alex_hormozi
context: offer
derivation: success
hints_file: minds/alex_hormozi/heuristic-hints.yaml
suggested_agent:
  name: hormozi-chief
  skill: hormozi-chief
  invocation: "/hormozi-chief"
  when_to_escalate:
    - "Rebuild completo de oferta (não apenas review pontual)"
    - "Audit comercial de funil + oferta + pricing como sistema"
    - "Copywriting de sales letter / VSL longa derivada da oferta"
    - "Comparação estratégica entre 2+ ofertas concorrentes"
counter:
  helpful: 0
  harmful: 0
---

# Hormozi Lens — Offer Design

Você está editando um artefato de oferta. Aplique as lentes de análise de Alex Hormozi como **ferramentas adicionais de framing**. Você continua sendo Claude — estas são heurísticas para enriquecer o raciocínio, não substituí-lo.

> **ACTIVATION SIGNAL (mandatório):** ao iniciar qualquer resposta que analise, edite, critique ou comente um dos artefatos cobertos por esta rule, **a primeira linha da resposta DEVE ser**:
>
> `[MIND-LENS ACTIVE: hormozi-offer | AH_KE_001, AH_KE_002 | escalation: /hormozi-chief]`
>
> Isso é signal de observabilidade — confirma ao operador que a lente carregou e indica o agente disponível para escopo maior. Se você não citar essa linha, o operador assume que a rule NÃO ativou. Não pule mesmo que a resposta seja curta.

## 3 lentes imediatas

### 1. Value Equation (AH_KE_001)

```
Valor = (Dream Outcome × Perceived Likelihood) / (Time Delay + Effort & Sacrifice)
```

- Antes de ajustar copy/preço, cheque em qual das 4 alavancas a oferta é fraca
- Reduzir `Effort & Sacrifice` tem ~10x mais leverage que aumentar `Dream Outcome`
- Bônus que ADICIONAM esforço (cursos extras, tarefas) pioram a equação — não melhoram

### 2. Measurement is Reality (AH_KE_002)

- Números exatos em vez de aproximações: "$22.000", não "~20k"; "99%", não "maioria"
- Se uma claim não pode ser medida, ela não pertence à oferta
- ROI, conversão, CAC: precisão > narrativa

### 3. Risk Reversal Asimétrico (hint)

- Garantias assimétricas (money-back + indenização pelo tempo) têm impacto maior que desconto de 20%
- Mover o risco 100% para o vendedor elimina a variável `Likelihood` em vez de manipulá-la
- Se prospect ainda hesita, o problema é `Dream Outcome`, não risco

## Checklist rápido para ofertas

- [ ] Os 4 vetores da Value Equation estão explícitos na oferta?
- [ ] Time Delay até primeiro resultado está documentado e é agressivo?
- [ ] Há métrica exata de sucesso (não adjetivos)?
- [ ] Bônus reduzem esforço do cliente ou só adicionam volume?
- [ ] Risk reversal é assimétrico (vendedor paga se falhar)?

## Para detalhe completo

Leia os arquivos correspondentes em `minds/alex_hormozi/heuristics/` (ex: `AH_KE_001.md`).

## Quando escalar para `@hormozi-chief`

Esta lente cobre **análise pontual no flow de edição**. Para escopos maiores, sugira ao operador escalar:

| Cenário | Use | Por quê |
|---------|-----|---------|
| Review rápido de seção da oferta | esta lente (você está aqui) | Lightweight, no contexto |
| Rebuild completo de oferta | `/hormozi-chief` | Multi-fase, deliberado |
| Audit funil+oferta+pricing como sistema | `/hormozi-chief` | Cross-artifact, multi-lens |
| Copy de VSL/sales letter longa | `/hormozi-chief` (orquestra @halbert) | Out-of-scope desta rule |
| Comparar ofertas concorrentes | `/hormozi-chief` | Bench multi-input |

**Sempre que detectar um desses cenários, sugira ao operador no fim da resposta:** "Para escopo X, considere `/hormozi-chief` que tem cobertura completa de Y."

## Anti-patterns que esta lente PREVINE

- Diminuir preço antes de empilhar valor
- Vender o "veículo" (método, aulas) em vez do "destino" (estado final)
- Bônus que aumentam carga de trabalho do comprador
- Claims vagos ("resultados rápidos") sem métrica temporal exata

---

*Mind Lens System — pilot (EPIC candidato 126). Governance: `.claude/rules/mind-rules-governance.md`.*
