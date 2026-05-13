# Scoring Methodology - Deep Strategic Planning

Sistema de pontuação para avaliação de cenários/futuros.

## Probability Score Calculation

### Base Score

Cada cenário começa com uma estimativa de probabilidade base (0-100%) baseada em:

- **Posição na Matriz de Futuros**
  - Mercado Favorável + Execução Perfeita: 70-80% base
  - Mercado Favorável + Execução Mediana: 50-60% base
  - Mercado Favorável + Execução Falha: 20-30% base
  - Mercado Neutro + Execução Perfeita: 55-65% base
  - Mercado Neutro + Execução Mediana: 35-45% base (cenário BASE)
  - Mercado Neutro + Execução Falha: 15-25% base
  - Mercado Adverso + Execução Perfeita: 35-45% base
  - Mercado Adverso + Execução Mediana: 20-30% base
  - Mercado Adverso + Execução Falha: 5-15% base
  - Black Swan: 5-10% base (por definição, imprevisível)

### Ajustes por Lente

Cada lente pode ajustar o score em -15 a +15 pontos:

| Ajuste | Significado | Exemplos |
|--------|-------------|----------|
| **+10 a +15** | Forte validação | First Principles confirma fundamentos sólidos |
| **+5 a +9** | Validação moderada | Steel Man revela força não-óbvia |
| **+1 a +4** | Leve validação | Sem red flags significativos |
| **0** | Neutro | Lente não se aplica ou é inconclusiva |
| **-1 a -4** | Leve concern | Pontos de atenção menores |
| **-5 a -9** | Concern moderado | Riscos identificados mas gerenciáveis |
| **-10 a -15** | Forte invalidação | Pre-Mortem revela falha fatal |

### Fórmula Final

```
Final Score = Base + Σ(ajustes por lente)

Caps:
- Minimum: 5% (nunca é impossível)
- Maximum: 95% (nunca é garantido)
```

### Exemplo de Cálculo

**Cenário:** "The Grind" - Mercado Neutro, Execução Mediana

```
Base Score: 40%

Ajustes por lente:
1. First Principles:    +5  (fundamentos sólidos)
2. Steel Man:           +3  (versão forte plausível)
3. Inversion:          -4  (modos de falha identificados)
4. Via Negativa:        +2  (simplificável)
5. Pre-Mortem:         -8  (risco de burnout do time)
6. Second-Order:       -3  (efeitos cascata moderados)
7. Goodhart:            0  (neutro)
8. Skin in the Game:   +7  (founders all-in)
9. Circle Competence:  +4  (dentro da expertise)
10. Lindy Effect:      -2  (depende de tech recente)
11. Antifragility:     -5  (frágil a choques)
12. Interdisciplinary: +3  (paralelos positivos)

Total de ajustes: +5 +3 -4 +2 -8 -3 +0 +7 +4 -2 -5 +3 = +2

Final Score: 40% + 2% = 42%
```

---

## Interpretação dos Scores

### Bandas de Confiança

| Score Range | Classificação | Recomendação |
|-------------|--------------|--------------|
| **80-95%** | Alta Confiança | Executar com vigor. Este é provavelmente "O Um". |
| **60-79%** | Confiança Moderada | Executar com checkpoints frequentes. Ter plano B pronto. |
| **40-59%** | Zona de Incerteza | Pilotar com scope limitado antes de full commit. |
| **20-39%** | Baixa Confiança | Apenas se sem alternativas melhores. Investir em reduzir incerteza. |
| **5-19%** | Evitar | Descarte este cenário. Focar energia em alternativas. |

### Score Delta

Além do score absoluto, considerar o delta entre cenários:

- **Delta > 20%**: Diferença significativa, escolha clara
- **Delta 10-20%**: Diferença moderada, considerar outros fatores
- **Delta < 10%**: Cenários comparáveis, decisão pode ir para qualquer lado

---

## Pesos Especiais por Tipo de Decisão

Algumas lentes têm mais peso dependendo do tipo de decisão:

### Decisões Técnicas (Arquitetura, Stack)
| Lente | Peso |
|-------|------|
| First Principles | 1.5x |
| Pre-Mortem | 1.5x |
| Lindy Effect | 1.3x |
| Circle of Competence | 1.3x |

### Decisões de Negócio (Produto, Market)
| Lente | Peso |
|-------|------|
| Skin in the Game | 1.5x |
| Second-Order | 1.5x |
| Goodhart | 1.3x |
| Antifragility | 1.3x |

### Decisões de Carreira (Pessoal)
| Lente | Peso |
|-------|------|
| Inversion | 1.5x |
| Via Negativa | 1.5x |
| Circle of Competence | 1.3x |
| Antifragility | 1.3x |

---

## Agregação de Múltiplos Cenários

### Cenário Vencedor

O cenário com maior score é o **candidato a vencedor**, mas verificar:

1. **Gap suficiente?** (idealmente >15% acima do 2º lugar)
2. **Contradições resolvidas?** (lentes em conflito)
3. **Contingência viável?** (fallback para 2º lugar se falhar)

### Portfólio de Cenários

Em alguns casos, a melhor estratégia é combinar elementos:

- **Cenário híbrido**: Combinar aspectos fortes de múltiplos cenários
- **Staged approach**: Começar com cenário seguro, evoluir para mais agressivo
- **Barbell**: Investir em extremos (muito conservador + muito agressivo)

---

## Validação do Score

### Sanity Checks

Após calcular, verificar:

1. **O score faz sentido intuitivamente?**
   - Se não, revisar premissas

2. **O cenário vencedor passa no "Teste do Travesseiro"?**
   - Você dormiria tranquilo escolhendo esse caminho?

3. **Existe viés de confirmação?**
   - Você está favorecendo o cenário que já queria?

### Calibração

Revisar scores após 6-12 meses:
- Cenários com score alto que falharam → Ajustar metodologia
- Cenários com score baixo que tiveram sucesso → Entender o porquê

---

## Quick Scoring Template

```markdown
## FUTURO: {Nome}

| Lente | Insight | Score |
|-------|---------|-------|
| First Principles | | |
| Steel Man | | |
| Inversion | | |
| Via Negativa | | |
| Pre-Mortem | | |
| Second-Order | | |
| Goodhart | | |
| Skin in the Game | | |
| Circle Competence | | |
| Lindy Effect | | |
| Antifragility | | |
| Interdisciplinary | | |

**Base:** ___%
**Ajustes:** ___
**Final:** ___%
**Classificação:** ___
```
