# Avaliação crítica do método ACM — confiabilidade, vieses e evolução

**Data:** 2026-07-09  
**Tipo:** análise metodológica (crítica + criativa + acionável)  
**Não é:** laudo NBR, opinião jurídica, nem PRD de stories  
**É:** stress-test intelectual do método que o código implementa  
**Casos de prova:** Honduras 629 · Andrade Pertence 113 · Andrade Pertence 132  
**Irmãos:** `ANALISE-ENGENHARIA-ACM-20260709.md` (engenharia) · `ROADMAP-ACM.md` (execução) · `AUDITORIA-EVOLUCAO-ACM-20260703.md` (achados)

---

## 0. Tese em 60 segundos

O ACM Moema é um **método comparativo operacional de captação**, não um laudo pericial.  
Ele é **fortíssimo** em uma coisa: transformar a tese comercial da Luciana (“deságio com âncora em ITBI real”) em um **pipeline reproduzível e auditável**.  

Ele é **perigoso** em outra: a sofisticação do PDF e dos testes **mascara** que o número central ainda depende de:

1. **amostra limpa** (tipologia, auto-referência, frações),  
2. **um desconto de até 15%** que parece técnico mas é arbítrio,  
3. **homogeneização incompleta** (tempo sim; idade/padrão/estado ainda fracos),  
4. **ITBI como verdade absoluta** — e ITBI mente, subdeclara e mistura usos.

A evolução de alto ROI **não** é “mais estatística por vaidade”. É **tornar o arbítrio explícito**, **a amostra à prova de mentira** e **o laudo legível em 30 segundos pelo proprietário e em 30 minutos por um adversário**.

---

## 1. O que o método realmente é (despir a retórica)

### 1.1 A fórmula mental (sem eufemismo)

```
1. Colete vendas ITBI num raio
2. Tire o lixo (ou esqueça e se arrependa — R5, 639)
3. Ordene por “parece com o meu” (50% área constr. + 20% terreno + 30% distância)
4. Pegue a mediana de R$/m² de um recorte (todos / top5 / top3)
5. Multiplique pela área do alvo
6. Aplique um desconto de Score/Capex (hoje 15% se B)
7. Aplique mais descontos de “liquidez” se a consultora der fatores
8. Compare com residual de incorporador e com anúncio/pretendido
9. Empacote em PDF bonito e diga “mercado está em X–Y”
```

Isso é **MCDDM light** (método comparativo direto de dados de mercado), com:

- **mediana** em vez de regressão,  
- **ranking** em vez de pesos calibrados empiricamente,  
- **faixa de sensibilidade** em vez de intervalo de confiança formal,  
- **tese de captação** como norte (não neutralidade pericial).

### 1.2 O que o método *não* é (e às vezes finge ser)

| Fingimento sutil | Realidade |
|------------------|-----------|
| “Valor de mercado objetivo” | Estimativa condicional à amostra e aos fatores |
| “Score técnico AAA–B” | Régua de R$/m² do material didático Jardins; Capex só B calibrado |
| “−15% Capex Score B” | Campo de arbítrio NBR disfarçado de classificação |
| “ITBI = verdade” | ITBI = preço declarado no registro fiscal (vieses conhecidos) |
| “Top 3 mais confiável” | Top 3 mais *parecido no eixo declarado* — se o eixo estiver errado, o Top 3 é pior |
| “Laudo de 18 páginas = rigor” | Rigor está na amostra e nos fatores; páginas sem isso são teatro |

### 1.3 As três perguntas que o ACM mistura — e deve separar

Já consolidado no roadmap (§10.6), mas aqui como crítica de produto:

| Camada | Pergunta | Fonte legítima |
|--------|----------|----------------|
| **1. Valor técnico** | “O que o mercado *pagou* por imóveis parecidos?” | ITBI saneado |
| **2. Estado do alvo** | “Este imóvel está acima/abaixo do típico?” | Vistoria + arbítrio declarado |
| **3. Jogo comercial** | “Como precificar e se diferenciar na vitrine?” | Anúncios, tempo, concorrência |

**Crítica:** o PDF de captação ainda *cheira* a camada única. O proprietário lê “mercado R$ X” e não distingue “ITBI diz” de “Luciana ajustou estado” de “se anunciar assim compete assim”.  
**Evolução:** três blocos visuais inegociáveis na capa (não só no texto da Sec. 10).

