import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useActivityFeed } from './useActivityFeed'
import { SPOT_LABELS, type Drill, type Game, type HeatEntry, type Player, type RecapCallout, type ShotSpot } from '../types'

/**
 * Session Recap's "Your day", "Highlight", and "To work on" callouts (PRD
 * §8, Screen 5).
 *
 * All three are derived from this session's `activity_records` — the same
 * feed `SessionRecapPage` already fetches via `useActivityFeed` for its
 * activity-count callout and per-activity list. Calling it again here costs
 * no extra network round-trip: react-query dedupes on the
 * `['activity-feed', sessionId]` query key.
 *
 * - `yourDay`: winning-side record across every `games` row this session
 *   (whichever side won more games, e.g. "Winning side in 4 of 5 games"),
 *   plus aggregate free-throw % across every `freeThrow` drill logged,
 *   compared against the average `target_ft_percent` of the players who
 *   shot those free throws. Either clause is omitted if this session has
 *   no real data for it (no games / no free-throw drills); `null` only
 *   when neither clause has data.
 * - `highlight`: the single closest-margin `games` row (smallest
 *   `|team_a_score - team_b_score|`) across every `match` activity this
 *   session logged — the same "closest game" concept `MatchRecapPage.tsx`
 *   computes per-match, applied session-wide across possibly several
 *   matches' games here. `null` when this session logged no `match`
 *   activity (never fabricated).
 * - `toWorkOn`: the worst-performing shot `spot` — lowest makes/attempts %
 *   among spots with `attempts > 0` (a spot with zero attempts can never
 *   win, since it has no real performance to report) — aggregated across
 *   every `heat_entries` row from every `drill` activity this session
 *   logged. `null` when this session logged no `drill` activity.
 */
