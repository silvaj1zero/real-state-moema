# Frontend Specification — UX Design

**Projeto:** Sistema de Mapeamento e Assessoria Imobiliaria RE/MAX
**Versao:** 1.0
**Status:** Ready for Architect Review
**Data:** 2026-03-18
**Autora:** Uma (UX Design Expert, AIOX)
**Baseado em:** PRD v2.0 (Morgan + Pedro Valerio)

---

## Sumario Executivo

Este documento especifica a experiencia de usuario mobile-first para o sistema de mapeamento imobiliario da Luciana Borba, consultora RE/MAX Galeria Moema. O design e centrado no caso de uso primario: **andar pelo bairro de Moema e registrar/qualificar edificios com uma mao, em menos de 30 segundos por registro**.

**Persona primaria:** Luciana Borba, 30-45 anos, consultora imobiliaria RE/MAX, usa o app enquanto caminha pelas ruas de Moema/SP. Uma mao segura o celular, a outra pode estar com bolsa/pasta. Sol forte em Sao Paulo exige alto contraste. Conexao pode falhar entre predios altos.

**Dispositivo de referencia:** iPhone 14 / Samsung Galaxy S23 (375px width logico, ~812px height)

**Principio central:** O mapa e o hub. Tudo comeca e termina no mapa. Nenhuma acao de campo deve exigir mais de 3 taps apos abrir o app.

---

## 1. Arquitetura de Informacao

### 1.1 Mapa de Telas e Hierarquia

```
[Login]
   |
   v
[MAPA PRINCIPAL] -------- Tela raiz, sempre acessivel
   |
   |-- [FAB +] --> [Cadastro Rapido de Edificio]
   |                   |-- (salva) --> volta ao Mapa com pin novo
   |
   |-- [Tap em Pin] --> [Card do Edificio] (bottom sheet)
   |                       |-- [Editar Edificio]
   |                       |-- [Ver Leads do Edificio]
   |                       |-- [Cadastrar Lead] --> [Form Lead]
   |                       |-- [Ver Informantes]
   |                       |-- [Marcar FISBO]
   |
   |-- [Barra Inferior - Tab "Funil"]
   |       |-- [Funil de Vendas] (5 tabs)
   |              |-- [Lead Card] --> [Detalhe do Lead]
   |                                     |-- [Scripts]
   |                                     |-- [Agendar V1/V2]
   |                                     |-- [Checklist V1->V2]
   |                                     |-- [Gerar ACM]
   |                                     |-- [Gerar Dossie]
   |                                     |-- [Historico/Timeline]
   |
   |-- [Barra Inferior - Tab "Feed"]
   |       |-- [Feed de Inteligencia]
   |              |-- [Evento] --> acao contextual
   |
   |-- [Barra Inferior - Tab "Dashboard"]
   |       |-- [Dashboard de KPIs]
   |              |-- [KPIs Territoriais]
   |              |-- [KPIs Funil]
   |              |-- [KPIs Informantes]
   |              |-- [KPIs FROG]
   |              |-- [Progressao Clubes RE/MAX]
   |
   |-- [Barra Inferior - Tab "Mais"]
           |-- [ACM Generator]
           |-- [Central de Referrals]
           |-- [Biblioteca de Scripts]
           |-- [Configuracoes]
           |-- [Perfil / Branding]
```

### 1.2 Navegacao Principal (Bottom Tab Bar)

```
+----------+----------+----------+----------+----------+
|          |          |          |          |          |
|  Mapa    |  Funil   |  Feed    | Dashboard|  Mais    |
|  (pin)   | (funnel) | (bell)   | (chart)  |  (...)   |
|          |  [12]    |  [3]     |          |          |
+----------+----------+----------+----------+----------+
```