---

## 2. Auditoria epistemológica — de onde vem a confiança?

### 2.1 ITBI: o melhor pior dado

**Por que é o certo:** anúncio é desejo; ITBI é (em tese) fechamento. A decisão de **nunca** misturar oferta na mediana (rejeitada 09-Jul) é correta e deve ser dogma.

**Por que ainda é frágil:**

| Viés do ITBI | Efeito no ACM | Contra-medida |
|--------------|---------------|---------------|
| Subdeclaração (valor venal / planejamento fiscal) | Mediana **para baixo** | Detectar outliers por R$/m² vs. bairro×tipologia (C-3); flag “suspeito” |
| Fração ideal / compra de incorporador | R$/m² unitário distorcido | Dedup SQL + filtro proporção &lt;99% (já no guia Jardins; frágil se campo NULL) |
| Complemento perdido (“AP 82”) | Casa×apto invertido | **R5** — não-negociável |
| Atraso / competência fiscal ≠ data de negócio | Homogeneização temporal errada | Preferir data da guia; documentar lag |
| Geocode por CEP/logradouro (±200 m) | “Proximidade” inventada | Score de qualidade de geocode; baixar peso se ruim |
| Uso comercial rotulado como residencial | Programa errado no Top N | Crosscheck programa (já achado Torres Homem / Canadá 111) |

**Provocação:** um ACM “honesto” deveria imprimir na capa:

> *Base: N vendas ITBI. Estimativa de subdeclaração regional: não modelada.  
> Se a subdeclaração típica for 10%, o valor técnico sobe ~10%.*

Hoje isso **não existe**. O PDF transmite certeza cartorial.

### 2.2 A mediana simples: robusta e cega

**Mérito:** mediana resiste a um outlier monstruoso.  
**Cegueira:** trata com o mesmo peso:

- uma venda 2024 a 800 m de uma casa 1965 reformada, e  
- uma venda 2026 a 80 m de uma casa 2018.

O ranking de aderência **ordena**, mas a mediana do Top-N **não pondera**.  
C-6 (mediana ponderada por score de aderência) ataca isso — e ainda é barato.

**Crítica mais dura:** com Top 3, a “mediana de 3” é quase **média dos do meio se ordenados** — na prática, **um único endereço** pode dominar o headline se for o ponto central.  
Com n=3, robustez estatística é teatro. O valor real do Top 3 é **narrativo** (“as três casas mais parecidas”), não estatístico.

**Evolução criativa — “n efetivo”:**

```
n_eff = 1 / Σ wᵢ²   (se pesos normalizados)
```

Se n_eff &lt; 4, o PDF grita: *“referência concentrada — tratar como estudo de casos, não como mercado”*.

### 2.3 Aderência 50/20/30: dogma herdado, não calibração

Os pesos vêm do material didático Honduras. **Não há** evidência no repositório de que:

- 50/20/30 maximiza correlação com preço residual,  
- ou minimiza erro de previsão em hold-out.

No caso **132**, ativar o 20% de terreno **estragou** a referência (1,99M → 1,27M artefato).  
Isso prova empiricamente: **os pesos não são universais**.

| Contexto | Peso de terreno 20% | Comentário |
|----------|---------------------|------------|
| Teardown / lote bom (Honduras, 113 terreno) | Pode fazer sentido | Tese de terra |
| Casa conservada, valor no construído (132) | **Nocivo** | Contamina com ITBI de terra barata |
| Apartamento Moema | Terreno irrelevante / fração | Régua 9.1 obrigatória |

**Evolução:** pesos **condicionais ao perfil de tese**:

```
tese = { construcao | terreno | hibrido | apto }
weights = WEIGHTS_BY_TESE[tese]
```

Declarado no laudo. Sem surpresa.

### 2.4 Score AAA–B + Capex: o elefante de 15%

```ts
CAPEX_BY_SCORE = { AAA: 0, AA: 0, A: 0, B: 0.15 }
// só B calibrado no Honduras: 18264 × 800 × 0.85 = 12.419.520
```

**Leitura crítica:**

