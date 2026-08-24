import type { Session } from '../types'

/**
 * Presentational-only session state for the calendar grid's mini-pills
 * (PRD §3.2, bug §12.3). 'missed' is never written to the DB — a session
 * stays `state: 'planned'` forever; this is purely how a past-dated planned
 * session renders. Derived client-side, no schema change.
 */
export type PillState = 'active' | 'planned' | 'completed' | 'missed'

// Render priority when a day has more sessions than pill slots: active
// (happening now) first, then planned (still to come — and the one that
// matters most if a plan converts to active mid-day), then missed, then
// completed last (already done, least urgent "at a glance").
const PILL_PRIORITY: Record<PillState, number> = {
  active: 0,
  planned: 1,
  missed: 2,
  completed: 3,
}

/** A 'planned' session whose date has already passed. */
export function isMissed(session: Session, todayISODate: string): boolean {
  return session.state === 'planned' && session.date < todayISODate
}

export function pillState(session: Session, todayISODate: string): PillState {
  if (isMissed(session, todayISODate)) return 'missed'
  return session.state
}

/**
 * Picks which sessions render as mini-pills in a `.cal-day` cell: up to
 * `maxPills`, most relevant first (see PILL_PRIORITY), plus a count of how
 * many were left out (for the "+N" overflow badge).
 */
export function selectDayPills(
  sessions: Session[],
  todayISODate: string,
  maxPills = 2
): { pills: Session[]; overflow: number } {
  const sorted = [...sessions].sort(
    (a, b) => PILL_PRIORITY[pillState(a, todayISODate)] - PILL_PRIORITY[pillState(b, todayISODate)]
  )
  return {
    pills: sorted.slice(0, maxPills),
    overflow: Math.max(0, sorted.length - maxPills),
  }
}

/**
 * Grid-pill text budget (review fix, round 1 — see task-2-report.md
 * "Fix round 1" section for the full derivation): on a 390px reference
 * viewport, page `px-[18px]` (36px) + `grid-cols-7 gap-1` (6 * 4px = 24px)
 * leaves a 330px grid / 7 = 47.14px `.cal-day` column. `* { box-sizing:
 * border-box }` means `.cal-day`'s 1px border eats into that (45.14px
 * content), then `.cal-day-pills`'s `padding: 0 2px` (41.14px) and
 * `.cal-pill`'s `padding: 1px 4px` (33.14px) leave ~33px of actual text
 * area at `font-size: 8px; font-weight: 700`. At Archivo bold's roughly
 * 0.6em average glyph width (~4.8px at this size), that's a ~6-7 character
 * budget for the ENTIRE label — not per segment. The previous
 * `"<loc>· <suffix>"` format (e.g. "Levall· Miss", 12 chars / ~58px) was
 * roughly double that budget on most pills, not just the longest one.
 *
 * Fix: the grid pill shows only the (already-fits) truncated location —
 * no separator, no status word. State is still fully conveyed by the
 * pill's background/text color (see `pillBg()` / `stateColor()` in
 * CalendarPage.tsx, unchanged), and full state-name + duration detail
 * remains visible in the "Selected day sessions" list rendered directly
 * below the grid. 6 chars * ~4.8px = 28.8px, comfortably inside the
 * 33.14px budget (~4px of margin for font-metric estimation error).
 */
const LOCATION_CHARS = 6

/** e.g. "Levall" for a session at "Levallois Gym" — see LOCATION_CHARS. */
export function pillLabel(location: string): string {
  return location.slice(0, LOCATION_CHARS)
}
