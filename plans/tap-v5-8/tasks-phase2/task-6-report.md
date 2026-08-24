# Task 6 Report: Weekly Recurrence (PRD §3.2)

## Status
DONE

## Implementation Summary

### 1. `buildRecurringSessionDates()` pure function
**File:** `src/utils/recurringSessions.ts` (new)
- Pure date math extracted into its own file, matching this codebase's existing
  convention (`calendarPills.ts`, `formatDuration.ts`) of pulling pure logic
  out of components so it's independently unit-testable.
- `buildRecurringSessionDates(startDate: string, count = 8)` returns
  `{ date, weekday }[]`: `startDate` plus `count - 1` more dates at 7-day
  intervals, each carrying the JS `Date#getDay()` (0–6) of `startDate` (the
  same value on every entry, since every entry is a whole number of weeks
  after the first).
- Dates are parsed/formatted as `'YYYY-MM-DD'` strings at local noon
  (`T12:00:00`), the exact convention `CalendarPage.tsx` already uses for
  `selectedDate`/`todayISODateString`/`dateLabel` — no second date-parsing
  convention introduced.
- Exported constants `RECURRING_SESSION_COUNT = 8` and
  `RECURRING_SESSION_INTERVAL_DAYS = 7`.

### 2. `useCreateRecurringSessions()` hook
**File:** `src/hooks/useSessions.ts`
- New hook, additive — `useCreatePlannedSession()` is untouched (signature,
  behavior, and its one existing caller in `PlanSessionSheet` all unchanged).
  A separate hook was chosen over an optional param on
  `useCreatePlannedSession()` because the two mutations return different
  shapes (one `Session` row vs. `Session[]`), and Supabase's `.insert()` call
  itself differs (`.insert({...}).select().single()` for one row vs.
  `.insert([...]).select()` for a batch) — folding both into one function
  would have meant a conditional return type, which isn't worth it for a
  hook with a single call site.
- Builds 8 row objects via `buildRecurringSessionDates(date)`, each with
  `state: 'planned'`, `is_recurring: true`, `recurrence_weekday: <weekday>`,
  the same `location`/`expected_player_ids` on every row, and inserts them
  in **one** `supabase.from('sessions').insert([...8 rows...]).select()`
  call — not 8 separate requests.
- `onSuccess` invalidates the `['sessions']` query, same as the other
  session-mutation hooks in this file.

### 3. "Repeat weekly" toggle on `PlanSessionSheet`
**File:** `src/pages/CalendarPage.tsx`
- Added a `repeatWeekly` boolean (`useState`, default `false`) and a toggle
  row between the existing "Add players" button and the "Plan Session"
  confirm button.
- Toggle UI matches this file's existing on/off button convention (see
  `SettingsPage.tsx`'s theme picker and `HandToggle.tsx`): a button that
  flips between `background: var(--orange)` / `color: #fff` (on) and
  `background: var(--panel)` / `color: var(--dim)` (off), `role="switch"` +
  `aria-checked` for semantics. No new CSS file/class — inline `style` with
  `var(--...)` tokens only, consistent with the rest of this component.
  `#fff` for the on-state label text mirrors the exact same already-reviewed
  pattern used 3 other places in this codebase (`SettingsPage.tsx`,
  `HandToggle.tsx`, and `CalendarPage.tsx`'s own selected-pill contrast fix)
  for text-on-solid-`--orange`; no bare hex color was introduced for
  anything else.
- Copy under the toggle reads "Plans 8 sessions, every `<Weekday>` starting
  `<date>`" — `<Weekday>` derived via
  `date.toLocaleDateString('en-GB', { weekday: 'long' })`, same
  `date + 'T12:00:00'` parsing already used for `dateLabel` just above it.
- `handlePlanSession()` now branches: `repeatWeekly` true calls
  `useCreateRecurringSessions().mutateAsync(...)`, false calls the original
  `useCreatePlannedSession().mutateAsync(...)` — same
  `{ location, date, expectedPlayerIds }` args either way. Confirm button
  disables while either mutation is pending and reads "Plan 8 Sessions" /
  "Planning…" when the toggle is on.

### 4. Known limitation (by design, per the task brief)
There is no server-side/background job. The 8-session batch is a fixed
horizon created once, at plan time. If a scribe wants sessions beyond that
horizon, they open a new recurring plan closer to that later date — this is
an accepted v1 limitation, not something this task solves.

## Testing

### `src/utils/recurringSessions.test.ts` (new)
- 8 dates by default, 7 days apart, starting from the given date.
- Every entry carries the selected date's JS weekday (verified against a
  known Tuesday, `2026-09-01`, `getDay() === 2`, confirmed via `node -e`
  before writing the assertion).
