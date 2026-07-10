# Decisões H-3 — Luciana Borba (2026-07-10)

**Status:** CALIBRADO · **Aplicado no código:** sim (`H3_POLICY`, `ESTADO_DESAGIO_H3`)  
**Fonte da pauta:** `ONEPAGER-H3-LUCIANA-ACM-20260709.md`

---

## Decisões registradas

| # | Tema | Decisão |
|---|------|---------|
| **A** | Formato da faixa na capa | `Mercado R$ X – Y (referência Z)` |
| **B/C régua** | Estado do imóvel | **A–F:** A 0% · B −5% · C −7,5% · D −10% · E −15% · **F** fora da régua (conversa aberta) |
| **C texto** | Anúncio barato | *“Subprecificado — não recomendo cortar”* |
| **D** | Residual incorporador | **Só laudo técnico / investidor** (não capa Lite; Sec. 8 do laudo OK) |
| **E** | V1 vs V2 | **Lite na V1** · **Laudo completo só na V2** |
| **F** | Preferência de erro | **Preferir subavaliar** (captação mais dura, exclusividade mais justa) |
| **4** | Frase dono | *“O mercado não é um número — é uma faixa. Pelo estado do imóvel, eu posiciono aqui.”* |
| **5** | Checklist one-pager | **OK** (pauta fechada) |

---

## Onde entrou no código

| Artefato | Mudança |
|----------|---------|
| `methodology.ts` | `EstadoConservacao` A–F · `ESTADO_DESAGIO_H3` · `H3_POLICY` · `origemDefault: h3-luciana-2026-07-10` |
| `teseComercial.ts` / `subprecificacao.ts` | Copy “Subprecificado — não recomendo cortar” |
| `laudoModel.ts` | Capa sem card co-âncora; mercado com ref; nota de deságio H-3 |
| `liteModel.ts` | Frase dono + formato faixa + residual só V2 técnico |
| `docs/stories/9.14` | Status Done com H-3 aplicado |

---

## Próximos casos

- Próximo imóvel real para testar com ficha A–E na visita: _a definir na operação_.
