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
 * Compact duration for an 8px mini-pill: same started_at/ended_at diff as
 * SessionRecapPage's fmtDuration, but rounded to a single unit ("2h", "45m")
 * since there's no room for "2h 30min" at this scale.
 */
export function fmtPillDuration(startedAt: string | undefined | null, endedAt: string | undefined | null): string {
  if (!startedAt || !endedAt) return '—'
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime()
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return h > 0 ? `${h}h` : `${m}m`
}

const PILL_SUFFIX: Record<PillState, (s: Session) => string> = {
  active: () => 'Live',
  planned: () => 'Plan',
  missed: () => 'Miss',
  completed: (s) => fmtPillDuration(s.started_at, s.ended_at),
}

/** e.g. "Levall· 2h" for a completed session at "Levallois Gym". */
export function pillLabel(session: Session, todayISODate: string): string {
  const state = pillState(session, todayISODate)
  const loc = session.location.slice(0, 6)
  return `${loc}· ${PILL_SUFFIX[state](session)}`
}
