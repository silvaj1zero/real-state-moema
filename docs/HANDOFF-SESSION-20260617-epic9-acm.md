# Handoff — Sessão 2026-06-17 · Epic 9 (ACM: paridade premium + apto/casa)

> **Para a próxima sessão.** Esta sessão ficou longa; abrir sessão nova para
> continuar (9.1 elicit + 9.4 cross-repo). Estado limpo: tudo abaixo está
> commitado e no remoto, nada pela metade.

## Branch / remoto
`fix/epic7-v-crawl-health` — HEAD em `1f279b7`. Commits desta sessão:
- `dd0e0d3` — Epic 9 PRD + stories 9.0/9.1/9.2/9.4 + spike 9.0 [Story 9.0]
- `5fe106b` — mapa Top-5/pins (wiring Resumo) [Story 9.3]
- `1f279b7` — planilha XLSX canônica 7 abas (exceljs) [Story 9.2]

## O que foi feito (SDC completo, @pm→@sm→@po→@dev→@qa→@devops)
- **Epic 9** criado: `docs/prd/EPIC-9-ACM-PARIDADE-PREMIUM.md`. Decisões: produto = **ambos (apto+casa)**; arquitetura **Opção C** (React-PDF in-app, sem toolkit Python — refuta o doc de migração).
- **9.0 Done** — spike read-only (`docs/acm/9.0-data-audit.md`, `app/scripts/acm-audit/9.0-data-audit.mjs`). Achados:
  - RPC viva `fn_comparaveis_no_raio` **já retorna lat/lng/anuncio_url** por comparável (migration 8.7 aplicada em PROD) → mapa destravado.
  - **Metodologia 100% NULL** nas 3.618 linhas ITBI (área constr×terreno, S/V/D, score, sql_cadastral, padrão, ano, valor venal, status, preço pedido). Só `data_referencia`/`coordinates` preenchidos.
  - `tipo` 100% NULL → banco não distingue apto×casa hoje.
  - Duplicidade de endereços (guias múltiplas, sem dedup por SQL) → entra na 9.4.
- **9.3 Done** — mapa Top-5 numerado + pins. Descoberto que a 8.7 já fazia no Laudo/Deck/Pacote; delta = wirar o **Resumo** (`buildAcmMapMarkers` em `ResumoExportSheet`). Gate PASS. `docs/qa/gates/9.3-mapa-pins.yml`.
- **9.2 Done** — planilha XLSX canônica 7 abas (exceljs já instalado). `app/src/lib/acm/xlsx/{planilhaModel,buildPlanilhaWorkbook}.ts` + `PlanilhaExportSheet.tsx` + item no `AcmExportMenu`. Gate **CONCERNS** (AC2 18/21 colunas — `Bairro`/`Programa:origem`/`Re-verif.` faltam no dado, entram com 9.4/9.5). `docs/qa/gates/9.2-planilha-xlsx.yml`.

Validação geral: **132/132 testes ACM** (`cd app && npx vitest run src/lib/acm src/components/acm --no-file-parallelism`), 0 tsc em `src/`, 0 lint.

## Pendências (bloqueios reais — começar aqui na nova sessão)

### 9.1 — Discriminador apto/casa + régua de Score de apartamento (Ready)
- Arquivo: `docs/stories/9.1.story.md`. Bloqueio: `elicit` da régua de apto **com a Luciana** (Art. IV — sem fonte canônica como Honduras teve p/ casa).
- **Rascunho de régua abaixo (§ Régua de apto — PROPOSTA)** — levar para a Luciana validar; só depois travar testes (AC2/AC6).
- Implementação (após validação): `propertyType: 'apartamento'|'casa'` em `AcmTarget`/`ComputeLaudoOptions` (default 'casa', não regredir Honduras); `classifyScoreApartamento` em `methodology.ts`; aderência sem termo de terreno p/ apto; suprimir seções 8/8a/8b no laudo p/ apto; seletor de tipo na UI. Auto-classificação por `tipo` depende de 9.4.

