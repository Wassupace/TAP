import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { groupSpotHistoryByDrill, type SpotHistoryDrillRow, type SpotHistoryHeatEntryRow } from '../utils/spotHistory'
import type { Hand, ShotSpot } from '../types'

export type HandFilter = 'all' | Hand

/**
 * Task 11 (PRD §4.4): Shot Chart zone tap → per-spot history sheet.
 *
 * Scoped to exactly one `(playerId, spot)` pair — and, when the chart's
 * `handMode` isn't `'all'`, one `hand` too — matching the query shape in
 * this task's brief: `heat_entries` filtered to this player and spot, with
 * each row embedding its parent `drill` (for `started_at`) and that
 * drill's `session` (for `location`). See `spotHistory.ts` for why
 * `drill.started_at` — not each heat's own `recorded_at` — is the
 * authoritative sort key for the grouped drill rows this returns; the raw
 * fetch here is still given a flat-column `.order('recorded_at', ...)` as
 * a reasonable default (this codebase's existing convention is to never
 * order by an embedded/foreign-table column at the Supabase-query level —
 * see `useRecentPlayerActivity.ts`).
 *
 * `spot` is `null`-able so a caller can mount this hook before a zone has
 * been tapped; the query stays disabled (and `data` stays `[]`) until a
 * real spot is set.
 */
export function useSpotHistory(
  playerId: string,
  spot: ShotSpot | null,
  handMode: HandFilter
): {
  data: SpotHistoryDrillRow[]
  isPending: boolean
  isError: boolean
} {
  const { data, isPending, isError } = useQuery({
    queryKey: ['spot-history', playerId, spot, handMode],
    enabled: !!playerId && !!spot,
    queryFn: async (): Promise<SpotHistoryDrillRow[]> => {
      let query = supabase
        .from('heat_entries')
        .select('*, drill:drills(started_at, session:sessions(location))')
        .eq('player_id', playerId)
        .eq('spot', spot as ShotSpot)

      if (handMode !== 'all') {
        query = query.eq('hand', handMode)
      }

      const { data, error } = await query.order('recorded_at', { ascending: false })
      if (error) throw error

      return groupSpotHistoryByDrill((data ?? []) as unknown as SpotHistoryHeatEntryRow[])
    },
  })
  return { data: data ?? [], isPending, isError }
}