1. O Score classifica o *mercado* (mediana de R$/m²), não o *estado do imóvel-alvo*.  
2. Depois usa essa classe para **descontar o alvo** em 15% se B.  
3. AAA/AA/A têm Capex **zero** — o método só “sabe descontar lixo”, não “premiar excelência”.  
4. No 132, imóvel **conservado** caiu em lógica de −15% se seguir Score B cego → **subavaliação** (tese comercial confirmada pela própria análise de idade/estado).

**Isso é o maior risco reputacional do método:** um adversário inteligente pergunta:

> “Por que 15% e não 8%? Onde está a vistoria que justifica?”

Se a resposta for “porque o PDF de referência tinha”, a ACM perde o tribunal e perde o proprietário sofisticado.

**C-1 está certo** (0 / −7,5 / −15% declarados). Falta:

- **default por estado do alvo** (ficha A/B/C/D), não por Score da mediana;  
- **separar** “desconto de estado” de “classificação de mercado”;  
- **nunca** chamar Capex o que é arbítrio de conservação.

### 2.5 Residual do incorporador: segunda âncora ou fanfic?

```
VGV 34k/m² × 800 − obra 10,5k − demolição 200k − 8% − 5% − 20% = 9,624M
```

**Problemas:**

| Parâmetro | Status | Crítica |
|-----------|--------|---------|
| VGV 34k | Sem fonte no laudo | Pode ser “âncora de luxo” circular |
| Obra 10,5k | Sem fonte | Varia 2× por padrão |
| Margem 20% | Heurística de incorporador | Ciclo de juros muda margem |
| N de terreno para efeito-escala | n=2 no Honduras | Co-âncora frágil (auditoria) |

**Uso honesto:** residual é **teto do comprador-terreno**, útil em tese de teardown.  
**Uso desonesto:** “convergência” com mercado de construção quando residual usa inputs não auditados.

**Evolução:** cada parâmetro com `fonte` + `data` + `cenário` (otimista/base/pessimista). Sem fonte → residual some da capa e vira apêndice.

### 2.6 Liquidez composta: a consultora *é* o modelo

Fatores Honduras: 7% + 5% + 3% + 4% compostos ≈ −17,7%.  
São **inputs por imóvel**. Correto. Perigoso se:

- reutilizados sem elicitação (copy-paste do template),  
- ou se o PDF não deixa gritante que **não saíram do ITBI**.

**Evolução UX:** tela “Fatores de Luciana” com slider e **preview ao vivo** do fechamento — o comercial *sente* o peso de cada 1%.

---

## 3. Stress-test pelos três casos reais

### 3.1 Honduras 629 — o mito fundador

| O que o caso ensinou | O que o caso distorce |
|----------------------|------------------------|
| Pipeline completo e material didático | Método calibrado em **casa de alto padrão Jardins** |
| ITBI + Top N + residual + PDF | Moema vertical **não** é Honduras |
| Incidentes 639 / bairro / headline | “Gabarito sagrado” pode congelar vieses do v4 |

**Crítica:** a regressão de 185 testes **protege o motor**, mas também **canoniza** um único tipo de imóvel.  
Todo avanço (apto, casa popular, sobrado reformado) parece “desvio do Honduras” em vez de “generalização”.

**Evolução:** suite de **multi-gabaritos**:

- Honduras (casa luxo)  
- 113 (sobrado compacto)  
- 132 (casa conservada V. Olímpia)  
- + 1 apto Moema (ainda inexistente — **buraco existencial** do produto)

### 3.2 Andrade Pertence 113 — o caso que salvou a honestidade

Amostra contaminada por APs **refutava** o R$ 1,1M da proprietária.  
Amostra limpa + lente de terreno **validava**.

**Lição de ouro:** o ACM não “descobre a verdade” — **remove a mentira da amostra** até as lentes convergirem.  
Quando construção e terreno discordam violentamente, o método deve **recusar headline único** e forçar due diligence (matrícula).

### 3.3 Andrade Pertence 132 — o caso que expôs o Capex e o ranking

- R5 + Street View: tipolog ia ainda falha com heurística  
- Ranking com terreno: artefato de R$ 700k  
- Capex −15%: subavalia imóvel conservado  
- Anúncio 1,495M vs ref ~1,77M+: tese de **subprecificação** (inverso do “sempre deságie o dono”)

