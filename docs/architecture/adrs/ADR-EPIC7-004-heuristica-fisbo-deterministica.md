# ADR-EPIC7-004: Heuristica FISBO Deterministica 4-Signal antes de ML

**Date:** 2026-05-14
**Status:** Accepted
**Epic:** 7 — Inteligencia de Prospeccao Automatizada Multi-Fonte

## Context

A categoria A (FISBO — For Sale By Owner) e prioridade comercial para Luciana e diferencial competitivo do produto. Diferente do mercado US (onde Realtor.com entrega `advertiser.type = "seller"` tipificado e HomeHarvest apenas consome), nos portais BR (Zap/OLX/VivaReal/MercadoLivre/ImovelWeb) o campo "anunciante" pode ser ambiguo:

- imobiliaria (broker)
- corretor autonomo (agent)
- proprietario direto (FSBO/FISBO)
- portal/automacao (lead-gen)

A inferencia precisa ser nossa. Wave 1+2 research mapeou que:
- Literatura US (REDX, Vulcan7, Espresso, Mojo, FSBOTown, ForSaleByOwner.com) opera comercialmente sobre heuristica similar — modelos rentaveis
- Hypothesis H-001 ("heuristica deterministica > 80% precisao") ficou INCONCLUSIVE — sem benchmark publicado BR
- Estimativa defensavel 70-85% lower-bound; +5-10% adicional com feature L3 (Delta-preco-vs-ITBI-bairro)
- ML supervised premature antes de ter 200+ labels da Luciana (REC-1.3, REC-6.2)

HomeHarvest code-anatomy revelou que `processors.py:33-79` so processa `advertiser.type == "seller" | "community"`; sem advertiser ou tipo nao-tipificado = **inferencia silenciosa do caller** (FSBO ou outro). Em BR precisamos formalizar a regra.

## Decision

**Implementar heuristica FISBO deterministica de 4 sinais convergentes ANTES de qualquer modelo ML.**

Funcao pura `classifyAdvertiser(signals: AdvertiserSignals)`:

```typescript
// packages/scrapers/lib/classify-advertiser.ts
interface AdvertiserSignals {
  hasCRECI: boolean;            // CRECI lookup retornou Ativo
  cnpj?: string;                // CNPJ encontrado no anuncio
  phoneType?: 'mobile' | 'landline' | 'unknown';
  phoneDDD?: string;
  listingCountByPhone?: number; // anuncios ativos do mesmo telefone
  nameAppearsPersonal: boolean; // heuristica regex (nome PF vs razao social)
}

function classifyAdvertiser(s: AdvertiserSignals): {
  classification: 'agent' | 'broker' | 'builder' | 'for_sale_by_owner' | 'unknown';
  confidence: number; // 0-1
  signals: string[];  // rastreabilidade dos sinais
} {
  const signals: string[] = [];

  // Path 1: CNPJ -> Builder / Broker (alta confianca)
  if (s.cnpj) {
    const cnae = lookupCNAE(s.cnpj);
    if (['4110700', '4120400'].includes(cnae)) {
      return { classification: 'builder', confidence: 0.95, signals: ['cnpj_match_construtora'] };
    }
    if (['6822500', '6831700'].includes(cnae)) {
      return { classification: 'broker', confidence: 0.90, signals: ['cnpj_match_imobiliaria'] };
    }
  }

  // Path 2: FISBO — 4 sinais convergentes (todos devem casar)
  if (
    !s.hasCRECI &&
    s.phoneType === 'mobile' &&
    s.listingCountByPhone === 1 &&
    s.nameAppearsPersonal
  ) {
    return {
      classification: 'for_sale_by_owner',
      confidence: 0.85,
      signals: ['ddd_mobile', 'no_creci_match', 'single_listing', 'name_appears_personal'],
    };
  }

  // Path 3: Agent (CRECI ativo)
  if (s.hasCRECI) {
    return { classification: 'agent', confidence: 0.80, signals: ['has_creci'] };
  }

  return { classification: 'unknown', confidence: 0.0, signals: [] };
}
```

