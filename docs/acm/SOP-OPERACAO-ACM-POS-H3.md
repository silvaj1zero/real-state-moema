# SOP — Operar o ACM (pós H-3)

**Público:** Luciana / operador · **Não é** laudo judicial  
**Branch de referência:** `fix/epic7-v-crawl-health`

---

## Fluxo de produto

```
V1 (captação)  →  ACM Lite (modo dono)     ← 5–15 min com dataset pronto
V2 (fechamento) →  Laudo técnico completo  ← residual, Sec. 8, investidor
```

---

## 1. Dados

1. Dataset em `docs/acm/<slug>/dataset.json` (casos 113/132 como modelo)  
2. Ficha do alvo na visita — **estado A–F** (H-3):

| Nota | Deságio |
|------|---------|
| A | 0% |
| B | −5% |
| C | −7,5% |
| D | −10% |
| E | −15% |
| F | Fora da régua (sem %) |

3. Tipologia: R5 (casa/apto) — dataset já limpo ou `propertyType: 'casa'`

---

## 2. Comandos (de `app/`)

```bash
# Validar + relatório (offline)
npx tsx scripts/acm/acm-validate.tsx docs/acm/<slug> --json-only
npx tsx scripts/acm/acm-validate.tsx docs/acm/<slug>          # + Lite PDF
npx tsx scripts/acm/acm-validate.tsx docs/acm/<slug> --laudo  # + laudo

# Após a Luciana preencher Confere? na planilha
npx tsx scripts/acm/merge-back-xlsx.tsx docs/acm/<slug> --validate
```

---

## 3. O que dizer (voz H-3)

- *“O mercado não é um número — é uma faixa. Pelo estado do imóvel, eu posiciono aqui.”*  
- Se barato: *“Subprecificado — não recomendo cortar.”*  
- Capa: **Mercado R$ X – Y (referência Z)**  
- Preferir **subavaliar** na dúvida (exclusividade mais justa)

---

## 4. O que NÃO misturar

| Camada | Onde |
|--------|------|
| Valor técnico ITBI | Lite + laudo |
| Estado A–F | Ficha na visita → deságio |
| Residual incorporador | **Só laudo técnico V2** (Sec. 8) |
| Merge corretor | XLSX → dataset (P-2) |

---

## 5. Pendências de produto

- [ ] 9.4 sink ITBI no engine (PROD)  
- [ ] Próximo caso real com ficha A–E  
- [ ] PR da branch para main (quando founder autorizar)  
