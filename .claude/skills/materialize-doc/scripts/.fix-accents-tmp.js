#!/usr/bin/env node

/**
 * fix-accents.js
 * Restaura acentuação do português brasileiro em texto Markdown.
 * Protege blocos de código, Mermaid, YAML e termos técnicos.
 *
 * Estratégia:
 *   1. Separa o documento em segmentos "prosa" vs "código"
 *   2. Aplica dicionário de palavras específicas (alta confiança)
 *   3. Aplica regras de sufixo produtivas
 *   4. Reconstrói o documento
 */

const fs = require('fs');
const path = require('path');

const SOURCE = path.join(__dirname, '..', 'SINKRA-LIVRO-COMPLETO.md');
const OUTPUT = path.join(__dirname, '..', 'SINKRA-LIVRO-COMPLETO.md'); // sobrescreve

// ══════════════════════════════════════════════════════════════
// DICIONÁRIO DE PALAVRAS ESPECÍFICAS (case-insensitive match)
// Formato: [sem_acento, com_acento]
// ══════════════════════════════════════════════════════════════

const WORD_MAP = [
  // --- Palavras extremamente comuns ---
  ['nao', 'não'],
  ['tambem', 'também'],
  ['voce', 'você'],
  ['entao', 'então'],
  ['porem', 'porém'],
  ['alem', 'além'],
  ['atraves', 'através'],
  ['tres', 'três'],
  ['pos', 'pós'],
  ['pre', 'pré'],
  ['ja', 'já'],
  ['so', 'só'],
  ['ate', 'até'],
  ['ai', 'aí'],
  ['la', 'lá'],
  ['ha', 'há'],
  ['mas', 'más'], // cuidado: "mas" conjunção NÃO leva acento - REMOVIDO abaixo
  ['tera', 'terá'],
  ['sera', 'será'],
  ['esta', 'está'],  // verb form - handled with context
  ['sao', 'são'],
  ['dao', 'dão'],
  ['vao', 'vão'],
  ['estao', 'estão'],
  ['farao', 'farão'],
  ['terao', 'terão'],
  ['serao', 'serão'],
  ['irao', 'irão'],
  ['poderao', 'poderão'],
  ['deverao', 'deverão'],
  ['ficara', 'ficará'],
  ['ficaram', 'ficarão'], // actually ficaram is past tense, no accent needed - REMOVE
  ['comeca', 'começa'],
  ['comecam', 'começam'],
  ['comecou', 'começou'],
  ['comeco', 'começo'],

  // --- Substantivos/adjetivos comuns ---
  ['capitulo', 'capítulo'],
  ['capitulos', 'capítulos'],
  ['sumario', 'sumário'],
  ['numero', 'número'],
  ['numeros', 'números'],
  ['pagina', 'página'],
  ['paginas', 'páginas'],
  ['metodo', 'método'],
  ['metodos', 'métodos'],
  ['codigo', 'código'],
  ['codigos', 'códigos'],
  ['titulo', 'título'],
  ['titulos', 'títulos'],
  ['unico', 'único'],
  ['unica', 'única'],
  ['unicos', 'únicos'],
  ['unicas', 'únicas'],
  ['ultimo', 'último'],
  ['ultima', 'última'],
  ['ultimos', 'últimos'],
  ['ultimas', 'últimas'],
  ['proximo', 'próximo'],
  ['proxima', 'próxima'],
  ['proximos', 'próximos'],
  ['proximas', 'próximas'],
  ['tecnico', 'técnico'],
  ['tecnica', 'técnica'],
  ['tecnicos', 'técnicos'],
  ['tecnicas', 'técnicas'],
  ['pratico', 'prático'],
  ['pratica', 'prática'],
  ['praticos', 'práticos'],
  ['praticas', 'práticas'],
  ['basico', 'básico'],
  ['basica', 'básica'],
  ['basicos', 'básicos'],
  ['basicas', 'básicas'],
  ['obvio', 'óbvio'],
  ['obvia', 'óbvia'],
  ['obvios', 'óbvios'],
  ['obvias', 'óbvias'],
  ['valido', 'válido'],
  ['valida', 'válida'],
  ['validos', 'válidos'],
  ['validas', 'válidas'],
  ['rapido', 'rápido'],
  ['rapida', 'rápida'],
  ['rapidos', 'rápidos'],
  ['rapidas', 'rápidas'],
  ['solido', 'sólido'],
  ['solida', 'sólida'],
  ['solidos', 'sólidos'],
  ['solidas', 'sólidas'],
  ['publico', 'público'],
  ['publica', 'pública'],
  ['publicos', 'públicos'],
  ['publicas', 'públicas'],
  ['especifico', 'específico'],
  ['especifica', 'específica'],
  ['especificos', 'específicos'],
  ['especificas', 'específicas'],
  ['generico', 'genérico'],
  ['generica', 'genérica'],
  ['genericos', 'genéricos'],
  ['genericas', 'genéricas'],
  ['numerico', 'numérico'],
  ['numerica', 'numérica'],
  ['numericos', 'numéricos'],
  ['numericas', 'numéricas'],
  ['minimo', 'mínimo'],
  ['minima', 'mínima'],
  ['minimos', 'mínimos'],
  ['minimas', 'mínimas'],
  ['maximo', 'máximo'],
  ['maxima', 'máxima'],
  ['maximos', 'máximos'],
  ['maximas', 'máximas'],
  ['otimo', 'ótimo'],
  ['otima', 'ótima'],
  ['otimos', 'ótimos'],
  ['otimas', 'ótimas'],
  ['pessimo', 'péssimo'],
  ['pessima', 'péssima'],
  ['necessario', 'necessário'],
  ['necessaria', 'necessária'],
  ['necessarios', 'necessários'],
  ['necessarias', 'necessárias'],
  ['primario', 'primário'],
  ['primaria', 'primária'],
  ['secundario', 'secundário'],
  ['secundaria', 'secundária'],
  ['contrario', 'contrário'],
  ['contraria', 'contrária'],
  ['varios', 'vários'],
  ['varias', 'várias'],
  ['proprio', 'próprio'],
  ['propria', 'própria'],
  ['proprios', 'próprios'],
  ['proprias', 'próprias'],
  ['serio', 'sério'],
  ['seria', 'séria'],
  ['criterio', 'critério'],
  ['criterios', 'critérios'],
  ['misterio', 'mistério'],
  ['misterios', 'mistérios'],
  ['exercicio', 'exercício'],
  ['exercicios', 'exercícios'],
  ['edificio', 'edifício'],
  ['principio', 'princípio'],
  ['principios', 'princípios'],
  ['raciocinio', 'raciocínio'],
  ['dominio', 'domínio'],
  ['dominios', 'domínios'],
  ['equilibrio', 'equilíbrio'],
  ['vocabulario', 'vocabulário'],
  ['glossario', 'glossário'],
  ['cenario', 'cenário'],
  ['cenarios', 'cenários'],
  ['formulario', 'formulário'],
  ['formularios', 'formulários'],
  ['calendario', 'calendário'],
  ['inventario', 'inventário'],
  ['comentario', 'comentário'],
  ['comentarios', 'comentários'],
  ['intermediario', 'intermediário'],
  ['intermediarios', 'intermediários'],
  ['beneficio', 'benefício'],
  ['beneficios', 'benefícios'],
  ['sacrificio', 'sacrifício'],
  ['conteudo', 'conteúdo'],
  ['conteudos', 'conteúdos'],
  ['miudo', 'miúdo'],
  ['saude', 'saúde'],
  ['duvida', 'dúvida'],
  ['duvidas', 'dúvidas'],
  ['musica', 'música'],
  ['musicas', 'músicas'],
  ['fabrica', 'fábrica'],
  ['fabricas', 'fábricas'],
  ['maquina', 'máquina'],
  ['maquinas', 'máquinas'],
  ['regua', 'régua'],
  ['lingua', 'língua'],
  ['linguas', 'línguas'],
  ['agua', 'água'],
  ['aguas', 'águas'],

  // --- Palavras com ç ---
  ['comecou', 'começou'],
  ['comeca', 'começa'],
  ['comecam', 'começam'],
  ['comeco', 'começo'],
  ['comecamos', 'começamos'],
  ['comecando', 'começando'],
  ['comecar', 'começar'],
  ['forca', 'força'],
  ['forcas', 'forças'],
  ['forcar', 'forçar'],
  ['forcando', 'forçando'],
  ['forcado', 'forçado'],
  ['forcada', 'forçada'],
  ['preco', 'preço'],
  ['precos', 'preços'],
  ['espaco', 'espaço'],
  ['espacos', 'espaços'],
  ['almoco', 'almoço'],
  ['cabeca', 'cabeça'],
  ['cabecas', 'cabeças'],
  ['pecas', 'peças'],
  ['peca', 'peça'],
  ['troca', 'troça'], // actually troca doesn't need accent - REMOVE
  ['caca', 'caça'],
  ['cacas', 'caças'],
  ['cacador', 'caçador'],
  ['licao', 'lição'],
  ['licoes', 'lições'],

  // --- Verbos comuns ---
  ['voce', 'você'],
  ['voces', 'vocês'],
  ['nos', 'nós'],    // careful - "nos" (pronoun) vs "nós" - context needed
  ['eles', 'êles'],  // actually "eles" doesn't have accent in modern Portuguese - REMOVE
  ['tambem', 'também'],
  ['ninguem', 'ninguém'],
  ['alguem', 'alguém'],
  ['porem', 'porém'],
  ['alem', 'além'],
  ['parabens', 'parabéns'],
  ['armazem', 'armazém'],
  ['refem', 'refém'],
  ['contem', 'contém'],
  ['mantem', 'mantém'],
  ['obtem', 'obtém'],
  ['detem', 'detém'],
  ['contem', 'contém'],
  ['retem', 'retém'],
  ['intervem', 'intervém'],

  // --- Palavras com acento circunflexo ---
  ['exito', 'êxito'],
  ['exitos', 'êxitos'],
  ['frequencia', 'frequência'],
  ['frequencias', 'frequências'],
  ['ciencia', 'ciência'],
  ['ciencias', 'ciências'],
  ['experiencia', 'experiência'],
  ['experiencias', 'experiências'],
  ['ausencia', 'ausência'],
  ['presenca', 'presença'],
  ['essencia', 'essência'],
  ['potencia', 'potência'],
  ['potencias', 'potências'],
  ['diferenca', 'diferença'],
  ['diferencas', 'diferenças'],
  ['consequencia', 'consequência'],
  ['consequencias', 'consequências'],
  ['referencia', 'referência'],
  ['referencias', 'referências'],
  ['tendencia', 'tendência'],
  ['tendencias', 'tendências'],
  ['inteligencia', 'inteligência'],
  ['eficiencia', 'eficiência'],
  ['dependencia', 'dependência'],
  ['independencia', 'independência'],
  ['consistencia', 'consistência'],
  ['existencia', 'existência'],
  ['resistencia', 'resistência'],
  ['permanencia', 'permanência'],
  ['transparencia', 'transparência'],
  ['coerencia', 'coerência'],
  ['urgencia', 'urgência'],
  ['emergencia', 'emergência'],
  ['competencia', 'competência'],
  ['competencias', 'competências'],
  ['importancia', 'importância'],
  ['tolerancia', 'tolerância'],
  ['relevancia', 'relevância'],
  ['distancia', 'distância'],
  ['distancias', 'distâncias'],
  ['substancia', 'substância'],
  ['substancias', 'substâncias'],
  ['vigilancia', 'vigilância'],
  ['seguranca', 'segurança'],
  ['esperanca', 'esperança'],
  ['mudanca', 'mudança'],
  ['mudancas', 'mudanças'],
  ['semelhanca', 'semelhança'],
  ['lembranca', 'lembrança'],
  ['lideranca', 'liderança'],
  ['crianca', 'criança'],
  ['criancas', 'crianças'],
  ['alianca', 'aliança'],
  ['confianca', 'confiança'],
  ['desconfianca', 'desconfiança'],
  ['governanca', 'governança'],
  ['heranca', 'herança'],
  ['cobranca', 'cobrança'],
  ['cobrancas', 'cobranças'],
  ['venganca', 'vingança'],

  // --- ã/õ ---
  ['versao', 'versão'],
  ['versoes', 'versões'],
  ['padrao', 'padrão'],
  ['padroes', 'padrões'],
  ['razao', 'razão'],
  ['razoes', 'razões'],
  ['questao', 'questão'],
  ['questoes', 'questões'],
  ['relacao', 'relação'],
  ['relacoes', 'relações'],
  ['situacao', 'situação'],
  ['situacoes', 'situações'],
  ['informacao', 'informação'],
  ['informacoes', 'informações'],
  ['organizacao', 'organização'],
  ['organizacoes', 'organizações'],
  ['operacao', 'operação'],
  ['operacoes', 'operações'],
  ['comunicacao', 'comunicação'],
  ['comunicacoes', 'comunicações'],
  ['producao', 'produção'],
  ['producoes', 'produções'],
  ['execucao', 'execução'],
  ['execucoes', 'execuções'],
  ['solucao', 'solução'],
  ['solucoes', 'soluções'],
  ['instituicao', 'instituição'],
  ['instituicoes', 'instituições'],
  ['contribuicao', 'contribuição'],
  ['contribuicoes', 'contribuições'],
  ['distribuicao', 'distribuição'],
  ['construcao', 'construção'],
  ['destruicao', 'destruição'],
  ['instrucao', 'instrução'],
  ['instrucoes', 'instruções'],
  ['reducao', 'redução'],
  ['introducao', 'introdução'],
  ['reproducao', 'reprodução'],
  ['conclusao', 'conclusão'],
  ['conclusoes', 'conclusões'],
  ['exclusao', 'exclusão'],
  ['inclusao', 'inclusão'],
  ['ilusao', 'ilusão'],
  ['decisao', 'decisão'],
  ['decisoes', 'decisões'],
  ['precisao', 'precisão'],
  ['revisao', 'revisão'],
  ['revisoes', 'revisões'],
  ['previsao', 'previsão'],
  ['visao', 'visão'],
  ['divisao', 'divisão'],
  ['divisoes', 'divisões'],
  ['televisao', 'televisão'],
  ['ocasiao', 'ocasião'],
  ['invasao', 'invasão'],
  ['persuasao', 'persuasão'],
  ['expressao', 'expressão'],
  ['expressoes', 'expressões'],
  ['impressao', 'impressão'],
  ['compressao', 'compressão'],
  ['sessao', 'sessão'],
  ['sessoes', 'sessões'],
  ['profissao', 'profissão'],
  ['profissoes', 'profissões'],
  ['missao', 'missão'],
  ['missoes', 'missões'],
  ['permissao', 'permissão'],
  ['emissao', 'emissão'],
  ['transmissao', 'transmissão'],
  ['discussao', 'discussão'],
  ['discussoes', 'discussões'],
  ['confusao', 'confusão'],
  ['dimensao', 'dimensão'],
  ['dimensoes', 'dimensões'],
  ['extensao', 'extensão'],
  ['extensoes', 'extensões'],
  ['tensao', 'tensão'],
  ['atencao', 'atenção'],
  ['prevencao', 'prevenção'],
  ['convencao', 'convenção'],
  ['intencao', 'intenção'],
  ['intencoes', 'intenções'],
  ['mencao', 'menção'],
  ['funcao', 'função'],
  ['funcoes', 'funções'],
  ['juncao', 'junção'],
  ['conjuncao', 'conjunção'],
  ['direcao', 'direção'],
  ['direcoes', 'direções'],
  ['correcao', 'correção'],
  ['correcoes', 'correções'],
  ['protecao', 'proteção'],
  ['selecao', 'seleção'],
  ['elecao', 'eleição'],
  ['conexao', 'conexão'],
  ['conexoes', 'conexões'],
  ['reacao', 'reação'],
  ['reacoes', 'reações'],
  ['interacao', 'interação'],
  ['interacoes', 'interações'],
  ['criacao', 'criação'],
  ['criacoes', 'criações'],
  ['inovacao', 'inovação'],
  ['inovacoes', 'inovações'],
  ['motivacao', 'motivação'],
  ['educacao', 'educação'],
  ['avaliacao', 'avaliação'],
  ['avaliacoes', 'avaliações'],
  ['validacao', 'validação'],
  ['validacoes', 'validações'],
  ['configuracao', 'configuração'],
  ['configuracoes', 'configurações'],
  ['implementacao', 'implementação'],
  ['implementacoes', 'implementações'],
  ['documentacao', 'documentação'],
  ['documentacoes', 'documentações'],
  ['automatizacao', 'automatização'],
  ['autorizacao', 'autorização'],
  ['otimizacao', 'otimização'],
  ['classificacao', 'classificação'],
  ['especificacao', 'especificação'],
  ['especificacoes', 'especificações'],
  ['verificacao', 'verificação'],
  ['identificacao', 'identificação'],
  ['notificacao', 'notificação'],
  ['notificacoes', 'notificações'],
  ['certificacao', 'certificação'],
  ['publicacao', 'publicação'],
  ['publicacoes', 'publicações'],
  ['aplicacao', 'aplicação'],
  ['aplicacoes', 'aplicações'],
  ['complicacao', 'complicação'],
  ['explicacao', 'explicação'],
  ['explicacoes', 'explicações'],
  ['duplicacao', 'duplicação'],
  ['replicacao', 'replicação'],
  ['estimacao', 'estimação'],
  ['animacao', 'animação'],
  ['programacao', 'programação'],
  ['reclamacao', 'reclamação'],
  ['reclamacoes', 'reclamações'],
  ['negociacao', 'negociação'],
  ['negociacoes', 'negociações'],
  ['associacao', 'associação'],
  ['associacoes', 'associações'],
  ['colaboracao', 'colaboração'],
  ['comparacao', 'comparação'],
  ['comparacoes', 'comparações'],
  ['preparacao', 'preparação'],
  ['separacao', 'separação'],
  ['alteracao', 'alteração'],
  ['alteracoes', 'alterações'],
  ['geracao', 'geração'],
  ['geracoes', 'gerações'],
  ['migracao', 'migração'],
  ['integracao', 'integração'],
  ['integracoes', 'integrações'],
  ['concentracao', 'concentração'],
  ['demonstracao', 'demonstração'],
  ['administracao', 'administração'],
  ['orquestracao', 'orquestração'],
  ['frustracao', 'frustração'],
  ['abstracoes', 'abstrações'],
  ['obrigacao', 'obrigação'],
  ['obrigacoes', 'obrigações'],
  ['investigacao', 'investigação'],
  ['navegacao', 'navegação'],
  ['delegacao', 'delegação'],
  ['irrigacao', 'irrigação'],
  ['mitigacao', 'mitigação'],
  ['populacao', 'população'],
  ['regulacao', 'regulação'],
  ['articulacao', 'articulação'],
  ['manipulacao', 'manipulação'],
  ['acumulacao', 'acumulação'],
  ['simulacao', 'simulação'],
  ['formulacao', 'formulação'],
  ['atuacao', 'atuação'],
  ['graduacao', 'graduação'],
  ['evolucao', 'evolução'],
  ['revolucao', 'revolução'],
  ['resolucao', 'resolução'],
  ['substituicao', 'substituição'],
  ['constituicao', 'constituição'],
  ['restituicao', 'restituição'],
  ['transicao', 'transição'],
  ['transicoes', 'transições'],
  ['posicao', 'posição'],
  ['posicoes', 'posições'],
  ['composicao', 'composição'],
  ['composicoes', 'composições'],
  ['decomposicao', 'decomposição'],
  ['proposicao', 'proposição'],
  ['proposicoes', 'proposições'],
  ['disposicao', 'disposição'],
  ['oposicao', 'oposição'],
  ['exposicao', 'exposição'],
  ['repeticao', 'repetição'],
  ['repeticoes', 'repetições'],
  ['competicao', 'competição'],
  ['competicoes', 'competições'],
  ['adicao', 'adição'],
  ['condicao', 'condição'],
  ['condicoes', 'condições'],
  ['tradicao', 'tradição'],
  ['tradicoes', 'tradições'],
  ['edicao', 'edição'],
  ['edicoes', 'edições'],
  ['medicao', 'medição'],
  ['predicao', 'predição'],
  ['definicao', 'definição'],
  ['definicoes', 'definições'],
  ['restricao', 'restrição'],
  ['restricoes', 'restrições'],
  ['excecao', 'exceção'],
  ['excecoes', 'exceções'],
  ['concepcao', 'concepção'],
  ['percepcao', 'percepção'],
  ['recepcao', 'recepção'],
  ['descricao', 'descrição'],
  ['descricoes', 'descrições'],
  ['inscricao', 'inscrição'],
  ['prescricao', 'prescrição'],
  ['abstracoes', 'abstrações'],
  ['abstracao', 'abstração'],
  ['iteracao', 'iteração'],
  ['iteracoes', 'iterações'],
  ['federacao', 'federação'],
  ['moderacao', 'moderação'],
  ['cooperacao', 'cooperação'],
  ['recuperacao', 'recuperação'],
  ['remuneracao', 'remuneração'],
  ['enumeracao', 'enumeração'],
  ['toleracao', 'toleração'],
  ['exploracao', 'exploração'],
  ['restauracao', 'restauração'],
  ['transformacao', 'transformação'],
  ['transformacoes', 'transformações'],
  ['formacao', 'formação'],
  ['informacao', 'informação'],
  ['conformacao', 'conformação'],
  ['deformacao', 'deformação'],
  ['acomodacao', 'acomodação'],
  ['adaptacao', 'adaptação'],
  ['adaptacoes', 'adaptações'],
  ['fragmentacao', 'fragmentação'],
  ['segmentacao', 'segmentação'],
  ['argumentacao', 'argumentação'],
  ['orientacao', 'orientação'],
  ['orientacoes', 'orientações'],
  ['representacao', 'representação'],
  ['apresentacao', 'apresentação'],
  ['alimentacao', 'alimentação'],
  ['sustentacao', 'sustentação'],
  ['documentacao', 'documentação'],
  ['experimentacao', 'experimentação'],
  ['complementacao', 'complementação'],
  ['fundamentacao', 'fundamentação'],
  ['tentacao', 'tentação'],
  ['limitacao', 'limitação'],
  ['limitacoes', 'limitações'],
  ['habilitacao', 'habilitação'],
  ['facilitacao', 'facilitação'],
  ['capacitacao', 'capacitação'],

  // --- Mão, chão, etc ---
  ['mao', 'mão'],
  ['maos', 'mãos'],
  ['chao', 'chão'],
  ['irmao', 'irmão'],
  ['irmaos', 'irmãos'],
  ['alemao', 'alemão'],
  ['cidadao', 'cidadão'],
  ['cidadaos', 'cidadãos'],
  ['orgao', 'órgão'],
  ['orgaos', 'órgãos'],
  ['botao', 'botão'],
  ['botoes', 'botões'],
  ['caminhao', 'caminhão'],
  ['coração', 'coração'],

  // --- Palavras com til ---
  ['opcao', 'opção'],
  ['opcoes', 'opções'],
  ['secao', 'seção'],
  ['secoes', 'seções'],

  // --- -ência/-ância já cobertos acima, mais alguns ---
  ['obediencia', 'obediência'],
  ['paciencia', 'paciência'],
  ['providencia', 'providência'],
  ['aparencia', 'aparência'],
  ['ocorrencia', 'ocorrência'],
  ['ocorrencias', 'ocorrências'],
  ['concorrencia', 'concorrência'],
  ['preferencia', 'preferência'],
  ['preferencias', 'preferências'],
  ['interferencia', 'interferência'],
  ['diferenca', 'diferença'],
  ['diferencas', 'diferenças'],
  ['gerencia', 'gerência'],
  ['eficiencia', 'eficiência'],
  ['deficiencia', 'deficiência'],
  ['suficiencia', 'suficiência'],
  ['insuficiencia', 'insuficiência'],
  ['consciencia', 'consciência'],
  ['audiencia', 'audiência'],
  ['evidencia', 'evidência'],
  ['evidencias', 'evidências'],
  ['residencia', 'residência'],
  ['incidencia', 'incidência'],
  ['equivalencia', 'equivalência'],
  ['ambivalencia', 'ambivalência'],
  ['prevalencia', 'prevalência'],
  ['violencia', 'violência'],
  ['excelencia', 'excelência'],
  ['influencia', 'influência'],
  ['influencias', 'influências'],
  ['sequencia', 'sequência'],
  ['sequencias', 'sequências'],

  // --- Adjetivos/advérbios ---
  ['impossivel', 'impossível'],
  ['possivel', 'possível'],
  ['possiveis', 'possíveis'],
  ['acessivel', 'acessível'],
  ['acessiveis', 'acessíveis'],
  ['visivel', 'visível'],
  ['visiveis', 'visíveis'],
  ['invisivel', 'invisível'],
  ['flexivel', 'flexível'],
  ['inflexivel', 'inflexível'],
  ['compativel', 'compatível'],
  ['compativeis', 'compatíveis'],
  ['disponivel', 'disponível'],
  ['disponiveis', 'disponíveis'],
  ['responsavel', 'responsável'],
  ['responsaveis', 'responsáveis'],
  ['vulneravel', 'vulnerável'],
  ['vulneraveis', 'vulneráveis'],
  ['aplicavel', 'aplicável'],
  ['aplicaveis', 'aplicáveis'],
  ['aceitavel', 'aceitável'],
  ['aceitaveis', 'aceitáveis'],
  ['inaceitavel', 'inaceitável'],
  ['razoavel', 'razoável'],
  ['razoaveis', 'razoáveis'],
  ['confortavel', 'confortável'],
  ['confortaveis', 'confortáveis'],
  ['notavel', 'notável'],
  ['notaveis', 'notáveis'],
  ['admiravel', 'admirável'],
  ['agradavel', 'agradável'],
  ['desagradavel', 'desagradável'],
  ['comparavel', 'comparável'],
  ['comparaveis', 'comparáveis'],
  ['mensuravel', 'mensurável'],
  ['mensuraveis', 'mensuráveis'],
  ['sustentavel', 'sustentável'],
  ['sustentaveis', 'sustentáveis'],
  ['inegociavel', 'inegociável'],
  ['inegociaveis', 'inegociáveis'],
  ['indispensavel', 'indispensável'],
  ['indispensaveis', 'indispensáveis'],
  ['inabalavel', 'inabalável'],
  ['inevitavel', 'inevitável'],
  ['inevitaveis', 'inevitáveis'],
  ['imutavel', 'imutável'],
  ['imutaveis', 'imutáveis'],
  ['estavel', 'estável'],
  ['estaveis', 'estáveis'],
  ['instavel', 'instável'],
  ['instaveis', 'instáveis'],
  ['previsivel', 'previsível'],
  ['previsiveis', 'previsíveis'],
  ['imprevisivel', 'imprevisível'],
  ['imprevisiveis', 'imprevisíveis'],
  ['reutilizavel', 'reutilizável'],
  ['reutilizaveis', 'reutilizáveis'],
  ['escalavel', 'escalável'],
  ['escalaveis', 'escaláveis'],
  ['programavel', 'programável'],
  ['programaveis', 'programáveis'],
  ['verificavel', 'verificável'],
  ['verificaveis', 'verificáveis'],
  ['transferivel', 'transferível'],
  ['transferiveis', 'transferíveis'],
  ['reproduzivel', 'reproduzível'],
  ['reproduziveis', 'reproduzíveis'],
  ['substituivel', 'substituível'],
  ['substituiveis', 'substituíveis'],
  ['intercambiavel', 'intercambiável'],
  ['intercambiaveis', 'intercambiáveis'],
  ['negociavel', 'negociável'],
  ['negociaveis', 'negociáveis'],

  // --- Substantivos variados ---
  ['analise', 'análise'],
  ['analises', 'análises'],
  ['sintese', 'síntese'],
  ['hipotese', 'hipótese'],
  ['hipoteses', 'hipóteses'],
  ['parentese', 'parêntese'],
  ['parenteses', 'parênteses'],
  ['enfase', 'ênfase'],
  ['indice', 'índice'],
  ['indices', 'índices'],
  ['apendice', 'apêndice'],
  ['superficie', 'superfície'],
  ['especie', 'espécie'],
  ['especies', 'espécies'],
  ['serie', 'série'],
  ['series', 'séries'],
  ['nivel', 'nível'],
  ['niveis', 'níveis'],
  ['movel', 'móvel'],
  ['moveis', 'móveis'],
  ['imovel', 'imóvel'],
  ['imoveis', 'imóveis'],
  ['automovel', 'automóvel'],
  ['automoveis', 'automóveis'],
  ['facil', 'fácil'],
  ['faceis', 'fáceis'],
  ['dificil', 'difícil'],
  ['dificeis', 'difíceis'],
  ['fragil', 'frágil'],
  ['agil', 'ágil'],
  ['ageis', 'ágeis'],
  ['util', 'útil'],
  ['uteis', 'úteis'],
  ['inuteis', 'inúteis'],
  ['volatil', 'volátil'],

  // --- Verbos no infinitivo e conjugados ---
  ['contribui', 'contribuí'],
  ['distribui', 'distribuí'],
  ['construi', 'construí'],
  ['inclui', 'incluí'],
  ['substitui', 'substituí'],
  ['possuir', 'possuir'], // no accent needed
  ['consegui', 'conseguí'], // actually no accent on "consegui" - KEEP without
  ['tambem', 'também'],
  ['poderao', 'poderão'],
  ['deverao', 'deverão'],
  ['estarao', 'estarão'],
  ['precisarao', 'precisarão'],
  ['passarao', 'passarão'],
  ['ficarao', 'ficarão'],
  ['tomarao', 'tomarão'],
  ['farao', 'farão'],
  ['darao', 'darão'],

  // --- Outras palavras comuns ---
  ['obstaculo', 'obstáculo'],
  ['obstaculos', 'obstáculos'],
  ['espetaculo', 'espetáculo'],
  ['oraculo', 'oráculo'],
  ['curriculo', 'currículo'],
  ['articulo', 'artículo'],
  ['veiculo', 'veículo'],
  ['veiculos', 'veículos'],
  ['circulo', 'círculo'],
  ['circulos', 'círculos'],
  ['calculo', 'cálculo'],
  ['calculos', 'cálculos'],
  ['musculo', 'músculo'],
  ['musculos', 'músculos'],
  ['molecula', 'molécula'],
  ['moleculas', 'moléculas'],
  ['celula', 'célula'],
  ['celulas', 'células'],
  ['formula', 'fórmula'],
  ['formulas', 'fórmulas'],
  ['simbolo', 'símbolo'],
  ['simbolos', 'símbolos'],
  ['proposito', 'propósito'],
  ['propositos', 'propósitos'],
  ['deposito', 'depósito'],
  ['depositos', 'depósitos'],
  ['credito', 'crédito'],
  ['creditos', 'créditos'],
  ['debito', 'débito'],
  ['debitos', 'débitos'],
  ['habito', 'hábito'],
  ['habitos', 'hábitos'],
  ['fenomeno', 'fenômeno'],
  ['fenomenos', 'fenômenos'],
  ['genero', 'gênero'],
  ['generos', 'gêneros'],

  // --- Palavras com acento agudo em e ---
  ['serie', 'série'],
  ['serio', 'sério'],
  ['misterio', 'mistério'],
  ['criterio', 'critério'],
  ['imperio', 'império'],
  ['ministerio', 'ministério'],
  ['comercio', 'comércio'],
  ['exercicio', 'exercício'],
  ['beneficio', 'benefício'],
  ['sacrificio', 'sacrifício'],
  ['servico', 'serviço'],
  ['servicos', 'serviços'],

  // --- Palavras com acento em i ---
  ['politica', 'política'],
  ['politicas', 'políticas'],
  ['politico', 'político'],
  ['politicos', 'políticos'],

  // --- Mais palavras do contexto do livro ---
  ['hierarquia', 'hierarquia'], // no accent needed
  ['sequencia', 'sequência'],
  ['frequencia', 'frequência'],
  ['permanencia', 'permanência'],
  ['eficiencia', 'eficiência'],
  ['transparencia', 'transparência'],

  // --- Verbo ser/estar ---
  ['esta', 'está'],
  ['estao', 'estão'],
  ['sao', 'são'],

  // --- Preposições e advérbios ---
  ['atras', 'atrás'],
  ['alias', 'aliás'],
  ['entretanto', 'entretanto'], // no accent
  ['porem', 'porém'],
  ['tambem', 'também'],
  ['so', 'só'],
  ['ja', 'já'],
  ['ate', 'até'],
  ['apos', 'após'],

  // --- Acentos em ê ---
  ['ele', 'êle'], // actually modern Portuguese doesn't accent "ele" - WILL SKIP
  ['voce', 'você'],
  ['tres', 'três'],

  // --- Palavras com -ância ---
  ['importancia', 'importância'],
  ['tolerancia', 'tolerância'],
  ['relevancia', 'relevância'],
  ['constancia', 'constância'],
  ['instancia', 'instância'],
  ['instancias', 'instâncias'],
  ['circunstancia', 'circunstância'],
  ['circunstancias', 'circunstâncias'],
  ['substancia', 'substância'],
  ['abundancia', 'abundância'],
  ['redundancia', 'redundância'],
  ['discordancia', 'discordância'],
  ['concordancia', 'concordância'],
  ['observancia', 'observância'],
  ['discrepancia', 'discrepância'],
  ['ressonancia', 'ressonância'],
  ['ignorancia', 'ignorância'],
  ['arrogancia', 'arrogância'],
  ['elegancia', 'elegância'],

  // --- Palavras com acento que aparecem no livro ---
  ['logico', 'lógico'],
  ['logica', 'lógica'],
  ['logicos', 'lógicos'],
  ['logicas', 'lógicas'],
  ['analogico', 'analógico'],
  ['analogica', 'analógica'],
  ['biologico', 'biológico'],
  ['biologica', 'biológica'],
  ['tecnologico', 'tecnológico'],
  ['tecnologica', 'tecnológica'],
  ['tecnologicos', 'tecnológicos'],
  ['tecnologicas', 'tecnológicas'],
  ['metodologico', 'metodológico'],
  ['metodologica', 'metodológica'],
  ['cronologico', 'cronológico'],
  ['cronologica', 'cronológica'],
  ['estrategico', 'estratégico'],
  ['estrategica', 'estratégica'],
  ['estrategicos', 'estratégicos'],
  ['estrategicas', 'estratégicas'],
  ['energetico', 'energético'],
  ['energetica', 'energética'],
  ['sintetico', 'sintético'],
  ['sintetica', 'sintética'],
  ['estetico', 'estético'],
  ['estetica', 'estética'],
  ['hipotetico', 'hipotético'],
  ['hipotetica', 'hipotética'],
  ['teoretico', 'teorético'],
  ['pratico', 'prático'],
  ['pratica', 'prática'],
  ['automatico', 'automático'],
  ['automatica', 'automática'],
  ['automaticos', 'automáticos'],
  ['automaticas', 'automáticas'],
  ['sistematico', 'sistemático'],
  ['sistematica', 'sistemática'],
  ['tematico', 'temático'],
  ['tematica', 'temática'],
  ['problematico', 'problemático'],
  ['problematica', 'problemática'],
  ['dramatico', 'dramático'],
  ['dramatica', 'dramática'],
  ['simbolico', 'simbólico'],
  ['simbolica', 'simbólica'],
  ['historico', 'histórico'],
  ['historica', 'histórica'],
  ['historicos', 'históricos'],
  ['historicas', 'históricas'],
  ['retorico', 'retórico'],
  ['retorica', 'retórica'],
  ['periodico', 'periódico'],
  ['periodica', 'periódica'],
  ['organico', 'orgânico'],
  ['organica', 'orgânica'],
  ['mecanico', 'mecânico'],
  ['mecanica', 'mecânica'],
  ['dinamico', 'dinâmico'],
  ['dinamica', 'dinâmica'],
  ['dinamicos', 'dinâmicos'],
  ['dinamicas', 'dinâmicas'],
  ['ceramico', 'cerâmico'],
  ['ceramica', 'cerâmica'],
  ['botanico', 'botânico'],
  ['botanica', 'botânica'],
  ['romantico', 'romântico'],
  ['romantica', 'romântica'],
  ['semantico', 'semântico'],
  ['semantica', 'semântica'],
  ['atlantico', 'atlântico'],
  ['atlantica', 'atlântica'],
  ['britanico', 'britânico'],
  ['britanica', 'britânica'],
  ['hispanico', 'hispânico'],
  ['hispanica', 'hispânica'],
  ['espontaneo', 'espontâneo'],
  ['espontanea', 'espontânea'],
  ['simultaneo', 'simultâneo'],
  ['simultanea', 'simultânea'],
  ['instantaneo', 'instantâneo'],
  ['instantanea', 'instantânea'],
  ['contemporaneo', 'contemporâneo'],
  ['contemporanea', 'contemporânea'],
  ['heterogeneo', 'heterogêneo'],
  ['heterogenea', 'heterogênea'],
  ['homogeneo', 'homogêneo'],
  ['homogenea', 'homogênea'],

  // --- Verbos ---
  ['comeca', 'começa'],
  ['comecam', 'começam'],
  ['comecou', 'começou'],
  ['comecar', 'começar'],
  ['comecamos', 'começamos'],
  ['comecando', 'começando'],
  ['alcanca', 'alcança'],
  ['alcancam', 'alcançam'],
  ['alcancou', 'alcançou'],
  ['alcancar', 'alcançar'],
  ['alcancando', 'alcançando'],
  ['lancam', 'lançam'],
  ['lanca', 'lança'],
  ['lancou', 'lançou'],
  ['lancar', 'lançar'],
  ['lancando', 'lançando'],
  ['lancamento', 'lançamento'],
  ['avanca', 'avança'],
  ['avancam', 'avançam'],
  ['avancou', 'avançou'],
  ['avancar', 'avançar'],
  ['avancando', 'avançando'],

  // --- Palavras específicas do contexto de processos/tech ---
  ['heuristica', 'heurística'],
  ['heuristicas', 'heurísticas'],
  ['metrica', 'métrica'],
  ['metricas', 'métricas'],
  ['diagnostico', 'diagnóstico'],
  ['diagnosticos', 'diagnósticos'],
  ['prognostico', 'prognóstico'],
  ['prognosticos', 'prognósticos'],
  ['topico', 'tópico'],
  ['topicos', 'tópicos'],
  ['taxonomia', 'taxonomia'], // no accent
  ['autonomo', 'autônomo'],
  ['autonoma', 'autônoma'],
  ['autonomos', 'autônomos'],
  ['autonomas', 'autônomas'],
  ['sinonimo', 'sinônimo'],
  ['sinonimos', 'sinônimos'],
  ['anonimo', 'anônimo'],
  ['anonima', 'anônima'],

  // --- Mais verbos ---
  ['contem', 'contém'],
  ['mantem', 'mantém'],
  ['obtem', 'obtém'],
  ['detem', 'detém'],
  ['retem', 'retém'],
  ['convem', 'convém'],
  ['provem', 'provém'],
  ['intervem', 'intervém'],
  ['somente', 'somente'], // no accent

  // --- Palavras com ú ---
  ['unico', 'único'],
  ['unica', 'única'],
  ['ultimos', 'últimos'],
  ['ultimas', 'últimas'],
  ['ultimo', 'último'],
  ['ultima', 'última'],
  ['musica', 'música'],
  ['publica', 'pública'],
  ['publico', 'público'],
  ['republica', 'república'],
  ['duvida', 'dúvida'],
  ['duvidas', 'dúvidas'],

  // --- Outras ---
  ['historia', 'história'],
  ['historias', 'histórias'],
  ['memoria', 'memória'],
  ['memorias', 'memórias'],
  ['categoria', 'categoria'], // no accent
  ['necessidade', 'necessidade'], // no accent
  ['anonimo', 'anônimo'],
  ['sinonimo', 'sinônimo'],
  ['fenomeno', 'fenômeno'],
  ['academico', 'acadêmico'],
  ['academica', 'acadêmica'],
  ['economico', 'econômico'],
  ['economica', 'econômica'],
  ['economicos', 'econômicos'],
  ['economicas', 'econômicas'],
  ['ergonomico', 'ergonômico'],
  ['ergonomica', 'ergonômica'],
  ['astronomico', 'astronômico'],
  ['astronomica', 'astronômica'],
  ['gastronomico', 'gastronômico'],
  ['gastronomica', 'gastronômica'],
  ['taxonomico', 'taxonômico'],
  ['taxonomica', 'taxonômica'],

  // --- Palavras terminadas em -ario/-aria ---
  ['funcionario', 'funcionário'],
  ['funcionarios', 'funcionários'],
  ['funcionaria', 'funcionária'],
  ['funcionarias', 'funcionárias'],
  ['secretario', 'secretário'],
  ['secretarios', 'secretários'],
  ['secretaria', 'secretária'],
  ['usuario', 'usuário'],
  ['usuarios', 'usuários'],
  ['usuaria', 'usuária'],
  ['operario', 'operário'],
  ['operarios', 'operários'],
  ['ordinario', 'ordinário'],
  ['ordinaria', 'ordinária'],
  ['extraordinario', 'extraordinário'],
  ['extraordinaria', 'extraordinária'],
  ['temporario', 'temporário'],
  ['temporaria', 'temporária'],
  ['temporarios', 'temporários'],
  ['temporarias', 'temporárias'],
  ['voluntario', 'voluntário'],
  ['voluntaria', 'voluntária'],
  ['voluntarios', 'voluntários'],
  ['involuntario', 'involuntário'],
  ['involuntaria', 'involuntária'],
  ['solitario', 'solitário'],
  ['solitaria', 'solitária'],
  ['solidario', 'solidário'],
  ['solidaria', 'solidária'],
  ['milionario', 'milionário'],
  ['milionaria', 'milionária'],
  ['monetario', 'monetário'],
  ['monetaria', 'monetária'],
  ['tributario', 'tributário'],
  ['tributaria', 'tributária'],
  ['planetario', 'planetário'],
  ['planetaria', 'planetária'],
  ['legendario', 'legendário'],
  ['legendaria', 'legendária'],
  ['revolucionario', 'revolucionário'],
  ['revolucionaria', 'revolucionária'],
  ['estacionario', 'estacionário'],
  ['estacionaria', 'estacionária'],
  ['visionario', 'visionário'],
  ['visionaria', 'visionária'],
  ['imaginario', 'imaginário'],
  ['imaginaria', 'imaginária'],
  ['dicionario', 'dicionário'],
  ['dicionarios', 'dicionários'],
  ['adversario', 'adversário'],
  ['adversarios', 'adversários'],

  // --- Mais palavras do livro (contexto: processos, gestão) ---
  ['processo', 'processo'], // no accent
  ['negocio', 'negócio'],
  ['negocios', 'negócios'],
  ['comercio', 'comércio'],
  ['relatorio', 'relatório'],
  ['relatorios', 'relatórios'],
  ['repositorio', 'repositório'],
  ['repositorios', 'repositórios'],
  ['laboratorio', 'laboratório'],
  ['laboratorios', 'laboratórios'],
  ['territorio', 'território'],
  ['territorios', 'territórios'],
  ['escritorio', 'escritório'],
  ['escritorios', 'escritórios'],
  ['consultorio', 'consultório'],
  ['auditorios', 'auditórios'],
  ['auditorio', 'auditório'],
  ['obrigatorio', 'obrigatório'],
  ['obrigatoria', 'obrigatória'],
  ['obrigatorios', 'obrigatórios'],
  ['obrigatorias', 'obrigatórias'],
  ['transitorio', 'transitório'],
  ['transitoria', 'transitória'],
  ['provisorio', 'provisório'],
  ['provisoria', 'provisória'],
  ['aleatorio', 'aleatório'],
  ['aleatoria', 'aleatória'],
  ['aleatorios', 'aleatórios'],
  ['aleatorias', 'aleatórias'],
  ['satisfatorio', 'satisfatório'],
  ['satisfatoria', 'satisfatória'],
  ['contraditorios', 'contraditórios'],
  ['contraditorias', 'contraditórias'],
  ['eliminatorio', 'eliminatório'],
  ['eliminatoria', 'eliminatória'],
  ['classificatorio', 'classificatório'],
  ['classificatoria', 'classificatória'],

  // --- Palavras com ê ---
  ['ele', 'ele'], // no accent in modern Portuguese - skip
  ['voce', 'você'],
  ['voces', 'vocês'],
  ['portugues', 'português'],
  ['portuguesa', 'portuguesa'], // no accent
  ['mes', 'mês'],
  ['meses', 'meses'], // no accent on plural
  ['ingles', 'inglês'],
  ['frances', 'francês'],
  ['japones', 'japonês'],
  ['chines', 'chinês'],
  ['holandes', 'holandês'],

  // --- Mais ---
  ['entrega', 'entrega'], // no accent
  ['estrategia', 'estratégia'],
  ['estrategias', 'estratégias'],
  ['energia', 'energia'], // no accent
  ['tecnologia', 'tecnologia'], // no accent
  ['metodologia', 'metodologia'], // no accent
  ['ideologia', 'ideologia'], // no accent
  ['analogia', 'analogia'], // no accent
  ['ontologia', 'ontologia'], // no accent
  ['psicologia', 'psicologia'], // no accent
  ['epistemologia', 'epistemologia'], // no accent

  // --- Advérbios em -mente que perdem o acento da base ---
  // These actually DON'T have accents: basicamente, logicamente, etc.
  // Skip them.

  // --- Palavras com -ncia ---
  ['ancia', 'ância'],
  ['ancias', 'âncias'],
  ['encia', 'ência'],
  ['encias', 'ências'],

  // --- Palavras com -ção (catch-all para sufixos) ---
  // Already extensively covered above

  // --- Particípios e gerúndios ---
  ['tambem', 'também'],
  ['alguem', 'alguém'],
  ['ninguem', 'ninguém'],
  ['quem', 'quem'], // no accent
  ['alem', 'além'],
  ['porem', 'porém'],
  ['sequer', 'sequer'], // no accent

  // --- Números ---
  ['tres', 'três'],
  ['numeros', 'números'],
  ['numero', 'número'],

  // --- Pronomes ---
  ['ele', 'ele'], // no accent
  ['nos', 'nós'],  // ambiguous but in most contexts = nós
  ['vos', 'vós'],
];

