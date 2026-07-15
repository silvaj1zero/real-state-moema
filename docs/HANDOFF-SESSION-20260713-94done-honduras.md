# Handoff — Sessão 12-15/Jul-2026: Story 9.4 Done (sessão C Wave 6) + dossiê Honduras 629 (auditado 3×)

**De:** sessão Fable 12-15/Jul · **Para:** sessões pós-`/clear`
**Master local = remoto:** `3d05641` (tudo sincronizado).

> **⚡ ESTADO FINAL HONDURAS (15-Jul):** dossiê passou por **3 auditorias adversariais** (Fable → Grok/Ficha Única → 3ª independente via `PROMPT-AUDITORIA-DOSSIE-20260713.md`, veredicto REPROVADO) → **fila de correções §7.1 EXECUTADA**: **laudo v6.1** (`LAUDO-ACM-Honduras-v6.1-2026-07-14`, datação como indício, cadeia de redutores declarada, residual indicativo, sucessão, zero drift) + **PDF de cenários v2** (`CENARIOS-ESTRATEGIA-Honduras629-REMAX-2026-07-14.pdf`, Capex −15% exposto, área 715–817 RT-decide, regularizado na mesma base = 9,72–11,59M área mín. até 13,24M, N=2 no deságio, âncora≠fechamento declarado). **Doc operacional único: `docs/acm/honduras-629/DOSSIE-CONSOLIDADO-HONDURAS-629-20260714.md`** (status FECHADO/ABERTO/BLOQUEANTE). **GATE: re-rodar a auditoria (mesmo prompt, alvos de 14-Jul) até PASS/RESSALVAS ANTES da supervisão.** Condicionante sucessória: Ermantina falecida ~2018 sem inventário averbado; Dennis vivo (confirmado); contrato RE/MAX exige Dennis + 3 herdeiros/inventariante. Relógio: anistia até **30/08/2026**.

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
- **Regularização:** anistia Lei 17.202/2019 **prorrogada até 30/08/2026** (Lei 18.375/2025). **Obras DATADAS pré-2014** pela série histórica de satélite 08/09/2013 (Anexo B) → **trilho ANISTIA CONFIRMADO** (TJSP afasta IPTU retroativo). Recomendação vigente: **C-via-anistia** + anúncio-ponte no terreno (D). Doc: `REGULARIZACAO-CAMINHO-E-PASSIVO-20260713.md`.
- **Verificação de zona + tombamento (13-Jul, GeoSampa WFS no ponto do alvo — §2.1/§2.2 do doc de regularização):**
  - Zona **ZER-1** nas DUAS leis (LPUOS 16.402/16 e **Lei 18.177/2024**) → **TO 0,5 = projeção máx. 525 m²** no lote de 1.050; medido ~689-736 → **excesso de ~165-210 m² (31-40%)**; CA 1,0 com folga; 441 averbados são conformes. **No rito comum o excedente é INAVERBÁVEL** (TO insanável) → anistia é a ÚNICA porta.
  - **Lote DENTRO do perímetro tombado "JARDINS: AMÉRICA, EUROPA, PAULISTA E PAULISTANO"** (camada `patrimonio_cultural_bairro_ambiental`; CONDEPHAAT Res. SC 02/1986 + SCEC 37/2021; CONPRESP Res. 05/1991 + 07/2004) → **anuência patrimonial obrigatória = gate real do deferimento da anistia** (risco MÉDIO; mitigantes: obra pré-2014 consumada, possível delegação via Res. CONPRESP 07/2004, precedentes no bairro). Restrições convencionais do loteamento (Cia. de Imóveis e Construções, na matrícula) prevalecem se mais restritivas.
  - Cenário C (12-14M) fica **condicionado à anuência**; piso-terreno 9,62M e cenário B independem.
