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

// Interfaces

export interface AcmComparavel {
  id: string
  consultant_id: string
  edificio_referencia_id: string | null
  endereco: string
  coordinates: string | null // PostGIS geography as WKT
  area_m2: number
  preco: number
  preco_m2: number | null
  is_venda_real: boolean
  fonte: FonteComparavel
  scraped_listing_id: string | null
  data_referencia: string | null
  notas: string | null
  created_at: string
  updated_at: string
}

export interface AcmComparavelComDistancia extends AcmComparavel {
  distancia_m: number
}

/** Result from fn_comparaveis_no_raio RPC */
export interface ComparavelNoRaio {
  comparavel_id: string
  endereco: string
  area_m2: number
  preco: number
  preco_m2: number
  is_venda_real: boolean
  fonte: FonteComparavel
  distancia_m: number
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
export type TipoFeed = 'novo_fisbo' | 'reducao_preco' | 'ex_imobiliaria_fisbo' | 'novo_raio_desbloqueado' | 'lead_parado' | 'agendamento_proximo' | 'seed_completo' | 'sync_completo'
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
