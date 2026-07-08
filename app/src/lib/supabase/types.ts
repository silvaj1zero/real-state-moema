// Database types derived from schema.sql (Epic 1 + Epic 2)

// =============================================================================
// Epic 1 — Foundation
// =============================================================================

export type StatusVarredura = 'nao_visitado' | 'mapeado' | 'em_prospeccao' | 'concluido'
export type TipologiaEdificio = 'residencial_vertical' | 'residencial_horizontal' | 'comercial' | 'misto' | 'outro'
export type PadraoEdificio = 'popular' | 'medio' | 'medio_alto' | 'alto' | 'luxo'
export type AberturaCorretores = 'zelador_amigavel' | 'rigido' | 'exige_autorizacao' | 'desconhecido'
export type OrigemEdificio = 'manual' | 'seed' | 'api'

export interface Edificio {
  id: string
  nome: string
  endereco: string
  endereco_normalizado: string | null
  coordinates: string // PostGIS geography as WKT
  bairro: string | null
  cep: string | null
  cidade: string
  estado: string
  origem: OrigemEdificio
  seed_source: string | null
  seed_source_secondary: string | null
  verificado: boolean
  created_by: string | null
  // Story 3.5 — GeoSampa IPTU enrichment fields
  total_units: number | null
  area_construida: number | null
  ano_construcao: number | null
  padrao_iptu: string | null
  tipo_uso_iptu: string | null
  num_pavimentos: number | null
  sql_lote: string | null
  edited_fields: string[] | null
  created_at: string
  updated_at: string
}

export interface EdificioQualificacao {
  id: string
  edificio_id: string
  consultant_id: string
  tipologia: TipologiaEdificio | null
  padrao: PadraoEdificio | null
  status_varredura: StatusVarredura
  abertura_corretores: AberturaCorretores
  oportunidades_count: number
  notas: string | null
  is_fisbo_detected: boolean
  created_at: string
  updated_at: string
}

export interface EdificioWithQualificacao extends Edificio {
  edificios_qualificacoes: EdificioQualificacao[]
  // Parsed coordinates for map
  lat?: number
  lng?: number
}

// =============================================================================
// Epic 2 — Leads, Funil de Vendas & Metodologia RE/MAX
// =============================================================================

// Enums (match migration 002_epic2_methodology.sql)

export type EtapaFunil =
  | 'contato'
  | 'v1_agendada'
  | 'v1_realizada'
  | 'v2_agendada'
  | 'v2_realizada'
  | 'representacao'
  | 'venda'
  | 'perdido'

export type OrigemLead =
  | 'digital'
  | 'placa'
  | 'zelador'
  | 'indicacao'
  | 'fisbo_scraping'
  | 'referral'
  | 'captei'

export type PrazoUrgencia = 'imediato' | 'tres_meses' | 'seis_meses' | 'sem_pressa'

export type FonteFrog = 'familia' | 'relacionamentos' | 'organizacoes' | 'geografia'

export type TipoAgendamento = 'v1' | 'v2' | 'follow_up' | 'safari' | 'outro'

export type StatusAgendamento = 'agendado' | 'confirmado' | 'realizado' | 'cancelado' | 'reagendado'

export type FuncaoInformante = 'zelador' | 'porteiro' | 'gerente_predial' | 'comerciante' | 'sindico' | 'outro'

export type CategoriaScript =
  | 'objecao_imobiliaria'
  | 'objecao_experiencia'
  | 'objecao_exclusividade'
  | 'objecao_comissao'
  | 'objecao_preco'
  | 'abordagem_inicial'
  | 'fechamento'
  | 'follow_up'

export type TipoChecklist = 'preparacao_v2' | 'home_staging' | 'pre_safari'

/** Story 10.1 — resultado da tentativa de contato na call list FISBO. */
export type ContatoStatus =
  | 'nao_contatado'
  | 'atendeu'
  | 'nao_atendeu'
  | 'retornar'
  | 'agendado'
  | 'descartado'

// Interfaces

export interface Lead {
  id: string
  consultant_id: string
  edificio_id: string | null
  informante_id: string | null
  nome: string
  unidade: string | null
  telefone: string | null
  email: string | null
  origem: OrigemLead
  fonte_frog: FonteFrog | null
  etapa_funil: EtapaFunil
  etapa_changed_at: string
  motivacao_venda: string | null
  prazo_urgencia: PrazoUrgencia | null
  fotos_v1: string[] | null
  perfil_psicografico: 'investidor' | 'herdeiro' | 'mudanca_cidade' | 'upgrade_downgrade' | null
  valoriza: 'preco' | 'rapidez' | 'discricao' | 'seguranca' | null
  notas: string | null
  is_fisbo: boolean
  referral_id: string | null
  // Story 10.1 (Epic 10) — status de tentativa de contato (migration 022).
  contato_status: ContatoStatus
  contato_status_at: string | null
  contato_notas: string | null
  scraped_listing_id: string | null
  created_at: string
  updated_at: string
}