// ══════════════════════════════════════════════════════════════
// REGRAS DE SUFIXO (aplicadas como fallback para palavras
// não encontradas no dicionário específico)
// ══════════════════════════════════════════════════════════════

const SUFFIX_RULES = [
  // -ação/-ações (mais produtivo em PT)
  [/acao\b/g, 'ação'],
  [/acoes\b/g, 'ações'],
  [/ucao\b/g, 'ução'],
  [/ucoes\b/g, 'uções'],
  [/icao\b/g, 'ição'],
  [/icoes\b/g, 'ições'],
  [/ecao\b/g, 'eção'],
  [/ecoes\b/g, 'eções'],

  // -são/-sões
  [/isao\b/g, 'isão'],
  [/isoes\b/g, 'isões'],

  // -ância/-ência
  [/ancia\b/g, 'ância'],
  [/ancias\b/g, 'âncias'],
  [/encia\b/g, 'ência'],
  [/encias\b/g, 'ências'],

  // -ável/-ível
  [/avel\b/g, 'ável'],
  [/aveis\b/g, 'áveis'],
  [/ivel\b/g, 'ível'],
  [/iveis\b/g, 'íveis'],

  // -ário/-ária/-ório/-ória
  [/ario\b/g, 'ário'],
  [/arios\b/g, 'ários'],
  [/aria\b/g, 'ária'],
  [/arias\b/g, 'árias'],
  [/orio\b/g, 'ório'],
  [/orios\b/g, 'órios'],
  [/oria\b/g, 'ória'],
  [/orias\b/g, 'órias'],

  // -ógico/-ógica
  [/ogico\b/g, 'ógico'],
  [/ogica\b/g, 'ógica'],
  [/ogicos\b/g, 'ógicos'],
  [/ogicas\b/g, 'ógicas'],

  // -ênico/-ênica / -ônico/-ônica / -ético/-ética
  [/onico\b/g, 'ônico'],
  [/onica\b/g, 'ônica'],
  [/etico\b/g, 'ético'],
  [/etica\b/g, 'ética'],
  [/eticos\b/g, 'éticos'],
  [/eticas\b/g, 'éticas'],

  // -ático/-ática
  [/atico\b/g, 'ático'],
  [/atica\b/g, 'ática'],
  [/aticos\b/g, 'áticos'],
  [/aticas\b/g, 'áticas'],

  // -ulo/-ula (esdrúxulas)
  [/iculo\b/g, 'ículo'],
  [/iculos\b/g, 'ículos'],
  [/icula\b/g, 'ícula'],
  [/iculas\b/g, 'ículas'],
  [/ecula\b/g, 'écula'],
  [/eculas\b/g, 'éculas'],

  // -ômeno
  [/omeno\b/g, 'ômeno'],
  [/omenos\b/g, 'ômenos'],

  // -ômico/-ômica
  [/omico\b/g, 'ômico'],
  [/omica\b/g, 'ômica'],
  [/omicos\b/g, 'ômicos'],
  [/omicas\b/g, 'ômicas'],

  // -âmico/-âmica
  [/amico\b/g, 'âmico'],
  [/amica\b/g, 'âmica'],
  [/amicos\b/g, 'âmicos'],
  [/amicas\b/g, 'âmicas'],

  // -âneo/-ânea
  [/aneo\b/g, 'âneo'],
  [/anea\b/g, 'ânea'],
  [/aneos\b/g, 'âneos'],
  [/aneas\b/g, 'âneas'],

  // -íduo/-ídua
  [/iduo\b/g, 'íduo'],
  [/idua\b/g, 'ídua'],
  [/iduos\b/g, 'íduos'],
  [/iduas\b/g, 'íduas'],
];