**Crítica de produto:** o método nasceu para **baixar expectativa do proprietário** (tese do deságio).  
No 132, o certo comercial é **não cortar**.  
Se o software for otimizado só para a narrativa de deságio, ele vira **arma de um lado só** e perde credibilidade quando o mercado diz o contrário.

**Evolução:** modo de tese explícito na capa:

```
[ ] Expectativa acima do mercado  → narrativa deságio
[ ] Alinhado                     → narrativa execução
[ ] Abaixo do mercado            → narrativa subprecificação / não cortar
```

Derivado automaticamente de `(pretendido ou anúncio) vs headline.referencia`.

---

## 4. Vieses estruturais (lista negra)

| # | Viés | Sintoma | Severidade | Antídoto |
|---|------|---------|------------|----------|
| V1 | **Viés de confirmação comercial** | Headline escolhido para fechar exclusividade | Crítica | Faixa + tese automática + H-3 Luciana |
| V2 | **Viés de amostra conveniente** | Ampliar raio/bairro para “fechar N” | Alta | C-3 + avisos multi-bairro |
| V3 | **Viés de geocode** | Proximidade falsa | Alta | Qualidade de geocode no índice |
| V4 | **Viés de tipologia** | APs como casas | Crítica | R5 + 9.4 |
| V5 | **Viés de Capex oculto** | −15% sem vistoria | Crítica | C-1 explícito |
| V6 | **Viés de gabarito único** | Tudo comparado a Honduras | Média | Multi-gabarito |
| V7 | **Viés de PDF** | Beleza = verdade | Média | `avisos[]` na capa em vermelho |
| V8 | **Viés de ITBI limpo** | Subdeclaração ignorada | Média | Outlier vs índice bairro |
| V9 | **Viés de Top-N pequeno** | n=3 como “mercado” | Alta | n_eff + faixa obrigatória |
| V10 | **Viés de apto invisível** | Moema sem régua vertical | Crítica p/ produto | 9.1 |

---

## 5. Confiabilidade — o que significa e como medir

### 5.1 Definição operacional (não filosófica)

Um ACM é **confiável** se:

1. **Reprodutível** — mesmo input → mesmo output (já quase 100% no motor).  
2. **Auditável** — cada número aponta fonte (SQL, índice, fator, data).  
3. **Resistente a contaminação** — auto-ref, tipologia, fração, outlier.  
4. **Calibrado** — em backtest, o valor técnico prediz faixas de fechamentos futuros.  
5. **Útil** — a Luciana usa *antes* da V2, não só para enfeitar a pasta.

Hoje: **1–2 fortes**, **3 parcial**, **4 quase ausente**, **5 emergente** (3 casos artesanais).

### 5.2 O buraco do backtest

Não há no repositório um loop:

```
para cada venda ITBI do passado:
  esconda-a da amostra
  rode ACM no endereço/data
  compare valor técnico vs preço real (deflacionado)
  registre erro %
```

Sem isso, toda discussão de “85–90% do NBR Grau III” é **juízo de engenharia**, não medição.

**Proposta criativa — “ACM Lab” (mensal):**

| Métrica | Meta ano 1 |
|---------|------------|
| Mediana \|erro\| no hold-out casas Moema | &lt; 12% |
| % casos com tipo errado (R5) | 0 em produção |
| % laudos com avisos críticos ignorados | &lt; 5% |
| Tempo Luciana até V2 com PDF | &lt; 45 min |
| Taxa de uso do ACM nas captações elegíveis | &gt; 70% |

### 5.3 Placar NBR 14653-2 (honesto)

| Item fundamentação | Situação atual | Nota |
|--------------------|----------------|------|
| 1 Caracterização do alvo | Ficha incompleta (idade/estado) | Fraco |
| 2 Quantidade de amostras | OK se R5 e n≥5 | Médio–bom |
| 3 Identificação dos dados | SQL/CEP no v5; S/V/D NULL em PROD | Médio |
| 4 Fatores de homogeneização | Temporal sim; físico parcial; Capex duvidoso | Fraco–médio |
| 5 Apresentação | PDF excelente | Bom |

**Precisão:** amplitude Top3–todos frequentemente **&gt; 15–25%** → Grau III de precisão **não** é o default; a **faixa** é a forma honesta de reportar.

---

## 6. Uso prático — onde o método ganha e onde morre

### 6.1 Jornadas reais

