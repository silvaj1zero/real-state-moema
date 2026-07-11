---
name: acm-validate
description: Gera o pacote ACM completo (dataset → CLI → auditoria ancorada → Lite/laudo H-3) para um endereço novo ou pasta de caso em docs/acm. Use para validar ou emitir ACM de um imóvel.
version: "1.0.0"
user-invocable: true
---

# /acm-validate — pacote ACM ponta a ponta

**Objetivo:** dado `<endereço|pasta-do-caso>` em `$ARGUMENTS`, produzir o pacote
completo (computation + relatório + planilha Fase 1 + PDF conforme rota) com
veredito de auditoria ancorado — sem copiar pasta de scripts, sem número fora do
`computeLaudo`.

**Veredito automatizado do auditor: ATIVO** — gate de entrada N=4 LLM medido em
2026-07-11: amplitude 0 de veredito em todos os alvos e acurácia 100% vs gabaritos
congelados (checklist v1.1, âncoras E4–E8; ver
`docs/research/2026-07-10-acm-gate-variance/medicoes-llm-9.29.json`).

## Fluxo

### 1. Roteamento da entrada

- `$ARGUMENTS` é pasta existente com `dataset.json` (ex.: `docs/acm/andrade-pertence-132`) → passo 3.
- `$ARGUMENTS` é endereço novo → passo 2.
- Sem argumento → pergunte endereço ou pasta.

### 2. Caso novo — montar dataset (agente `acm-operator`)

Spawne o agente `acm-operator` com o endereço. Ele monta
`docs/acm/<slug>/dataset.json` pelo protocolo R1–R5 (discover read-only,
geocode, funil ITBI — ver corpo do agente). Registre pendências que ele
reportar (ficha A–F da visita, Fase 1). Ao terminar → passo 3.

### 3. Validar (CLI — única fonte de números)

De `app/`:

```bash
npx tsx scripts/acm/acm-validate.tsx docs/acm/<slug> --json-only
```

Exit ≠ 0 ou gate `critico` → pare e reporte a saída real dos gates. Não contorne.

### 4. Auditoria ancorada (agente `acm-auditor` — contexto independente)

Spawne o agente `acm-auditor` apontando para
`docs/acm/<slug>/ACM-computation.json`. Ele aplica exclusivamente o
`docs/acm/CHECKLIST-ACM-AUDITOR-v1.md` (C1–C15) e devolve JSON
PASS/CONCERNS/FAIL com evidência campo a campo.

- **FAIL** → NÃO emitir PDF. Reportar condições blocking e parar.
- **CONCERNS** → emitir, anexando as atenções ao resumo.
- **PASS** → emitir.

Grave o JSON do veredito em `docs/acm/<slug>/ACM-auditoria.json`.

### 5. Emissão (política H-3)

| Rota | Comando (de `app/`) | Quando |
|------|---------------------|--------|
| V1 Lite (default) | `npx tsx scripts/acm/acm-validate.tsx docs/acm/<slug>` | Captação |
| V2 laudo | `npx tsx scripts/acm/acm-validate.tsx docs/acm/<slug> --laudo` | Fechamento / investidor |

Após a corretora preencher `Confere?` na planilha:
`npx tsx scripts/acm/merge-back-xlsx.tsx docs/acm/<slug> --validate` e re-rode a partir do passo 3.

### 6. Resumo final (obrigatório)

Endereço · n comparáveis · faixa `Mercado R$ X – Y (referência Z)` · tese
comercial · veredito do auditor (com contagem blocking/atenção/info) · avisos ·
pendências (ficha A–F, Fase 1) · arquivos gerados.

## Proibições

- Nenhum número fora do `computeLaudo` (anti-lista 3). O auditor não recalcula; o orquestrador não "ajusta" faixa/mediana.
- Veredito só por condição citada do checklist — nunca por julgamento livre.
- Nunca escrever no banco (discover é read-only).

## Referências (ler sob demanda)

- SOP operacional: `docs/acm/SOP-OPERACAO-ACM-POS-H3.md`
- Política de produto: `docs/acm/DECISOES-H3-LUCIANA-20260710.md`
- Checklist do auditor: `docs/acm/CHECKLIST-ACM-AUDITOR-v1.md`
- CLI: `app/scripts/acm/acm-validate.tsx` · merge-back: `app/scripts/acm/merge-back-xlsx.tsx`
