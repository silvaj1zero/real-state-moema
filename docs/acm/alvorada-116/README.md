# Caso Alvorada 116 apto 52 — Edifício Manuela (Vila Olímpia)

**Alvo:** Rua Alvorada, 116 — apto 52 · CEP 04550-000 · São Paulo/SP
**PRIMEIRO caso de alvo VERTICAL (apartamento)** do pipeline ACM.
Proprietária: **Dorothy** (referência do cliente — em 27-Jul o prédio chegou a
ser registrado como "Ed. Dorothy" por engano; corrigido para **Ed. Manuela**).

## Alvo (declarado pelo cliente — 27-Jul-2026)

| Campo | Valor |
|---|---|
| Área útil | 113 m² |
| Dormitórios | 3 (1 suíte) |
| Características | varanda, área de serviço, dependência + WC empregada, lavabo, ventilação cruzada, boa distribuição de áreas |
| Prédio | Ed. Manuela (1995) · 10 andares · 2 aptos/andar; academia, sauna, salão de festas |
| Unidade | 5º andar |
| Condomínio | R$ 1.840/mês (declarado) |
| Vagas | 2 (declarado pelo cliente em 27-Jul — conferir na matrícula/IPTU) |
| Ano de construção | 1995 (declarado — conferir no IPTU) |
| Estado (declarado) | pintado recentemente; cascolac reaplicado no piso de madeira — **não substitui a ficha A–F** |
| Preço pretendido | **não informado** (pendência) |
| Ficha A–F | **pendente de visita** (H-3) |
| Referência interna | apto 71 do mesmo prédio (foto via WhatsApp — arquivo ainda não anexado ao caso) |

Geocode: Mapbox 27-Jul-2026, `-23.604695, -46.676327` — CEP do resultado
(04550-000) bate com o ViaCEP do logradouro (inequívoco).

## Funil R1–R5 (adaptado a alvo vertical — recorte declarado)

| Regra | Aplicação | Resultado |
|---|---|---|
| R1 Geográfico | raio 1.000 m (RPC `fn_comparaveis_no_raio`) | 824 |
| R2 Evidência | vendas reais ITBI/PMSP, área>0, preço>0 | 824 |
| R3 Venda única | **NÃO aplicado** — proxy horizontal excluiria as torres | — |
| R4 Classe R$/m² | **NÃO aplicado** — teto 22k é régua horizontal; sem régua vertical documentada (Art. IV) | — |
| R5 Tipologia | guia oficial (uso/padrão IPTU + complemento, sink 9.4) via `filtrarComparaveisPorR5('apartamento')` | **759** (65 excluídos; 0 por heurística) |

Tipologia: 759/759 com confiança **guia oficial** (cobertura pós-9.4 = 824/824 no raio).
Vendas no próprio R ALVORADA 116: **0** (sem auto-referência; ITBI não permite
crosscheck das 2 vagas declaradas — conferir na matrícula/IPTU).

Competências: nov/2023 – mai/2026 · Bairros (coluna `bairro_real`):
Vila Olímpia 388 · Moema 288 · Vila Nova Conceição 83.

## Pendências (antes da V2)

- [ ] Ficha A–F na visita → deságio de estado H-3 (estado declarado: pintura + cascolac recentes).
- [ ] Conferir as 2 vagas declaradas na matrícula/IPTU.
- [ ] Conferir ano de construção 1995 no IPTU.
- [ ] Preço pretendido/pedido da proprietária Dorothy (tese comercial).
- [ ] Anexar foto/dados do apto 71 (mesmo prédio — referência interna; blob do WhatsApp não é acessível fora do navegador).
- [ ] Fase 1 humana: `Confere?` na planilha → `merge-back-xlsx.tsx --validate`.
- [ ] Conferir área privativa na matrícula (113 m² útil declarada × área construída IPTU).

## Reproduzir

Discover/build: protocolo dos casos 113/132 (scripts efêmeros, read-only; recorte
integralmente declarado em `dataset.json → recorte`). Validação:

```bash
cd app
npx tsx scripts/acm/acm-validate.tsx docs/acm/alvorada-116 --json-only
```