| Momento | ACM ajuda? | Como evoluir |
|---------|------------|--------------|
| Pré-contato FISBO | Pouco (ainda sem endereço rico) | ACM Lite em 2 cliques no lead |
| Preparação V1 | Médio | 1 página: faixa + 3 comparáveis + mapa |
| V2 / exclusividade | **Alto** | Pacote Pro: laudo + planilha + tese |
| Contra-proposta | Alto se faixa | Simulador “e se pedirem X?” |
| Disputa / jurídico | Baixo hoje | Tier Técnica + ART parceiro |
| Escala multi-consultor | Baixo | CLI + skill + 9.4 |

### 6.2 Fricções que matam adoção (mesmo com método bom)

1. **Pipeline por pasta de scripts** — não cabe no bolso em campo.  
2. **Fatores e residual sem defaults regionais** — cada ACM vira consultoria.  
3. **Planilha que apaga marcações** — Luciana não refaz trabalho.  
4. **Apto** — se 80% do raio é vertical, casa-only é ferramenta de nicho.  
5. **Tempo até o primeiro “uau”** — se &gt; 1 sessão de operador, vira projeto paralelo.

### 6.3 O “modo dono de imóvel” (criativo, alto impacto)

O PDF atual fala **para a consultora** e **sobre o dono**.  
Falta um artefato de **2 páginas em linguagem humana**:

```
O que o registro mostra que se vendeu perto de você
O que isso sugere para o SEU imóvel (faixa)
O que ainda precisamos confirmar (matrícula, reforma, vagas)
O que a gente recomenda anunciar / negociar
O que NÃO estamos dizendo (não é laudo judicial)
```

Isso aumenta **uso prático** mais do que mais 10 seções técnicas.

---

## 7. Mapa de evolução — de “método” a “sistema de confiança”

### 7.1 Norte: três tiers (já no roadmap — reforço crítico)

| Tier | Quando | Conteúdo mínimo | Proibido |
|------|--------|-----------------|----------|
| **Lite** | 80% das captações | R5 + mediana + faixa deságio + 3 comps | Residual sem fonte; 18 págs |
| **Pro** | V2 / exclusividade | + fatores + bairro×tipo + concorrência + planilha | Misturar anúncio na mediana |
| **Técnica** | Contestado / financiamento | + Ross + IC/amplitude + C-5 + anexos | Capex oculto |

**Crítica:** sem tiers, todo ACM tenta ser Honduras — caro, lento, e às vezes *menos* confiável (mais páginas, mesma amostra suja).

### 7.2 Backlog priorizado por *confiabilidade × uso* (não por vaidade técnica)

#### Classe S — muda o número ou evita desastre (fazer primeiro)

| ID | Ideia | Por quê |
|----|-------|---------|
| **S1** | Capex/estado **explícito** (C-1 no motor, não só no PDF do 132) | Maior swing; fim do desconto oculto |
| **S2** | R5 + 9.4 na base PROD | Sem isso, escala = escalar erro |
| **S3** | `avisos[]` na capa (n, multi-bairro, geocode, n_eff, residual n&lt;3) | Confiabilidade *percebida e real* |
| **S4** | Pesos de aderência por **tese** (construção/terreno/apto) | 132 provou o dano |
| **S5** | Ficha do alvo obrigatória (idade, estado A–D, reformas) | Condicionante nº 1 |

#### Classe A — multiplica uso sem reinventar ciência

| ID | Ideia | Por quê |
|----|-------|---------|
| **A1** | ACM Lite in-app / CLI em &lt;5 min | Adoção |
| **A2** | XLSX merge-back | Loop humano sustentável |
| **A3** | Resumo “modo dono” 2 págs | Conversão na V2 |
| **A4** | Simulador pretendido × faixa (slider) | Preparação de objeção |
| **A5** | Tese automática (acima/alinhado/abaixo) | Narrativa honesta nos dois sentidos |
| **A6** | Índice bairro×tipologia como **sanity band** (C-3) | Detecta absurdo |

#### Classe B — sobe grau de fundamentação (quando o caso pedir)

