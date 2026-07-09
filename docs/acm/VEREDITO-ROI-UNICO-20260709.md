# Veredito único de ROI — o que fazer de verdade

**Data:** 2026-07-09 · **Rev. 4** (v3 + reconciliação com segundo veredito independente; plano de execução operacional em `PLANO-EXECUCAO-ACM-20260709.md`)  
**Entradas:**
1. **OS agêntico** — contexto versionado · gates · autoridade · dívidas (push, E2E, scripts, operador único)  
2. **Método ACM** — ITBI certo · epistemologia · passaporte · **prioridade real 1–8** · criativos (tribunal, radar, objeções, simulador) · frieza NBR  

**Critério de ROI:** *(exclusividade + laudo defensável em V2 + zero perda de disco)* ÷ *dias*  
**Frase-mãe (análise 2):** *O melhor ACM não é o que só calcula preço — é o que prova, responde objeção e manda o que fazer segunda-feira.*

---

## 0. Veredito final (não negociar sem evidência nova)

### Duas análises, um plano

| Camada | Mensagem | Status |
|--------|----------|--------|
| **Fábrica (1)** | Sistema já escala **execução** com agentes (story/gate/handoff/@devops) | **Usar, não expandir** |
| **Produto (2)** | ACM ainda **não** escala **confiança + uso comercial** sem herói | **Construir isto** |

```
ROI = OS × Evidência × Explicabilidade × Ação comercial × Trabalho_salvo
```

Sofisticação (Ross, regressão, skill LLM) **em cima de evidência incerta = número bonito e fraco.**  
Erro a evitar (análise 2, ao pé da letra): *correr para regressão antes de limpar evidência, alvo e explicabilidade.*

### Ordem canônica de ROI

```
FASE 0  Higiene + julgamento
        0a push/backup commits   ← análise 1 dívida #1 (irreversível)
        0b H-3 Luciana           ← calibra 9.14 + copy comercial

FASE 1  Motor de evidência + três preços  (~1 sem)
        1. avisos[] + passaporte/score A-B-C por comparável     [9.15★]
        2. ficha obrigatória do alvo + deságio não-fixo        [9.14★]
        3. três preços sempre (técnico · captação · anúncio)   [regra visual + 9.14/9.18]
        4. mediana ponderada / ranking A-B-C na mediana         [9.20 NEW]
        5. pesos por tese (construção/terreno)                  [9.16]
        6. tese acima/alinhado/abaixo + radar subprecificação   [9.18 + 9.21]

FASE 2  Uso em campo + escala  (~1–2 sem)
        7. ACM Lite + modo dono + modo objeções (v1 texto)     [9.19★]
        8. R5 + 9.4 (Complemento/Uso)                           [9.17 + 9.4]
        9. CLI acm-validate + merge-back planilha               [P-1 + P-2]
       10. simulador 3 estratégias (rápida/defensável/agressiva)[9.22]
       11. teste de robustez da tese (“tribunal”)               [9.23]

FASE 3  Depois do DoD da Fase 2
       Fase 2 web confiança graduada + screenshots             [9.5 / N-4]
       skill/squad D-3 · E2E CI · apto 9.1 · Ross-Heidecke
```

★ = caminho crítico de implementação imediata pós H-3.

---

## 1. Mapa: “Prioridade Real” da análise 2 → backlog

| # análise 2 | Item | Veredito ROI | Story / artefato |
|-------------|------|--------------|------------------|
| **1** | `avisos[]` + score confiança por comparável | **#1 de produto** — muda o laudo de opinião para auditável | **9.15** (ampliada: códigos + passaporte) |
| **2** | Ficha obrigatória do alvo | **#2** — mata −15% cego; sem ficha → faixa conservadora explícita | **9.14** |
| **3** | Mediana ponderada A/B/C | **#3** — aderência vira peso, não só ordem | **9.20** (nova) |
| **4** | Fase 2 confiança graduada + screenshots | Alto valor, **depois** evidência base; depende crawler/UI | **9.5** / N-4 — **Fase 3** |
| **5** | Simulador de estratégia de preço | ROI comercial alto **depois** dos 3 preços estáveis | **9.22** — Fase 2 final |
| **6** | Índice subprecificação / atratividade | Conecta 132 à ação de segunda-feira | **9.21** — com 9.18 |
| **7** | Ross-Heidecke | Só com idade/estado capturados | **Depois** 9.14+9.4 — Fase 3 |
| **8** | CLI `acm-validate` + merge-back | Escala agentes/operador; **após** motor limpo | **P-1 + P-2** — Fase 2 |