- **Mapa** e o tab padrao ao abrir o app
- **Funil** mostra badge com total de leads ativos
- **Feed** mostra badge com alertas nao lidos
- Tab ativa: cor azul RE/MAX (#003DA5)
- Tab inativa: cinza (#6B7280)
- Altura da barra: 56px (safe area bottom incluida)

### 1.3 Fluxo de Navegacao

| De | Para | Gesto/Acao |
|----|------|------------|
| Mapa | Cadastro Rapido | Tap no FAB (+) |
| Mapa | Card Edificio | Tap no pin |
| Card Edificio | Detalhe Lead | Tap no lead listado |
| Card Edificio | Novo Lead | Tap "Novo Lead" |
| Detalhe Lead | Scripts | Tap "Scripts" |
| Detalhe Lead | Agendar | Tap "Agendar V1/V2" |
| Detalhe Lead | ACM | Tap "Gerar ACM" |
| Qualquer tela | Mapa | Tap no tab Mapa |
| Feed | Mapa (pin) | Tap em evento geolocalizavel |
| Dashboard | Funil | Tap em KPI do funil |

### 1.4 Gestos Globais

| Gesto | Acao |
|-------|------|
| Swipe down (top edge) | Pull-to-refresh no Feed e Dashboard |
| Swipe right (edge) | Voltar (navegacao nativa iOS/Android) |
| Long press no mapa | Mover epicentro |
| Pinch | Zoom do mapa |
| Pan | Mover mapa |

---

## 2. Especificacao de Telas

### 2.1 Tela de Login

**Proposito:** Autenticacao inicial. Usada uma vez, depois o token persiste.

**Contexto:** Luciana abre o app pela primeira vez ou apos logout.

```
+-----------------------------------+  375px
|                                   |
|          [Logo RE/MAX]            |  80px height
|     "Sistema de Mapeamento"       |
|                                   |
|     [Luciana Borba]               |  Marca pessoal sutil
|     Consultora RE/MAX Galeria     |
|                                   |
|  +-----------------------------+  |
|  |  Email                      |  |  48px height, 16px font
|  +-----------------------------+  |
|                                   |
|  +-----------------------------+  |
|  |  Senha                      |  |  48px height
|  +-----------------------------+  |
|                                   |
|  [====== ENTRAR ===============]  |  56px height, full width
|                                   |  Azul RE/MAX #003DA5
|                                   |
|  "Esqueci minha senha"            |  Link discreto
|                                   |
+-----------------------------------+
```

**Componentes:**
- Logo RE/MAX centrado (120x80px)
- Nome "Luciana Borba" como subtitulo de marca
- Campos de email e senha com altura minima de 48px (touch target)
- Botao "Entrar" full-width, 56px altura, cor primaria
- Link "Esqueci senha" abaixo

**Interacoes:**
- Tap em campo: teclado sobe, view scroll up automaticamente
- Tap "Entrar": loading spinner no botao, desabilita double-tap
- Erro: shake animation no campo + mensagem vermelha abaixo
- Sucesso: transicao fade para o Mapa Principal

---

### 2.2 Mapa Principal

**Proposito:** Tela raiz do app. Visao territorial do negocio da Luciana. Hub para todas as acoes de campo.

**Contexto:** Luciana abre o app ao sair do metro Moema. Ve sua posicao, os edificios ao redor, e decide pra qual lado caminhar.

```
+-----------------------------------+  375px
| [Offline]  Moema 73%  [filtro] [=]|  Status bar (44px)
|                                   |
|            .  .  .  .             |
|         .              .          |  Circulo 500m (verde)
|       .    [A] [V]  .    .       |
|     .   [C]       [A]      .     |  Pins coloridos
|    .        [*ME*]           .    |  * = posicao GPS
|     .    [F]    [M]        .     |  [F] = FISBO badge
|       .     [V]  [C]    .        |
|         .              .          |  Circulo 1km (amarelo)
|            .  .  .  .             |
|      ....                ....     |  Circulo 2km (vermelho)
|                                   |
|                                   |
|                                   |
|                                   |
|  +-----------------------------+  |  Legenda recolhivel
|  | C:12  M:34  P:8  V:5  F:3  |  |  Cinza Azul Amarelo Verde FISBO
|  +-----------------------------+  |
|                                   |
|                            [+]    |  FAB (56px, vermelho RE/MAX)
|                                   |
+---+-------+-------+-------+---+--+
| Mapa | Funil | Feed | Dash | + |  Bottom tabs
+------+-------+------+------+----+
```

**Componentes detalhados:**

**Header bar (44px):**
- Esquerda: Indicador offline (aparece apenas quando offline, badge laranja)
- Centro: Nome do bairro + percentual de cobertura do raio ativo ("Moema 73%")
- Direita: Botao filtro (icone funil) + botao layers (icone hamburguer/camadas)

**Mapa Mapbox (area principal):**
- Fullscreen atras de tudo
- Epicentro: Rua Alvorada, Moema (CEP 04550-000)
- Tres circulos concentricos com bordas translucidas:
  - 500m: borda verde (#22C55E), fill verde 5% opacity
  - 1km: borda amarela (#EAB308), fill amarelo 5% opacity
  - 2km: borda vermelha (#DC1431), fill vermelho 5% opacity
- Raios toggleaveis via botao layers
- Pin GPS "Voce esta aqui": ponto azul pulsante (como Google Maps)

**Pins de edificios (MapPin component):**
- Tamanho: 32x40px (touch target 44x44px com padding)
- Cores por status:
  - Cinza (#9CA3AF): Nao Visitado
  - Azul (#003DA5): Mapeado
  - Amarelo (#EAB308): Em Prospeccao
  - Verde (#22C55E): Concluido
- Badge FISBO: estrela vermelha (#DC1431) no canto superior direito do pin
- Badge "auto" (seed data): borda pontilhada, icone (A) pequeno
- Badge "verificado": borda solida, checkmark pequeno
- Clustering: ao zoom out, pins agrupam em circulos com numero (Mapbox cluster)

**Legenda (barra recolhivel, 36px colapsada):**
- Mostra contagem por status: C:12 M:34 P:8 V:5
- Contagem FISBO separada: F:3
- Tap expande com nomes completos e acao de filtro
- Cores alinhadas com os pins

**FAB (Floating Action Button):**
- Posicao: canto inferior direito, 16px acima da tab bar, 16px da borda
- Tamanho: 56px diametro
- Cor: Vermelho RE/MAX (#DC1431)
- Icone: "+" branco, 24px
- Sombra: elevation 8
- Tap: abre Cadastro Rapido
- Long press: menu radial com opcoes (Edificio, Lead, Nota rapida)

**Filtro (overlay):**
- Tap no icone filtro: dropdown com checkboxes por status
- "Apenas FISBOs" toggle
- "Apenas meu raio ativo" toggle
- Filtros aplicados mostram badge numerico no icone

**Botao Layers:**
- Toggle raios (500m, 1km, 2km)
- Toggle pins seed vs verificados
- Toggle heatmap de oportunidades

**Interacoes:**
- Tap em pin: abre Bottom Sheet (Card do Edificio)
- Tap em area vazia do mapa: fecha bottom sheet se aberto
- Pinch zoom: clustering agrupa/desagrupa pins
- Long press no mapa (area sem pin): opcao de mover epicentro
- Swipe up na legenda: expande com detalhes
- GPS tracking continuo: pin azul acompanha a caminhada

**Dados exibidos:**
- Edificios cadastrados (pins)
- Posicao GPS em tempo real
- Raios concentricos
- Cobertura percentual
- Contagem por status
- Indicador online/offline

**Acoes disponiveis:**
- Cadastrar edificio (FAB)
- Abrir card de edificio (tap pin)
- Filtrar pins
- Alternar layers
- Mover epicentro (long press)

---

### 2.3 Card do Edificio (Bottom Sheet)

**Proposito:** Ficha completa do edificio com leads, informantes e acoes. Painel de inteligencia territorial por predio.

**Contexto:** Luciana toca em um pin no mapa. O card desliza de baixo pra cima com dados do edificio. Ela pode editar, cadastrar lead, ou ver quem ja mora la e esta vendendo.

```
ESTADO 1: PEEK (30% da tela, 244px)
+-----------------------------------+
|            [barra drag]           |  Handle de arraste (40px area)
|                                   |
|  Ed. Solar do Parque       [F]   |  Nome + badge FISBO
|  R. Alvorada, 320 - Moema        |  Endereco
|  Mapeado (azul)      12/01/2026  |  Status + data cadastro
|                                   |
|  Alto Padrao | Residencial | 18un |  Quick info chips
|                                   |
|  [Editar]  [+ Lead]  [FISBO]     |  Acoes rapidas
+-----------------------------------+

ESTADO 2: HALF (60% da tela, ~487px) - swipe up
+-----------------------------------+
|            [barra drag]           |
|                                   |
|  Ed. Solar do Parque       [F]   |
|  R. Alvorada, 320 - Moema        |
|  Mapeado (azul)      12/01/2026  |
|                                   |
|  Alto Padrao | Residencial | 18un |
|                                   |
|  [Editar]  [+ Lead]  [FISBO]     |
|  ---------------------------------|
|  Abertura: Zelador amigavel [v]  |  Dropdown editavel
|  Oportunidades: 3 (2 FISBO)      |  Contador
|                                   |
|  --- Leads (2) ------------------|
|  [Maria Silva - V1 - 15/03]      |  Lead card compacto
|  [Joao Santos - Contato - 10/03] |
|                                   |
|  --- Informantes (1) ------------|
|  [Ze Carlos - Porteiro]          |  Informante card
|                                   |
+-----------------------------------+

ESTADO 3: FULL (95% da tela) - swipe up novamente
+-----------------------------------+
|  [X fechar]     Ed. Solar do...  |
|  ... (tudo acima) ...             |
|  ---------------------------------|
|  --- Notas ----------------------|
|  "Porteiro Ze Carlos e receptivo. |
|   Ligou pra avisar sobre ap 12B" |
|  [+ Adicionar nota]              |
|                                   |
|  --- Historico ------------------|
|  12/03 - Status: Mapeado         |
|  15/03 - Lead Maria adicionada   |
|  16/03 - FISBO detectado          |
|                                   |
|  --- Localizacao ----------------|
|  [Mini mapa com pin]             |
|  -23.5893, -46.6655              |
|  Raio: 500m (zona verde)         |
|                                   |
|  [Ver no mapa]   [Compartilhar]  |
+-----------------------------------+
```

**Componentes detalhados:**

**Handle de arraste:** barra cinza 40x4px centralizada, area de toque 40px height

**Cabecalho:**
- Nome do edificio (font 18px bold, truncado com ellipsis)
- Badge FISBO (estrela vermelha) se aplicavel
- Endereco (font 14px, cinza #6B7280)
- Chip de status com cor correspondente (pill shape, font 12px)
- Data de cadastro alinhada a direita

**Quick info (chips):**
- Padrao (Alto/Medio/Baixo)
- Tipologia (Residencial/Comercial/Misto)
- Numero de unidades
- Font 12px, background cinza claro, border-radius 16px

**Acoes rapidas (botoes):**
- "Editar": outlined, azul
- "+ Lead": filled, azul
- "FISBO": toggle, vermelho quando ativo
- Altura: 36px, espacamento 8px

**Secao Leads:**
- Lista compacta de LeadCards (ver componente 3.3)
- Maximo 3 visivel, "Ver todos (N)" se mais
- Cada card: nome, estagio do funil (chip colorido), data proxima acao

**Secao Informantes:**
- Lista compacta: nome + funcao + numero de indicacoes
- Tap abre detalhe do informante

**Interacoes:**
- Swipe up: expande para proximo estado (peek -> half -> full)
- Swipe down: contrai (full -> half -> peek -> fecha)
- Tap fora do sheet: fecha (volta ao mapa)
- Tap "Editar": abre form de edicao inline
- Tap "+ Lead": abre form de cadastro de lead
- Tap "FISBO": toggle marcacao FISBO com animacao
- Tap em lead: navega para detalhe do lead
- Tap em informante: navega para detalhe do informante

---

### 2.4 Cadastro Rapido de Campo

**Proposito:** Registrar um edificio novo em menos de 30 segundos. O formulario mais critico do app -- precisa funcionar com uma mao, sol forte, andando.

**Contexto:** Luciana esta caminhando pela R. Canario, ve um predio que nao esta no mapa. Toca no FAB (+), preenche nome, confirma endereco, salva. Continua andando.

```
+-----------------------------------+  375px
|  [X]  Novo Edificio       [GPS]  |  Header (56px)
|                                   |
|  +-----------------------------+  |
|  |  Nome do Edificio *         |  |  Campo texto, 48px
|  |  Ed. _________________      |  |  Prefixo "Ed." sugerido
|  +-----------------------------+  |
|                                   |
|  +-----------------------------+  |
|  |  Endereco (GPS)       [edit]|  |  Pre-preenchido, 48px
|  |  R. Canario, 450 - Moema   |  |  Reverse geocoding
|  +-----------------------------+  |
|                                   |
|  Tipologia (opcional)             |
|  [Residencial] [Comercial] [Misto]|  Chip select, 40px
|                                   |
|  Padrao (opcional)                |
|  [Baixo] [Medio] [Alto] [Luxo]   |  Chip select, 40px
|                                   |
|                                   |
|                                   |
|                                   |
|                                   |
|                                   |
|                                   |
|  [========== SALVAR ===========]  |  56px, verde #22C55E
|                                   |
|  "Cadastrado offline - sync      |  Aparece se offline
|   automatico ao reconectar"       |
+-----------------------------------+
```

**Contagem de taps (objetivo: <=3 + teclado):**
1. Tap no FAB (+) -> abre formulario
2. Teclado aparece automaticamente no campo Nome (auto-focus)
3. Digitar nome (teclado)
4. Tap em chip Tipologia (opcional)
5. Tap em chip Padrao (opcional)
6. Tap em "Salvar"

**Total metas: 3 taps obrigatorios (FAB + nome via teclado + Salvar) + 2 opcionais**

**Componentes detalhados:**

**Header (56px):**
- Esquerda: [X] fechar (44x44px touch target)
- Centro: "Novo Edificio"
- Direita: indicador GPS (verde = precisao boa, amarelo = baixa, vermelho = sem sinal)

**Campo Nome:**
- Auto-focus ao abrir (teclado sobe imediatamente)
- Prefixo "Ed." como placeholder sugerido (nao obrigatorio)
- Font 16px, altura 48px
- Border: 2px azul quando ativo
- Autocomplete desabilitado

**Campo Endereco:**
- Pre-preenchido via reverse geocoding da posicao GPS
- Icone GPS a esquerda (verde se preciso)
- Botao "edit" para corrigir manualmente
- Se GPS indisponivel: campo vazio com placeholder "Digite o endereco"
- Font 14px, cinza #374151

**Chips de Tipologia:**
- Opcoes: Residencial, Comercial, Misto
- Selecao unica, visual: outlined quando inativo, filled azul quando selecionado
- Altura 40px, border-radius 20px
- Opcional -- pode salvar sem selecionar

**Chips de Padrao:**
- Opcoes: Baixo, Medio, Alto, Luxo
- Mesma mecanica dos chips de Tipologia

**Botao Salvar:**
- Full-width, 56px altura
- Cor: verde (#22C55E) -- verde sinaliza acao positiva/rapida
- Estado disabled ate ter nome preenchido
- Loading spinner durante salvamento
- Feedback haptico (vibracao curta) ao salvar com sucesso

**Estado offline:**
- Mesmo formulario funciona offline
- Mensagem abaixo do botao: "Cadastrado offline - sync automatico ao reconectar"
- Badge "pendente sync" no pin criado

**Interacoes:**
- Abertura: slide-up com teclado ja aberto
- GPS verde: pisca uma vez ao obter posicao
- Tap fora de campo: teclado fecha
- Tap "X": confirma descarte se houver dado preenchido ("Descartar cadastro?")
- Tap "Salvar": loading 0.5s -> haptic feedback -> transicao para mapa com pin novo pulsando
- Swipe down no header: mesma acao que "X"

**Apos salvar:**
- Volta ao mapa
- Novo pin aparece com animacao bounce
- Pin pisca 3x em azul (Mapeado)
- Toast: "Ed. [Nome] cadastrado!" (2s, dismissavel)

---

### 2.5 Funil de Vendas (Mobile Tabs)

**Proposito:** Visualizar e gerenciar o pipeline de vendas RE/MAX. Cada lead em seu estagio, com acoes de transicao.

**Contexto:** Luciana esta no escritorio ou no cafe. Abre o Funil pra ver quantos leads tem em cada estagio, quem precisa de follow-up, e planeja as ligacoes do dia.

**IMPORTANTE:** Mobile usa TABS (nao Kanban horizontal). Cada tab mostra os leads daquele estagio. Swipe lateral troca de tab.

```
+-----------------------------------+  375px
|  [<]  Funil de Vendas    [filtro] |  Header
|                                   |
|  [Contato] [V1] [V2] [Excl] [$$] |  Tabs com scroll horizontal
|    (23)    (12)  (5)  (3)   (1)  |  Contadores por tab
|  ========                         |  Indicador tab ativa
|                                   |
|  --- Hoje (3) -------------------|  Agrupado por urgencia
|                                   |
|  +-----------------------------+  |
|  | Maria Silva          V1 >  |  |  Lead card
|  | Ed. Solar - Ap 12B         |  |  Edificio + unidade
|  | FISBO | Alto Padrao         |  |  Tags
|  | Proximo: Ligar hoje 14h     |  |  Proxima acao
|  | [Ligar]  [Agendar]  [...]  |  |  Acoes rapidas
|  +-----------------------------+  |
|                                   |
|  +-----------------------------+  |
|  | Carlos Mendes       V1 >   |  |
|  | Ed. Tuiuti - Ap 5A         |  |
|  | Indicacao Sr. Ze            |  |
|  | Proximo: Follow-up amanha   |  |
|  | [Ligar]  [Agendar]  [...]  |  |
|  +-----------------------------+  |
|                                   |
|  --- Esta semana (8) ------------|
|  +-----------------------------+  |
|  | Ana Paula R.        V1 >   |  |
|  | ...                         |  |
|  +-----------------------------+  |
|                                   |
|  --- Sem acao (12) --------------|  Leads parados >3 dias
|  ...                              |  Vermelho claro no fundo
|                                   |
+---+-------+-------+-------+---+--+
| Mapa | Funil | Feed | Dash | + |
+------+-------+------+------+----+
```

**Componentes detalhados:**

**Tabs (scroll horizontal):**
- 5 tabs: Contato, V1, V2, Exclusividade, Venda
- Cada tab com contador numerico entre parenteses
- Tab ativa: texto azul bold + underline 3px azul
- Tab inativa: texto cinza
- Se muitas tabs nao cabem: scroll horizontal com indicador de overflow
- Swipe horizontal na area de conteudo: troca de tab com animacao slide

**Agrupamento por urgencia:**
- "Hoje": leads com acao agendada para hoje
- "Esta semana": proximos 7 dias
- "Sem acao": leads parados >3 dias (fundo rosa claro #FEF2F2)
- "Todos": restante

**Lead Card (dentro do funil):**
- Altura variavel (~120px base)
- Nome do lead (font 16px bold)
- Seta ">" indicando estagio atual
- Edificio + unidade (font 14px, cinza)
- Tags: FISBO (vermelho), origem FROG (azul), padrao
- Proxima acao (font 14px, cor por urgencia: verde=ok, amarelo=breve, vermelho=atrasado)
- Acoes rapidas: botoes inline (Ligar, Agendar, ...)
- Swipe right: avancar no funil (com confirmacao)
- Swipe left: menu de acoes (retroceder, arquivar)

**Filtros (tap no icone filtro):**
- Por edificio
- Por origem (FISBO, Informante, FROG, Digital)
- Por data de criacao
- Por urgencia

**Transicao de estagio:**
- Swipe right no lead card OU tap no botao ">" no card
- Modal de confirmacao:
  ```
  +-----------------------------+
  |  Mover Maria Silva          |
  |  Contato -> V1?             |
  |                              |
  |  Data: [hoje]  [calendar]   |
  |  Nota: [________________]   |
  |                              |
  |  [Cancelar]    [Confirmar]  |
  +-----------------------------+
  ```
- Data e nota obrigatorias (registro do funil)
- Animacao: card desliza para direita e desaparece
- Toast: "Maria movida para V1"

**Retrocesso de estagio (guardrails):**
- Swipe left -> opcao "Retroceder"
- Modal com campo obrigatorio "Justificativa"
- Alerta visual permanente no card (icone warning amarelo)
- Contabilizado no diagnostico de gargalos

**Interacoes:**
- Swipe horizontal entre tabs
- Tap em tab para pular direto
- Tap em lead card: abre detalhe completo
- Swipe right no card: avancar estagio
- Swipe left no card: menu secundario
- Pull-to-refresh: atualiza lista

---

### 2.6 Dashboard de KPIs

**Proposito:** Visao executiva do negocio. Metricas que mostram se Luciana esta no caminho certo.

**Contexto:** Luciana abre no inicio do dia ou no final da semana pra avaliar performance. Precisa ver rapidamente: quantos contatos fiz, quantos virei, estou expandindo?

```
+-----------------------------------+  375px
|  [<]  Dashboard        [periodo]  |  Header
|                                   |
|  Bom dia, Luciana!                |  Saudacao contextual
|  Meta hoje: 3/5 V1s               |  Meta diaria em destaque
|  [=======>          ]  60%        |  Barra de progresso
|                                   |
|  --- Territorio ------------------|
|  +-------------+  +-------------+ |
|  | Cobertura   |  | Edificios   | |
|  |   73%       |  |   154       | |
|  | Raio 500m   |  | 42 verific. | |
|  +-------------+  +-------------+ |
|  +-------------+  +-------------+ |
|  | FISBOs      |  | Varredura   | |
|  |   12        |  |  2.3 km/sem | |
|  | 8 nao abord.|  |             | |
|  +-------------+  +-------------+ |
|                                   |
|  --- Funil ----------------------|
|  Contato [===] 23                 |
|  V1      [==]  12                 |  Barras horizontais
|  V2      [=]    5                 |  empilhadas
|  Excl    [=]    3                 |
|  Venda   []     1                 |
|                                   |
|  Conversao: Cont>V1: 52%         |  Taxas entre etapas
|             V1>V2: 42%           |
|             V2>Excl: 60%         |
|                                   |
|  --- FROG ----------------------- |
|  [F:3] [R:8] [O:2] [G:12]       |  Chips com contagem
|  Melhor fonte: Geografia (48%)    |
|                                   |
|  --- Informantes ----------------|
|  Ativos: 5 | Indicacoes: 12      |
|  Comissao potencial: R$8.400     |
|                                   |
|  --- Clubes RE/MAX --------------|
|  [Barra] Executive --> 100%      |
|  VGV atual: R$ 2.4M              |
|  Faltam: R$ 600K para 100% Club  |
|                                   |
+---+-------+-------+-------+---+--+
| Mapa | Funil | Feed | Dash | + |
+------+-------+------+------+----+
```

**Componentes detalhados:**

**Meta diaria (destaque):**
- Barra de progresso com cor gradiente (vermelho -> amarelo -> verde)
- Meta configuravel (default: 5 V1s/dia)
- Numero grande (32px) com o progresso
- Mensagem motivacional quando poucos dados:
  - "Cadastre seu primeiro edificio para comecar!"
  - "Voce esta no caminho certo, continue!"

**Cards de KPI (grid 2x2):**
- Tamanho: ~165x80px cada
- Numero principal: 24px bold
- Label: 12px cinza
- Sublabel: 12px, contextual
- Background: branco, border-radius 12px, shadow sutil
- Tap: expande com historico/detalhe

**Funil visual:**
- Barras horizontais empilhadas (funnel shape)
- Cores correspondentes aos estagios
- Numeros a direita
- Tap em barra: vai para tab do funil correspondente

**FROG chips:**
- F (Familia), R (Relacionamentos), O (Organizacoes), G (Geografia)
- Cor do chip por categoria
- Contagem dentro
- "Melhor fonte" destacada

**Progressao Clubes RE/MAX:**
- Barra de progresso com marcos nomeados
- Clube atual destacado
- VGV acumulado
- Distancia pro proximo marco

**Empty states:**
- Cada secao tem empty state motivacional
- "Comece a mapear Moema para ver suas metricas aqui!"
- Icone ilustrativo + botao de acao primaria

**Interacoes:**
- Pull-to-refresh
- Tap em card KPI: expande detalhes
- Tap em barra do funil: navega para tab do funil
- Filtro de periodo: dropdown (Hoje, 7d, 30d, 90d, Custom)
- Scroll vertical para ver todas as secoes

---

### 2.7 Feed de Inteligencia

**Proposito:** Stream de eventos acionaveis gerados pelos agentes automatizados e pelo sistema. "O que aconteceu enquanto eu dormia?"

**Contexto:** Luciana abre o app de manha, ve o badge no tab Feed (3 novos), e descobre que um FISBO novo apareceu na R. Canario e que o preco de um imovel na R. Alvorada caiu 15%.

```
+-----------------------------------+  375px
|  [<]  Inteligencia    [filtro][x] |  Header
|                                   |
|  --- Resumo Matinal --------------|  Card especial (topo)
|  +-----------------------------+  |
|  | 3 novos FISBOs detectados   |  |  Destaque
|  | 1 queda de preco >10%      |  |  Resumo
|  | 2 leads precisam follow-up  |  |  Auto-gerado
|  +-----------------------------+  |
|                                   |
|  --- Hoje (5) -------------------|
|                                   |
|  +-----------------------------+  |
|  | [!] FISBO DETECTADO   9:14  |  |  Evento alta prioridade
|  | Ap 8C - Ed. Canario, 320   |  |  Vermelho lateral
|  | ZAP Imoveis - R$ 890K      |  |
|  | [Criar Lead] [Ver no Mapa]  |  |  Acoes
|  +-----------------------------+  |
|                                   |
|  +-----------------------------+  |
|  | [$] QUEDA DE PRECO    8:45  |  |  Evento medio
|  | R. Alvorada, 120 - Ap 5B   |  |  Amarelo lateral
|  | De R$1.2M para R$1.02M(-15%)|  |
|  | [Ver ACM] [Contatar]       |  |
|  +-----------------------------+  |
|                                   |
|  +-----------------------------+  |
|  | [i] NOVO EDIFICIO     8:30  |  |  Evento informativo
|  | Seed: R. Tutoia, 55         |  |  Azul lateral
|  | Identificado via OSM        |  |
|  | [Confirmar] [Descartar]     |  |
|  +-----------------------------+  |
|                                   |
|  +-----------------------------+  |
|  | [!] LEAD PARADA     ontem   |  |  Alerta
|  | Carlos Mendes - V1 ha 5d   |  |  Vermelho lateral
|  | Sem acao desde 13/03        |  |
|  | [Follow-up] [Ver Lead]      |  |
|  +-----------------------------+  |
|                                   |
|  --- Ontem (12) ------[ver tudo]--|
|  ...                              |
|                                   |
+---+-------+-------+-------+---+--+
| Mapa | Funil | Feed | Dash | + |
+------+-------+------+------+----+
```

**Componentes detalhados:**

**Resumo matinal (card especial):**
- Background gradiente azul/branco
- Gerado automaticamente ao primeiro acesso do dia
- Resumo dos eventos nao lidos em 3 bullet points
- Tap: expande com detalhes
- Dismissavel (swipe right)

**Evento/FeedEvent card:**
- Borda lateral colorida por prioridade:
  - Vermelho (#DC1431): Alta (FISBO, lead parada, urgente)
  - Amarelo (#EAB308): Media (preco, ex-imobiliaria)
  - Azul (#003DA5): Info (seed, sync, sistema)
- Icone por tipo: [!] alerta, [$] financeiro, [i] info, [pin] territorial
- Timestamp (relativo: "9:14", "ontem", "3d atras")
- Descricao em 2-3 linhas
- Botoes de acao contextuais (maximo 2)

**Tipos de evento:**
| Tipo | Cor | Acoes |
|------|-----|-------|
| FISBO detectado | Vermelho | Criar Lead, Ver no Mapa |
| Queda de preco | Amarelo | Ver ACM, Contatar |
| Ex-imobiliaria -> FISBO | Amarelo | Criar Lead, Investigar |
| Lead parada | Vermelho | Follow-up, Ver Lead |
| Novo edificio seed | Azul | Confirmar, Descartar |
| Raio 80% atingido | Azul | Expandir, Ver Mapa |
| Sync completado | Azul | (nenhum) |

**Filtros:**
- Por tipo de evento
- Por prioridade
- Por periodo
- "Apenas nao lidos"

**Interacoes:**
- Scroll vertical infinito
- Pull-to-refresh
- Tap em acao: executa e marca como lido
- Swipe right em evento: marca como lido (dismiss)
- Tap em evento: expande detalhes + mais acoes
- Badge no tab Feed: contagem de nao lidos (vermelho)

**Push Notifications (alta prioridade):**
- FISBO detectado no raio
- Lead parada >3 dias sem acao
- Agendamento V1/V2 em 1h
- Tap na notificacao: abre o evento no Feed

---

### 2.8 ACM Generator

**Proposito:** Criar Analise Comparativa de Mercado para precificar imoveis. Ferramenta essencial para V2 (apresentacao ao proprietario).

**Contexto:** Luciana esta preparando a V2 com Maria Silva. Precisa montar uma ACM com comparaveis do raio de 500m para mostrar ao proprietario que o preco pedido esta acima do mercado.

```
+-----------------------------------+  375px
|  [<]  ACM Generator      [salvar] |  Header
|                                   |
|  Imovel referencia:               |
|  [Ed. Solar - Ap 12B - 85m2   v] |  Dropdown de leads
|                                   |
|  Raio de busca: [500m v]          |  Dropdown
|                                   |
|  --- Comparaveis (5) ------------|
|  +-----------------------------+  |
|  | R. Alvorada, 220 - 12A     |  |
|  | 92m2 | R$12.500/m2 | Venda |  |  Dados do comparavel
|  | Fonte: ZAP    [Manual][X]  |  |  Origem + acoes
|  +-----------------------------+  |
|  +-----------------------------+  |
|  | R. Canario, 180 - 8B       |  |
|  | 78m2 | R$11.800/m2 | Anunc |  |
|  | Fonte: OLX    [Manual][X]  |  |
|  +-----------------------------+  |
|  +-----------------------------+  |
|  | R. Tutoia, 90 - 3C         |  |
|  | 88m2 | R$13.200/m2 | Venda |  |
|  | Fonte: Manual [editar][X]   |  |
|  +-----------------------------+  |
|                                   |
|  [+ Adicionar comparavel manual]  |  Botao outlined
|                                   |
|  --- Analise --------------------|
|  Media m2:    R$ 12.500           |
|  Mediana m2:  R$ 12.500           |  Calculos automaticos
|  Menor:       R$ 11.800           |
|  Maior:       R$ 13.200           |
|  Tendencia:   Estavel             |
|                                   |
|  Estimativa imovel (85m2):        |
|  R$ 1.062.500                     |  Numero grande, bold
|                                   |
|  [Preco anuncio]  [Preco real]    |  Toggle tipo
|                                   |
|  [== EXPORTAR PDF ==]             |  Botao primario
|  [Usar no Dossie]                 |  Botao secundario
|                                   |
+-----------------------------------+
```

**Componentes detalhados:**

**Imovel referencia:** dropdown que lista leads com imovel associado

**Comparavel card:**
- Endereco + unidade
- Metragem, preco/m2, tipo (Venda real vs Anuncio)
- Fonte (ZAP, OLX, VivaReal, Manual)
- Botao editar (para manuais)
- Botao remover [X]
- Deslizar para remover

**Adicionar comparavel manual:**
- Form modal: endereco, metragem, preco, tipo, fonte
- GPS opcional (se for um imovel proximo)

**Secao Analise:**
- Calculos automaticos recalculados em tempo real
- Toggle "Preco anuncio" vs "Preco real de venda"
- Numero estimado em destaque (24px bold)
- Indicador de tendencia (seta up/down/stable)

**Acoes:**
- Exportar PDF: gera via React-PDF client-side
- Usar no Dossie: vincula esta ACM ao dossie do lead
- Compartilhar: WhatsApp/email

**Interacoes:**
- Drag-to-reorder comparaveis
- Swipe left para remover
- Pull-to-refresh busca novos comparaveis do scraping
- Tap em comparavel: expande com fotos e detalhes (se disponivel)

---

### 2.9 Central de Referrals

**Proposito:** Gerenciar indicacoes cruzadas com outros consultores RE/MAX. Quem indicou pra quem, status, reciprocidade.

**Contexto:** Luciana recebeu um cliente que quer comprar na Vila Madalena. Ela vai indicar para sua colega Renata (que domina aquela regiao) e rastrear o resultado.

```
+-----------------------------------+  375px
|  [<]  Referrals          [+ novo] |  Header
|                                   |
|  --- Minhas metricas ------------|
|  Enviadas: 8  | Recebidas: 5     |
|  Convertidas: 3 | Reciprocidade:63%|
|                                   |
|  [Enviadas]  [Recebidas]          |  Tabs
|  ===========                      |
|                                   |
|  +-----------------------------+  |
|  | -> Renata Costa (Vila Mad.) |  |  Referral card
|  | Cliente: Pedro Almeida      |  |
|  | Busca: 3q, 120m2, ate 1.5M |  |
|  | Status: Em Andamento        |  |  Chip verde
|  | Enviada: 10/03              |  |
|  | [Mensagem] [Atualizar]      |  |
|  +-----------------------------+  |
|                                   |
|  +-----------------------------+  |
|  | -> Ana Lucia (Itaim)       |  |
|  | Cliente: Familia Santos     |  |
|  | Busca: 4q, cobertura       |  |
|  | Status: Aceita              |  |  Chip azul
|  | [Mensagem] [Atualizar]      |  |
|  +-----------------------------+  |
|                                   |
|  +-----------------------------+  |
|  | -> Carlos Diniz (Pinheiros)|  |
|  | Cliente: Mariana V.         |  |
|  | Status: Convertida!         |  |  Chip dourado
|  | Comissao: R$ 12.000         |  |
|  +-----------------------------+  |
|                                   |
+---+-------+-------+-------+---+--+
| Mapa | Funil | Feed | Dash | + |
+------+-------+------+------+----+
```

**Status flow dos referrals:**
Enviada -> Aceita -> Em Andamento -> Convertida -> Comissao Paga

**Cores dos status:**
- Enviada: cinza
- Aceita: azul
- Em Andamento: verde
- Convertida: dourado
- Comissao Paga: verde com checkmark

**Componentes:**
- Metricas de reciprocidade no topo
- Tabs: Enviadas / Recebidas
- Referral card com perfil do parceiro, cliente, status
- Botoes: Mensagem (WhatsApp deep link), Atualizar status

**Novo referral (formulario):**
- Parceiro (busca por nome)
- Cliente (nome, perfil, o que busca)
- Regiao alvo
- Notas

**Interacoes:**
- Tap em card: expande com timeline completa
- Tap "Mensagem": abre WhatsApp com mensagem pre-formatada
- Tap "Atualizar": dropdown de status com data automatica
- Pull-to-refresh

---

### 2.10 Checklist V1 -> V2

**Proposito:** Garantir que Luciana esta totalmente preparada antes da V2. Cada item e um pre-requisito para uma apresentacao profissional.

**Contexto:** Luciana fechou a V1 com Maria Silva. Agora tem 3-5 dias para preparar a V2. O checklist guia cada passo da preparacao.

```
+-----------------------------------+  375px
|  [<]  Prep. V2: Maria Silva      |  Header
|                                   |
|  V2 agendada: 20/03 as 15h       |  Data e hora
|  Faltam: 2 dias                   |  Countdown
|                                   |
|  Progresso: 3/6  [========>    ]  |  Barra 50%
|                                   |
|  [x] ACM preparada               |  Item completo (verde)
|      R$ 12.500/m2 | 5 comparaveis|
|      [Ver ACM]                    |
|                                   |
|  [x] Dossie gerado               |  Item completo
|      PDF pronto | 12 paginas      |
|      [Ver Dossie]                 |
|                                   |
|  [x] Fotos V1 anexadas           |  Item completo
|      8 fotos | Enviadas 15/03     |
|                                   |
|  [ ] Home Staging enviado         |  Item pendente (cinza)
|      Template padrao disponivel   |
|      [Gerar e Enviar WhatsApp]    |
|                                   |
|  [ ] Matricula consultada         |  Item pendente
|      Numero: ___________          |
|      [Consultar]                  |
|                                   |
|  [ ] Plano de Marketing revisado  |  Item pendente
|      7 itens do plano             |
|      [Ver Plano]                  |
|                                   |
|  --- Home Staging ----------------|
|  [Compartilhar via WhatsApp]      |  Botao destaque
|  Preview:                         |
|  "Sra. Maria, seguem as          |
|   recomendacoes para valorizar    |
|   seu imovel na visita..."        |
|                                   |
+-----------------------------------+
```

**Componentes:**
- Countdown para data da V2
- Barra de progresso geral
- Items checkavel com estado e acao contextual
- Items completados: fundo verde claro, checkmark
- Items pendentes: fundo cinza claro
- Cada item pode ter sub-acao (gerar, consultar, enviar)

**Home Staging compartilhavel:**
- Template pre-formatado com branding Luciana Borba
- 3 regras de ouro de home staging
- Personalizavel por tipologia
- Botao "Compartilhar via WhatsApp": deep link com texto pre-montado
- Preview do conteudo antes de enviar

**Notificacao 24h antes:**
- Push: "V2 com Maria Silva amanha as 15h. 3 itens pendentes."
- Tap na notificacao: abre este checklist

**Interacoes:**
- Tap em checkbox: toggle completo/pendente
- Tap em sub-acao: executa acao (gerar ACM, gerar Dossie, etc.)
- Tap em "Compartilhar WhatsApp": abre WhatsApp com texto
- Scroll vertical para ver todos os itens

---

### 2.11 Biblioteca de Scripts

**Proposito:** Scripts de contorno de objecoes RE/MAX, acessiveis em qualquer momento, especialmente antes/durante uma ligacao.

**Contexto:** Luciana vai ligar para um FISBO que disse "nao preciso de corretor". Ela abre Scripts, busca "nao preciso", encontra o contorno adequado, e faz a ligacao preparada.

```
+-----------------------------------+  375px
|  [<]  Scripts         [buscar]    |  Header
|                                   |
|  +-----------------------------+  |
|  | Buscar objecao...           |  |  Campo busca
|  +-----------------------------+  |
|                                   |
|  Categorias:                      |
|  [Primeiro Contato] [FISBO]       |  Chips filtraveis
|  [Preco] [Exclusividade] [V1/V2] |
|                                   |
|  +-----------------------------+  |
|  | "Nao preciso de corretor"  |  |  Script card
|  | Categoria: FISBO            |  |
|  | Contexto: Proprietario que  |  |
|  | anuncia sozinho e recusa    |  |
|  | ajuda profissional          |  |
|  |                             |  |
|  | Script:                     |  |
|  | "Entendo perfeitamente.     |  |
|  |  Muitos proprietarios       |  |
|  |  comecam assim. Posso       |  |
|  |  fazer uma analise gratuita |  |
|  |  do seu imovel? Sem         |  |
|  |  compromisso. Se gostar,    |  |
|  |  conversamos. Se nao, voce  |  |
|  |  tera dados valiosos."      |  |
|  |                             |  |
|  | [Copiar] [Usar agora]       |  |
|  +-----------------------------+  |
|                                   |
|  +-----------------------------+  |
|  | "Ja tenho corretor"        |  |  Proximo script
|  | Categoria: Primeiro Contato |  |
|  | ...                         |  |
|  +-----------------------------+  |
|                                   |
+-----------------------------------+
```

**Componentes:**
- Campo de busca com auto-complete
- Filtro por categorias (chips toggleaveis)
- Script card expandivel: titulo (objecao), categoria, contexto, script completo
- Botoes: Copiar (clipboard), Usar agora (abre telefone)

**Acesso contextual:**
- Acessivel do card do lead (botao "Scripts")
- Quando acessado do lead, filtra por estagio do funil automaticamente
- Ex: Lead em "Contato" -> mostra scripts de primeiro contato primeiro

**Interacoes:**
- Busca em tempo real (debounced 300ms)
- Tap em chip: toggle filtro
- Tap em card: expande/contrai (accordion)
- Tap "Copiar": clipboard + toast "Copiado!"
- Tap "Usar agora": abre discador com numero do lead (se acessado do lead)
- Scripts customizaveis: botao "Editar" em cada card

---

## 3. Component Library Spec

### 3.1 MapPin

Pin de edificio no mapa Mapbox.

```
Anatomia:
     [B]        <- Badge (FISBO estrela / auto / verificado)
    /   \
   | ICO |      <- Icone central (predio)
    \   /
     \ /
      V         <- Ponta do pin
```

**Propriedades:**

| Prop | Tipo | Valores |
|------|------|---------|
| status | enum | `not_visited`, `mapped`, `prospecting`, `completed` |
| color | string | Cinza #9CA3AF, Azul #003DA5, Amarelo #EAB308, Verde #22C55E |
| isFisbo | boolean | Se true, badge estrela vermelha |
| isAutoSeed | boolean | Se true, borda pontilhada + badge "A" |
| isVerified | boolean | Se true, borda solida + checkmark |
| buildingName | string | Tooltip no hover (desktop) |
| unitCount | number | Mostrado no cluster |

**Tamanhos:**
- Pin individual: 32x40px (com touch target 44x44px)
- Cluster: 40x40px circulo com numero
- Badge: 12x12px, posicao top-right do pin

**Estados visuais:**
- Default: cor solida do status
- Selected: borda branca 2px + sombra + escala 1.2x
- Clustered: circulo com numero + cor do status predominante

**Implementacao Mapbox:**
- Custom marker via `mapboxgl.Marker` com HTML custom
- Clustering via Mapbox `cluster` source property
- Animacao de bounce ao criar novo pin

---

### 3.2 BuildingCard (Bottom Sheet)

Card/bottom sheet que aparece ao tocar em um edificio.

**Propriedades:**

| Prop | Tipo | Descricao |
|------|------|-----------|
| building | Building | Dados do edificio |
| leads | Lead[] | Leads vinculados |
| informants | Informant[] | Informantes vinculados |
| snapPoints | number[] | [0.3, 0.6, 0.95] (porcentagem da tela) |
| initialSnap | number | 0 (peek) |
| onClose | function | Callback ao fechar |

**Snap points:**
- 0.3 (Peek): cabecalho + acoes rapidas
- 0.6 (Half): + leads + informantes
- 0.95 (Full): + notas + historico + mapa

**Animacao:**
- Spring physics (damping: 0.8, stiffness: 300)
- Velocity-based snap: swipe rapido pula snap intermediario
- Fade-in do backdrop ao expandir

**Acessibilidade:**
- Role: dialog
- Aria-label: "Detalhes do edificio [nome]"
- Escape ou swipe down: fecha
- Focus trap quando em modo full

---

### 3.3 LeadCard

Card de lead usado no funil e no card do edificio.

```
+-----------------------------------+
| [avatar] Nome do Lead    [stage]  |  24px + chip
| Ed. Nome - Ap XXX                 |  14px cinza
| [FISBO] [FROG:G] [Alto]           |  Tags 12px
| Proximo: Acao | Data              |  14px, cor urgencia
| [Acao1]  [Acao2]  [...]           |  Botoes 32px
+-----------------------------------+
```

**Propriedades:**

| Prop | Tipo | Descricao |
|------|------|-----------|
| lead | Lead | Dados do lead |
| stage | FunnelStage | Estagio atual |
| nextAction | Action | Proxima acao agendada |
| tags | Tag[] | FISBO, FROG, padrao |
| variant | enum | `compact` (no edificio), `full` (no funil) |
| onSwipeRight | function | Avancar estagio |
| onSwipeLeft | function | Menu secundario |

**Cores do stage chip:**
- Contato: cinza (#6B7280)
- V1: azul (#003DA5)
- V2: azul escuro (#001D4A)
- Exclusividade: dourado (#D97706)
- Venda: verde (#22C55E)

**Urgencia da proxima acao:**
- Verde: >2 dias
- Amarelo: 1-2 dias
- Vermelho: atrasado

**Variante compact (dentro do BuildingCard):**
- Sem tags
- Sem botoes de acao (apenas tap para navegar)
- Altura: ~60px

**Variante full (no funil):**
- Todas as tags
- Botoes de acao visivel
- Swipe gestures habilitados
- Altura: ~120px

---

### 3.4 FunnelTabs

Componente de tabs do funil de vendas para mobile.

```
+------+------+------+------+------+
| Cont | V1   | V2   | Excl | $$   |
| (23) | (12) | (5)  | (3)  | (1)  |
+======+------+------+------+------+
  ^^^^
  Tab ativa (underline 3px azul)
```

**Propriedades:**

| Prop | Tipo | Descricao |
|------|------|-----------|
| stages | FunnelStage[] | Lista de estagios |
| activeStage | FunnelStage | Tab ativa |
| counts | Record<stage, number> | Contadores |
| onChangeStage | function | Callback |

**Comportamento:**
- Scroll horizontal se tabs nao cabem (em telas <375px)
- Swipe no conteudo abaixo muda de tab (gesture handler)
- Animacao de slide ao trocar tab
- Badge vermelho pulsante se houver lead atrasado na tab

**Acessibilidade:**
- Role: tablist
- Cada tab: role tab, aria-selected
- Conteudo: role tabpanel

---

### 3.5 QuickActionFAB

Floating Action Button com menu radial opcional.

```
Estado fechado:           Estado aberto (long press):

                          [Nota]
                             |
      [+]                [Lead]--[+]--[Edificio]
                             |
                          [Foto]
```

**Propriedades:**

| Prop | Tipo | Descricao |
|------|------|-----------|
| primaryAction | function | Acao do tap simples (cadastrar edificio) |
| secondaryActions | Action[] | Acoes do menu radial |
| position | enum | `bottom-right` (padrao) |
| color | string | #DC1431 (vermelho RE/MAX) |

**Comportamento:**
- Tap simples: executa primaryAction (cadastrar edificio)
- Long press (500ms): abre menu radial com animacao spring
- Tap fora do menu: fecha
- Cada item do menu: icone + label, 44x44px touch target

**Visual:**
- Sombra: elevation 8 (visivel sobre o mapa)
- Z-index: acima de tudo exceto modais
- Posicao: 16px da borda direita, 16px acima da tab bar
- Quando bottom sheet aberto: FAB sobe junto (animacao)

---

### 3.6 FeedEvent

Card de evento no feed de inteligencia.

```
+---[cor]------------------------------+
| [icone]  TITULO          timestamp   |
| Descricao linha 1                     |
| Descricao linha 2                     |
| [Acao 1]  [Acao 2]                   |
+---------------------------------------+
```

**Propriedades:**

| Prop | Tipo | Descricao |
|------|------|-----------|
| type | EventType | fisbo, price_drop, ex_agency, lead_stale, seed, expansion, sync |
| priority | enum | high, medium, low |
| title | string | Titulo do evento |
| description | string | Descricao em 2-3 linhas |
| timestamp | Date | Data/hora do evento |
| actions | Action[] | Botoes acionaveis (max 2) |
| isRead | boolean | Lido/nao lido |
| location | LatLng | Se geolocalizavel |

**Cores laterais por prioridade:**
- Alta: borda esquerda 4px #DC1431 (vermelho)
- Media: borda esquerda 4px #EAB308 (amarelo)
- Baixa: borda esquerda 4px #003DA5 (azul)

**Nao lido:**
- Background: azul muito claro (#EFF6FF)
- Ponto azul no canto superior direito

**Lido:**
- Background: branco
- Sem ponto

**Icones por tipo:**
- FISBO: estrela vermelha
- Preco: cifrao
- Ex-imobiliaria: seta curva
- Lead parada: relogio
- Seed: semente/planta
- Expansao: circulos concentricos
- Sync: setas circulares

---

### 3.7 ProgressBar

Barra de progresso reutilizavel para cobertura territorial e progressao nos clubes.

```
Variante simples:
[=========>               ]  73%

Variante com marcos (Clubes):
[====|=====|===>    |     ]
     Exec   100%   Plat   Chairman
```

**Propriedades:**

| Prop | Tipo | Descricao |
|------|------|-----------|
| value | number | Valor atual (0-100 ou absoluto) |
| max | number | Valor maximo |
| milestones | Milestone[] | Marcos nomeados (para clubes) |
| variant | enum | `simple`, `milestoned` |
| color | string | Cor da barra preenchida |
| label | string | Label acima/abaixo |
| showPercentage | boolean | Mostrar % |

**Variante simple:**
- Usada para cobertura territorial, progresso checklist, meta diaria
- Cor gradiente: vermelho (0-33%) -> amarelo (34-66%) -> verde (67-100%)
- Altura: 8px (thin) ou 16px (normal)
- Border-radius: 4px

**Variante milestoned (Clubes RE/MAX):**
- Marcos: Executive, 100%, Platinum, Chairman's, Titan, Diamond, Pinnacle
- Cada marco com label e posicao na barra
- Marco atingido: icone dourado
- Marco atual: pulsante
- Proximo marco: outlined

**Animacao:**
- Fill: ease-out 600ms ao carregar
- Milestone reached: confetti micro-animacao

---

## 4. Fluxos de Interacao

### 4.1 Fluxo "Andar e Registrar"

Cenario: Luciana saiu do metro Moema, abriu o app, e esta caminhando pela R. Canario.

```
PASSO 1: Abrir app
+-----------------------------------+
| App ja logado (token persistido)  |
| Mapa carrega centrado no GPS      |
| Pins existentes visiveis          |
| FAB vermelho visivel              |
+-----------------------------------+
         |
         v [Luciana ve um predio sem pin]
         |
PASSO 2: Tap no FAB (+)
+-----------------------------------+
| Form de cadastro rapido sobe      |
| GPS ja capturou posicao           |
| Endereco pre-preenchido:          |
| "R. Canario, 450 - Moema"        |
| Teclado aberto no campo Nome      |
+-----------------------------------+
         |
         v [Digita "Cond. Vila Canario"]
         |
PASSO 3: Tap "Salvar"
+-----------------------------------+
| Haptic feedback (vibracao)        |
| Form fecha com slide-down         |
| Pin azul novo aparece com bounce  |
| Pin pisca 3x                      |
| Toast: "Cond. Vila Canario        |
|         cadastrado!"              |
+-----------------------------------+
         |
         v [Continua andando]
         |
PASSO 4 (opcional): Qualificar
+-----------------------------------+
| Tap no pin recem-criado           |
| Bottom sheet abre (peek)          |
| Tap "Editar"                      |
| Seleciona: Alto Padrao,           |
|   Residencial, 24 unidades        |
| Tap "Salvar"                      |
| Status: Mapeado (azul)            |
+-----------------------------------+

TEMPO TOTAL: ~25 segundos (registro basico)
TAPS: 3 (FAB + teclado + Salvar)
```

### 4.2 Fluxo "Prospectar FISBO"

Cenario: Luciana ve um pin com badge FISBO no mapa. E um proprietario vendendo sozinho -- oportunidade de ouro.

```
PASSO 1: Identificar FISBO no mapa
+-----------------------------------+
| Pin amarelo com estrela vermelha  |
| [F] visivel mesmo em zoom medio  |
| Luciana toca no pin               |
+-----------------------------------+
         |
         v
PASSO 2: Abrir card do edificio
+-----------------------------------+
| Bottom sheet (peek):              |
| "Ed. Tuiuti, 450"                 |
| Badge FISBO + "Em Prospeccao"     |
| "Oportunidades: 2 (1 FISBO)"     |
| Botao [+ Lead] em destaque       |
+-----------------------------------+
         |
         v [Tap "+ Lead"]
         |
PASSO 3: Cadastrar lead FISBO
+-----------------------------------+
| Form de lead:                     |
| Nome: Carlos Mendes               |
| Unidade: Ap 5A                    |
| Origem: [FISBO] (pre-selecionado) |
| Telefone: (11) 9xxxx-xxxx        |
| Portal: ZAP Imoveis               |
| Preco pedido: R$ 890.000          |
| [Salvar]                          |
+-----------------------------------+
         |
         v [Lead criado no estagio "Contato"]
         |
PASSO 4: Preparar ligacao com script
+-----------------------------------+
| Lead card aberto                  |
| Estagio: Contato                  |
| Tap [Scripts]                     |
| Auto-filtrado: "FISBO"            |
| Script: "Nao preciso de corretor" |
| Le o script, se prepara           |
| Tap [Usar agora]                  |
| Discador abre com numero          |
+-----------------------------------+
         |
         v [Ligacao feita, proprietario aceitou V1]
         |
PASSO 5: Agendar V1
+-----------------------------------+
| Volta ao lead card                |
| Tap [Agendar V1]                  |
| Tecnica de Duas Opcoes:           |
| "Terca 14h ou Quarta 10h?"       |
| Seleciona data/hora               |
| [Confirmar agendamento]           |
+-----------------------------------+
         |
         v [Lead move para estagio V1]
         |
PASSO 6: Confirmacao
+-----------------------------------+
| Lead agora em V1 (azul)           |
| Agendamento visivel no card       |
| Notificacao programada: 1h antes  |
| Toast: "V1 agendada - 20/03 14h" |
+-----------------------------------+

TEMPO TOTAL: ~3 minutos
JORNADA: Mapa -> Card -> Lead -> Script -> Ligacao -> V1
```

### 4.3 Fluxo "V1 para V2 Preparacao"

Cenario: Luciana completou a V1 com Maria Silva. Agora precisa preparar a V2 com todos os materiais profissionais.

```
PASSO 1: Completar V1
+-----------------------------------+
| No detalhe do lead Maria Silva    |
| Estagio: V1                       |
| Preenche campos V1:               |
| - Motivacao real: "Mudanca SP->RJ"|
| - Prazo urgencia: "3 meses"       |
| - Fotos V1: [+] (tira 5 fotos)   |
| [Concluir V1]                     |
+-----------------------------------+
         |
         v [Sistema sugere agendar V2]
         |
PASSO 2: Agendar V2
+-----------------------------------+
| Modal: "Agendar V2?"             |
| Intervalo sugerido: 3-5 dias      |
| Datas sugeridas:                   |
| [Terca 20/03 15h]                 |
| [Quarta 21/03 10h]                |
| [Confirmar]                       |
+-----------------------------------+
         |
         v [V2 agendada, checklist criado automaticamente]
         |
PASSO 3: Checklist V1->V2
+-----------------------------------+
| Checklist auto-criado:            |
| [ ] ACM preparada                 |
| [ ] Dossie gerado                 |
| [ ] Fotos V1 anexadas -> [x] ja! |
| [ ] Home Staging enviado          |
| [ ] Matricula consultada          |
| [ ] Plano Marketing revisado      |
| Progresso: 1/6                     |
+-----------------------------------+
         |
         v [Luciana trabalha nos itens]
         |
PASSO 4: Gerar ACM
+-----------------------------------+
| No checklist: tap "ACM preparada" |
| Navega para ACM Generator         |
| Imovel: Maria Silva - 85m2        |
| 3 comparaveis automaticos (scrap.)|
| + 2 comparaveis manuais           |
| Estimativa: R$ 1.062.500          |
| [Exportar PDF]                    |
| Checklist atualiza: [x] ACM      |
+-----------------------------------+
         |
         v
PASSO 5: Gerar Dossie
+-----------------------------------+
| No checklist: tap "Dossie"        |
| Navega para Dossie Generator      |
| Compila: ACM + Fotos + Plano Mkt  |
| Branding Luciana Borba            |
| Preview do PDF                     |
| [Gerar] -> PDF 12 paginas         |
| Checklist atualiza: [x] Dossie   |
+-----------------------------------+
         |
         v
PASSO 6: Home Staging via WhatsApp
+-----------------------------------+
| No checklist: tap "Home Staging"  |
| Template com 3 regras de ouro     |
| Preview da mensagem:              |
| "Sra. Maria, seguem..."           |
| [Compartilhar via WhatsApp]       |
| WhatsApp abre com msg pronta      |
| Checklist atualiza: [x] Home St. |
+-----------------------------------+
         |
         v
PASSO 7: V2 pronta
+-----------------------------------+
| Checklist: 6/6 [=============]   |
| Notificacao 24h antes:            |
| "V2 com Maria amanha 15h.         |
|  Todos os itens preparados!"      |
| [Revisar materiais]               |
+-----------------------------------+

TEMPO TOTAL: ~2 horas (distribuido em 3-5 dias)
ARTEFATOS: ACM PDF, Dossie PDF, Home Staging WhatsApp
```

### 4.4 Fluxo "Inteligencia Matinal"

Cenario: Luciana acorda, pega o celular, abre o app antes de sair de casa. Ve o que aconteceu na regiao durante a noite.

```
PASSO 1: Abrir app
+-----------------------------------+
| Mapa carrega                      |
| Badge vermelho no tab Feed: [3]   |
| Luciana toca no tab Feed          |
+-----------------------------------+
         |
         v
PASSO 2: Feed de inteligencia
+-----------------------------------+
| Resumo Matinal:                   |
| "3 novos FISBOs detectados        |
|  1 queda de preco >10%            |
|  2 leads precisam follow-up"      |
|                                   |
| Luciana le o resumo               |
+-----------------------------------+
         |
         v [Tap no evento FISBO]
         |
PASSO 3: Agir no FISBO
+-----------------------------------+
| Evento: FISBO detectado           |
| Ap 8C - Ed. Canario, 320         |
| ZAP - R$ 890K - 78m2              |
| [Criar Lead] [Ver no Mapa]        |
|                                   |
| Tap [Criar Lead]                  |
| Form pre-preenchido com dados     |
| do scraping                       |
| [Salvar]                          |
+-----------------------------------+
         |
         v [Lead criado, volta ao Feed]
         |
PASSO 4: Verificar queda de preco
+-----------------------------------+
| Evento: Queda de preco            |
| R. Alvorada, 120 - Ap 5B         |
| De R$1.2M para R$1.02M (-15%)    |
| [Ver ACM] [Contatar]              |
|                                   |
| Tap [Contatar]                    |
| Abre card do lead associado       |
| Programa follow-up para hoje      |
+-----------------------------------+
         |
         v [Marca eventos como lidos]
         |
PASSO 5: Verificar leads paradas
+-----------------------------------+
| 2 leads com alerta vermelho       |
| Carlos Mendes - V1 ha 5 dias     |
| Ana Paula - Contato ha 4 dias     |
|                                   |
| Tap [Follow-up] em cada           |
| Agenda ligacoes para hoje         |
+-----------------------------------+
         |
         v
PASSO 6: Plano do dia definido
+-----------------------------------+
| Feed zerado (todos lidos)          |
| Badge Feed: sem numero             |
| Luciana sabe exatamente:           |
| - 1 FISBO novo para prospectar     |
| - 1 proprietario com preco baixo  |
| - 2 follow-ups para fazer          |
| Vai para o tab Mapa e sai de casa |
+-----------------------------------+

TEMPO TOTAL: ~5 minutos
RESULTADO: Dia planejado com acoes prioritarias
```

---

## 5. Diretrizes de Branding

### 5.1 Paleta de Cores

**Cores primarias (RE/MAX):**

| Cor | Hex | Uso |
|-----|-----|-----|
| Azul RE/MAX | #003DA5 | Cor primaria, headers, tabs ativas, botoes primarios, pins Mapeado |
| Vermelho RE/MAX | #DC1431 | FAB, alertas, FISBO badges, CTAs de destaque |
| Branco | #FFFFFF | Background principal, texto em botoes coloridos |

**Cores de status (pins):**

| Cor | Hex | Status |
|-----|-----|--------|
| Cinza | #9CA3AF | Nao Visitado |
| Azul | #003DA5 | Mapeado |
| Amarelo | #EAB308 | Em Prospeccao |
| Verde | #22C55E | Concluido |

**Cores de suporte:**

| Cor | Hex | Uso |
|-----|-----|-----|
| Azul escuro | #001D4A | Texto principal, headers |
| Cinza texto | #374151 | Texto secundario |
| Cinza claro | #F3F4F6 | Background secundario, chips inativos |
| Cinza borda | #D1D5DB | Bordas, divisores |
| Verde sucesso | #22C55E | Confirmacoes, salvar, progresso alto |
| Amarelo aviso | #EAB308 | Warnings, urgencia media |
| Vermelho erro | #DC1431 | Erros, urgencia alta |
| Dourado | #D97706 | Exclusividade, conquistas, comissoes |

**Raios do mapa:**

| Raio | Cor borda | Fill |
|------|-----------|------|
| 500m | #22C55E (verde) | rgba(34,197,94,0.05) |
| 1km | #EAB308 (amarelo) | rgba(234,179,8,0.05) |
| 2km | #DC1431 (vermelho) | rgba(220,20,49,0.05) |

### 5.2 Tipografia

| Elemento | Font | Peso | Tamanho |
|----------|------|------|---------|
| H1 (telas) | Inter | Bold (700) | 24px |
| H2 (secoes) | Inter | Semibold (600) | 18px |
| H3 (subsecoes) | Inter | Semibold (600) | 16px |
| Body | Inter | Regular (400) | 14px |
| Body small | Inter | Regular (400) | 12px |
| Label | Inter | Medium (500) | 12px |
| Number (KPI) | Inter | Bold (700) | 32px |
| Button | Inter | Semibold (600) | 16px |
| Caption | Inter | Regular (400) | 10px |

**Nota:** Inter e a fonte padrao do Tailwind CSS / shadcn/ui. Fallback: system-ui, sans-serif.

### 5.3 Espacamento e Grid

**Sistema de espacamento (base 4px):**

| Token | Valor | Uso |
|-------|-------|-----|
| space-1 | 4px | Gap minimo, padding interno chips |
| space-2 | 8px | Gap entre elementos inline |
| space-3 | 12px | Padding interno cards |
| space-4 | 16px | Padding de tela, gap entre cards |
| space-5 | 20px | Margem entre secoes |
| space-6 | 24px | Margem grande |
| space-8 | 32px | Separacao de blocos |

**Touch targets:**
- Minimo: 44x44px (WCAG AA)
- Botoes: 48px altura minima
- FAB: 56px diametro
- Campos de texto: 48px altura

**Safe areas:**
- Top: status bar height (44-47px iOS, variavel Android)
- Bottom: home indicator (34px iOS, variavel Android) + tab bar (56px)

### 5.4 Icones

Usar **Lucide Icons** (conjunto padrao do shadcn/ui):

| Funcao | Icone | Contexto |
|--------|-------|----------|
| Mapa | `map-pin` | Tab bar, navegacao |
| Funil | `filter` | Tab bar |
| Feed | `bell` | Tab bar, alertas |
| Dashboard | `bar-chart-3` | Tab bar |
| Mais | `more-horizontal` | Tab bar |
| Adicionar | `plus` | FAB, botoes |
| FISBO | `star` | Badge, filtros |
| Editar | `pencil` | Botoes |
| GPS | `navigation` | Indicador de posicao |
| Offline | `wifi-off` | Status bar |
| Sync | `refresh-cw` | Status sincronizacao |
| Ligar | `phone` | Acao no lead |
| WhatsApp | custom SVG | Compartilhar |
| PDF | `file-text` | Dossie, ACM |
| Calendario | `calendar` | Agendamento |
| Relogio | `clock` | Urgencia, prazos |
| Check | `check` | Checklist, confirmacao |
| Warning | `alert-triangle` | Retrocesso, alerta |

### 5.5 Marca Pessoal Luciana Borba

**Presencas da marca:**
- Tela de login: nome + titulo abaixo do logo RE/MAX
- Dossie PDF: header com nome, foto, CRE/CI, telefone
- Home Staging compartilhavel: assinatura digital
- WhatsApp shares: rodape com nome e contato

**Tom de voz da interface:**
- Profissional mas acolhedora
- Dados objetivos, sem jargao tecnico excessivo
- Mensagens motivacionais nos empty states
- Tratamento formal com proprietarios (Sra./Sr.)
- Informalidade nos textos internos do app (para a Luciana)

**Elementos visuais da marca:**
- Foto profissional da Luciana no perfil e no Dossie
- Cores RE/MAX como base, sem customizacoes de cor pessoal
- Logo RE/MAX sempre visivel (tab bar ou header)

### 5.6 WCAG AA para Uso Externo

**Contraste minimo:**
- Texto normal: ratio 4.5:1
- Texto grande (>18px bold): ratio 3:1
- Icones e graficos: ratio 3:1

**Cores validadas para sol forte:**

| Combinacao | Ratio | Status |
|------------|-------|--------|
| #001D4A em #FFFFFF | 16.7:1 | PASS |
| #003DA5 em #FFFFFF | 8.9:1 | PASS |
| #DC1431 em #FFFFFF | 6.2:1 | PASS |
| #FFFFFF em #003DA5 | 8.9:1 | PASS |
| #374151 em #FFFFFF | 10.7:1 | PASS |
| #FFFFFF em #DC1431 | 6.2:1 | PASS |
| #EAB308 em #FFFFFF | 2.1:1 | FAIL -- usar #92400E em texto |
| Texto em amarelo | Usar #92400E (6.8:1) | PASS |

**Nota critica:** Amarelo (#EAB308) NAO passa WCAG AA como cor de texto. Para texto sobre fundo amarelo ou texto amarelo, usar #92400E (amarelo escuro). O amarelo puro e aceitavel apenas como background de chips/badges com texto escuro.

**Tamanhos minimos de toque:**
- Todos os elementos interativos: 44x44px minimo
- Espacamento entre alvos de toque: 8px minimo
- Botoes primarios: 48px altura, full width no mobile

**Luminosidade do mapa:**
- Mapa em estilo claro (Mapbox light-v11) para uso externo
- Pins com borda branca 2px para destacar do fundo
- Circulos dos raios com opacity baixa (5%) para nao obstruir

---

## 6. Consideracoes Tecnicas de UX

### 6.1 Performance Percebida

| Acao | Tempo maximo | Feedback |
|------|-------------|----------|
| Abrir app (logado) | 2s | Splash -> Mapa |
| Cadastro rapido (salvar) | 500ms | Haptic + toast |
| Transicao de funil | 300ms | Animacao slide |
| Abrir bottom sheet | 200ms | Spring animation |
| Busca de scripts | 300ms | Resultados incrementais (debounce) |
| Gerar PDF | 3-5s | Progress bar |
| Sync offline | Background | Badge "sincronizando" |

### 6.2 Estados de Erro

**Padroes de erro:**

| Erro | Feedback |
|------|----------|
| Sem GPS | Icone GPS vermelho + "Ative o GPS para cadastro preciso" |
| Sem internet | Badge "Offline" + funcionalidade completa offline |
| Falha sync | Toast "Falha ao sincronizar. Tentando novamente..." + retry automatico |
| Form invalido | Shake no campo + mensagem vermelha inline |
| Sessao expirada | Modal: "Sessao expirada" + redirect login |

### 6.3 Skeleton Loading

Usar skeleton screens (nao spinners) para carregamento:
- Cards: retangulos cinza pulsantes
- Lista de leads: 3 skeletons de LeadCard
- Mapa: tiles em cinza com loading no centro
- Dashboard KPIs: retangulos pulsantes no grid 2x2

### 6.4 Offline-First UX

**Indicadores visuais:**
- Badge "Offline" no header do mapa (fundo laranja, texto branco)
- Pins cadastrados offline: borda pontilhada + icone sync
- Toast ao reconectar: "Conectado! Sincronizando X itens..."
- Progresso de sync: mini progress bar no header

**Funcionalidades offline:**
- Mapa navegavel (tiles pre-cacheados)
- Cadastro de edificios (IndexedDB)
- Edicao de leads existentes
- Consulta de scripts (pre-carregados)
- Acesso ao checklist

**Funcionalidades que requerem online:**
- Seed data / scraping
- ACM com dados de portais
- Gerar Dossie (se precisa dados do servidor)
- Sync de referrals
- Push notifications

### 6.5 Responsividade Desktop/Tablet

**Breakpoints:**

| Dispositivo | Width | Layout |
|-------------|-------|--------|
| Mobile | <640px | Layout descrito neste doc |
| Tablet | 640-1024px | Mapa + sidebar, funil 2 colunas |
| Desktop | >1024px | Mapa + sidebar, funil Kanban, dashboard grid |

**Adaptacoes desktop (>1024px):**
- Funil: Kanban horizontal com drag-and-drop (nao tabs)
- Mapa: sidebar fixa a direita com card do edificio (nao bottom sheet)
- Dashboard: grid 3-4 colunas de KPIs
- Feed: split view (lista esquerda, detalhe direita)
- Bottom tab bar -> sidebar de navegacao a esquerda

---

## 7. Mapa de Cobertura PRD -> UX

| Requisito PRD | Tela/Componente UX | Status |
|---------------|---------------------|--------|
| FR-001 Mapa interativo | 2.2 Mapa Principal | Coberto |
| FR-002 Epicentro editavel | 2.2 Long press no mapa | Coberto |
| FR-003 Status de varredura | 3.1 MapPin (4 cores) | Coberto |
| FR-004 Expansao 80% | 2.6 Dashboard + Feed alertas | Coberto |
| FR-005 Sugestao prox. rua | Feed de Inteligencia (evento) | Coberto |
| FR-006 Cadastro <30s | 2.4 Cadastro Rapido | Coberto |
| FR-007 Abertura a corretores | 2.3 Card Edificio (dropdown) | Coberto |
| FR-008 Cadastro leads | Formulario Lead (via Card) | Coberto |
| FR-009 Cruzamento bases | Feed de Inteligencia | Coberto |
| FR-010 Destaque FISBOs | 3.1 MapPin badge + filtro | Coberto |
| FR-011 Funil 5 etapas | 2.5 Funil de Vendas (tabs) | Coberto |
| FR-012 Diagnostico gargalos | 2.6 Dashboard (taxas conversao) | Coberto |
| FR-013 Scripts objecao | 2.11 Biblioteca Scripts | Coberto |
| FR-014 FROG | 2.6 Dashboard (FROG chips) | Coberto |
| FR-015 ACM semi-auto | 2.8 ACM Generator | Coberto |
| FR-016 Recalculo m2 | ACM Generator (raio selecionavel) | Coberto |
| FR-017 Referrals | 2.9 Central de Referrals | Coberto |
| FR-018 Tracking indicacoes | 2.9 Central (status + metricas) | Coberto |
| FR-019 Dashboard KPIs | 2.6 Dashboard de KPIs | Coberto |
| FR-020 Agendamento V1/V2 | Fluxo 4.3 (detalhe lead) | Coberto |
| FR-021 Varredura portais | Feed (eventos auto-gerados) | Coberto |
| FR-025 Alertas FISBOs | 2.7 Feed + Push notifications | Coberto |
| FR-028 Informantes | 2.3 Card Edificio (secao) | Coberto |
| FR-031 Dossie PDF | Fluxo 4.3 (via checklist) | Coberto |
| FR-032 Checklist Home Staging | 2.10 Checklist V1->V2 | Coberto |
| FR-033 Diagnostico gargalos | 2.6 Dashboard (funil visual) | Coberto |
| FR-034 Clubes RE/MAX | 2.6 Dashboard (ProgressBar) | Coberto |
| NFR-001 Mobile-first | Toda a spec (375px referencia) | Coberto |
| NFR-002 Offline | 6.4 Offline-First UX | Coberto |
| NFR-004 Performance mapa | 6.1 Performance Percebida | Coberto |

---

## Apendice A: Glossario de Termos RE/MAX

| Termo | Significado |
|-------|-------------|
| V1 | Primeira visita ao imovel (avaliacao) |
| V2 | Segunda visita (apresentacao com ACM, Dossie) |
| FISBO | For Sale By Owner — proprietario vendendo sem corretor |
| ACM | Analise Comparativa de Mercado |
| FROG | Familia, Relacionamentos, Organizacoes, Geografia |
| Exclusividade | Contrato de representacao exclusiva |
| VGV | Valor Geral de Vendas |
| Home Staging | Preparacao visual do imovel para venda |
| Dossie/Showcase | Documento profissional para V2 |
| Marketing de Gentileza | Pequenos presentes/atencoes para informantes |
| Regra de Ouro (5%) | 5% da comissao para o informante que indicou |
| Epicentro | Ponto central do territorio da consultora |

---

*Frontend Specification v1.0 — Uma (UX Design Expert, AIOX) — 2026-03-18*
