# Business Rules — rictom/cnpj-sqlite

O repo é puramente ETL — não embute regras de negócio imobiliárias. As regras abaixo são as **extraíveis do schema RFB que vamos aplicar no Epic 7** para classificação tipológica.

## Regras herdadas da RFB (estruturais)

### BR-RFB-1 — Identificador de sócio (verbatim, `socios.identificador_de_socio`)

| Valor | Significado | Sinal Epic 7 |
|---|---|---|
| `'1'` | Pessoa Jurídica | Categoria E (Holding) candidata se ≥1 sócio PJ |
| `'2'` | Pessoa Física | Sócios PF → empresa "individual" / familiar |
| `'3'` | Estrangeiro | Sinal específico (investimento externo) |

### BR-RFB-2 — Situação cadastral (`estabelecimento.situacao_cadastral`)

| Valor | Significado | Tratamento Epic 7 |
|---|---|---|
| `'01'` | Nula | DESCARTAR — empresa nunca operou |
| `'02'` | **Ativa** | **Considerar** |
| `'03'` | Suspensa | Considerar com flag de alerta |
| `'04'` | Inapta | DESCARTAR (advertência fiscal) |
| `'08'` | Baixada | DESCARTAR |

### BR-RFB-3 — Porte empresa (`empresas.porte_empresa`)

| Valor | Significado |
|---|---|
| `'01'` | ME (Microempresa) |
| `'03'` | EPP (Empresa Pequeno Porte) |
| `'05'` | Demais |

### BR-RFB-4 — Matriz vs Filial (`estabelecimento.matriz_filial`)

| Valor | Significado |
|---|---|
| `'1'` | Matriz |
| `'2'` | Filial |

O ETL **já filtra** sócios apenas pela matriz (dados_cnpj_para_sqlite.py:163): `where te.matriz_filial='1'`. Isso significa que, ao buscar sócios via JOIN, **filiais não recebem cópia dos sócios** — o que está correto (sócio é vinculado à empresa, não ao estabelecimento).

## Regras Epic 7 que VAMOS aplicar sobre o schema

### BR-EPIC7-1 — Classificação tipológica via CNAE primário

**Input:** `estabelecimento.cnae_fiscal` (TEXT(7))
**Output:** Categoria A/B/C/D/E ou UNKNOWN

```yaml
# Tabela de decisão verbatim para o Epic 7
cnae_primario -> categoria_inicial:
  "6822500": B  # Adm. de imóveis de terceiros
  "6831700": B  # Intermediação compra/venda
  "6810201": B  # Compra/venda próprios (sublocação massiva)
  "6810202": B  # Aluguel imóveis próprios
  "4110700": C  # Incorporação imobiliária
  "4120400": C  # Construção edifícios
  "4399105": C  # Acabamento de obras
  "8112500": D  # Adm. predial
  "8121400": D  # Limpeza prédios
  "8130300": D  # Paisagismo / jardinagem (sinal fraco D)
  outros:    UNKNOWN  # FALLBACK
```

### BR-EPIC7-2 — Refinamento E (Holding) via grafo societário

**Pré-condição:** categoria via CNAE = `UNKNOWN` ou `B` (ambíguo).

**Regra:**

```yaml
SE
  - empresa tem ≥1 sócio com identificador_de_socio = '1' (PJ)
  - E qualquer sócio PJ tem CNAE primário na lista categoria-B-ou-C
  - E empresa tem ≥2 estabelecimentos OU ≥2 sócios PJ
ENTÃO
  categoria = E (Holding imobiliária)
```

### BR-EPIC7-3 — Refinamento C (Construtora) via CNAE secundária

**Input:** `cnae_secundaria.cnae_fiscal_secundaria` lista exploded.

```yaml
SE
  - estabelecimento.cnae_fiscal NÃO está em lista C primária
  - MAS contém qualquer das seguintes em cnae_secundaria:
    "4110700", "4120400", "4221904", "4292801"
ENTÃO
  categoria_secundaria += "C-aux"
```

### BR-EPIC7-4 — Match anunciante texto-livre

**Input:** nome anunciante extraído do portal (e.g. "Andre Imóveis", "Vinicius Lopes Corretor").

```yaml
ALGORITMO match-anunciante:
  1. normaliza:
     - uppercase
     - remove acentos
     - remove sufixos LTDA, ME, EPP, S/A, EIRELI
     - remove pontuação
  2. exact_match em estabelecimento.nome_fantasia OU empresas.razao_social
     → SE 1 resultado → match forte
     → SE >1 resultado → desambigua via município OU CEP do anúncio
  3. SE exact_match falhar:
     fuzzy_match (Levenshtein <= 2 OU trigram similarity > 0.7)
     → score do match vai para o scoring final do lead
  4. SE fuzzy falhar:
     anunciante = PF candidato (categoria A FISBO)
```

### BR-EPIC7-5 — Sinal FISBO secundário via ausência CNPJ + DDD móvel

**Combina com BR-EPIC7-4 quando match falha:**

```yaml
SE
  - match-anunciante retornou ZERO candidatos em RFB
  - AND telefone do anúncio é DDD móvel (DDD 11+, prefixo 9XXXX-XXXX)
  - AND nome do anunciante = formato PF (≥1 nome + sobrenome, sem termos "IMOVEIS"/"REAL ESTATE"/"PROPRIEDADES"/"CORRETOR")
ENTÃO
  categoria_provavel = A (FISBO)
  confianca = média (depende de validação de CRECI via buscacreci)
```

**Combinar com:**
- Resultado lookup buscacreci (vide `docs/code-anatomy/buscacreci/`)
- Quantidade de anúncios mesmo nome/telefone (≥3 anúncios → categoria B mascarado)

## Limitações estruturais herdadas da RFB

| Limitação | Implicação Epic 7 |
|---|---|
| RFB mascara CPF de sócios PF (mostra só dígitos centrais) | Não dá pra fazer matching PF preciso por CPF. Match por nome com fuzzy. |
| Apenas sócios com >5% do capital são listados | Sócios minoritários não aparecem — não dá pra detectar SPE/SCP "verdadeira" |
| Update mensal (não real-time) | Empresas novas (<30 dias) não estão na base |
| CNAE primário é declarativo, frequentemente desatualizado | Considerar CNAE secundária + nome fantasia como tie-breaker |
| Endereço pode ser caixa-postal / endereço-fiscal ≠ operação | Cruzar com endereço do anúncio do portal para detecção de sham |

## Regras NÃO presentes na RFB (a serem ADICIONADAS no Epic 7)

1. **CRECI lookup** → vide `buscacreci` (categoria A se nome PF e sem CRECI ativo).
2. **DDD geográfico** → DDD 11/12/13/14 = SP estado.
3. **Histórico de transações ITBI** → vide CQ-001 (só Δ-preço, não grafo).
4. **Frequência de anúncios mesmo CNPJ** → categoria B/C operacional.
5. **Densidade espacial Mapbox** → categoria B operando em "território".
