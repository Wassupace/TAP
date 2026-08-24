import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface WLStats {
  wins: number
  losses: number
}

export interface GameSideRow {
  team_a_score: number
  team_b_score: number
  team_a_player_ids: string[]
  team_b_player_ids: string[]
}

/**
 * Win/loss tally for one player, scoped to a single "side" (team A or team
 * B) across a list of `games` rows. A game only counts toward this side if
 * the player actually appears in that side's `team_*_player_ids` for that
 * specific game — so this is safe to call against either a pre-filtered
 * list (usePlayerWL's `.contains(...)`-scoped queries below, where the
 * membership check is always true) or an unfiltered list spanning multiple
 * games with different rosters per game (a single match's own `games`
 * embed, used by `useRecentPlayerActivity`'s per-match W/L branch — see
 * that file for the reuse). Ties count as a loss, matching this hook's
 * original (pre-extraction) behavior — not "fixed" here, out of scope.
 *
 * Exported so `useRecentPlayerActivity.ts` can reuse this exact
 * win-counting logic scoped to one match's games, instead of
 * reimplementing it (Task 9 brief's explicit requirement).
 */
export function tallyBySide(games: GameSideRow[], playerId: string, side: 'a' | 'b'): WLStats {
  let wins = 0
  let losses = 0
  for (const g of games) {
    const onThisSide = side === 'a'
      ? g.team_a_player_ids?.includes(playerId)
      : g.team_b_player_ids?.includes(playerId)
    if (!onThisSide) continue
    const ownScore = side === 'a' ? g.team_a_score : g.team_b_score
    const oppScore = side === 'a' ? g.team_b_score : g.team_a_score
    if (ownScore > oppScore) wins++
    else losses++
  }
  return { wins, losses }
}

export function usePlayerWL(playerId: string): { data: WLStats | null; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ['player-wl', playerId],
    enabled: !!playerId,
    queryFn: async (): Promise<WLStats> => {
      const [{ data: gamesA, error: errA }, { data: gamesB, error: errB }] = await Promise.all([
        supabase
          .from('games')
          .select('team_a_score, team_b_score, team_a_player_ids, team_b_player_ids')
          .contains('team_a_player_ids', [playerId]),
        supabase
          .from('games')
          .select('team_a_score, team_b_score, team_a_player_ids, team_b_player_ids')
          .contains('team_b_player_ids', [playerId]),
      ])
      if (errA) throw errA
      if (errB) throw errB

      const a = tallyBySide((gamesA ?? []) as GameSideRow[], playerId, 'a')
      const b = tallyBySide((gamesB ?? []) as GameSideRow[], playerId, 'b')
      return { wins: a.wins + b.wins, losses: a.losses + b.losses }
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
