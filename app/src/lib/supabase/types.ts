// Database types derived from schema.sql (Epic 1)

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
  verificado: boolean
  created_by: string | null
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
