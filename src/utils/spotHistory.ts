import type { Hand, ShotSpot } from '../types'

/**
 * Task 11 (PRD §4.4): pure grouping/sorting for the Shot Chart's per-spot
 * history sheet (`SpotHistorySheet.tsx`), fed by `useSpotHistory.ts`'s
 * Supabase query: `heat_entries` rows for one `(playerId, spot)` — and
 * optionally one `hand` — each embedding its parent `drill` (and that
 * drill's `session`, for location).
 *
 * One `drill` row is one session's worth of heats at that spot, so this
 * groups by `drill_id` and reduces each group to a single display row:
 * date, location, that drill's total makes/attempts at this spot, and the
 * heat-by-heat sequence ordered by `heat_number`.
 *
 * Row/drill-list ordering both use `drill.started_at`, not each heat's own
 * `recorded_at`, as the primary sort key. Reasoning (see task-11-report.md
 * for the fuller writeup): `drill.started_at` is one value shared by every
 * heat in a drill and is a required (non-nullable) column on `drills`, so
 * it's a clean, unambiguous "when did this drill happen" signal for
 * grouping by drill — whereas `recorded_at` is a per-heat timestamp that
 * varies heat-to-heat *within* a single drill, so using it to order whole
 * drills would mean arbitrarily picking one heat's stamp to represent the
 * group. `recorded_at` is kept only as a fallback for the (expected-rare)
 * case a row's `drill` embed didn't resolve. This also matches this
 * codebase's existing convention of never ordering by an embedded/foreign
 * table column at the Supabase-query level (see `useRecentPlayerActivity.ts`'s
 * `mergeAndSortActivity`, which fetches unordered and sorts client-side by
 * a plain `date` field) — `useSpotHistory.ts` orders the raw fetch by the
 * flat `recorded_at` column (a reasonable default fetch order) and this
 * function is the actual authority on final display order.
 */

export interface SpotHistoryHeatEntryRow {
  id: string
  drill_id: string
  hand: Hand
  spot?: ShotSpot
  makes: number
  attempts: number
  heat_number: number
  recorded_at: string
  drill: {
    started_at: string
    session: { location: string | null } | null
  } | null
}

export interface SpotHistoryHeat {
  heatNumber: number
  makes: number
  attempts: number
}

export interface SpotHistoryDrillRow {
  drillId: string
  date: string
  location: string | null
  makes: number
  attempts: number
  heats: SpotHistoryHeat[]
}

export function groupSpotHistoryByDrill(rows: SpotHistoryHeatEntryRow[]): SpotHistoryDrillRow[] {
  const byDrill = new Map<string, SpotHistoryHeatEntryRow[]>()
  for (const row of rows) {
    const list = byDrill.get(row.drill_id) ?? []
    list.push(row)
    byDrill.set(row.drill_id, list)
  }

  const result: SpotHistoryDrillRow[] = []
  for (const [drillId, heatRows] of byDrill) {
    const sortedHeats = [...heatRows].sort((a, b) => a.heat_number - b.heat_number)
    const makes = heatRows.reduce((sum, r) => sum + r.makes, 0)
    const attempts = heatRows.reduce((sum, r) => sum + r.attempts, 0)
    const date = heatRows[0]?.drill?.started_at ?? heatRows[0]?.recorded_at ?? ''
    const location = heatRows[0]?.drill?.session?.location ?? null

    result.push({
      drillId,
      date,
      location,
      makes,
      attempts,
      heats: sortedHeats.map(r => ({ heatNumber: r.heat_number, makes: r.makes, attempts: r.attempts })),
    })
  }

  result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  return result
}

/** e.g. "7/10 · 8/10 · 9/10" — one segment per heat, already `heat_number`-ordered. */
export function formatHeatSequence(heats: SpotHistoryHeat[]): string {
  return heats.map(h => `${h.makes}/${h.attempts}`).join(' · ')
}