export interface LeadWithEdificio extends Lead {
  edificios: Pick<Edificio, 'id' | 'nome' | 'endereco'> | null
}

export interface Informante {
  id: string
  consultant_id: string
  nome: string
  funcao: FuncaoInformante
  telefone: string | null
  qualidade_relacao: 'frio' | 'morno' | 'quente'
  notas: string | null
  total_investido_gentileza: number
  comissao_devida: number
  comissao_paga: number
  created_at: string
  updated_at: string
}

export interface InformanteEdificio {
  informante_id: string
  edificio_id: string
  created_at: string
}

export interface AcaoGentileza {
  id: string
  informante_id: string
  consultant_id: string
  tipo: 'cafe' | 'brinde' | 'agradecimento_escrito' | 'presente' | 'outro'
  descricao: string | null
  valor: number
  data_acao: string
  created_at: string
}

export interface FunnelTransition {
  id: string
  lead_id: string
  consultant_id: string
  from_etapa: EtapaFunil | null
  to_etapa: EtapaFunil
  is_retrocesso: boolean
  justificativa: string | null
  observacao: string | null
  created_at: string
}

export interface Agendamento {
  id: string
  lead_id: string
  consultant_id: string
  tipo: TipoAgendamento
  status: StatusAgendamento
  data_hora: string
  opcao_alternativa: string | null
  notas: string | null
  created_at: string
  updated_at: string
}