### Três preços — regra inegociável (análise 2 §2)

Sempre, na capa e no computation:

| Preço | Definição | Fonte |
|-------|-----------|--------|
| **Técnico provável** | ITBI saneado (faixa headline) | compute / 9.10 |
| **Comercial de captação** | Técnico × condição/liquidez (ficha + fatores) | 9.14 + liquidez |
| **Estratégico de anúncio** | Posicionamento vs concorrência ativa | input + C-4 / 9.22 |

Nunca colapsar os três em um único “valor de mercado” na capa.  
Stories 9.14 / 9.18 / 9.19 / 9.22 **obrigam** esse layout.

### Códigos `avisos[]` canônicos (análise 2 — adotar)

| Código | Significado |
|--------|-------------|
| `sample_size_low_top3` | Top 3 / n referência baixo |
| `mixed_neighborhood_sample` | Multi-bairro sem segmentação |
| `typology_heuristic_present` | R5 por heurística, não guia |
| `target_land_area_unconfirmed` | Terreno do alvo provisório (ex. 132) |
| `temporal_dispersion_high` | Datas espalhadas sem homog. |
| `terrain_lens_low_n` | Efeito-escala / residual com n fraco |
| `liquidity_factors_unvalidated` | Fatores liquidez default/sem elicit |
| `same_street_missing_due_normalization` | Guard-rail 9.8 cego a formato de endereço |
| `target_condition_unconfirmed` | Sem ficha → faixa conservadora (liga 9.14) |
| `confidence_low_in_top5` | Passaporte C no Top 5 |

---

## 2. Criativos da análise 2 — o que entra quando

| Criativo | Valor comercial | Quando | Como |
|----------|-----------------|--------|------|
| **ACM como tribunal** (testemunhas, admissibilidade, leave-one-out) | Altíssimo em V2 | Fase 2 | **9.23** — secção “Teste de Robustez da Tese” |
| **Radar de subprecificação** | Ação segunda-feira (132) | Fase 1 fim | **9.21** — índice + ação recomendada |
| **Modo objeções do proprietário** | Fechamento | Fase 2 com Lite | **9.19** AC extra: 5 respostas com citação ACM |
| **Simulador 3 estratégias** | Trade-off dono | Fase 2 | **9.22** — tabela rápida/defensável/agressiva |
| **Passaporte / A-B-C** | Defesa sob contraditório | Fase 1 | **9.15** + **9.20** |

**Não** implementar criativos **antes** de avisos + ficha + três preços — senão vira teatro de PDF.

---

## 3. Dureza NBR (análise 2) — redline de marketing

> **Bom o suficiente para decisão comercial de captação; evoluível para laudo técnico quando o caso exigir.**  
> **Nunca** vender como “laudo formal NBR completo”.

Faltam para grau técnico forte (lista de controle, não sprint atual):  
ficha completa · fatores explícitos · idade/conservação · fonte por parâmetro · dispersão/IC · evidência anexada · score formal fundamentação/precisão.

Trilha: **Lite/Pro agora** → **Técnica (Ross + 9.5)** só sob demanda.

---

## 4. Análise agêntica — o que encaixa sem desviar

| Dívida OS | Ação | Fase |
|-----------|------|------|
| Commits sem push | @devops agora | **0a** |
| Scripts por caso | CLI P-1 | **2** |
| Operador único | skill D-3 **após** CLI | **3** |
| E2E fora do CI | depois | **3** |
| Copy-on-build | quando Wave B | sob demanda |

O OS **já** entrega: a Fase 1–2 deve ser executada com SDC existente (`develop-story` / `review-story` / `@devops`), **sem** novo framework.

---

## 5. Backlog de stories (estado após este veredito)

