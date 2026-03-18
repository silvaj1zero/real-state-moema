'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Script, CategoriaScript, EtapaFunil } from '@/lib/supabase/types'

interface ScriptFilters {
  categoria?: CategoriaScript
  etapaFunil?: EtapaFunil
  search?: string
}

export function useScripts(filters?: ScriptFilters) {
  return useQuery({
    queryKey: ['scripts', filters?.categoria, filters?.etapaFunil, filters?.search],
    queryFn: async (): Promise<Script[]> => {
      const supabase = createClient()

      let query = supabase
        .from('scripts')
        .select('*')
        .order('is_default', { ascending: false })
        .order('categoria')
        .order('titulo')

      if (filters?.categoria) {
        query = query.eq('categoria', filters.categoria)
      }

      if (filters?.etapaFunil) {
        query = query.eq('etapa_funil', filters.etapaFunil)
      }

      if (filters?.search) {
        const term = `%${filters.search}%`
        query = query.or(`titulo.ilike.${term},objecao.ilike.${term},resposta.ilike.${term}`)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching scripts:', error)
        return []
      }

      return (data as Script[]) || []
    },
    staleTime: 5 * 60 * 1000, // Scripts change infrequently
  })
}

interface CreateScriptInput {
  titulo: string
  categoria: CategoriaScript
  objecao: string
  resposta: string
  tecnica: string | null
  etapa_funil: EtapaFunil | null
}

export function useCreateScript() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateScriptInput): Promise<Script | null> => {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()

      const { data, error } = await supabase
        .from('scripts')
        .insert({
          ...input,
          is_default: false,
          consultant_id: user?.id ?? null,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating script:', error)
        throw new Error(`Erro ao criar script: ${error.message}`)
      }

      return data as Script
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scripts'] })
    },
  })
}
