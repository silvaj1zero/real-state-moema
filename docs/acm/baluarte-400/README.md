# Caso Baluarte 400 — prova ponta a ponta da skill `/acm-validate` (Story 9.29 AC5)

**Alvo:** Rua Baluarte, 400 — Vila Olímpia · **NÃO é caso de cliente.**
Atributos do alvo (área 180 m², terreno 250 m², 3 dorm, preço pretendido R$ 2,2M)
são **declarados para prova de pipeline**; a ficha A–F depende de visita real.

## O que este caso prova (DoD do veredito ROI)

"Lite ou CLI gera pacote para 1 endereço novo **sem copiar pasta de scripts**" — cumprido via skill:

| Passo da skill | Execução | Resultado |
|---|---|---|
| 2. Dataset (protocolo @acm-data) | discover read-only + funil R1–R5 (heurística de lote SQL, guia 2026 indisponível) | funil 968 → 968 itbi → 143 venda única → 128 classe → **n=68** |
| 3. CLI | `npx tsx scripts/acm/acm-validate.tsx docs/acm/baluarte-400 --json-only` | exit 0, 6 gates OK, mediana R$/m² 10.244,90 |
| 4. Auditoria (`acm-auditor`, contexto independente) | CHECKLIST-ACM-AUDITOR v1.1, C1–C15 | **PASS 99** (1 info C_HOMOG) → `ACM-auditoria.json` |
| 5. Emissão V1 (H-3) | CLI com Lite | `ACM-Lite-baluarte-400-2026-07-11.pdf` |

## Pendências (se o caso virar real)

- Ficha A–F na visita → deságio de estado H-3.
- Fase 1 humana: tipologia dos 68 é **heurística (confiança baixa)** — conferir na planilha, depois `merge-back-xlsx.tsx --validate`.
- Homogeneização FipeZap: comparáveis têm `dataVenda` — ativável quando a série for plugada no fluxo (hoje opt-in inerte).
