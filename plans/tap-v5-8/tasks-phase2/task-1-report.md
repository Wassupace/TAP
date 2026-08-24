# Task 1 Report: Create Planned sessions (PRD §3.2)

## Path note (read first)

The brief and the dispatch instructions both say to write this report to
`plans/tap-v5-8/task-1-report.md`. That path is already occupied by the
**Phase 1** task-1 report (the `sessions.state` CHECK-constraint migration
report, dated Aug 22). Overwriting it would destroy a completed Phase-1
record, so I wrote this report to
`plans/tap-v5-8/tasks-phase2/task-1-report.md` instead (mirroring where the
brief itself lives: `.superpowers/sdd/tasks-phase2/task-1-brief.md`). Phase 1's
task-2..task-9 reports at `plans/tap-v5-8/task-N-report.md` will collide the
same way if Phase 2's tasks 2-6 reuse the flat `task-N-report.md` pattern —
worth fixing at the dispatch level before those run.

## What I implemented

1. **`src/hooks/useSessions.ts`** — added `useCreatePlannedSession()`,
   mirroring `useOpenSession`'s shape exactly but inserting
   `state: 'planned'` with no `started_at` key, `is_recurring: false`, and
   `expected_player_ids: expectedPlayerIds` (defaults to `[]`). Same
   `onSuccess` (invalidate `['sessions']`, seed `['session', id]`) as
   `useOpenSession`.

