# Task 9: Recent Activity Log (PRD §4.3)

## Status: DONE

## What was built

### `src/hooks/useRecentPlayerActivity.ts` (new)

`useRecentPlayerActivity(playerId)` runs three independent branches in
parallel (`Promise.all` inside one `useQuery`, same shape as
`usePlayerWL`) and merges the results client-side, since `activity_records`
has no `player_id` column and there's no single query that covers a
player's involvement across matches, drills, and competitive games:

1. **Matches** — two separate `.contains('team_a_player_ids'|'team_b_player_ids', [playerId])`
   calls against `matches` (not a guessed `.or()` filter — this mirrors
   `usePlayerWL`'s existing two-query pattern exactly), each joined with
   `games(*)` and `session:sessions(location)`. Results from both queries
   are deduped by match id before building activity items (covers the edge
   case where a player could theoretically appear in both team arrays).
   Per match, W/L + game count reuse the *same* win-counting logic as
   `usePlayerWL`, not a reimplementation: I extracted `tallyBySide(games,
   playerId, side)` out of `usePlayerWL` in `usePlayerStats.ts` (previously
   two inline `for` loops) and call it twice (side `'a'` and `'b'`) against
   just that match's own `games` embed. `usePlayerWL` itself now calls the
   same extracted function against its two pre-filtered query results —
   behavior-preserving (verified: full build + all existing tests still
   green, no `usePlayerStats.test.tsx` existed to begin with). Result line:
   `"W · 4 of 5 games"` (wins > losses → `W`, losses > wins → `L`, equal →
   `T`; game count is `games.length` for that match regardless of whether
   the player sat out any single game on a sub rotation).
2. **Drills** — `.contains('player_ids', [playerId])` on `drills`, joined
   with `heat_entries(*)` and `session:sessions(location)`. Each drill's
   `heat_entries` are filtered to `player_id === playerId` for personal
   makes/attempts; hand is taken from the player's own filtered entries
   (falling back to the drill's own `hand` column if the player logged no
   entries). Result line: `"82% · R · 82/100"`.
3. **Competitive games** — `.eq('player_id', playerId)` on
   `competitive_results`, joined with `competitive_games(*, session:sessions(location))`.
   Total participant count comes from `competitive_games.player_ids.length`
   (already embedded — no extra query). Result line: `"2nd of 6"` via a
   standard ordinal-suffix helper.

None of the three source tables (`matches`/`drills`/`competitive_games`)
carry a `location` column directly — only their parent `sessions` row
does — so each branch adds a `session:sessions(location)` embed, the same
alias convention already used by `useAttendanceStats.ts`
(`session:sessions(date, location, state)`). This is the one place I
extended the brief's literal query snippets, since the required output
shape (`location`) can't be produced from the tables the brief named alone.

All items merge into `{ id, activityType, label, location, date,
resultLine }[]`, sorted by date descending via `mergeAndSortActivity`, with
no cap on the merged list (per `plan.mdx`'s Questions-block
recommendation, "No cap for v1").

### `src/hooks/usePlayerStats.ts` (edited)

Extracted `tallyBySide(games, playerId, side): WLStats` (exported) from
`usePlayerWL`'s two inline loops. `usePlayerWL`'s public behavior and
return shape are unchanged — verified via full build/lint/test suite.

### `src/pages/PlayerProfilePage.tsx` (edited)

Added a "Recent Activity" section strictly below the attendance-stats
strip (after its closing `)}`, before the container `</div>`) — the hero
card, edit sheet, and `ShotChart` usage above/below it are untouched.
Renders the first 10 items as `Card variant="accent"` list items (icon
badge + label/location·date/result-line — same visual pattern as
`SessionRecapPage.tsx`'s per-activity list), with a ghost "View More"
button that expands `visibleActivityCount` by 10 (no new fetch — the full
sorted list is already in memory). Section renders nothing when there's no
activity yet (no empty-state clutter on a fresh player).

## Recap-route addressing gap (confirmed, as anticipated by the brief)

Confirmed by reading `src/App.tsx` and the two existing recap pages:

- `/match/recap` and `/drill/recap` have no `:id` param, and
  `MatchRecapPage.tsx` / `DrillRecapPage.tsx` render entirely from
  client-side Zustand store state (`useMatchStore()` / `useDrillStore()`),
  not a fetch-by-id. They can only show whatever match/drill is currently
  live in the store — never an arbitrary past one.
- There is no competitive-game recap route at all (grepped `src/App.tsx`
  for `competitive`; only `/activity/setup` and `/activity/banks` exist,
  both live-session setup/play screens, not recaps).

So none of the three activity types can be addressed by id today. Per the
brief's explicit instruction, Activity Cards are **non-navigable**: no
`onClick` is passed to `Card`, so it renders without the pointer-cursor
"tappable" affordance it only adds when a handler is present — no new
routes invented, no retrofitting of the recap pages (out of scope here).

## Testing

New `src/hooks/useRecentPlayerActivity.test.tsx` (28 tests):

- Hook-level integration tests (mocked `supabase.from`, dispatched per
  table, `QueryClientProvider` + `createRoot`/`act` harness) covering: the
  full three-branch merge + date-descending sort, dedup of a match returned
  by both the team_a and team_b `.contains()` queries, and the all-empty
  case. Follows `useSessions.test.tsx`'s `waitForSettled` convention
  exactly — polls the hook's own captured `isPending` (which the hook
  exposes for this purpose), never a cache-level proxy — since this is a
  single `useQuery` (like `usePlayerWL`), not a chained multi-query hook.
- Pure-function unit tests: `computeMatchWL` (mixed win/loss across games
  with team-side switches between games; a game the player didn't appear
  in on either side never counts), `formatMatchResultLine` (W/L/T
  outcomes, singular "game" for a 1-game match), `formatDrillResultLine`
  (multi-attempt %, hand letter, 0/0 edge case, missing-hand fallback),
  `ordinal`/`formatCompetitiveResultLine` (1st/2nd/3rd/4th and the
  11th/12th/13th exceptions), `mergeAndSortActivity` (mixed-type
  date-descending order, no cap, all-empty).

Full suite run **twice** after the final fix (see below): both runs
168/168 tests passing, 19 files, no flakiness.

`npm run build`: clean (`tsc -b && vite build`).
`npm run lint`: found and fixed one *new* error I introduced (a
`useEffect(() => setVisibleActivityCount(10), [playerId])` I'd added
defensively for a profile-to-profile navigation edge case — the
`react-hooks/set-state-in-effect` rule flagged it). Removed it since it
wasn't part of the brief's requirements and the app's actual navigation
flow doesn't hit that edge case (`BackButton` always routes through
`/players` first, which remounts this page). Confirmed lint is back to
exactly the baseline: 5 pre-existing errors + 1 warning in
`IOSInstallBanner.tsx`/`StatusDot.tsx`/`AttendancePage.tsx`/`CompetitiveSetupPage.tsx`,
none in files this task touched.

## Files changed

- `src/hooks/useRecentPlayerActivity.ts` (new)
- `src/hooks/useRecentPlayerActivity.test.tsx` (new)
- `src/hooks/usePlayerStats.ts` (edited — extracted `tallyBySide`)
- `src/pages/PlayerProfilePage.tsx` (edited — new activity-log section)
