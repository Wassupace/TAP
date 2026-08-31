import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { dbInsert, dbUpdate, dbDelete } from '../lib/db'
import { cachedQuery } from '../lib/readCache'
import type { Player } from '../types'

export function usePlayers() {
  return useQuery({
    queryKey: ['players'],
    queryFn: () => cachedQuery('players', async () => {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('name')
      if (error) throw error
      return data as Player[]
    }),
  })
}

export function usePlayer(id: string) {
  return useQuery({
    queryKey: ['player', id],
    enabled: !!id,
    queryFn: () => cachedQuery(`player:${id}`, async () => {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as Player
    }),
  })
}

export function useAddPlayer() {
  const qc = useQueryClient()
  return useMutation({
    // Task 5 (PRD §1.3): routed through dbInsert so an offline add is
    // queued instead of silently lost. The id is generated client-side
    // (rather than left to the DB default) so it's known synchronously —
    // callers like PlayerPickerModal need the real id immediately — and so
    // a later retry via the queue's upsert-by-id is idempotent.
    mutationFn: async (player: Omit<Player, 'id' | 'created_at'>) => {
      const created: Player = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...player }
      await dbInsert('players', created as unknown as Record<string, unknown>)
      return created
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['players'] })
      // Optimistic — makes the new player visible immediately even while
      // the write is still queued offline (§1.3: UI always reads local state).
      qc.setQueryData<Player[]>(['players'], (prev) => prev ? [...prev, created] : [created])
    },
  })
}

export function useUpdatePlayer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Player> & { id: string }) => {
      await dbUpdate('players', id, patch)
      return { id, patch }
    },
    onSuccess: ({ id, patch }) => {
      qc.invalidateQueries({ queryKey: ['players'] })
      qc.invalidateQueries({ queryKey: ['player', id] })
      qc.setQueryData<Player[]>(['players'], (prev) => prev?.map(p => p.id === id ? { ...p, ...patch } : p))
      qc.setQueryData<Player>(['player', id], (prev) => prev ? { ...prev, ...patch } : prev)
    },
  })
}

export function useDeletePlayer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await dbDelete('players', id)
      return id
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ['players'] })
      qc.setQueryData<Player[]>(['players'], (prev) => prev?.filter(p => p.id !== id))
    },
  })
}
