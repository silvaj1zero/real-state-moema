# P-2 — Merge-back da planilha XLSX do corretor

**Epic:** 9 / Wave 4  
**Status:** InReview  
**Priority:** Must (fábrica)  
**Implementado:** 2026-07-09

## Story

Como consultora, quero que as marcações da planilha de validação (Confere? / Correção / Observação / Tipologia manual) **voltem para o dataset** sem re-digitar, para o P-1 e o laudo refletirem a revisão humana.

## Acceptance Criteria

1. Parse da XLSX Fase 1 (abas Top N / Todos) com colunas flexíveis.
2. `Confere = ✗/nao` → exclui comparável do dataset.
3. Coluna tipologia manual e `Correção` `chave=valor` atualizam campos (area, preco, tipologia, sql).
4. Backup `dataset.pre-merge-back.json` + `merge-back-report.json`.
5. CLI dry-run e opcional `--validate` (P-1).
6. Testes unitários com workbook sintético.

## Uso

```bash
cd app
npx tsx scripts/acm/merge-back-xlsx.tsx docs/acm/andrade-pertence-132 --dry-run
npx tsx scripts/acm/merge-back-xlsx.tsx docs/acm/andrade-pertence-132 --validate
```

## File List

- `app/src/lib/acm/xlsx/mergeBack.ts`
- `app/src/lib/acm/xlsx/mergeBack.test.ts`
- `app/scripts/acm/merge-back-xlsx.tsx`
- `docs/stories/p2-merge-back-xlsx.md`