| ID | Ideia | Por quê |
|----|-------|---------|
| **B1** | Ross por idade (dado já existe em parte) | Homogeneização física |
| **B2** | Mediana ponderada (C-6) | Usa ranking que já existe |
| **B3** | C-5 deságio anúncio→venda empírico | Prior 8–12% SP até medir |
| **B4** | Qualidade de geocode no peso de proximidade | Menos ficção espacial |
| **B5** | Multi-gabarito de regressão (113/132/apto) | Anti-Honduras-only |

#### Classe C — criativo / diferenciador de mercado

| ID | Ideia | Descrição |
|----|-------|-----------|
| **C★1** | **Red Team ACM** | Segundo agente tenta *derrubar* o laudo (amostra, Capex, residual); relatório de ataque anexado |
| **C★2** | **Diário de calibração** | Cada fechamento real da Luciana volta como label; erro % por bairro/tipologia |
| **C★3** | **Monte Carlo leve** | Amostra com bootstrap dos Top-N → histograma de valor; comunica incerteza sem NBR formal |
| **C★4** | **ACM em voz** | 90s de áudio: “vizinho vendeu X, sua faixa é Y, recomendo Z” — para WhatsApp pós-V1 |
| **C★5** | **Mapa de confiança** | Pins coloridos por qualidade da evidência (SQL ok, tipologia ok, geocode ok) |
| **C★6** | **Contrato de não-uso** | Checkbox no PDF: “não usar como laudo judicial / financiamento sem tier Técnica” — reduz risco jurídico |
| **C★7** | **Gêmeos de sensibilidade** | Mesmo laudo com 3 personas: conservador / base / agressivo — dono escolhe, consultora ancora |
| **C★8** | **Detecção de “ITBI mentiroso”** | Se R$/m² &lt; p10 do bairro×tipo após deflação → peso 0 ou quarentena |

### 7.3 O que *não* fazer (anti-roadmap)

1. **Regressão hedônica completa** antes de R5/9.4/C-1 — estatística em cima de lixo.  
2. **Injetar anúncios na mediana** para “aumentar N” — reabre a ferida da auditoria.  
3. **Skill agentica sem CLI e sem gates** — automatiza o erro com gravata.  
4. **Congelar Honduras como única verdade** — Moema não é Jardins.  
5. **Chamar o sistema de “laudo NBR”** em material de cliente — risco reputacional e legal.  
6. **Otimizar o PDF para assustar o dono** em todo caso — o 132 mostra o oposto.

---

## 8. Arquitetura de confiança proposta (alvo 90 dias)

```
                    ┌──────────────────────┐
                    │  Ficha do alvo       │  estado, idade, tese
                    └──────────┬───────────┘
                               ▼
┌──────────────┐    ┌──────────────────────┐    ┌─────────────────┐
│ ITBI PROD    │───►│ Saneamento           │───►│ Compute          │
│ + Complemento│    │ R5 · 9.8 · fração    │    │ pesos por tese   │
│ + Uso/ACC    │    │ outlier · geocode    │    │ C-1 explícito    │
└──────────────┘    └──────────────────────┘    │ faixa + avisos   │
                                                 └────────┬────────┘
                                                          ▼
                    ┌──────────────────────┐    ┌─────────────────┐
                    │ Sanity C-3           │◄───│ AcmLaudoComputation
                    │ banda bairro×tipo    │    └────────┬────────┘
                    └──────────────────────┘             ▼
                               ┌──────────────────────────┴──────────┐
                               ▼                                     ▼
                    ┌──────────────────┐                  ┌──────────────────┐
                    │ Entrega por tier │                  │ Lab / calibração │
                    │ Lite · Pro · Téc.│                  │ erro vs fechado  │
                    └──────────────────┘                  └──────────────────┘
```

**Princípio:** a confiança não mora no React-PDF. Mora no **filtro**, no **arbítrio nomeado** e no **feedback de fechamentos reais**.

---

## 9. Notas por alavanca metodológica (veredito pontual)