- Weekday/date sequence stays correct across a month **and year** boundary
  (`2026-12-29` → the batch runs into `2027-01`/`2027-02`).
- Respects a custom `count` argument.

### `src/hooks/useSessions.test.tsx`
- Added `buildBatchInsertChain()` (mirrors `buildInsertChain()`, but
  `.select()` itself resolves — no `.single()` — matching the array-insert
  shape) and `mountRecurringHook()` (same harness pattern as `mountHook()`).
- New `describe('useCreateRecurringSessions', ...)` block:
  - Asserts `insert` and `select` are each called **exactly once** (single
    batched array call, not 8 separate requests) and that the inserted
    array has length 8 with the expected date sequence and per-row shape
    (`is_recurring: true`, `recurrence_weekday: 2` for the Tuesday fixture,
    same `location`/`expected_player_ids` copied onto every row).
  - `expectedPlayerIds` defaults to `[]` on every row when omitted.
  - Rejects when Supabase returns an error.
- No mutation-hook test needed a fixed-timeout tick; the one query-hook
  helper already in this file (`waitForSettled`, polling `isPending`) was
  left untouched and unused by these new tests, since
  `useCreateRecurringSessions` is a mutation (awaited directly via
  `mutateAsync`, same as the existing `useCreatePlannedSession` tests).

## Build & Test Results

### `npm run build`
Clean — `tsc -b && vite build` succeeds, no TypeScript errors.

### `npm test` (run twice, per the flake-avoidance instruction)
Both runs: **16 test files, 122 tests passed**, no failures, no flake.
(115 tests before this task + 4 in `recurringSessions.test.ts` + 3 in the new
`useCreateRecurringSessions` describe block = 122.)

### `npm run lint`
Same baseline as before this task — **5 pre-existing errors + 1 warning**,
all in files this task doesn't touch (`IOSInstallBanner.tsx` ×1,
`StatusDot.tsx` ×1, `AttendancePage.tsx` ×2 errors + 1 warning,
`CompetitiveSetupPage.tsx` ×1). No new lint issues introduced.

## Files Changed
- `src/utils/recurringSessions.ts` (new) — pure date-math function
- `src/utils/recurringSessions.test.ts` (new) — unit tests for the above
- `src/hooks/useSessions.ts` — added `useCreateRecurringSessions()`
- `src/hooks/useSessions.test.tsx` — added tests for the new hook
- `src/pages/CalendarPage.tsx` — added the "Repeat weekly" toggle and
  branching logic to `PlanSessionSheet`

## Constraints Met
- Styling via `var(--...)` tokens only; no new CSS file/class; the one
  literal `#fff` matches 3 existing precedents in this exact codebase for
  text-on-solid-orange, not a new arbitrary color.
- No new npm dependencies.
- Did not touch `AttendancePage.tsx`, `useActivateSession`,
  `useStartPlannedSession.ts`, `useTodaysPlannedSession`, or
  `useLocationHistory`/`dedupeLocationsByRecency`.
- `useCreatePlannedSession()`'s signature and behavior are unchanged; its
  one existing caller is unaffected.
- Single batched `.insert([...])` call for the 8-session horizon, verified
  by test (`insert`/`select` each called exactly once).
- `npm run build`, `npm test`, `npm run lint` all clean for touched files;
  `npm test` run twice with identical, non-flaky results.
