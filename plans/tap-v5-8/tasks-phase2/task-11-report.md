# Task 11: Spot History drill-down (PRD §4.4)

## Status
**DONE**

## Summary
Tapping any of the 10 mid-range/three-point zones in `ShotChart.tsx` (the 5
spots × 2 zone-types each already covered by the existing `spotZoneMap`) now
opens a bottom-sheet showing the player's history at that `(spot, handMode)`
combination: one row per drill (date, location, that drill's makes/attempts+%
at the spot, and the heat-by-heat sequence). The other 5 interior zones
(`restricted`, `rblk`, `rpost`, `lpost`, `lblk`) remain non-interactive —
scoped out per the plan's Global Constraints (Phase 4 item).

## Changes Made

### 1. `src/utils/spotHistory.ts` (new)
Pure grouping/sorting logic, unit-tested in isolation:
- `groupSpotHistoryByDrill(rows)`: groups `heat_entries` rows by `drill_id`,
  sorts heats within a drill by `heat_number`, sums makes/attempts per drill,
  and sorts the resulting drill rows by date descending (most recent first).
- `formatHeatSequence(heats)`: renders `"7/10 · 8/10 · 9/10"`.

### 2. `src/hooks/useSpotHistory.ts` (new)
React-Query hook wrapping the brief's exact query shape:
```
supabase.from('heat_entries')
  .select('*, drill:drills(started_at, session:sessions(location))')
  .eq('player_id', playerId)
  .eq('spot', spot)
```
adds `.eq('hand', handMode)` only when `handMode !== 'all'`, feeds the raw
rows through `groupSpotHistoryByDrill`, and is `enabled` only once both
`playerId` and `spot` are truthy (so it can be mounted before any zone has
been tapped).

**Ordering decision (drill.started_at, not recorded_at):** the query orders
the raw fetch by the flat `recorded_at` column (`.order('recorded_at', {
ascending: false })`) — a plain column on `heat_entries` itself, matching
this codebase's existing convention of never ordering by an embedded/foreign
table column at the Supabase-query level (see `useRecentPlayerActivity.ts`,
which fetches unordered and sorts client-side by a plain `date` field via
`mergeAndSortActivity`). The *authoritative* display order, however, is
computed in `groupSpotHistoryByDrill` using **`drill.started_at`** as the
primary date/sort key, with `recorded_at` only as a fallback if a row's
`drill` embed didn't resolve. Reasoning: `drill.started_at` is one value
shared by every heat in a drill and is a required (non-nullable) column on
`drills`, so it's an unambiguous "when did this drill happen" signal for a
whole-drill row — whereas `recorded_at` is a per-heat timestamp that varies
heat-to-heat within a single drill, so using it to order *drills* would mean
arbitrarily picking one heat's stamp to represent the group.

### 3. `src/components/ui/SpotHistorySheet.tsx` (new)
Bottom-sheet, same shell as `PlayerPickerModal`/`EditPlayerSheet` (backdrop
`rgba(0,0,0,.75)` + `blur(6px)`, `var(--r-lg) var(--r-lg) 0 0`, `padding: 24px
18px 40px`, `maxHeight: 85dvh`, `zIndex: 80` — stacked above `ShotChart`'s own
`z-[70]` overlay). Header shows the spot label (reusing `SPOT_LABELS`) and the
active hand filter; body renders loading/error/empty states and one
`Card variant="accent"` row per drill (date + location, makes/attempts+%, and
the heat sequence string).

### 4. `src/components/ui/ShotChart.tsx`
- Added a top-level `ZONE_TO_SPOT: Record<string, ShotSpot>` constant — the
  reverse of the existing `spotZoneMap` (zone id → spot), covering exactly
  the 10 mid/three zone ids. `spotZoneMap` itself was read but **not**
  modified, and `ShotSpot`'s type was **not** extended, per the plan's
  Global Constraints.
- Added `playerId?: string` to `ShotChartProps`.
- Added `historySpot` state (`ShotSpot | null`) and wired an `onClick` on
  each zone `<path>` in the zone-fills loop: only zones present in
  `ZONE_TO_SPOT` (and only when `playerId` is provided) get a handler and a
  pointer cursor — the fill/color rendering logic itself is untouched.
- Renders `<SpotHistorySheet>` when `historySpot` is set, passing
  `playerId`, `historySpot`, and the chart's own current `handMode` state
  (so `'all'` shows both hands mixed, matching the chart's own aggregation
  behavior for that state; `'left'`/`'right'` filters to that hand).

### 5. `src/pages/PlayerProfilePage.tsx`
`ShotChart` had no way to know which player it was showing (no `playerId`
prop existed before this task). Added one line at its call site:
`playerId={player.id}` — no other change in this file.

## Testing
New tests, both run twice via `npm test -- --run` (181/181 passing both
times, including the whole pre-existing suite):

- `src/utils/spotHistory.test.ts` (8 tests): multi-drill date sort (most
  recent first), heat sort within a drill by `heat_number` regardless of
  input order, per-drill makes/attempts summation, date/location carried
  from the embed, fallback to `recorded_at`/`null` when the embed is
  missing, empty-input handling, and `formatHeatSequence`'s exact
  `"7/10 · 8/10 · 9/10"` formatting.
- `src/hooks/useSpotHistory.test.tsx` (5 tests): verifies the exact
  `player_id`/`spot` `.eq()` calls and select string; verifies the `hand`
  `.eq()` is added only when `handMode !== 'all'` and omitted (mixed hands)
  when `'all'`; verifies the disabled-when-`spot === null` path never calls
  Supabase; verifies a Supabase error surfaces as `isError`. Follows
  `useSessions.test.tsx`'s harness/`waitForSettled` convention exactly —
  `waitForSettled` polls the hook's own captured `isPending`, never a
  cache-level proxy. (The error-path test needed `retry: false` on that
  file's `QueryClient`, since react-query's default retry/backoff would
  otherwise outlast the polling loop's real-timer budget — no other test
  file in this repo exercises a query-hook error path, so there was no
  existing convention to follow there.)

Verification commands run:
- `npm test -- --run` — 21 files / 181 tests passing (run twice)
- `npm run build` — clean (`tsc -b && vite build`)
- `npm run lint` — only the 5 pre-existing baseline errors + 1 warning in
  `IOSInstallBanner.tsx`/`StatusDot.tsx`/`AttendancePage.tsx`/
  `CompetitiveSetupPage.tsx`; nothing new from any file this task touched

## Files Modified / Added
- `src/utils/spotHistory.ts` (new)
- `src/utils/spotHistory.test.ts` (new)
- `src/hooks/useSpotHistory.ts` (new)
- `src/hooks/useSpotHistory.test.tsx` (new)
- `src/components/ui/SpotHistorySheet.tsx` (new)
- `src/components/ui/ShotChart.tsx` (modified: reverse zone→spot map, new
  prop, onClick wiring, sheet render)
- `src/pages/PlayerProfilePage.tsx` (modified: one new prop at the
  `<ShotChart/>` call site)

## Notes
- No new npm dependencies.
- `ShotSpot`'s type and `spotZoneMap` are unchanged — read, not modified.
- Zone fill/color rendering (Task 10's real FT wiring included) is
  untouched; only an `onClick`/cursor was added to the 10 in-scope `<path>`
  elements.
- Did not touch `SessionRecapPage.tsx`, `useSessionHighlights.ts`,
  `CalendarPage.tsx`, `DashboardPage.tsx`, `useSessions.ts`,
  `usePlayers.ts`, `playerEditForm.ts`, `useRecentPlayerActivity.ts`, or
  `usePlayerStats.ts`.
