/**
 * The current LOCAL calendar date as a 'YYYY-MM-DD' string.
 *
 * Final-review Fix 3 (Phase 2 whole-branch review): "today" used to be
 * computed three different, inconsistent ways across the app —
 * CalendarPage.tsx built a LOCAL-date string inline, while
 * useSessions.ts's useTodaysPlannedSession() and DashboardPage.tsx's
 * ad-hoc-session flows used `new Date().toISOString().split('T')[0]`
 * (UTC). Near local midnight in any non-UTC timezone (and for a good chunk
 * of the evening in any negative-UTC-offset timezone) those two
 * computations disagree about what day it is — e.g. a session could read
 * "Missed" on the Calendar while the Dashboard's planned-session prompt
 * still called that same row "today", or the Dashboard could silently
 * match tomorrow's planned session instead of today's.
 *
 * Sessions are tied to a physical local day a coach experiences, not a UTC
 * day, so LOCAL date components are the correct convention (matching
 * CalendarPage.tsx's original behavior) — this is now the single source of
 * truth for "today" as a date string, used by CalendarPage.tsx,
 * useSessions.ts, and DashboardPage.tsx.
 *
 * Accepts an optional `Date` (defaults to `new Date()`) purely so tests can
 * pass a fixed instant — app call sites should call it with no argument.
 */
export function todayISODate(d: Date = new Date()): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
