---
paths:
  - "workspace/**"
  - "outputs/**"
  - "squads/**/templates/**"
  - "squads/**/data/**"
  - "squads/**/config.yaml"
  - "squads/**/squad-io.yaml"
  - ".aiox-core/**"
---
# Artifact Classification — Sinkra Hub

## Decision Tree (NON-NEGOTIABLE)

```
Artefato gerado?
├── Tem template em squads/*/templates/ + entry no document-registry.yaml?
│   ├── SIM → workspace/businesses/{slug}/L{N}-{layer}/
│   └── NÃO → É output de execução de squad/task?
│       ├── SIM → outputs/{squad-name}/{business-slug}/
│       └── NÃO → É framework/config do AIOX?
│           ├── SIM → .aiox-core/ ou squads/
│           └── NÃO → Avaliar caso a caso com @cso
```

## Artefato Canônico (→ workspace/)

Documentos que fazem parte do workspace l0-l4, governados pelo Document Registry.

| Critério | Obrigatório |
|----------|-------------|
| Template-bound (squads/*/templates/) | SIM |
| Lifecycle gerenciado (PLACEHOLDER → APPROVED) | SIM |
| Registry entry (document-registry.yaml) | SIM |
| Owner squad definido | SIM |
| TTL definido (camada l0-l4) | SIM |
| Governado pelo CSO | SIM |

## Output de Squad (→ outputs/)

Resultados de execução de tasks — produtos de trabalho transitórios.

| Critério | Descrição |
|----------|-----------|
| Produto de task | Gerado pela execução de uma task |
| Sem template canônico | Formato livre ou template interno |
| Sem lifecycle formal | Não passa por PLACEHOLDER→APPROVED |
| Transitório | Pode ser regenerado re-executando a task |
| NÃO governado pelo CSO | Fora do Document Registry |

## Convenção de Paths

| Tipo | Path | Exemplo |
|------|------|---------|
| Canônico (business) | `workspace/businesses/{slug}/L{n}-{layer}/` | `workspace/businesses/aiox/L1-strategy/icp.yaml` |
| Canônico (hub) | `workspace/sinkra-hub/L{n}-{layer}/` | `workspace/sinkra-hub/L0-identity/constitution.yaml` |
| Output de squad | `outputs/{squad-name}/{business-slug}/` | `outputs/deep-research/aiox/market-analysis.md` |
| Output genérico | `outputs/{squad-name}/` | `outputs/deep-research/tech-report.md` |
| Framework | `.aiox-core/` | `.aiox-core/constitution.md` |
| Squad config | `squads/{name}/` | `squads/sinkra-squad/config.yaml` |
| Governance | `.claude/` | `.claude/rules/artifact-classification.md` |

**Importante:** Camadas usam **capital-L** (`L0-identity`, `L1-strategy`, `L2-tactical`, `L3-product`, `L4-operational`) conforme `workspace/_system/config.yaml`. Referências a `l0-identity` em lowercase são legado e serão migradas (EPIC-120).

## PII em Squads — Identity-Bound vs Operational

Quando o artefato está em `squads/**` e referencia uma pessoa real (person_id, email, voice DNA), aplica-se a regra `.claude/rules/squads-pii-policy.md`:

| Categoria | PII permitida? | Manifest required |
|-----------|----------------|-------------------|
| Identity-Bound (squad É a pessoa) | SIM | `identity_bound: true` + `identity_source` em `config.yaml` |
| Operational (squad é genérico) | NÃO | usar slot abstrato (`{steward}`, `{accountable}`) resolvido via `_registry.yaml` |

**ADR autoritativa:** `docs/architecture/adrs/ADR-SQUAD-PII-POLICY.yaml`

## Decision Tree — Campanhas (ADR-012)

Campanhas são artefatos cross-squad (copy + ads + design + movement + brand) e vivem em **L4-operational/campaigns/**.

```
Campanha?
├── Artefato lido por 2+ squads?
│   ├── SIM → workspace/businesses/{biz}/L4-operational/campaigns/{slug}/{artifact}.yaml
│   │        (raiz — cross-squad contract registrado em workspace/_system/config.yaml)
│   │        Exemplos: campaign-brief.yaml, message-architecture.yaml
│   └── NÃO → workspace/businesses/{biz}/L4-operational/campaigns/{slug}/{squad}/{artifact}.yaml
│            (subpasta por squad produtor)
│            Exemplos: copy/creative-brief.yaml, ads/media-plan.yaml
```

**Subpastas canônicas reservadas em `campaigns/{slug}/`:**
- `copy/` — copy squad
- `ads/` — aiox-ads squad
- `design/` — design-system / design-ops squad
- `movement/` — movement squad
- `brand/` — brand squad
- `content/` — content/media squad
- `pitch/` — pitch-deck squad

**Template de referência:** `workspace/_templates/business-template-v3/L4-operational/campaigns/_example/`
**Schema formal:** `docs/schemas/campaign-brief-schema.yaml`
**ADR:** `docs/adrs/ADR-012-campaign-canonical-layout.md`

## Regra de Enforcement

- **NUNCA** salvar outputs de squads em `workspace/businesses/*/`
- **NUNCA** salvar artefatos canônicos em `outputs/`
- **SEMPRE** verificar o decision tree antes de criar novo arquivo
- Research outputs, transcriptions, generated content → `outputs/`
- Workspace docs com template + registry → `workspace/`
- **NUNCA** usar dialeto legado (`company/`, `products/`, `copy/` raiz, `brand/` raiz, `design/` raiz, `movement/` raiz, `pitch-deck/` raiz, `content/` raiz) — todas as camadas usam prefixo `L{n}-` canônico. Gate: `validate:workspace-dialect` (Story 120.6)
