# Handoff — Sessão 13-Jul-2026: Story 9.4 Done (sessão C Wave 6) + dossiê Honduras 629

**De:** sessão Fable 12/13-Jul (sessão C do handoff Wave 6 + caso Honduras) · **Para:** sessões pós-`/clear`
**Master local = remoto:** `15fc019` (6 pushes nesta sessão, tudo sincronizado).

---

## 1. Estado (verificado com saída real nesta sessão)

### Story 9.4 — DONE (fecha a pendência estrutural do Épico 9)
- **Engine local** (`workspace/businesses/luciana-borba/squads-custom/acm-imobiliario/` — gitignorado, sem GitHub): sink ampliado (schema canônico +5 colunas; `para_schema` preserva campos da guia; `src/viacep.py` novo; `_campos_metodologia()` no sink; `backfill_story94.py` novo). **Backup prévio:** `squads-custom/_backups/acm-imobiliario-backup-2026-07-12.zip` (96,8 MB).
- **Backfill PROD:** match 3.618/3.618 → UPDATE por id, **0 erros** (ids preservados, não-ITBI intocados). `9.4-sink-coverage.mjs` **EXIT 0** — 0% NULL em todos os campos-meta (`complemento` 8,5% best-effort; S/V/D 100% = ITBI puro).
- **Lado-app:** `adapter.ts` mapeia `data_venda`→`dataVenda` (competência, só venda real) + R5 + `bairro_real` (+4 tests). Smoke `9.4-inapp-smoke.mjs`: homogeneização **ajustados=68/semAjuste=0**; gate R5 alvo casa **780 excluídos via guia**. Suíte ACM **303 PASS**; tsc/eslint/flake8 exit 0.
- **Pendência do engine:** 194 vendas 2026 novas no xlsx aguardam re-sink snapshot (`python push_acm_supabase.py --bairro moema --apply` + envs; snapshot deleta+reinsere ITBI → muda ids; rodar coverage depois).

### Caso Honduras 629 — dossiê completo (tudo em `docs/acm/honduras-629/`)
- **Matrícula 116.360 + GeoSampa convergem:** área construída oficial **441 m²** (não 800 do anúncio); terreno **1.050 m²**. Ônus: alienação fiduciária Banco Máxima (venc. 04/2025 — checar quitação/baixa) + penhora 50% (exec. fiscal R$ 85k) + certidão vencida (01/2023).
- **Laudo v6 emitido** (`07-build-laudo-v6.tsx`): base documental; headline mercado **R$ 5,99–7,15M**; mediana 19.061/m² idêntica ao v5 (zero drift, dataset congelado); âncoras comerciais v4 SUSPENSAS (definir com Luciana).
- **Lente do terreno = piso real: R$ 9,62M** (residual). Cenários E0/A/B/C/C′/D em `CENARIOS-ESTRATEGIA-PROPRIETARIO-20260713.md`.
- **Regularização:** anistia Lei 17.202/2019 **prorrogada até 30/08/2026** (Lei 18.375/2025). **Obras DATADAS pré-2014** pela série histórica de satélite 08/09/2013 (Anexo B) → **trilho ANISTIA CONFIRMADO** (zoneamento não bloqueia; TJSP afasta IPTU retroativo). Recomendação vigente: **C-via-anistia** + anúncio-ponte no terreno (D). Doc: `REGULARIZACAO-CAMINHO-E-PASSIVO-20260713.md`.
- **PDF de apresentação DS RE/MAX** (`08-build-cenarios-pdf.tsx`): 9 págs, Anexos A (satélite 2024) + B (histórico 2013), caixa de validação da supervisão. **Versão atual = `...-REMAX-2026-07-13-rev2.pdf`** (canônico estava aberto no leitor/EBUSY — consolidar: copiar rev2 sobre o canônico e apagar rev2 quando o leitor fechar).

## 2. Próximas sessões (1 objetivo = 1 sessão; plano/QA Fable, execução Sonnet/Opus)

| # | Sessão | Modelo | Kickoff | Pré-condição |
|---|--------|--------|---------|--------------|
| D | Story **9.1** régua apto/casa | Sonnet | `@dev *develop-story 9.1` — agora com `tipo`/`uso_iptu`/`complemento` reais em PROD | ✅ nenhuma (9.4 Done) |
| E | Story **9.5** Fase B web | Opus | contrato C-5; AC5 = gate LGPD verificável | 9.4 Done ✅ · **ajustes do Épico 7 do founder ANTES** (7.9 workshop não rodou; 7.10 LIA em waiver) |
| F | Story **9.30** cobertura por bairro | Sonnet | `@dev *develop-story 9.30` — **importar de `geoConfig.ts`** (gate 9.7); `bairro_real` agora 0% NULL | 9.4 Done ✅ · soft 9.7 ✅ |
| — | Re-sink 194 vendas 2026 | operacional | engine local, snapshot + coverage | decisão founder (muda ids) |

## 3. Pendências humanas (founder/Luciana — bloqueiam o mundo real, não o código)

1. **URGENTE (~7 semanas): protocolar anistia Honduras até 30/08/2026** — contratar licenciador (ART/RRT); evidência de anterioridade = Anexo B + o que o RT levantar.
2. Validar PDF de cenários com a **supervisão Luciana/RE/MAX** (caixa de assinatura na pág. 3) e definir âncora comercial (v4 suspensas).
3. Certidão de matrícula atualizada + quitação fiduciária + penhora (advogado).
4. Terreno real do **132** (matrícula/IPTU) — condicionante nº1 daquele caso.
5. Decisão **N-3** (fator idade × Ross) — destrava draft do C-2.

## 4. Cuidados operacionais

- Suíte: `npx vitest run src/lib/acm --no-file-parallelism` (de `app/`) — 27 files / **303** tests.
- Working tree: modificações do **Épico 7** (apify/proxy/scripts SQL/docs workshop) são da revisão paralela do founder — **não commitar/tocar**. Untracked ambientais (`settings.local.json.bak`, JSONs de smoke do 132) — não commitar.
- Lições react-pdf (para novos entregáveis): `registerBrandFonts()` ANTES do `StyleSheet.create`; imagem local só via **data URL base64** (src path vira fetch e falha silenciosa — detectar pelo tamanho do PDF); tsx roda CJS = **sem top-level await**; arquivo aberto no leitor → fallback `-revN`.
- **GeoSampa WFS por SQL** (área oficial de qualquer lote): `geoportal:lote_cidadao` com `CQL_FILTER=cd_setor_fiscal='SSS' AND cd_quadra_fiscal='QQQ' AND cd_lote='LLLL'` → `qt_area_construida`/`qt_area_terreno`. Candidata a helper do pipeline ACM.
- Datasets `docs/acm/*/dataset.json` congelados — laudo v6 Honduras provou o protocolo (zero drift).

## 5. Artefatos da sessão (commits `ccf57b7..15fc019`)

Story 9.4: story Done + `9.4-sink-ac3-verification.md` §4/§5 + `adapter.ts`/tests + `9.4-inapp-smoke.mjs` + engine (fora do git).
Honduras: `CONDICIONANTES-MATRICULA-116360-*.md` · `LAUDO-ACM-Honduras-v6-*` + `07-build-laudo-v6.tsx` · `CENARIOS-ESTRATEGIA-PROPRIETARIO-*.md` · `REGULARIZACAO-CAMINHO-E-PASSIVO-*.md` · `08-build-cenarios-pdf.tsx` + PDF rev2 + `anexo-satelite/` (11 capturas a1-a6/b1-b5).
