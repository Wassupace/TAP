import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useActivityFeed } from './useActivityFeed'
import { SPOT_LABELS, type Game, type HeatEntry, type RecapCallout, type ShotSpot } from '../types'

/**
 * Session Recap's "Highlight" and "To work on" callouts (PRD §8, Screen 5).
 *
 * Both are derived from this session's `activity_records` — the same feed
 * `SessionRecapPage` already fetches via `useActivityFeed` for its
 * activity-count callout and per-activity list. Calling it again here costs
 * no extra network round-trip: react-query dedupes on the
 * `['activity-feed', sessionId]` query key.
 *
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
  highlight: RecapCallout | null
  toWorkOn: RecapCallout | null
} {
  const { data: activities = [] } = useActivityFeed(sessionId || null)

  const matchIds = useMemo(
    () => activities.filter(a => a.activity_type === 'match').map(a => a.reference_id),
    [activities]
  )
  const drillIds = useMemo(
    () => activities.filter(a => a.activity_type === 'drill').map(a => a.reference_id),
    [activities]
  )

  const { data: games = [] } = useQuery({
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

  const { data: heatEntries = [] } = useQuery({
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

    const minutes = Math.round(closest.duration_seconds / 60)
    return {
      icon: 'flame',
      label: 'Highlight',
      value: `Closest game: ${closest.team_a_score}-${closest.team_b_score}, lasted ${minutes} min`,
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

  return { highlight, toWorkOn }
}