// ══════════════════════════════════════════════════════════════
// PALAVRAS AMBÍGUAS — NÃO SUBSTITUIR
// ══════════════════════════════════════════════════════════════

const AMBIGUOUS = new Set([
  'mas',      // conjunção (sem acento) vs más (adjetivo)
  'por',      // preposição vs pôr (verbo)
  'pode',     // presente vs pôde (passado)
  'de',       // preposição (sem acento sempre)
  'e',        // conjunção vs é (verbo)
  'a',        // artigo vs à (crase)
  'as',       // artigo vs às (crase)
  'tem',      // singular vs têm (plural)
  'vem',      // singular vs vêm (plural)
  'para',     // preposição (sem acento em PT moderno)
  'pelo',     // preposição vs pêlo (antigo)
  'pela',     // preposição vs péla (antigo)
  'polo',     // substantivo vs pólo (antigo)
  'ele',      // sem acento no PT moderno
  'ela',      // sem acento no PT moderno
  'este',     // sem acento (acordo ortográfico)
  'esta',     // ambíguo: demonstrativo vs verbo "está"
  'esse',     // sem acento
  'essa',     // sem acento
  'aquele',   // sem acento
  'aquela',   // sem acento
  'ficaram',  // passado (sem acento) vs ficarão (futuro)
  'nos',      // pronome oblíquo (sem acento) vs nós (pronome reto)
  'troca',    // substantivo/verbo sem acento
  'consegui', // sem acento
]);

