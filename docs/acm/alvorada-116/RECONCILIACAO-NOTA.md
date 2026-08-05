# ⚠️ NOTA DE RECONCILIAÇÃO — faixa deste caso SUPERADA

**A faixa deste caso (R$ 797.454 – 1.132.012) não deve ser usada.**

Reconciliação completa em:
`workspace/businesses/luciana-borba/L1-strategy/analytics/acm-alvorada-116/RECONCILIACAO.md`

## Resumo do diagnóstico (3 problemas, nenhum na amostra)

1. **Erro de unidade (−47%, causa principal):** o R$/m² dos comparáveis é sobre
   área **cadastral** (ITBI), mas foi multiplicado pela área **útil** do alvo
   (113 m²). A área cadastral do tipo do prédio é **213 m²** (carnê IPTU ap 71 +
   guias ITBI aps 51/61/12; fator 1,88). Prova: o método aplicado à venda real
   do AP 51 (R$ 1.325.000, set/2023) "reavalia" a própria venda em R$ 703 mil.
2. **Janela nov/2023–mai/2026 cortou o comparável interno:** AP 51 (mesmo prédio,
   mesmo andar) vendeu em set/2023 — 2 meses antes da janela. O caso registrava
   "vendas no 116: 0"; há 4 registros no ITBI 2022–2026.
3. **Cobertura:** o dataset (759) tem **zero vendas na própria Rua Alvorada**;
   o ITBI bruto tem ~30 na janela. Conferir ingestão do snapshot e o geocode do
   alvo (Mapbox × Nominatim divergem ~570 m).

## Número reconciliado (validado por 3 evidências convergentes)

| | |
|---|---|
| Dataset deste caso, corrigido (área 190–240 + época 1985–2005, n=88) | mediana **R$ 1.415.000** |
| Engine ITBI (53 comparáveis) | mediana R$ 1.312.500 |
| AP 51 real corrigido a 2025/26 | R$ 1.308.000 – 1.506.000 |
| **Recomendação final** | **anunciar R$ 1,55–1,70 M · fechar R$ 1,35–1,50 M · piso R$ 1,25 M** |

## Ações para o pipeline (V2)

- [ ] Alvo vertical: comparar **cadastral com cadastral** (nunca cadastral × útil).
- [ ] **Revisar Andrade Pertence 113 e 132** — mesmo método ⇒ provável mesmo viés.
- [ ] Estender janela ITBI para trás (≥ 2022).
- [ ] Investigar ausência da R. Alvorada no snapshot Supabase.

*jul/2026 · reconciliação executada pelo squad `acm-imobiliario` (engine ITBI).*