| Story | Tema | Fase | Status |
|-------|------|------|--------|
| **9.15** | avisos[] + passaporte A/B/C | 1 | Draft ★ (ampliar códigos) |
| **9.14** | ficha alvo + deságio não-fixo + três preços (camada comercial) | 1 | Draft ★ |
| **9.16** | pesos aderência por tese | 1 | Draft |
| **9.18** | tese acima/alinhado/abaixo | 1 | Draft |
| **9.20** | mediana ponderada / exclusão C da mediana principal | 1 | **a criar** |
| **9.21** | radar subprecificação | 1–2 | **a criar** |
| **9.19** | Lite + modo dono + **objeções v1** | 2 | Draft |
| **9.17** | R5 industrializado | 2 | Draft |
| **9.4** | sink Complemento/Uso (ampliada) | 2 | Ready+ampliada |
| **P-1 / P-2** | CLI + XLSX merge-back | 2 | roadmap |
| **9.22** | simulador 3 estratégias | 2 | **a criar** |
| **9.23** | robustez / tribunal leave-one-out | 2 | **a criar** |
| **9.5** | Fase 2 web graduada | 3 | PRD |
| Ross / 9.1 apto fino | Técnica | 3 | depois |

---

## 6. Anti-lista (unificada)

1. Regressão / Ross **antes** de avisos + ficha + passaporte.  
2. Skill LLM auditor **antes** de códigos determinísticos.  
3. CLI que só empacota scripts sujos.  
4. PDF criativo (tribunal/objeções) **sem** passaporte no JSON.  
5. Chamar de NBR formal.  
6. Novos squads AIOX genéricos nesta janela.  
7. Sessão longa com trabalho **só local** sem push.

---

## 7. DoD da janela (quando parar e comemorar)

- [ ] Push/backup feito  
- [ ] H-3 registrada  
- [ ] Laudo JSON emite **avisos[]** com códigos canônicos  
- [ ] Cada comparável tem **passaporte** A/B/C no computation  
- [ ] Capa mostra **três preços** (nunca um só)  
- [ ] Sem ficha → aviso `target_condition_unconfirmed` + faixa conservadora  
- [ ] Pelo menos um caso com **radar** (ex. 132: não reduzir)  
- [ ] Lite ou CLI gera pacote para **1 endereço novo** sem copiar pasta  

---

## 8. Ação de 24h

1. **@devops** — push/PR + backup  
2. **Você + Luciana** — H-3 (`ONEPAGER-H3-…`)  
3. **@dev** — **9.15** (avisos códigos canônicos + passaporte v1)  
4. **@dev** — **9.14** (ficha + três preços + deságio)  
5. Draft **9.20** (mediana A/B/C) na mesma wave  

---

## 9. Conclusão (síntese das duas vozes)

| Voz | Conclusão |
|-----|-----------|
| **Agêntica** | Preparado para o momento da IA **porque** disciplina o executor — não porque o modelo é mágico. |
| **Método** | Evolução ≠ mais fórmula; = **mais prova, rastreio, explicação e ação comercial**. |
| **ROI único** | **Segurar o disco → calibrar com Luciana → evidência (avisos/passaporte/ficha/A-B-C) → três preços + radar → Lite/CLI → criativos (objeções/tribunal/simulador) → só então skill e NBR.** |

> A Luciana não precisa de um oráculo.  
> Precisa de um **processo de prova** que um agente executa e um corretor defende na sala.

---

## Changelog

| Rev | Nota |
|-----|------|
| v1 | Síntese parcial |
| v2 | Passaporte + push + fases |
| v3 | Prioridade real 1–8 da análise 2; códigos avisos; três preços; criativos mapeados; 9.20–9.23; anti-regressão-antes-de-evidência |
| **v4** | Reconciliação com 2º veredito independente: (a) **9.17+9.4 viram gate duro pré-CLI** ("CLI sem R5 automatiza erro"); (b) **9.19 Lite promovida** (uma das 3 apostas de ROI máximo — adoção em campo), paralela à Wave 2; (c) ordem 9.15→9.14 mantida **apenas** por dependência de H-3 (ficha calibra com Luciana), inverter se H-3 já ocorreu; (d) **Honduras deixa de ser gabarito único** — congelar AP113/AP132 como fixtures na 9.15; (e) anti-lista ampliada: não polir PDF 18pp antes do Lite; anúncio nunca entra na mediana. Execução operacional (Sonnet/Opus, 1 story = 1 sessão): `PLANO-EXECUCAO-ACM-20260709.md` |
