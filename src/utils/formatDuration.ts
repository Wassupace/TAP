/**
 * Human-readable duration between a session's start and end timestamps,
 * e.g. "2h 30min" or "45min". Returns '—' when either timestamp is
 * missing (session hasn't started or hasn't ended yet).
 *
 * Extracted from `SessionRecapPage.tsx` (review fix, Task 2 round 2) so
 * `CalendarPage.tsx`'s "Selected day sessions" list can show a completed
 * session's duration too, per PRD §3.2's "gym name + duration for past
 * sessions" requirement — the grid mini-pills can't fit this text (see
 * `calendarPills.ts`'s budget derivation), so this list is the one place
 * in the Calendar view that must carry it.
 */
export function fmtDuration(startedAt: string | undefined | null, endedAt: string | undefined | null): string {
  if (!startedAt || !endedAt) return '—'
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime()
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return h > 0 ? `${h}h ${m}min` : `${m}min`
}