- **PDF de apresentação DS RE/MAX** (`08-build-cenarios-pdf.tsx`): **10 págs** — estratégia (3) + Anexo A (satélite 2024) + Anexo B (histórico 2013) + **Anexo C (canal oficial da anistia: portal/modalidade/7 docs/custos + box dos 2 alertas da lei)**; caixa de validação da supervisão; qualificação patrimonial na ficha/cenário C/roteiro. **Versão vigente = nome canônico** `CENARIOS-ESTRATEGIA-Honduras629-REMAX-2026-07-13.pdf` (rev2 fora do tracking; arquivo local rev2 pode ser apagado ao fechar o leitor).
- **Canal oficial da anistia documentado** (`REGULARIZACAO-CAMINHO-E-PASSIVO-20260713.md` §6): Portal de Licenciamento (100% digital) + Meu Imóvel Regular; modalidade provável **DECLARATÓRIA** (residencial ≤1.500 m²); docs do art. 9º; custos ~R$ 10/m² + ISS + taxas (outorga tende a zero — CA com folga; garagem computável pode gerar contrapartida Fr 1,2). **Dois achados na LETRA da lei:** (a) art. 4º, I — tombado PODE regularizar com anuência prévia (o FAQ oficial engana dizendo "não pode"; a exclusão é só da modalidade automática); (b) **art. 3º VEDA regularização que desrespeite RESTRIÇÕES CONVENCIONAIS DE LOTEAMENTO** — lote é de loteamento com restrições ("Companhia Imóveis e Construções" na matrícula) → **obter o teor das restrições = item nº 1 do estudo de viabilidade** (pode ser o gate mais duro, junto com a anuência CONPRESP).
- **Shortlist de assessoria** (`FORNECEDORES-REGULARIZACAO-SHORTLIST-20260713.md`): 10 candidatos com evidência pública (eng+jurídico: Sallus; licenciadores: Chá/Bonaldi/Noblle/Concepção/Avante/Vagner Landi; tributário: **Harada**/Karpat/Silva Araújo) + canais institucionais (rede RE/MAX, DPH/SMUL, CAU-SP, associação/loteadora) + checklist de triagem (pergunta-filtro: "como SCEC 37/2021 × Res. CONPRESP 07/2004 se aplicam a este lote?"). SEM atestado de qualidade — exigir processos deferidos (nº SEI verificável).

## 2. Próximas sessões (1 objetivo = 1 sessão; plano/QA Fable, execução Sonnet/Opus)

| # | Sessão | Modelo | Kickoff | Pré-condição |
|---|--------|--------|---------|--------------|
| D | Story **9.1** régua apto/casa | Sonnet | `@dev *develop-story 9.1` — agora com `tipo`/`uso_iptu`/`complemento` reais em PROD | ✅ nenhuma (9.4 Done) |
| E | Story **9.5** Fase B web | Opus | contrato C-5; AC5 = gate LGPD verificável | 9.4 Done ✅ · **ajustes do Épico 7 do founder ANTES** (7.9 workshop não rodou; 7.10 LIA em waiver) |
| F | Story **9.30** cobertura por bairro | Sonnet | `@dev *develop-story 9.30` — **importar de `geoConfig.ts`** (gate 9.7); `bairro_real` agora 0% NULL | 9.4 Done ✅ · soft 9.7 ✅ |
| — | Re-sink 194 vendas 2026 | operacional | engine local, snapshot + coverage | decisão founder (muda ids) |

## 3. Pendências humanas (founder/Luciana — bloqueiam o mundo real, não o código)

0. **NOVA CONDICIONANTE SUCESSÓRIA (13-Jul, tarde):** Ermantina (cotitular, comunhão universal) **falecida há ~8 anos SEM inventário/partilha averbados** (certidão 01/2023 nada mostra). Herdeiros: Clarisia (solteira, interlocutora) + 2 irmãos casados com filhos; meação 50% do Dennis (status a confirmar). **Sem partilha averbada não há escritura** — inventário entra no caminho crítico; contrato RE/MAX precisa de TODOS os cotitulares/inventariante (Clarisia sozinha não vincula); ITCMD + multa de ~8 anos a dimensionar; quem assina o protocolo da anistia deve ser definido JÁ (prazo 30/08 não espera inventário). Nota completa: `docs/acm/honduras-629/NOTA-TITULARIDADE-FAMILIA-REPRESENTACAO-20260713.md` (+ §2.4 das condicionantes). Rótulo "Proprietária: Clarisia" no laudo v6 → corrigir p/ "Interlocutora (herdeira)" na próxima revisão.

