import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { tallyBySide, type GameSideRow, type WLStats } from './usePlayerStats'
import type {
  ActivityType,
  CompetitiveGameType,
  Hand,
  ShotType,
} from '../types'

/**
 * Player Profile's Recent Activity Log (PRD §4.3).
 *
 * `activity_records` is session-scoped, not player-scoped (no `player_id`
 * column) — there's no single query for "every activity this player was
 * in." Player involvement lives in three independent tables, so this hook
 * runs three branches and merges the results client-side:
 *
 *  1. `matches` — "was this player in this match at all" is answered via
 *     the `games` table's PER-GAME `team_a_player_ids`/`team_b_player_ids`
 *     arrays (final-review Fix 2), NOT `matches`' own top-level arrays.
 *     Those top-level arrays are set once at match setup
 *     (MatchSetupPage.tsx) and never updated, so a player subbed in
 *     mid-match (matchStore.ts's `movePlayer`, captured per game) would be
 *     invisible to a query against `matches` even though
 *     `usePlayerWL`/`usePlayerWLByFormat` (usePlayerStats.ts) already
 *     correctly count that same player via `games`. Two `.contains(...)`
 *     queries against `games` (team_a / team_b — the exact pattern
 *     `usePlayerWLByFormat` uses, just selecting `match_id` instead of
 *     aggregating inline) find every match this player appears in ANY game
 *     of; those match ids are then fetched in full (`*, games(*),
 *     session:sessions(location)`) so each match's W/L + total game count
 *     still reuses `tallyBySide`/`computeMatchWL` scoped to that match's
 *     own COMPLETE `games` list, unchanged from before — only how "is this
 *     player in this match at all" gets decided changed, not the result-
 *     line computation once a match qualifies.
 *  2. `drills` — `.contains('player_ids', [playerId])`, with each drill's
 *     `heat_entries` filtered down to this player's own rows for their
 *     personal makes/attempts/hand.
 *  3. `competitive_results` — `.eq('player_id', playerId)`, joined to
 *     `competitive_games` for the result's rank and the game's total
 *     participant count.
 *
 * Each branch also embeds `session:sessions(location)` (same alias
 * convention as `useAttendanceStats.ts`) since none of `matches`/`drills`/
 * `competitive_games` carry a `location` column themselves — only their
 * parent `sessions` row does.
 */

export type ActivityLogItem = {
  id: string
  activityType: ActivityType
  label: string
  location: string | null
  date: string
  resultLine: string
}

// ── Row shapes from the embedded selects (this app's supabase client isn't
// generic-typed against a Database schema — same untyped-cast convention as
// usePlayerStats.ts / useAttendanceStats.ts). ────────────────────────────────

type SessionEmbed = { location: string | null } | null

type MatchRow = {
  id: string
  format: string
  started_at: string
  games: GameSideRow[] | null
  session: SessionEmbed
}

type HeatEntryRow = {
  player_id: string
  hand: Hand
  makes: number
  attempts: number
}

type DrillRow = {
  id: string
  shot_type: ShotType
  hand: Hand
  started_at: string
  heat_entries: HeatEntryRow[] | null
  session: SessionEmbed
}

type CompetitiveGameEmbed = {
  game_type: CompetitiveGameType
  custom_name?: string
  player_ids: string[]
  started_at: string
  session: SessionEmbed
} | null

type CompetitiveResultRow = {
  id: string
  rank: number
  competitive_games: CompetitiveGameEmbed
}

// ── Label / formatting helpers (pure — exported for unit tests) ─────────────

const SHOT_TYPE_LABEL: Record<ShotType, string> = {
  freeThrow: 'Free Throws',
  midRange: 'Mid-Range',
  threePoint: 'Three-Point',
  layup: 'Layups',
  floater: 'Floaters',
  postUp: 'Post-Ups',
}

const HAND_WORD: Record<Hand, string> = { left: 'Left', right: 'Right' }
const HAND_LETTER: Record<Hand, string> = { left: 'L', right: 'R' }

const GAME_TYPE_LABEL: Record<CompetitiveGameType, string> = {
  banks: 'Banks',
  middies: 'Middies',
  next: 'Next',
  generic: 'Generic',
}

/** Standard English ordinal suffix (1st, 2nd, 3rd, 4th, 11th, 21st, ...). */
export function ordinal(n: number): string {
  const j = n % 10
  const k = n % 100
  if (j === 1 && k !== 11) return `${n}st`
  if (j === 2 && k !== 12) return `${n}nd`
  if (j === 3 && k !== 13) return `${n}rd`
  return `${n}th`
}

/** Reuses `tallyBySide` (usePlayerStats.ts) scoped to one match's games. */
export function computeMatchWL(games: GameSideRow[], playerId: string): WLStats {
  const a = tallyBySide(games, playerId, 'a')
  const b = tallyBySide(games, playerId, 'b')
  return { wins: a.wins + b.wins, losses: a.losses + b.losses }
}

/** e.g. "W · 4 of 5 games" */
export function formatMatchResultLine(wl: WLStats, totalGames: number): string {
  const outcome = wl.wins > wl.losses ? 'W' : wl.wins < wl.losses ? 'L' : 'T'
  return `${outcome} · ${wl.wins} of ${totalGames} game${totalGames === 1 ? '' : 's'}`
}

