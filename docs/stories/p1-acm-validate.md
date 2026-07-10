# P-1 — CLI `acm-validate` offline

**Epic:** 9 / Wave 4  
**Status:** Done  
**Priority:** Must (fábrica)  
**Gate:** `docs/qa/gates/epic9-acm-wave-batch-20260709.yml`  

## Story

Como operador, quero um CLI que, a partir de `dataset.json`, rode gates R5/avisos e emita computation + PDF Lite/laudo, para não depender dos 3 scripts por caso.

## Delivered

- `app/src/lib/acm/validatePipeline.ts` + `dataset.ts`
- `app/scripts/acm/acm-validate.tsx`
- Smoke 113/132 EXIT 0

## QA Results

**Date:** 2026-07-09 · **Reviewer:** @qa (batch) · **Verdict:** PASS (offline)  
**Note:** caminho RPC “só endereço” depende Story 9.4 PROD.

## Change Log

| Data | Agente | Mudança |
|------|--------|---------|
| 2026-07-09 | @dev | Implementado offline |
| 2026-07-09 | @qa | PASS batch → Done |
