# Gabarito G-BOM — Honduras (congelado ANTES da medição)

**Data de congelamento:** 2026-07-10  
**Fontes:**
- `docs/acm/honduras-629/LAUDO-ACM-Honduras-v5-2026-07-08.computation.json`
- Fixture canônica `app/src/lib/acm/honduras.fixture.ts` via `computeLaudo`

## Veredito esperado

| Pipeline | Veredito | Notas |
|----------|----------|-------|
| Recompute fresco (fixture + computeLaudo atual) | **PASS** | Pode ter 1 info (`desagio_fora_prior_sp` se \|deságio\|∉[8,12]) |
| Arquivo v5 em disco (shape parcial) | **CONCERNS** | Campos de stories posteriores podem faltar → atenção, não blocking (tie-break legado) |

## Condições que DEVEM passar (fresco)

- C_HEADLINE_FAIXA: referência dentro da faixa
- C_TRES_PRECOS: desagioTratado com 3 cenários
- C_PASSAPORTES: length ok
- C_AUTOREF: array presente
- C_GUARD_STREET: sem sentinela 9.22
- C_SUBPREC: N/A ou coerente (Honduras sem tese abaixo forçada)

## Condições que NÃO podem falhar (blocking)

Nenhuma em G-BOM fresco. Se qualquer run der FAIL → checklist rejeitado (stable-but-wrong ou over-strict).