2. **`src/index.css`** — added `.cal-plus` (and `.cal-day.selected .cal-plus`)
   next to the existing `.cal-dot` rules: an absolutely-positioned "+" glyph
   in the same slot the session dot occupies, orange by default and white
   when the cell is selected (mirrors `.cal-dot`'s selected-state override).

3. **`src/pages/CalendarPage.tsx`**:
   - Added `todayISODateString` (computed from `now`, the existing `Date`
     already in scope) and `isFutureDate = selectedDate > todayISODateString`
     — the single source of truth for "is this day in the future," per the
     brief's exact formula. Commented for later tasks that will read/extend it.
   - In the day-cell map, added `cellDate` (per-cell ISO string) and
     `isFutureCell = !day.out && !hasSess && cellDate > todayISODateString`.
     Renders `<span className="cal-plus">+</span>` when true, mutually
     exclusive with `.cal-dot` (same `hasSess` gate, just negated) — a day
     never shows both, per the brief.
   - The cell's `onClick` still always does `setSelected(day.d)` (unchanged
     for every day), and *additionally* calls `setShowNewSession(true)` when
     `isFutureCell` is true. Since `isFutureCell` is false for every
     today/past cell, this branch is dead code for those — today/past taps
     are byte-for-byte the same as before.
   - `{showNewSession && (...)}` now branches on `isFutureDate`: `false` (
     today/past) renders the **original, untouched** quick-start sheet JSX
     (`handleCreateAndOpen` → `useOpenSession` → `setActiveSession` +
     `nav('/')`, not a single line changed); `true` (future) renders the new
     `<PlanSessionSheet date={selectedDate} onClose={...} />`.
   - Added new `PlanSessionSheet` component (below `CalendarPage`, clearly
     delimited with a `// ── Plan Session sheet (PRD §3.2) ──` banner comment
     and a doc comment flagging it as the extension point for later tasks'
     recurrence toggle / location datalist). It:
     - Owns its own `location`, `expectedPlayerIds`, `showPlayerPicker`
       state — fully self-contained, unmounts/remounts cleanly each time the
       sheet opens/closes, so no manual state reset is needed and it can
       never leak state into `CalendarPage` or the quick-start sheet.
     - Renders the identical bottom-sheet shell (same backdrop, panel,
       border-radius, blur, `stopPropagation` on the panel) as the
       quick-start sheet, per "mirror it exactly."
     - Title: `Plan Session · {date}`. Confirm button: `Plan Session` /
       `Planning…` while pending, disabled until location is non-empty.
     - New "Add players" step: a dashed-border button (styled to match
       `PlayerPickerModal`'s own "Add New Player" affordance) that opens
       `PlayerPickerModal` with `selectedIds={expectedPlayerIds}` and
       `onConfirm={setExpectedPlayerIds}`. `PlayerPickerModal` is rendered as
       a sibling of the sheet's backdrop (via a fragment), not nested inside
       it — so a click on the picker's own backdrop closes only the picker,
       not the Plan Session sheet underneath.
     - On `mutateAsync` success: calls `onClose()` only — no
       `setActiveSession`, no `nav('/')`. On failure: sheet stays open
       (mutation error surfaces via `createPlannedSession.isPending`/error
       state) so the coach can retry, instead of silently closing.
   - Added imports: `useCreatePlannedSession` (from `useSessions.ts`) and
     `PlayerPickerModal` (from `../components/ui/PlayerPickerModal`, existing
     component, not modified).

4. **`src/hooks/useSessions.test.tsx`** (new) — hook-level tests for
   `useCreatePlannedSession`, mocking `supabase.from` the way
   `src/lib/db.test.ts` does (chainable `insert().select().single()` mock),
   run under a real `QueryClientProvider` + `createRoot`/`act` harness (same
   pattern as `src/hooks/useResolvePickedPlayers.test.tsx`, since this hook
   needs `useMutation`/`useQueryClient` context that hook didn't). Three
   cases:
   - Insert payload equals `{ location, date, state: 'planned',
     is_recurring: false, expected_player_ids: [...] }` exactly, and has no
     `started_at` key.
   - `expectedPlayerIds` defaults to `[]` when omitted.
   - `mutateAsync` rejects when Supabase returns an error.

## What I tested and results

- `npm run build` — clean (`tsc -b && vite build`), no type errors.
- `npm test` — 12 test files, 81 tests, all passing (including the 3 new
  ones for `useCreatePlannedSession`; also ran
  `npx vitest run src/hooks/useSessions.test.tsx` standalone — 3/3 pass).
- `npm run lint` — 5 errors, all pre-existing and in the files the brief
  named as out of scope (`IOSInstallBanner.tsx` ×1, `StatusDot.tsx` ×1,
  `AttendancePage.tsx` ×2, `CompetitiveSetupPage.tsx` ×1). Zero lint issues
  in any file I touched.

## Files changed

- `src/hooks/useSessions.ts` (added `useCreatePlannedSession`)
- `src/hooks/useSessions.test.tsx` (new)
- `src/pages/CalendarPage.tsx` (future-date detection, `+` indicator, sheet
  branch, new `PlanSessionSheet` component)
- `src/index.css` (`.cal-plus` rule)

## Self-review

- **Today/past date tap:** unchanged. The cell `onClick` for these days only
  ever calls `setSelected(day.d)` (the added `if (isFutureCell)` branch is
  unreachable for them), and the sheet that opens via the top-right `+`
  button or the "Start one →" link is the original quick-start JSX,
  untouched. Confirmed by diff: not one character inside that block changed;
  it's simply now the `else` branch of a ternary keyed on `isFutureDate`.
- **Future date tap:** the tapped cell shows a `+` (never alongside a dot,
  since `isFutureCell` requires `!hasSess`), and tapping it opens
  `PlanSessionSheet` immediately (in addition to selecting the day, as
  before). Confirming stays on `/calendar` — no `nav('/')`, no
  `setActiveSession` call anywhere in the new path — and the sheet closes.
  The created row shows up in the "Selected day sessions" list below the
  grid on the next render (via the existing `['sessions']` query
  invalidation + the existing `s.state === 'planned'` render branch, which
  was already present and unused before this task).
- A future day that already has a session shows the dot, not the `+`, and
  tapping it does not auto-open a sheet — matches "mutually exclusive."
  The top-right `+` button and "Start one →" link still work for such a day
  (they open `PlanSessionSheet`, since `isFutureDate` is about the selected
  day, not the specific cell tapped) — lets a coach plan a second session on
  a day that already has one, which the brief doesn't prohibit.

## Concerns

- **Report path collision** — see "Path note" above. This likely affects
  tasks 2-6's report paths too if they were generated the same way.
- No new npm dependencies were added.
- `useCreatePlannedSession` inserts directly via `supabase.from(...)` (per
  the brief's exact snippet), the same as `useOpenSession` — neither goes
  through the offline-queue wrapper in `src/lib/db.ts`. Pre-existing
  asymmetry in the codebase, not something this task introduced or was asked
  to fix, but worth flagging since planned sessions created while offline
  will silently fail rather than queue (the mutation's `onError` isn't
  surfaced anywhere beyond keeping the sheet open).
