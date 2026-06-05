import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { AttendanceStats } from '../types'

export function useAttendanceStats(playerId: string): {
  data: AttendanceStats | null
  isLoading: boolean
} {
  const { data, isLoading } = useQuery({
    queryKey: ['attendance-stats', playerId],
    enabled: !!playerId,
    queryFn: async (): Promise<AttendanceStats> => {
      const { data: rows, error } = await supabase
        .from('session_attendances')
        .select('arrived_at, session:sessions(date, location, state)')
        .eq('player_id', playerId)
        .not('arrived_at', 'is', null)
        .order('arrived_at', { ascending: false })

      if (error) throw error

      type Row = {
        arrived_at: string
        session: { date: string; location: string; state: string } | null
      }
      const attended = (rows as unknown as Row[]).filter(r => r.session?.state === 'completed')

      if (attended.length === 0) {
        return { totalSessions: 0, streak: 0, lastSeen: null, lastLocation: null }
      }

      // Count streak: consecutive weekly sessions (allow up to 8-day gap)
      let streak = 0
      let prevDate: string | null = null
      for (const row of attended) {
        const d = row.session!.date
        if (prevDate === null) { streak = 1; prevDate = d; continue }
        const diff = Math.round(
          (new Date(prevDate).getTime() - new Date(d).getTime()) / 86_400_000
        )
        if (diff <= 8) { streak++; prevDate = d }
        else break
      }

      return {
        totalSessions: attended.length,
        streak,
        lastSeen:     attended[0].session!.date,
        lastLocation: attended[0].session!.location,
      }
    },
  })

  return { data: data ?? null, isLoading }
}
