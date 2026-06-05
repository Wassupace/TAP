import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Player } from '../types'

export function usePlayers() {
  return useQuery({
    queryKey: ['players'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('name')
      if (error) throw error
      return data as Player[]
    },
  })
}

export function usePlayer(id: string) {
  return useQuery({
    queryKey: ['player', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as Player
    },
  })
}

export function useAddPlayer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (player: Omit<Player, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('players')
        .insert(player)
        .select()
        .single()
      if (error) throw error
      return data as Player
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['players'] }),
  })
}

export function useUpdatePlayer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Player> & { id: string }) => {
      const { error } = await supabase.from('players').update(patch).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['players'] })
      qc.invalidateQueries({ queryKey: ['player', vars.id] })
    },
  })
}

export function useDeletePlayer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('players').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['players'] }),
  })
}
