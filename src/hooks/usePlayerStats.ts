import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface WLStats {
  wins: number
  losses: number
}

export function usePlayerWL(playerId: string): { data: WLStats | null; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ['player-wl', playerId],
    enabled: !!playerId,
    queryFn: async (): Promise<WLStats> => {
      const [{ data: gamesA, error: errA }, { data: gamesB, error: errB }] = await Promise.all([
        supabase
          .from('games')
          .select('team_a_score, team_b_score')
          .contains('team_a_player_ids', [playerId]),
        supabase
          .from('games')
          .select('team_a_score, team_b_score')
          .contains('team_b_player_ids', [playerId]),
      ])
      if (errA) throw errA
      if (errB) throw errB

      let wins = 0
      let losses = 0

      for (const g of gamesA ?? []) {
        if (g.team_a_score > g.team_b_score) wins++
        else losses++
      }
      for (const g of gamesB ?? []) {
        if (g.team_b_score > g.team_a_score) wins++
        else losses++
      }
      return { wins, losses }
    },
  })
  return { data: data ?? null, isLoading }
}

export interface ShootingStats {
  ftMakes: number
  ftAttempts: number
  midMakes: number
  midAttempts: number
  tptMakes: number
  tptAttempts: number
}

export function usePlayerShooting(playerId: string): {
  data: ShootingStats | null
  isLoading: boolean
} {
  const { data, isLoading } = useQuery({
    queryKey: ['player-shooting', playerId],
    enabled: !!playerId,
    queryFn: async (): Promise<ShootingStats> => {
      const { data: entries, error } = await supabase
        .from('heat_entries')
        .select('makes, attempts, drill:drills(shot_type)')
        .eq('player_id', playerId)
      if (error) throw error

      type Row = { makes: number; attempts: number; drill: { shot_type: string } | null }
      const rows = entries as unknown as Row[]

      const stats: ShootingStats = {
        ftMakes: 0, ftAttempts: 0,
        midMakes: 0, midAttempts: 0,
        tptMakes: 0, tptAttempts: 0,
      }

      for (const row of rows) {
        const type = row.drill?.shot_type
        if (type === 'freeThrow') { stats.ftMakes += row.makes; stats.ftAttempts += row.attempts }
        else if (type === 'midRange') { stats.midMakes += row.makes; stats.midAttempts += row.attempts }
        else if (type === 'threePoint') { stats.tptMakes += row.makes; stats.tptAttempts += row.attempts }
      }
      return stats
    },
  })
  return { data: data ?? null, isLoading }
}
