# Task 12: Real per-format + Recreational W-L, and a W-L pill on the roster list (PRD §4.4, §6, bug §12.1)

## Status
**DONE**

## Summary
`WinLossPage.tsx` used to render the exact same hardcoded `DATA` array and a
hardcoded `22–14` Recreational row for every player, and its back button
always went to `/players/1` — two different players' `/players/:id/wl` pages
looked identical regardless of which player's route was actually open. That
mock is now gone: the page reads the real `:id` route param, fetches real
per-format and Recreational win/loss records from Supabase, and its back
button returns to the correct player. The roster list (`PlayersPage.tsx`) now
also shows each player's aggregate W-L as a small pill, fixing PRD bug §12.1's
"wasted space" on the roster row.

## Changes Made

### 1. `src/hooks/usePlayerStats.ts` (additive only — `usePlayerWL`/
`usePlayerShooting` untouched)
- **`usePlayerWLByFormat(playerId)`**: mirrors `usePlayerWL`'s existing two
  `.contains('team_a_player_ids'/'team_b_player_ids', [playerId])` queries
  against `games`, extended with the same aliased-embed pattern
  `usePlayerShooting` already uses (`drill:drills(shot_type)`) — here
  `match:matches(format)`. The pure grouping logic is extracted into
  **`groupWLByFormat(gamesA, gamesB, playerId)`**, which reuses
  `tallyBySide`'s exact per-game win/loss rule (a tie counts as a loss for
  whichever side is being tallied — that function's own doc comment) so this
  hook's numbers always sum to the same total as `usePlayerWL`'s aggregate
  for the same games; only the format-bucketing is new. Every one of the 5
  `ALL_FORMATS` is seeded up front, so a format the player never played comes
  back as `{ wins: 0, losses: 0 }` instead of being omitted.
  - **Tie-handling decision**: `MatchRecapPage.tsx`'s `bWins = total - aWins`
    is a *team-level, two-column display* idiom (whatever isn't a strict A
    win gets bucketed into B's column, including ties) — not a per-player
    "did this player win" rule. The actually-relevant, already-established
    precedent for a *player-scoped* per-game W/L tally is `tallyBySide`
    (already used by `usePlayerWL` and reused by
    `useRecentPlayerActivity.ts`'s `computeMatchWL`), which counts a tie as a
    loss for both sides. I stayed consistent with that one, since
    `usePlayerWLByFormat` is fundamentally the same computation as
    `usePlayerWL`, just bucketed further — and a test asserts the two
    invariantly agree (see Testing).
- **`usePlayerRecreationalRecord(playerId)`**: `competitive_results.select('rank, competitive_games(game_type)').eq('player_id', playerId)` —
  unaliased `competitive_games` embed key, matching
  `useRecentPlayerActivity.ts`'s existing convention for this exact join
  (not the aliased `drill:` style, which that file only uses for the
  `heat_entries`→`drills` join). Pure counting logic extracted into
  **`tallyRecreationalRecord(rows)`**: a row counts as a win when
  `rank === 1`, a loss otherwise, **but only when `game_type` is `'banks'`,
  `'next'`, or `'generic'`** (`RECREATIONAL_GAME_TYPES`, exported) — a
  `'middies'` row (or a row with no resolvable embed) is skipped entirely,
  never counted as a win *or* a loss. Per PRD §6.2, Middies' career stat is
  Mid-Range %, not W/L.

### 2. `src/pages/WinLossPage.tsx` (rewritten)
- `useParams<{ id: string }>()` for the real player id; hardcoded `DATA`
  replaced with `usePlayerWLByFormat(id)`; hardcoded `22–14` Recreational row
  replaced with `usePlayerRecreationalRecord(id)`.
- Back button: `nav('/players/1')` → `nav(\`/players/${id}\`)`.
- Also made the back button's *label* dynamic (`usePlayer(id)` from the
  untouched `usePlayers.ts`, read-only import) — `"{nickname}'s profile"`
  instead of the hardcoded `"JC's profile"`, since a static label naming one
  specific player while navigating to a *different* player's profile is the
  same class of bug this task exists to fix, and the fix is one hook call.
- Recreational row's label changed from `"Banks · Middies · Next"` to
  `"Banks · Next · Generic"` — the old label was actively misleading once
  Middies was excluded from the number it's describing.

### 3. `src/pages/PlayersPage.tsx`
Extracted a `PlayerRosterRow` sub-component (a hook can't be called inside
the roster's `.map()` without breaking rules-of-hooks) that calls
`usePlayerWL(player.id)` — one extra query per visible row, acceptable at
this app's roster scale per the brief — and renders a `<Tag>` pill: `"12-4"`
style label, or `"–"` when the player has no games yet.

### 4. `src/components/ui/Tag.tsx`
Added two new CSS-var-only variants — `positive` (`var(--green-soft)` /
`var(--green)`) and `negative` (`var(--red-soft)` / `var(--red)`) — reusing
this existing small pill/badge component (already the established
"indicator chip" pattern in this codebase; its other variants were left
unchanged, and its only other call site, `CompetitiveSetupPage.tsx`, is
unaffected). The roster pill picks `neutral` (no games), `positive`
(wins ≥ losses), or `negative` (losses > wins) — the same `>= 50%` threshold
`WinLossPage.tsx` already uses for its own green/red bar coloring.

## Testing
New file `src/hooks/usePlayerStats.test.tsx` (15 tests), run via `npm test`
**twice** (both times: 22 files / 196 tests passing, including the full
pre-existing suite):

- `groupWLByFormat`: all 5 `ALL_FORMATS` present when the player only played
  2 of them (other 3 at `0/0`, not omitted); a tied game counts as a loss
  (see tie-handling decision above); a game where the player isn't actually
  on the tallied side doesn't count; a null `match` embed is skipped, not
  thrown on; sums to the same total wins/losses `tallyBySide` would produce
  over the same rows (cross-checks consistency with `usePlayerWL`).
- `tallyRecreationalRecord`: **the Middies-exclusion test** — 2 banks wins +
  1 middies win → `{ wins: 2, losses: 0 }`, not `3-0` — passed; rank 2+ counts
  as a loss for each of the 3 recreational types; a middies result is never
  miscounted as a loss either (skipped, not defaulted); null embed and empty
  input handled.
- `usePlayerWLByFormat` / `usePlayerRecreationalRecord` hooks (mocked
  Supabase, same chain-mock convention as `useSessions.test.tsx` /
  `useRecentPlayerActivity.test.tsx`, `waitForSettled` polling each hook's
  own `isLoading`): two differently-scripted fake players (`player-a`,
  `player-b`) produce genuinely different, individually-correct records —
  this is the literal regression check the brief asks for, since the old
  mock would have shown identical numbers for both.
- `usePlayerWL` regression guard: unchanged aggregate behavior still passes.

Verification commands run:
- `npm test` — 22 files / 196 tests passing, run twice
- `npx tsc -b` / `npm run build` — clean
- `npm run lint` — only the 5 pre-existing baseline errors + 1 warning in
  `IOSInstallBanner.tsx` / `StatusDot.tsx` / `AttendancePage.tsx` /
  `CompetitiveSetupPage.tsx`; nothing new from any file this task touched

No way to open the real running app against live/seeded Supabase data in
this environment, so per the brief's own fallback ("at minimum, write hook
tests with mocked Supabase data for two different fake players... assert the
numbers differ and are each individually correct") verification was done via
the mocked-hook tests described above rather than manually opening two
players' `/players/:id/wl` routes.

## Files Modified / Added
- `src/hooks/usePlayerStats.ts` (modified: two new hooks + two new pure
  functions, additive only)
- `src/hooks/usePlayerStats.test.tsx` (new)
- `src/pages/WinLossPage.tsx` (rewritten: real `:id`, real hooks, fixed back
  button target + label)
- `src/pages/PlayersPage.tsx` (modified: extracted `PlayerRosterRow`,
  added W-L pill)
- `src/components/ui/Tag.tsx` (modified: added `positive`/`negative`
  variants)

## Notes
- No new npm dependencies.
- Did not touch `SessionRecapPage.tsx`, `useSessionHighlights.ts`,
  `CalendarPage.tsx`, `DashboardPage.tsx`, `useSessions.ts`, `usePlayers.ts`,
  `playerEditForm.ts`, `useRecentPlayerActivity.ts`, `PlayerProfilePage.tsx`,
  `ShotChart.tsx`, `useSpotHistory.ts`/`spotHistory.ts`. `usePlayers.ts`'s
  existing `usePlayer(id)` was imported read-only into `WinLossPage.tsx`,
  not modified.
- `usePlayerWL`/`usePlayerShooting` in `usePlayerStats.ts` are unchanged —
  the new hooks are purely additive.
