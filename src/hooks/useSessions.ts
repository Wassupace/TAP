import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Session, SessionAttendance } from '../types'

export function useSessions(year: number, month: number) {
  return useQuery({
    queryKey: ['sessions', year, month],
    queryFn: async () => {
      const start = `${year}-${String(month).padStart(2, '0')}-01`
      const lastDay = new Date(year, month, 0).getDate()
      const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .gte('date', start)
        .lte('date', end)
        .order('date')
      if (error) throw error
      return data as Session[]
    },
  })
}

export function useSession(id: string) {
  return useQuery({
    queryKey: ['session', id],
    enabled: !!id && id !== 'morning',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as Session
    },
  })
}

export function useSessionAttendances(sessionId: string) {
  return useQuery({
    queryKey: ['session-attendances', sessionId],
    enabled: !!sessionId && sessionId !== 'morning',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_attendances')
        .select('*')
        .eq('session_id', sessionId)
      if (error) throw error
      return data as SessionAttendance[]
    },
  })
}

export function useOpenSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      location,
      date,
      expectedPlayerIds = [],
    }: {
      location: string
      date: string
      expectedPlayerIds?: string[]
    }) => {
      const { data, error } = await supabase
        .from('sessions')
        .insert({
          location,
          date,
          state: 'active',
          started_at: new Date().toISOString(),
          is_recurring: false,
          expected_player_ids: expectedPlayerIds,
        })
        .select()
        .single()
      if (error) throw error
      return data as Session
    },
    onSuccess: (s) => {
      qc.invalidateQueries({ queryKey: ['sessions'] })
      qc.setQueryData(['session', s.id], s)
    },
  })
}

export function useEndSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const patch: Record<string, unknown> = {
        state: 'completed',
        ended_at: new Date().toISOString(),
      }
      if (notes !== undefined) patch.notes = notes
      const { error } = await supabase.from('sessions').update(patch).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  })
}

export function useActivateSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      sessionId,
      presentPlayerIds,
    }: {
      sessionId: string
      presentPlayerIds: string[]
    }) => {
      // Update session state
      const { error: sessErr } = await supabase
        .from('sessions')
        .update({ state: 'active', started_at: new Date().toISOString() })
        .eq('id', sessionId)
      if (sessErr) throw sessErr

      // Upsert attendance records
      if (presentPlayerIds.length > 0) {
        const records = presentPlayerIds.map((playerId) => ({
          session_id: sessionId,
          player_id: playerId,
          is_expected: true,
          arrived_at: new Date().toISOString(),
        }))
        const { error: attErr } = await supabase
          .from('session_attendances')
          .upsert(records, { onConflict: 'session_id,player_id' })
        if (attErr) throw attErr
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['session', vars.sessionId] })
      qc.invalidateQueries({ queryKey: ['session-attendances', vars.sessionId] })
      qc.invalidateQueries({ queryKey: ['sessions'] })
    },
  })
}