/** e.g. "82% · R · 82/100" */
export function formatDrillResultLine(makes: number, attempts: number, hand: Hand | null): string {
  const pct = attempts > 0 ? Math.round((makes / attempts) * 100) : 0
  const letter = hand ? HAND_LETTER[hand] : '—'
  return `${pct}% · ${letter} · ${makes}/${attempts}`
}

/** e.g. "2nd of 6" */
export function formatCompetitiveResultLine(rank: number, totalParticipants: number): string {
  return `${ordinal(rank)} of ${totalParticipants}`
}

function dedupeById<T extends { id: string }>(rows: T[]): T[] {
  return Array.from(new Map(rows.map(r => [r.id, r])).values())
}

function buildMatchActivity(row: MatchRow, playerId: string): ActivityLogItem {
  const games = row.games ?? []
  const wl = computeMatchWL(games, playerId)
  return {
    id: row.id,
    activityType: 'match',
    label: `${row.format} Match`,
    location: row.session?.location ?? null,
    date: row.started_at,
    resultLine: formatMatchResultLine(wl, games.length),
  }
}

function buildDrillActivity(row: DrillRow, playerId: string): ActivityLogItem {
  const personalEntries = (row.heat_entries ?? []).filter(e => e.player_id === playerId)
  const makes = personalEntries.reduce((sum, e) => sum + e.makes, 0)
  const attempts = personalEntries.reduce((sum, e) => sum + e.attempts, 0)
  const hand = personalEntries[0]?.hand ?? row.hand ?? null

  return {
    id: row.id,
    activityType: 'drill',
    label: hand ? `${SHOT_TYPE_LABEL[row.shot_type]} — ${HAND_WORD[hand]}` : SHOT_TYPE_LABEL[row.shot_type],
    location: row.session?.location ?? null,
    date: row.started_at,
    resultLine: formatDrillResultLine(makes, attempts, hand),
  }
}

function buildCompetitiveActivity(row: CompetitiveResultRow): ActivityLogItem | null {
  const game = row.competitive_games
  if (!game) return null
  return {
    id: row.id,
    activityType: 'competitiveGame',
    label: game.custom_name?.trim() || GAME_TYPE_LABEL[game.game_type],
    location: game.session?.location ?? null,
    date: game.started_at,
    resultLine: formatCompetitiveResultLine(row.rank, game.player_ids?.length ?? 0),
  }
}

/** Flattens and sorts by `date` descending — no cap (plan.mdx's recommended default). */
export function mergeAndSortActivity(...groups: ActivityLogItem[][]): ActivityLogItem[] {
  return groups.flat().sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime())
}

export function useRecentPlayerActivity(playerId: string): {
  data: ActivityLogItem[]
  isLoading: boolean
  isPending: boolean
} {
  const { data, isLoading, isPending } = useQuery({
    queryKey: ['player-activity', playerId],
    enabled: !!playerId,
    queryFn: async (): Promise<ActivityLogItem[]> => {
      // Final-review Fix 2: which matches this player was in is decided by
      // `games`'s per-game arrays (see the class doc comment above), not
      // `matches`' own static ones — same two `.contains(...)` calls
      // `usePlayerWLByFormat` (usePlayerStats.ts) issues against `games`,
      // just selecting `match_id` rather than aggregating W/L inline.
      const [gamesARes, gamesBRes, drillsRes, competitiveRes] = await Promise.all([
        supabase.from('games').select('match_id').contains('team_a_player_ids', [playerId]),
        supabase.from('games').select('match_id').contains('team_b_player_ids', [playerId]),
        supabase.from('drills').select('*, heat_entries(*), session:sessions(location)').contains('player_ids', [playerId]),
        supabase.from('competitive_results').select('*, competitive_games(*, session:sessions(location))').eq('player_id', playerId),
      ])
      if (gamesARes.error) throw gamesARes.error
      if (gamesBRes.error) throw gamesBRes.error
      if (drillsRes.error) throw drillsRes.error
      if (competitiveRes.error) throw competitiveRes.error

      const matchIds = Array.from(new Set([
        ...((gamesARes.data ?? []) as { match_id: string }[]).map((r) => r.match_id),
        ...((gamesBRes.data ?? []) as { match_id: string }[]).map((r) => r.match_id),
      ]))

      // A second, dependent round-trip: once we know which matches actually
      // qualify (via `games`), fetch each one in full — its own complete
      // `games(*)` list (every game, not just the ones this player
      // appeared in) plus `session:sessions(location)` — so
      // `buildMatchActivity` below can keep computing W/L and "of N games"
      // exactly as it always has, scoped to a match's own games.
      const matchesRes = matchIds.length > 0
        ? await supabase.from('matches').select('*, games(*), session:sessions(location)').in('id', matchIds)
        : { data: [] as unknown[], error: null }
      if (matchesRes.error) throw matchesRes.error

      const matchRows = dedupeById((matchesRes.data ?? []) as unknown as MatchRow[])
      const drillRows = (drillsRes.data ?? []) as unknown as DrillRow[]
      const competitiveRows = (competitiveRes.data ?? []) as unknown as CompetitiveResultRow[]

      const matchItems = matchRows.map(row => buildMatchActivity(row, playerId))
      const drillItems = drillRows.map(row => buildDrillActivity(row, playerId))
      const competitiveItems = competitiveRows
        .map(buildCompetitiveActivity)
        .filter((item): item is ActivityLogItem => item !== null)

      return mergeAndSortActivity(matchItems, drillItems, competitiveItems)
    },
  })
  return { data: data ?? [], isLoading, isPending }
}