1. **URGENTE (~7 semanas): protocolar anistia Honduras até 30/08/2026** — contratar licenciador (ART/RRT) **com experiência em Jardins/CONPRESP** usando a shortlist + checklist de triagem; **primeiras tarefas do licenciador: (a) teor das restrições convencionais do loteamento (vedação art. 3º) e (b) dossiê de anuência CONPRESP**; evidência de anterioridade = Anexo B + o que o RT levantar. NÃO prometer averbação ao proprietário — deferimento condicionado. Modalidade provável: DECLARATÓRIA via Portal de Licenciamento (Anexo C do PDF tem o passo a passo).
2. Validar PDF de cenários com a **supervisão Luciana/RE/MAX** (caixa de assinatura na pág. 3) e definir âncora comercial (v4 suspensas).
3. Certidão de matrícula atualizada + quitação fiduciária + penhora (advogado).
4. Terreno real do **132** (matrícula/IPTU) — condicionante nº1 daquele caso.
5. Decisão **N-3** (fator idade × Ross) — destrava draft do C-2.

## 4. Cuidados operacionais

- Suíte: `npx vitest run src/lib/acm --no-file-parallelism` (de `app/`) — 27 files / **303** tests.
- Working tree: modificações do **Épico 7** (apify/proxy/scripts SQL/docs workshop) são da revisão paralela do founder — **não commitar/tocar**. Untracked ambientais (`settings.local.json.bak`, JSONs de smoke do 132) — não commitar.
- Lições react-pdf (para novos entregáveis): `registerBrandFonts()` ANTES do `StyleSheet.create`; imagem local só via **data URL base64** (src path vira fetch e falha silenciosa — detectar pelo tamanho do PDF); tsx roda CJS = **sem top-level await**; arquivo aberto no leitor → fallback `-revN`.
- **GeoSampa WFS por SQL** (área oficial de qualquer lote): `geoportal:lote_cidadao` com `CQL_FILTER=cd_setor_fiscal='SSS' AND cd_quadra_fiscal='QQQ' AND cd_lote='LLLL'` → `qt_area_construida`/`qt_area_terreno`. Candidata a helper do pipeline ACM.
- **GeoSampa WFS por PONTO** (zona + tombamento de qualquer alvo, WFS 2.0 + `bbox=lat,lng,lat,lng,urn:ogc:def:crs:EPSG::4326`): zoneamento vigente `geoportal:perimetro_zona_lei_18177_24` (e histórico `zoneamento_2016_map1`); patrimônio `patrimonio_cultural_bairro_ambiental` + `patrimonio_cultural_bem_tombado` + `patrimonio_cultural_area_envoltoria_{CONDEPHAAT,CONPRESP,IPHAN}` + `zona_especial_preservacao_cultural_apc`. Usado no Honduras p/ confirmar ZER-1 e o perímetro tombado dos Jardins — candidata a virar checagem padrão de alvo no `/acm-validate`.
- Datasets `docs/acm/*/dataset.json` congelados — laudo v6 Honduras provou o protocolo (zero drift).

## 5. Artefatos da sessão (commits `ccf57b7..15fc019`)

Story 9.4: story Done + `9.4-sink-ac3-verification.md` §4/§5 + `adapter.ts`/tests + `9.4-inapp-smoke.mjs` + engine (fora do git).
Honduras: `CONDICIONANTES-MATRICULA-116360-*.md` · `LAUDO-ACM-Honduras-v6-*` + `07-build-laudo-v6.tsx` · `CENARIOS-ESTRATEGIA-PROPRIETARIO-*.md` · `REGULARIZACAO-CAMINHO-E-PASSIVO-*.md` (com §2.1/2.2 zona+tombamento e §6 canal oficial) · `FORNECEDORES-REGULARIZACAO-SHORTLIST-*.md` · `08-build-cenarios-pdf.tsx` + PDF canônico 10 págs (Anexos A/B/C) + `anexo-satelite/` (11 capturas a1-a6/b1-b5).
