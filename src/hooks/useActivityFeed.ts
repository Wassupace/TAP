import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { ActivityRecord } from '../types'

export function useActivityFeed(sessionId: string | null) {
  return useQuery({
    queryKey: ['activity-feed', sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_records')
        .select('*')
        .eq('session_id', sessionId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as ActivityRecord[]
    },
    refetchInterval: 10_000, // poll every 10s when session is active
  })
}

export function useLogActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (record: Omit<ActivityRecord, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('activity_records')
        .insert(record)
        .select()
        .single()
      if (error) throw error
      return data as ActivityRecord
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['activity-feed', vars.session_id] })
    },
  })
}