### 9.4 — Fechar AC3 do sink ITBI (Ready, **cross-repo**)
- Arquivo: `docs/stories/9.4.story.md`. **Código fora deste repo:** `acm-imobiliario` → `engine/src/sinks/supabase_acm.py` (`montar_registros`). Caminho provável: `C:\Users\Zero\Desktop\AIOX-Enterprise MASTER\workspace\businesses\luciana-borba\squads-custom\acm-imobiliario\`.
- Fazer no repo do engine: mapear `area_construida_m2`/`area_terreno_m2` separados, `sql_cadastral` (de `id_fonte`), `padrao_iptu`, `ano_construcao`, `testada_m`, `valor_venal`, `tipo`, S/V/D (quando há anúncio) + **backfill idempotente** das 3.618 linhas + **dedup por SQL**.
- Neste repo: só a verificação de cobertura pós-backfill (`docs/acm/9.4-sink-ac3-verification.md`) — reusar `app/scripts/acm-audit/9.0-data-audit.mjs` para medir o antes/depois.
- Destrava: 9.1 (auto apto/casa), colunas vazias da 9.2, score real, rastreabilidade SQL.

### Esboços ainda no PRD (não draftados): 9.5 (validação web/Fase B), 9.6 (tipografia/logo), 9.7 (config geo Moema).

## Conexão Supabase (para spikes/verificação)
PostgREST + `SUPABASE_SERVICE_ROLE_KEY` de `app/.env.local` (supabase-js; `DATABASE_URL` direto obsoleto). Consultor ITBI: `1f7ec2b3-d414-4850-8b6a-32faa8e1f47c` (Luciana). PostgREST capa 1000 linhas/request → usar `count: exact, head: true` para totais.

---

## Régua de apto — PROPOSTA (rascunho para a Luciana validar) — NÃO É VALOR FINAL

> ⚠️ **Art. IV (No Invention):** os números abaixo são uma **proposta inicial** para
> apartamento em Moema, derivada da estrutura da régua de casa (`methodology.ts`,
> que classifica por R$/m² + programa) adaptada para **R$/m² privativo**. **Devem
> ser confirmados pela Luciana e/ou contra o ITBI real de apartamentos de Moema**
> antes de virar teste/regressão. Faixas marcadas "(confirmar)".

### A) Classe de Score por R$/m² de área **privativa** (apto)
| Score | R$/m² privativo (confirmar) | Sinais complementares | Leitura |
|---|---|---|---|
| **AAA** | ≥ R$ 18.000 (confirmar) | ≥ 3 suítes **e** ≥ 3 vagas, ou andar alto/vista permanente | Ícone / altíssimo padrão |
| **AA** | ≥ R$ 14.000 (confirmar) | ≥ 2 suítes e ≥ 2 vagas | Alto padrão consolidado |
| **A** | ≥ R$ 10.000 (confirmar) | 1 suíte, 1–2 vagas | Bom produto |
| **B** | < R$ 10.000 (confirmar) | sem suíte / 1 vaga / a modernizar | Produto a reposicionar |

> Diferença vs. casa: a casa usa R$/m² **construído** + área≥500/suítes/vagas e a
> "ótica de terreno". No apto **não há terreno/efeito-escala/residual** — a métrica
> é **privativa** e os diferenciais são **andar, vista, vagas, lazer**.

### B) Índice de aderência (apto) — re-normalizar sem o terreno
Casa hoje: `0,50·áreaConstr + 0,20·terreno + 0,30·proximidade`.
**Proposta apto (confirmar pesos):** `0,55·áreaPrivativa + 0,15·programa(dorm/suíte/vaga) + 0,30·proximidade` — remove o termo de terreno e o redistribui em privativa + programa.

### C) Ajustes finos do apto (substituem a seção de terreno do laudo)
- **Andar/vista:** ajuste ± sobre o R$/m² (ex.: andar alto + vista livre, prêmio; térreo/fundos, desconto) — % a definir com a Luciana.
- **Vagas:** nº de vagas acima/abaixo do padrão do programa.
- **Lazer/condomínio:** completo vs. básico (qualitativo no parecer).
- **NÃO aplicar** ao apto: efeito-escala de lote, valor residual do incorporador, aba Terrenos (já omitida na 9.2 quando `propertyType='apartamento'`).

### Perguntas objetivas para a Luciana (fechar o elicit)
1. As 4 faixas de R$/m² **privativo** (AAA/AA/A/B) acima batem com Moema? Quais valores corrigir?
2. Andar/vista valem quanto em % no R$/m² (faixa típica)?
3. Vaga extra (acima do padrão do programa) agrega quanto?
4. Algum diferencial de Moema que a régua de casa não captura (ex.: proximidade do Parque do Ibirapuera, metrô, "quadrilátero" de Moema)?