| Alavanca | Manter? | Evoluir para | Matar se… |
|----------|---------|--------------|-----------|
| Âncora ITBI | **Sim, dogma** | + outlier + fração | Misturar oferta |
| Mediana | Sim | + ponderada + n_eff | n&lt;3 sem aviso |
| Aderência 50/20/30 | Condicional | Pesos por tese | Peso único universal |
| Headline faixa | **Sim** | Capa com 3 camadas | Voltar ponto único |
| Capex Score B 15% | **Não como está** | Estado do alvo declarado | Continuar oculto |
| Residual | Opcional | Com fonte ou some | Capa sem fonte |
| Fatores liquidez | Sim | UI + defaults regionais | Copy-paste cego |
| Homog. FipeZap | Sim | + índice bairro local | Confiar em SP Total |
| R5 | **Dogma** | Industrializar 9.4 | Heurística só lote |
| PDF 18 págs | Tier Pro/Técnica | Lite 2–4 págs | Único formato |
| Gabarito Honduras | Sim, um de vários | Multi-caso | Único freio de regressão |

---

## 10. Roteiro de conversa com a Luciana (H-3 ampliado)

Não só “gosta da faixa?”. Perguntas que **calibram o método**:

1. Em quantos % das captações o ACM precisa existir **antes** da V1 vs só na V2?  
2. Quando o anúncio está **abaixo** da referência (caso 132), qual frase ela quer no PDF?  
3. Escala de estado A–D: como ela classifica em 10 segundos na visita?  
4. Em casa vs apto Moema: o que muda na cabeça do comprador (andar, vaga, condomínio)?  
5. Residual de incorporador: ela usa na conversa ou é ruído?  
6. Qual erro ela prefere: **superavaliar** (captação fácil, venda difícil) ou **subavaliar** (captação dura, exclusividade justa)?  

A resposta da (6) deveria virar **default de viés** do tier Lite (hoje o código puxa para o conservador via −15%).

---

## 11. Veredito final

### Nota metodológica (julgamento sintético)

| Critério | Nota 0–10 | Comentário |
|----------|-----------|------------|
| Âncora de dados correta | 9 | ITBI &gt; anúncio — acerto estrutural |
| Saneamento de amostra | 6 | R5 nasce; PROD ainda doente |
| Homogeneização | 5 | Tempo ok; físico/estado fraco |
| Transparência do arbítrio | 4 | Capex ainda “parece ciência” |
| Adequação a Moema (apto) | 3 | Buraco de produto |
| Utilidade em campo | 4 | Artesanal; 3 casos heróicos |
| Defensabilidade formal NBR | 4 | Caminho existe; não é o default |
| Honestidade narrativa | 7 | Faixa + incidentes documentados — cultura certa |
| **Média** | **~5,3** | **Método promissor, ainda semi-artesanal** |

### Frase de fechamento

> O ACM atual é uma **excelente máquina de disciplina** para uma consultora de alta performance: força ITBI, força amostra, força faixa, força rastreio.  
> Ainda **não** é uma **excelente máquina de verdade de mercado**: o 15% escondido, o apto inexistente, o ITBI não saneado em PROD e a ausência de backtest limitam a confiabilidade.  
> O caminho de evolução de maior retorno é paradoxalmente **simples**: nomear o arbítrio, limpar a amostra, fatiar tiers, medir erro em fechamentos reais — e só então sofisticar estatística.

### Próximo incremento “se só puder fazer três coisas”

1. **S1+S5** — estado do alvo e deságio declarado no motor (fim do Capex oculto).  
2. **S2** — 9.4 + R5 na base (fim do laudo confiante e errado).  
3. **A1+A3** — Lite + resumo modo dono (fim do ACM que só existe em sessão de operador).

---

## 12. Referências internas

- `docs/acm/ANALISE-ENGENHARIA-ACM-20260709.md`  
- `docs/acm/ROADMAP-ACM.md` (§3.1 R5, §10 frentes C-1…C-6, NBR)  
- `docs/acm/AUDITORIA-EVOLUCAO-ACM-20260703.md`  
- `docs/acm/HANDOFF-20260709-andrade-pertence.md`  
- `docs/acm/honduras-629/RELATORIO-ALTERACOES-LAUDO-v4-v5-20260707.md`  
- `app/src/lib/acm/methodology.ts`  
- `docs/prd/EPIC-8-ACM-LAUDO-GENERATION.md` · `EPIC-9-ACM-PARIDADE-PREMIUM.md`  
- NBR 14653-2 · Manual Avaliação Imóveis União 2024 · IBAPE-SP (via roadmap §10.7–10.8)

---

## Changelog

| Data | Mudança |
|------|---------|
| 2026-07-09 | Criação — avaliação crítica profunda do método (não só da engenharia) |