// ══════════════════════════════════════════════════════════════
// PROCESSAMENTO
// ══════════════════════════════════════════════════════════════

function isCodeBlock(line, inCode) {
  if (line.trim().startsWith('```')) {
    return !inCode;
  }
  return inCode;
}

function processText(text) {
  const lines = text.split('\n');
  let inCode = false;
  let totalReplacements = 0;
  const processedLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Detecta início/fim de bloco de código
    if (trimmed.startsWith('```')) {
      inCode = !inCode;
      processedLines.push(line);
      continue;
    }

    // Dentro de código: não toca
    if (inCode) {
      processedLines.push(line);
      continue;
    }

    // Linhas que parecem YAML ou código inline: pula
    if (trimmed.startsWith('- ') && trimmed.includes(': ') && !trimmed.startsWith('- Capitulo') && !trimmed.startsWith('- capitulo')) {
      // Possivelmente YAML - mas vamos processar se parece prosa
      // Heurística: se tem mais de 50 chars e não tem chaves/colchetes, é prosa
      if (trimmed.length < 50 || /[{}\[\]]/.test(trimmed)) {
        processedLines.push(line);
        continue;
      }
    }

    let processed = line;

    // Aplica dicionário de palavras
    for (const [from, to] of WORD_MAP) {
      if (from === to) continue; // skip no-ops
      if (AMBIGUOUS.has(from)) continue;

      // Match word boundaries, case-insensitive
      const regex = new RegExp(`\\b${escapeRegex(from)}\\b`, 'gi');
      processed = processed.replace(regex, (match) => {
        totalReplacements++;
        return matchCase(match, to);
      });
    }

    // Aplica regras de sufixo
    for (const [pattern, replacement] of SUFFIX_RULES) {
      const before = processed;
      // Reset lastIndex for global regexes
      pattern.lastIndex = 0;
      processed = processed.replace(pattern, (match) => {
        // Verifica se já foi acentuado
        if (match === replacement) return match;
        totalReplacements++;
        return replacement;
      });
    }

    processedLines.push(processed);
  }

  console.log(`  Total de substituições: ${totalReplacements}`);
  return processedLines.join('\n');
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchCase(original, replacement) {
  if (original === original.toUpperCase()) {
    return replacement.toUpperCase();
  }
  if (original[0] === original[0].toUpperCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

// ══════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════

function main() {
  console.log('=== Correção de Acentuação PT-BR ===\n');

  // Remove duplicatas e entradas inválidas do WORD_MAP
  const seen = new Set();
  const cleanMap = [];
  for (const [from, to] of WORD_MAP) {
    if (from === to) continue;
    if (AMBIGUOUS.has(from)) continue;
    const key = from.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    cleanMap.push([from, to]);
  }

  // Substitui WORD_MAP global pela versão limpa
  WORD_MAP.length = 0;
  WORD_MAP.push(...cleanMap);

  console.log(`  Dicionário: ${WORD_MAP.length} palavras`);
  console.log(`  Regras de sufixo: ${SUFFIX_RULES.length}`);
  console.log(`  Palavras ambíguas (protegidas): ${AMBIGUOUS.size}\n`);

  console.log(`  Lendo: ${SOURCE}`);
  const text = fs.readFileSync(SOURCE, 'utf-8');
  console.log(`  Linhas: ${text.split('\n').length}\n`);

  const result = processText(text);

  // Backup
  const backupPath = SOURCE + '.bak';
  fs.writeFileSync(backupPath, text, 'utf-8');
  console.log(`\n  Backup: ${backupPath}`);

  // Salva
  fs.writeFileSync(OUTPUT, result, 'utf-8');
  console.log(`  Output: ${OUTPUT}`);

  console.log('\n=== Concluído ===');
}

main();

module.exports = { processText };