**Validacao empirica obrigatoria:**
- Story 7.X (Workshop com Luciana): batch 200 anuncios estratificados; Luciana valida 30 -> calcula precision/recall reais para Zona Sul SP
- Resultado registrado em `docs/stories/decision-log-7.X-fisbo-validation.md`

**Manual review queue:**
- `/leads/review-queue` lista leads com `confidence < 0.70`
- Luciana confirma/recusa antes de criar entrada no funil V1
- Reduce risco de aproximacao errada (falso positivo FISBO em corretor autonomo CPF+telefone pessoal)

**ML NAO entra antes de:**
- 200 labels da Luciana acumulados (true/false "vale abordar")
- Pipeline UI labels operacional (FR-062)

## Alternatives Considered

| Alternativa | Avaliada | Por que rejeitada |
|---|---|---|
| **LLM-based classifier desde Wave A** | Possivel | Custo tokens; opacidade nao-explicavel; risco hallucination; sem ROI antes de ter labels |
| **Adopta `advertiser.type` ja existente** (a la HomeHarvest) | Possivel | Portais BR NAO entregam tipificado; inferencia tem que ser nossa |
| **2-signal heuristic (CRECI + cnpj)** | Possivel | Recall pobre — perderia FISBOs sem CNPJ visivel mas com CRECI consultavel; falso negativo alto |
| **5+ signal heuristic** | Possivel | Falso positivo alto; sinais menos preditivos diluem confidence; piora explicabilidade |
| **Supervised ML (XGBoost) desde Wave A** | Possivel | Sem labels Luciana, modelo treina com proxy noisy = bias amplificado |
| **Random Forest com SHAP** | Possivel | Mesmo problema do ML supervised antes de labels reais |

## Consequences

**Positive:**
- Explicabilidade total — rastreabilidade de quais sinais levaram a classification
- Zero custo (deterministica, sem LLM, sem API externa adicional alem de CRECI lookup ja necessario)
- Testavel via unit tests (input synthetic AdvertiserSignals -> assert output exato)
- Baseline auditavel para comparar contra ML quando entrar (Wave B)
- Bias controlado: nao herda viés implicito de dados de treino

**Negative:**
- Recall provavelmente menor que ML supervised quando entrar (aceito como baseline)
- Pode classificar erradamente corretores autonomos com CPF + telefone pessoal (sem CNPJ visivel, com CRECI). **Mitigacao:** CRECI lookup garantido em FR-053, signal `no_creci_match` so dispara se lookup confirmar ausencia
- Threshold 0.70 para manual review e escolha; precisa calibracao com Luciana
- Workshop Luciana 2h consume tempo dela (uma das stories mais delicadas operacionalmente)
- Falso positivo FISBO -> abordagem errada -> atrito com lead. Mitigacao: review queue + confidence transparente no UI

## Evidence

- **`docs/research/2026-05-14-leads-zonasul-sp/03-recommendations.md`** REC-1.1 + REC-1.2 + REC-1.3.
- **`docs/research/2026-05-14-leads-zonasul-sp/curiosity_queue.yaml`** CQ-007 PARTIAL + H-001 INCONCLUSIVE.
- **`docs/research/2026-05-14-leads-zonasul-sp/wave-2-summary.md`** §"Hypothesis verdicts" H-001.
- **`docs/code-anatomy/bunsly-homeharvest/07-business-rules.md`** BR-ADV-001 + analise verbatim Realtor.com pattern.
- **`docs/code-anatomy/bunsly-homeharvest/extraction-notes.md`** Sec. 2 (FSBO inference layer Zod schema).

---

*ADR-EPIC7-004 — Aria (@architect) + Morgan (@pm) — 2026-05-14*