export interface Script {
  id: string
  consultant_id: string | null
  titulo: string
  categoria: CategoriaScript
  etapa_funil: EtapaFunil | null
  objecao: string
  resposta: string
  tecnica: string | null
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface FrogContact {
  id: string
  consultant_id: string
  nome: string
  categoria: FonteFrog
  telefone: string | null
  email: string | null
  notas: string | null
  leads_gerados: number
  created_at: string
  updated_at: string
}

export interface ChecklistPreparacao {
  id: string
  lead_id: string
  consultant_id: string
  tipo: TipoChecklist
  acm_preparada: boolean
  dossie_montado: boolean
  home_staging_enviado: boolean
  matricula_verificada: boolean
  plano_marketing_rascunhado: boolean
  data_v2: string | null
  created_at: string
  updated_at: string
}

// =============================================================================
// Epic 3 — Inteligência, ACM & Agentes de Automação
// =============================================================================

// Enums (match migration 003_epic3_intelligence.sql)

export type FonteComparavel = 'manual' | 'scraping' | 'captei' | 'cartorio'

export type PortalScraping = 'zap' | 'olx' | 'vivareal' | 'quintoandar' | 'outro'

export type TipoAnunciante = 'proprietario' | 'corretor' | 'imobiliaria' | 'desconhecido'

/** Story 8.1 — Score da metodologia ACM (calculado na 8.2, persistido opcional). */
export type AcmScore = 'AAA' | 'AA' | 'A' | 'B'

/** Story 8.1 — status de recuperação do anúncio (pedido vs. fechado). */
export type AcmStatusAnuncio =
  | 'confirmado'
  | 'parcial'
  | 'off_market'
  | 'nao_recuperavel'

// Interfaces

export interface AcmComparavel {
  id: string
  consultant_id: string
  edificio_referencia_id: string | null
  endereco: string
  coordinates: string | null // PostGIS geography as WKT
  /** @deprecated Story 8.1 — usar `area_construida_m2`. Coluna legada por 1 release. */
  area_m2: number
  preco: number
  preco_m2: number | null
  is_venda_real: boolean
  fonte: FonteComparavel
  scraped_listing_id: string | null
  data_referencia: string | null
  notas: string | null
  // Story 8.1 — campos da metodologia ACM (migration 20260615000002).
  // Todos nullable: linhas legadas / fontes sem o dado ficam NULL.
  area_construida_m2?: number | null
  area_terreno_m2?: number | null
  preco_m2_terreno?: number | null
  testada_m?: number | null
  ano_construcao?: number | null
  ano_referencia?: number | null
  padrao_iptu?: number | null
  valor_venal?: number | null
  tipo?: string | null
  sql_cadastral?: string | null
  dormitorios?: number | null
  suites?: number | null
  vagas?: number | null
  score?: AcmScore | null
  preco_pedido?: number | null
  desagio_percent?: number | null
  status_anuncio?: AcmStatusAnuncio | null
  created_at: string
  updated_at: string
}

export interface AcmComparavelComDistancia extends AcmComparavel {
  distancia_m: number
}

/**
 * Result from fn_comparaveis_no_raio RPC.
 *
 * Story 8.1 (AC2) — campos da metodologia adicionados como opcionais: a RPC
 * passa a retorná-los após o `CREATE OR REPLACE`, mas o tipo permanece
 * tolerante para não quebrar consumidores enquanto a função não é atualizada
 * (graceful — o adapter cai para `area_m2` quando `area_construida_m2` ausente).
 */
export interface ComparavelNoRaio {
  comparavel_id: string
  endereco: string
  /** @deprecated Story 8.1 — preferir `area_construida_m2`. */
  area_m2: number
  preco: number
  preco_m2: number
  is_venda_real: boolean
  fonte: FonteComparavel
  distancia_m: number
  // Story 8.1 — campos da metodologia (RPC pós-CREATE OR REPLACE).
  area_construida_m2?: number | null
  area_terreno_m2?: number | null
  preco_m2_terreno?: number | null
  dormitorios?: number | null
  suites?: number | null
  vagas?: number | null
  score?: AcmScore | null
  sql_cadastral?: string | null
  ano_referencia?: number | null
  preco_pedido?: number | null
  desagio_percent?: number | null
  status_anuncio?: AcmStatusAnuncio | null
  // Story 8.7 — RPC fn_comparaveis_no_raio (migration 20260616000001): coords p/ pins
  // do mapa + link do anúncio (revisão humana via scraped_listings).
  latitude?: number | null
  longitude?: number | null
  anuncio_url?: string | null
}

// =============================================================================
// Epic 4 — Parcerias Ganha/Ganha & Escala
// =============================================================================

// Enums (match migration 004_epic4_partnerships.sql)

export type StatusReferral =
  | 'enviada'
  | 'aceita'
  | 'recusada'
  | 'em_andamento'
  | 'convertida'
  | 'comissao_paga'
  | 'expirada'

export type DirecaoReferral = 'enviado' | 'recebido'

// Interfaces

export interface Referral {
  id: string
  consultant_id: string
  direcao: DirecaoReferral
  parceiro_nome: string
  parceiro_franquia: string | null
  parceiro_telefone: string | null
  parceiro_email: string | null
  parceiro_regiao: string | null
  cliente_perfil: string | null
  tipologia_desejada: string | null
  faixa_preco_min: number | null
  faixa_preco_max: number | null
  regiao_desejada: string | null
  prazo_validade: string | null
  status: StatusReferral
  lead_id: string | null
  notas: string | null
  created_at: string
  updated_at: string
}

export type StatusSafari = 'planejado' | 'confirmado' | 'realizado' | 'cancelado'
export type StatusRsvp = 'convidado' | 'confirmado' | 'recusado' | 'pendente'

export interface SafariEvent {
  id: string
  consultant_id: string
  lead_id: string | null
  edificio_id: string | null
  titulo: string
  descricao: string | null
  data_hora: string
  endereco: string | null
  vagas: number
  status: StatusSafari
  feedback: string | null
  propostas_recebidas: number
  created_at: string
  updated_at: string
}

export interface SafariEventRsvp {
  id: string
  safari_event_id: string
  nome_convidado: string
  franquia: string | null
  telefone: string | null
  status: StatusRsvp
  notas: string | null
  created_at: string
}

export type StatusPagamento = 'pendente' | 'recebido' | 'pago_informante' | 'pago_parceiro' | 'completo'
export type TipoSplit = 'padrao' | 'referral' | 'informante' | 'clausula_relacionamento'

export interface Comissao {
  id: string
  consultant_id: string
  lead_id: string | null
  valor_imovel: number
  percentual_comissao: number
  valor_bruto: number
  split_consultora: number | null
  split_franquia: number | null
  split_informante: number | null
  split_referral: number | null
  tipo_split: TipoSplit
  percentual_clausula: number
  informante_id: string | null
  referral_id: string | null
  status_pagamento: StatusPagamento
  data_recebimento: string | null
  data_pagamento_informante: string | null
  data_pagamento_referral: string | null
  notas: string | null
  created_at: string
  updated_at: string
}

export interface MarketingPlan {
  id: string
  lead_id: string
  consultant_id: string
  publicar_zap: boolean
  publicar_zap_data: string | null
  publicar_zap_url: string | null
  publicar_olx: boolean
  publicar_olx_data: string | null
  publicar_olx_url: string | null
  publicar_vivareal: boolean
  publicar_vivareal_data: string | null
  postar_instagram: boolean
  postar_instagram_data: string | null
  postar_facebook: boolean
  postar_facebook_data: string | null
  fotos_profissionais: boolean
  fotos_profissionais_data: string | null
  tour_virtual: boolean
  tour_virtual_url: string | null
  placa_fisica: boolean
  safari_planejado: boolean
  safari_event_id: string | null
  notas: string | null
  created_at: string
  updated_at: string
}

// =============================================================================
// Epic 3 (continued)
// =============================================================================

export type GeocodingStatus = 'pending' | 'success' | 'failed' | 'manual'
export type MatchMethod = 'postgis_50m' | 'geocoding' | 'manual' | 'unmatched'

export interface ScrapedListing {
  id: string
  portal: PortalScraping
  external_id: string
  url: string | null
  tipo_anunciante: TipoAnunciante
  /** Story 7.13 — publisherType nativo (ZAP/VivaReal). NULL se ausente. */
  publisher_type: 'owner' | 'agency' | 'developer' | null
  endereco: string | null
  endereco_normalizado: string | null
  coordinates: string | null
  geocoding_status: GeocodingStatus
  bairro: string | null
  preco: number | null
  area_m2: number | null
  preco_m2: number | null
  tipologia: string | null
  quartos: number | null
  descricao: string | null
  is_fisbo: boolean
  first_seen_at: string
  last_seen_at: string
  removed_at: string | null
  preco_anterior: number | null
  preco_changed_at: string | null
  matched_edificio_id: string | null
  match_method: MatchMethod
  match_distance_m: number | null
  merged_group_id: string | null
  is_active: boolean
  // Epic 6 — Contact enrichment fields
  nome_anunciante: string | null
  telefone_anunciante: string | null
  email_anunciante: string | null
  whatsapp_anunciante: string | null
  creci_anunciante: string | null
  contact_enriched_at: string | null
  lgpd_consent_origin: string | null
  created_at: string
  updated_at: string
}

// Story 3.6 — Cross-referencing
export interface ListingCrossRef {
  id: string
  listing_a_id: string
  listing_b_id: string
  match_score: number
  match_method: string | null
  is_confirmed: boolean
  merged_at: string | null
  reviewed_by: string | null
  created_at: string
}

// Intelligence Feed (Story 3.7)
export type TipoFeed = 'novo_fisbo' | 'reducao_preco' | 'ex_imobiliaria_fisbo' | 'novo_raio_desbloqueado' | 'lead_parado' | 'agendamento_proximo' | 'seed_completo' | 'sync_completo' | 'busca_parametrica' | 'owner_lookup_completo'
export type PrioridadeFeed = 'alta' | 'media' | 'baixa'

export interface IntelligenceFeedEvent {
  id: string
  consultant_id: string
  tipo: TipoFeed
  prioridade: PrioridadeFeed
  titulo: string
  descricao: string | null
  coordinates: string | null
  edificio_id: string | null
  lead_id: string | null
  scraped_listing_id: string | null
  metadata: Record<string, unknown> | null
  is_read: boolean
  is_push_sent: boolean
  created_at: string
}

// =============================================================================
// Epic 6 — Busca Parametrica On-Demand com Enriquecimento de Contatos
// =============================================================================

// Story 6.6 — Lookup de proprietario via cartorio (migration 023)
export type OwnerLookupRowStatus = 'pending' | 'success' | 'failed' | 'not_found'

export interface OwnerLookup {
  id: string
  consultant_id: string
  edificio_id: string | null
  sql_lote: string | null
  endereco: string | null
  matricula: string | null
  nome_proprietario: string | null
  cpf_cnpj_masked: string | null
  cartorio: string | null
  data_matricula: string | null
  ultima_transacao: string | null
  fonte: string
  custo_brl: number
  raw_response: Record<string, unknown> | null
  status: OwnerLookupRowStatus
  error_message: string | null
  created_at: string
  updated_at: string
}

export type SearchStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface PortalSearchParams {
  quartos_min?: number | null
  quartos_max?: number | null
  suites_min?: number | null
  banheiros_min?: number | null
  banheiros_max?: number | null
  area_min?: number | null
  area_max?: number | null
  preco_min?: number | null
  preco_max?: number | null
  tipo_transacao?: 'venda' | 'aluguel'
  bairros?: string[] | null
  cep?: string | null
  endereco?: string | null
  raio_metros?: number
  center_lat?: number
  center_lng?: number
  edificio_ids?: string[] | null
  portais?: string[]
}

export interface PortalSearch {
  id: string
  consultant_id: string
  status: SearchStatus
  search_params: PortalSearchParams
  portals: string[]
  results_count: number
  new_listings_count: number
  fisbo_count: number
  apify_run_ids: Record<string, string> | null
  apify_cost_usd: number | null
  error_message: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface PortalSearchResult {
  id: string
  search_id: string
  scraped_listing_id: string
  is_new: boolean
  created_at: string
}

/** Result from fn_scraped_listings_parametric RPC */
export interface ScrapedListingParametric extends Omit<ScrapedListing, 'coordinates' | 'geocoding_status' | 'preco_changed_at' | 'merged_group_id' | 'created_at' | 'updated_at'> {
  distancia_m: number
}