export function useSessionHighlights(sessionId: string): {
  yourDay: RecapCallout | null
  highlight: RecapCallout | null
  toWorkOn: RecapCallout | null
  // Settled once every stage this hook actually depends on has reached a
  // terminal (non-pending) state — read directly off each inner query's own
  // reactive `isPending`, the same guarantee a bare `useQuery()` result
  // gives a caller, just combined across this hook's dependent stages. This
  // exists so tests can poll the hook's own committed state instead of a
  // cache-level proxy (see useSessionHighlights.test.tsx for why that
  // matters). Not consumed by SessionRecapPage today — additive only.
  isPending: boolean
} {
  const activityFeed = useActivityFeed(sessionId || null)
  const { data: activities = [] } = activityFeed

  const matchIds = useMemo(
    () => activities.filter(a => a.activity_type === 'match').map(a => a.reference_id),
    [activities]
  )
  const drillIds = useMemo(
    () => activities.filter(a => a.activity_type === 'drill').map(a => a.reference_id),
    [activities]
  )

  const gamesQuery = useQuery({
    queryKey: ['session-highlight-games', sessionId, matchIds],
    enabled: matchIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .in('match_id', matchIds)
      if (error) throw error
      return data as Game[]
    },
  })
  const { data: games = [] } = gamesQuery

  const heatEntriesQuery = useQuery({
    queryKey: ['session-toworkon-heat-entries', sessionId, drillIds],
    enabled: drillIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('heat_entries')
        .select('*')
        .in('drill_id', drillIds)
      if (error) throw error
      return data as HeatEntry[]
    },
  })
  const { data: heatEntries = [] } = heatEntriesQuery

  const drillsQuery = useQuery({
    queryKey: ['session-yourday-drills', sessionId, drillIds],
    enabled: drillIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drills')
        .select('id, shot_type')
        .in('id', drillIds)
      if (error) throw error
      return data as Pick<Drill, 'id' | 'shot_type'>[]
    },
  })
  const { data: drills = [] } = drillsQuery

  const ftHeatEntries = useMemo(() => {
    const ftDrillIds = new Set(drills.filter(d => d.shot_type === 'freeThrow').map(d => d.id))
    return heatEntries.filter(h => ftDrillIds.has(h.drill_id))
  }, [drills, heatEntries])

  const ftPlayerIds = useMemo(
    () => Array.from(new Set(ftHeatEntries.map(h => h.player_id))),
    [ftHeatEntries]
  )

  const ftPlayersQuery = useQuery({
    queryKey: ['session-yourday-ft-players', sessionId, ftPlayerIds],
    enabled: ftPlayerIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('players')
        .select('id, target_ft_percent')
        .in('id', ftPlayerIds)
      if (error) throw error
      return data as Pick<Player, 'id' | 'target_ft_percent'>[]
    },
  })
  const { data: ftPlayers = [] } = ftPlayersQuery

  const yourDay = useMemo<RecapCallout | null>(() => {
    // Winning-side clause: whichever side (a/b) won more games this
    // session, across every match logged. Ties don't count toward either
    // side. Omitted entirely if this session logged no decisive game.
    let aWins = 0, bWins = 0
    for (const g of games) {
      if (g.team_a_score > g.team_b_score) aWins++
      else if (g.team_b_score > g.team_a_score) bWins++
    }
    const decisive = aWins + bWins
    const winSideClause = decisive > 0
      ? `Winning side in ${Math.max(aWins, bWins)} of ${decisive} games`
      : null

    // Free-throw clause: aggregate makes/attempts across every freeThrow
    // drill logged, compared to the average target_ft_percent of the
    // players who actually shot them (real data only — never fabricated).
    let ftMakes = 0, ftAttempts = 0
    for (const h of ftHeatEntries) { ftMakes += h.makes; ftAttempts += h.attempts }
    let ftClause: string | null = null
    if (ftAttempts > 0) {
      const ftPct = Math.round((ftMakes / ftAttempts) * 100)
      if (ftPlayers.length > 0) {
        const avgGoal = ftPlayers.reduce((sum, p) => sum + p.target_ft_percent, 0) / ftPlayers.length
        const vsGoal = ftPct > avgGoal ? 'above goal' : ftPct < avgGoal ? 'below goal' : 'at goal'
        ftClause = `FT ${ftPct}% (${vsGoal})`
      } else {
        ftClause = `FT ${ftPct}%`
      }
    }

    if (!winSideClause && !ftClause) return null
    return {
      icon: 'trophy',
      label: 'Your day',
      value: [winSideClause, ftClause].filter(Boolean).join(' · '),
    }
  }, [games, ftHeatEntries, ftPlayers])

  const highlight = useMemo<RecapCallout | null>(() => {
    if (matchIds.length === 0) return null

    // Same reduce shape as MatchRecapPage's per-match `closest`, just fed
    // every game across every match this session logged instead of one
    // match's games.
    const closest = games.reduce<Game | null>((best, g) => {
      const margin = Math.abs(g.team_a_score - g.team_b_score)
      if (!best) return g
      return margin < Math.abs(best.team_a_score - best.team_b_score) ? g : best
    }, null)
    if (!closest) return null

    const scoreLine = `Closest game: ${closest.team_a_score}-${closest.team_b_score}`
    // Final-review Fix 7: PRD §5.4's post-fact logging flow can leave
    // `duration_seconds: 0` for a genuinely untimed match (the timer was
    // never run) — showing "lasted 0 min" for that reads as broken data,
    // not as "this wasn't timed". Omit the duration clause entirely rather
    // than show a misleading 0 min; any non-zero duration is unaffected.
    if (!closest.duration_seconds) {
      return { icon: 'flame', label: 'Highlight', value: scoreLine }
    }

    const minutes = Math.round(closest.duration_seconds / 60)
    return {
      icon: 'flame',
      label: 'Highlight',
      value: `${scoreLine}, lasted ${minutes} min`,
    }
  }, [games, matchIds])

  const toWorkOn = useMemo<RecapCallout | null>(() => {
    if (drillIds.length === 0) return null

    const bySpot = new Map<ShotSpot, { makes: number; attempts: number }>()
    for (const entry of heatEntries) {
      if (!entry.spot) continue
      const agg = bySpot.get(entry.spot) ?? { makes: 0, attempts: 0 }
      agg.makes += entry.makes
      agg.attempts += entry.attempts
      bySpot.set(entry.spot, agg)
    }

    let worst: { spot: ShotSpot; pct: number } | null = null
    for (const [spot, { makes, attempts }] of bySpot) {
      if (attempts === 0) continue // a spot with no real attempts can never win
      const pct = makes / attempts
      if (!worst || pct < worst.pct) worst = { spot, pct }
    }
    if (!worst) return null

    return {
      icon: 'bolt',
      label: 'To work on',
      value: `${SPOT_LABELS[worst.spot]}: ${Math.round(worst.pct * 100)}%`,
    }
  }, [heatEntries, drillIds])

  // `matchIds`/`drillIds` gate which stages actually matter: a query that's
  // disabled (`enabled: false`) sits at `isPending: true` forever in
  // react-query v5 (status stays 'pending', fetchStatus 'idle'), so a stage
  // this session never triggered must not hold `isPending` open — only
  // stages this hook actually enabled are required to reach a terminal
  // state.
  const isPending =
    activityFeed.isPending ||
    (matchIds.length > 0 && gamesQuery.isPending) ||
    (drillIds.length > 0 && heatEntriesQuery.isPending) ||
    (drillIds.length > 0 && drillsQuery.isPending) ||
    (ftPlayerIds.length > 0 && ftPlayersQuery.isPending)

  return { yourDay, highlight, toWorkOn, isPending }
}
