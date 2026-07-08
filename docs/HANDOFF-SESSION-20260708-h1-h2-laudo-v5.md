# Handoff — Sessão 07/08-Jul-2026 · H-1 + H-2 concluídos (laudo Honduras v5 aprovado)

**Branch:** `fix/epic7-v-crawl-health` (13 commits locais novos, **sem push** — Art. II, @devops)
**Roadmap:** `docs/acm/ROADMAP-ACM.md` · **Stories:** 9.12 e 9.13 (Done) + 9.10/9.11 commitadas
**Suíte:** 17 files / 195 tests verdes · `tsc`/`eslint` exit 0

---

## O que esta sessão entregou

### Story 9.12 — Ingestão H-1 (dados reais da homogeneização)

1. **Série FipeZap oficial** SP venda residencial 2024-01→2026-06 em
   `app/src/lib/acm/data/fipezapSpVendaResidencial.ts` (fonte/aba/coluna documentadas).
2. **Data de venda + SQL dos 23 comparáveis** via dados abertos "Guias de ITBI pagas"
   (SF/PMSP, arquivos anuais 2024/25/26) em `app/src/lib/acm/data/hondurasVendas.ts` —
   23/23 casados por logradouro+número+valor+áreas; SQLs do laudo conferem 5/5 no Top 5.
   ATENÇÃO: o material didático p. 5-7 NÃO tinha datas de venda (só ano de construção) —
   o roadmap estava impreciso; a fonte correta é a guia ITBI.
3. **Bairro real via CEP** (ViaCEP + CEP das guias): **16 Jd. Paulista / 5 Jd. América /
   2 Jd. Europa** — o "16/6/2=24" do laudo v4 incluía o alvo; e o próprio alvo
   (Honduras 629, CEP 01428-000) é **Jardim Paulista**.

### Story 9.13 — Laudo Honduras v5 (H-2)

- Gerador offline: `npx -y tsx app/scripts/acm-honduras/06-build-laudo-v5.tsx` (rodar de `app/`).
- Guard-rail 9.8 ativo (0 exclusões), homogeneização FipeZap ref. 2026-06 (23/23,
  fatores 1,005–1,110), headline em faixa.
- **Números v5:** mercado **R$ 10.922.944–12.961.698** (referência = Top 3 aderente;
  teto = todos os 23), fechamento computado R$ 8.986.472–10.663.786, mediana
  homogeneizada 19.061/m², deságio −12,7% (invariante). Âncoras comerciais do v4
  mantidas (anúncio R$ 11,5M; meta R$ 10,0–10,5M) — decisão da consultora (H-3).
- **Rodadas de layout com o founder (aprovado):** fontes da marca embutidas na geração
  offline; mapa Sec. 3 com pins em camadas (azuis→laranja→dourado→alvo), imagem
  942×512@2x na proporção exata da caixa de 280pt (sem corte pelo `objectFit: cover`),
  padding 44 no auto-fit; sinais/legendas em caracteres seguros; colunas com respiro.
- **Artefatos finais:** `docs/acm/honduras-629/LAUDO-ACM-Honduras-v5-2026-07-08.pdf`
  (9 págs.) + `.computation.json` + `RELATORIO-ALTERACOES-LAUDO-v4-v5-20260707.md/.pdf`.

### Roadmap/documentação

- H-1 e H-2 marcados Done no roadmap; Atlas (atlasdados.com/sp) e ITBImap registrados
  no **D-2** como fontes de CRUZAMENTO (nunca âncora — Art. IV; ambos com anti-bot 403).
- GeoSampa: já integrado (seed IPTU, Story 3.5) + conferência pública de SQL no laudo.

## Decisões/ações que dependem do FOUNDER (bloqueiam a sequência)

| # | Decisão/ação | Bloqueia | Nota |
|---|---|---|---|
| 1 | **Agendar H-3 com a Luciana** levando laudo v5 + relatório: (a) labels/texto da faixa; (b) manter meta R$ 10,0–10,5M ou reancorar com a mediana homogeneizada; (c) narrativa da composição por bairro (amostra majoritária é Jd. Paulista e o alvo também — o v4 vendia "Jardim América") | H-4 e a captação Clarisia | Principal |
| 2 | **Autorizar push/PR** dos 13 commits via @devops — e decidir se sobem na `fix/epic7-v-crawl-health` (nome de outro tema) ou em branch própria `feat/acm-h1-h2` | CI/backup do trabalho | Rápida |
| 3 | **Critério único para dupla guia ITBI** — Chile 113 usou a guia mais RECENTE; Martinica 49 usou a mais ANTIGA (critérios opostos, herdados do laudo v4) | Consistência metodológica; pode ir na pauta da H-3 | Documentado na 9.12 |
| 4 | **Pin 4 (Henrique Martins)**: guia "s/nº" → geocode cai no meio da rua (~1,1 km, fora do círculo; laudo mede 934 m). Fixar coordenada manual no `06-geocode-cache.json` ou manter honesto como está? | Só estética do mapa | Default: manter |
| 5 | Pré-existentes do roadmap §8 (sem mudança): ajuste por idade (N-3), fontes do residual (N-2 — dá para elicitar na mesma H-3), régua apto (D-1), Vercel duplicado, waiver LGPD | — | — |

## Próximos passos técnicos (não dependem do founder)

- **H-4** (após H-3): propagar faixa para `resumoModel`/`deckModel`/`didaticoModel`
  (hoje reportam `valorMercado` ponto) + fiação da homogeneização/guard-rails na UI
  (`PacoteExportSheet` e irmãs não passam `homogeneizacao` nem target completo).
- **P-1** (CLI `acm-validate`) — pode iniciar em paralelo.
- N-1 (avisos de robustez) — encaixe curto a qualquer momento.

## Aprendizados/pegadinhas da sessão (para quem pegar o código)

1. Geração offline de PDF **exige** `registerBrandFonts()` com as TTFs de
   `app/public/fonts/` ANTES do import dinâmico do Document — senão sai Helvetica
   (WinAnsi) e caracteres como −, ≥, ● viram lixo. Os dingbats ❶❷❸ não existem nem
   na Inter — legendas em texto puro.
2. Imagem do mapa deve ser pedida na MESMA proporção da caixa do PDF
   (`objectFit: 'cover'` corta o excedente — foi o que escondeu o pin 4).
3. Geocode nos Jardins: ruas curtas (Chile/Canadá/Cuba) têm homônimas no interior de
   SP — usar CEP + `proximity`/`bbox` do alvo. Coordenadas auditáveis em
   `app/scripts/acm-honduras/06-geocode-cache.json`.
4. O script tem fallback `-revN` quando o PDF está aberto no leitor (EBUSY/Windows).
5. Suíte: `npx vitest run src/lib/acm src/lib/fisbo --no-file-parallelism`
   (PDF smokes exigem a flag).

## Commits da sessão (ordem)

`9ab93c6` mecanismos 9.10/9.11 · `b42a14d` ingestão 9.12 · `4251347` laudo v5 ·
`2a06b44` relatório v4→v5 · `abbd69d` mapa Sec. 3 · `87dc91d` layout/fontes ·
`edc4828`+`ef73e6c` consolidações · `7f2ef63` relatório (GeoSampa/layout) ·
`45b6204` roadmap D-2 (Atlas/ITBImap) · `be34cd5` pin 4 (proporção+padding) ·
`499c077` mapa ampliado 280pt.
