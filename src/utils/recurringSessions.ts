/**
 * Task 6 (PRD §3.2): pure date math for the Plan Session sheet's "Repeat
 * weekly" toggle. Computes the fixed 8-session horizon — the selected date
 * plus 7 more sessions at 7-day intervals — rather than any kind of
 * open-ended/background recurrence (see task-6-report.md "Known
 * limitation": there's no server-side job, a scribe who wants sessions
 * further out creates a new recurring plan closer to that date).
 *
 * `startDate` and every returned `date` are 'YYYY-MM-DD' strings, matching
 * the format CalendarPage.tsx's `selectedDate`/`todayISODateString` already
 * use throughout this file — kept as the same single date-string
 * convention rather than introducing a second one here. Parsed at local
 * noon (`T12:00:00`, matching how this file already parses date strings
 * elsewhere, e.g. `dateLabel`) so DST transitions can't shift a date by a
 * day.
 *
 * `weekday` is the JS `Date#getDay()` value (0=Sun..6=Sat) of `startDate`.
 * It's the same for every entry in the batch since each is exactly 7 days
 * after the last — computed once and copied, not re-derived per entry.
 */
export interface RecurringSessionDate {
  date: string
  weekday: number
}

export const RECURRING_SESSION_COUNT = 8
export const RECURRING_SESSION_INTERVAL_DAYS = 7

export function buildRecurringSessionDates(
  startDate: string,
  count: number = RECURRING_SESSION_COUNT
): RecurringSessionDate[] {
  const start = new Date(startDate + 'T12:00:00')
  const weekday = start.getDay()
  const dates: RecurringSessionDate[] = []
  for (let i = 0; i < count; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i * RECURRING_SESSION_INTERVAL_DAYS)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    dates.push({ date: `${y}-${m}-${day}`, weekday })
  }
  return dates
}
