import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { ALL_FORMATS, type CompetitiveGameType, type MatchFormat } from '../types'

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

export interface FormatWLStats {
  format: MatchFormat
  wins: number
  losses: number
}

export interface GameFormatRow extends GameSideRow {
  // Many-to-one embed (games.match_id -> matches.id) — a single object, not
  // an array, same convention as usePlayerShooting's `drill:drills(...)`
  // embed below. Aliased `match:` to mirror that exact pattern (per Task
  // 12 brief), rather than the unaliased `matches(...)` key PostgREST
  // would otherwise default to.
  match: { format: MatchFormat } | null
}

/**
 * Buckets a player's per-game win/loss by the owning match's format,
 * reusing `tallyBySide`'s exact per-game rule (ties count as a loss for
 * whichever side is being tallied — see that function's doc comment) so
 * this hook's numbers always agree with `usePlayerWL`'s aggregate for the
 * same underlying games; only the bucketing is new. Every entry in
 * `ALL_FORMATS` is seeded up front so a format the player has never played
 * still comes back with `{ wins: 0, losses: 0 }` instead of being omitted.
 */
export function groupWLByFormat(
  gamesA: GameFormatRow[],
  gamesB: GameFormatRow[],
  playerId: string
): FormatWLStats[] {
  const byFormat = new Map<MatchFormat, WLStats>(
    ALL_FORMATS.map((format) => [format, { wins: 0, losses: 0 }])
  )

  function tally(games: GameFormatRow[], side: 'a' | 'b') {
    for (const g of games) {
      const format = g.match?.format
      const stats = format ? byFormat.get(format) : undefined
      if (!stats) continue // no format on this row, or a format outside ALL_FORMATS
      const { wins, losses } = tallyBySide([g], playerId, side)
      stats.wins += wins
      stats.losses += losses
    }
  }

  tally(gamesA, 'a')
  tally(gamesB, 'b')

  return ALL_FORMATS.map((format) => ({ format, ...byFormat.get(format)! }))
}

export function usePlayerWLByFormat(playerId: string): {
  data: FormatWLStats[] | null
  isLoading: boolean
} {
  const { data, isLoading } = useQuery({
    queryKey: ['player-wl-by-format', playerId],
    enabled: !!playerId,
    queryFn: async (): Promise<FormatWLStats[]> => {
      const gamesSelect = 'team_a_score, team_b_score, team_a_player_ids, team_b_player_ids, match:matches(format)'
      const [{ data: gamesA, error: errA }, { data: gamesB, error: errB }] = await Promise.all([
        supabase.from('games').select(gamesSelect).contains('team_a_player_ids', [playerId]),
        supabase.from('games').select(gamesSelect).contains('team_b_player_ids', [playerId]),
      ])
      if (errA) throw errA
      if (errB) throw errB

      return groupWLByFormat(
        (gamesA ?? []) as unknown as GameFormatRow[],
        (gamesB ?? []) as unknown as GameFormatRow[],
        playerId
      )
    },
  })
  return { data: data ?? null, isLoading }
}

export interface RecreationalRecord {
  wins: number
  losses: number
}

// PRD §6.2: Middies' career stat is Mid-Range %, not W/L — a Middies result
// must never feed this number. Deliberately excludes 'middies'.
export const RECREATIONAL_GAME_TYPES: CompetitiveGameType[] = ['banks', 'next', 'generic']

export interface CompetitiveResultGameTypeRow {
  rank: number
  // Unaliased `competitive_games` embed key — same convention
  // `useRecentPlayerActivity.ts` already uses for this exact
  // competitive_results -> competitive_games join.
  competitive_games: { game_type: CompetitiveGameType } | null
}

/**
 * Tallies a player's win/loss record across "recreational" competitive
 * games only (banks, next, generic). A Middies result — or any row without
 * a resolvable game_type — is skipped entirely, not counted as a loss.
 */
export function tallyRecreationalRecord(rows: CompetitiveResultGameTypeRow[]): RecreationalRecord {
  let wins = 0
  let losses = 0
  for (const row of rows) {
    const gameType = row.competitive_games?.game_type
    if (!gameType || !RECREATIONAL_GAME_TYPES.includes(gameType)) continue
    if (row.rank === 1) wins++
    else losses++
  }
  return { wins, losses }
}

export function usePlayerRecreationalRecord(playerId: string): {
  data: RecreationalRecord | null
  isLoading: boolean
} {
  const { data, isLoading } = useQuery({
    queryKey: ['player-recreational-record', playerId],
    enabled: !!playerId,
    queryFn: async (): Promise<RecreationalRecord> => {
      const { data: results, error } = await supabase
        .from('competitive_results')
        .select('rank, competitive_games(game_type)')
        .eq('player_id', playerId)
      if (error) throw error

      return tallyRecreationalRecord((results ?? []) as unknown as CompetitiveResultGameTypeRow[])
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
