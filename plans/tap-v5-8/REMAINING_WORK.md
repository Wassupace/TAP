# TAP v5.8 — Remaining Work

This document hands off everything left to build after Phases 1 and 2. It's
written for whoever picks this up next (GitHub Copilot or otherwise) without
assuming any memory of how Phases 1-2 were executed. `plans/tap-v5-8/plan.mdx`
is the original source-of-truth plan for the whole v5.8 effort — this document
narrows that down to what's actually left, with the current, as-built state of
the repo as the baseline (not the plan's original pre-Phase-1 assumptions,
which are now out of date for the Sessions and Player Profile modules).

## Status

| Phase | Module (PRD section) | Status |
| --- | --- | --- |
| 1 | Foundations: data-integrity fix, Player Picker Modal, NumberPad, theme system | **Done**, merged to `main` |
| 2 | Sessions (§3) + Player Profiles & shot chart (§4) | **Done**, 12 tasks + a final-review fix wave, all merged to `main` — one open decision, see below |
| 3 | Matches (§5) + Competitive Games (§6) | **Not started** — this document |
| 4 | Drills completeness (§7, beyond Phase 1's critical fix) | **Not started** — this document |
| 5 | Sheets export (§9), Offline sync consistency (§1.3), remaining bug sweep (§12) | **Not started** — this document |

Everything below Phase 2 is unbuilt. Phases 3, 4, 5 are independent of each
other in principle (different modules, different files) — they can be done in
any order, though the order below matches the original plan's sequencing and
this project's usual coach-facing-priority order (Matches and Competitive
Games are used more often per week than Drills-completeness polish or the
Sheets-export/offline-sync plumbing).

## One open decision from Phase 2 (resolve before or alongside Phase 3)

Phase 2's final whole-branch review found that **PRD §3.3's stated primary
entry point was never built**: *"The homepage (Dashboard) surfaces the next
upcoming planned session as a prominent card above the Start New Session
button. This is the primary entry point on session days."* No task's brief in
Phase 2 covered building this card — everything about *what happens when you
tap it* (the Start Now / Review Details modal) got built and works correctly,
but the card itself, on the Dashboard, does not exist.

The data is already available: `src/pages/DashboardPage.tsx` already calls
`useTodaysPlannedSession()` (from `src/hooks/useSessions.ts`) for its ad-hoc
disambiguation prompt. `useStartPlannedSession()`
(`src/hooks/useStartPlannedSession.ts`) already has the "Start Now" logic, and
`src/pages/CalendarPage.tsx`'s `StartOrReviewModal` component is a working
reference for the "Start Now / Review Details" two-button pattern.

**Decision needed:** build this card now (small — a new render block in
`DashboardPage.tsx`'s idle state, using data already in hand, opening the same
Start Now/Review Details choice) or defer it. Today, a coach can still reach
every Phase 2 feature via the Calendar — this is a discoverability/PRD-fidelity
gap, not a broken feature. Recommend building it as a small standalone task
before or during Phase 3, since it's cheap and closes a real PRD gap; but this
is the project owner's call, not an engineering one.

## Standing open product question (resolve before/during Phase 4)

Early in this project (Phase 1), the Drills setup wizard's data-integrity bug
was fixed (every `heat_entries.player_id` was silently `''`). While fixing
that, a product-design question came up about **group-drill spot-completion
semantics** — roughly: when multiple players share a round-robin rotation
through a drill's spots, what does "this spot is done, move to the next one"
mean — is it per-player (each player individually reaches their own heat
target at a spot before the group advances) or per-group (the group advances
together once the current shooter's heat is logged, regardless of where other
players are)? The exact original framing of this question was not preserved
in any committed file, so **read `src/stores/drillStore.ts`'s round-robin
rotation logic and `src/pages/DrillPage.tsx`'s current Next Spot/Save Heat
flow fresh** before Phase 4 starts, and confirm with the project owner what
"spot complete" should mean for a group drill before building anything in
Phase 4 that depends on it (especially "Add a distinct Next Spot button" and
the "Full breakdown table on DrillRecapPage," both below). Don't guess at this
one — it was deliberately left for a human decision both times it came up.

## Working conventions carried forward from Phases 1-2

These aren't optional style preferences — they're load-bearing patterns this
codebase now depends on. Read them before writing code in any phase below.

- **Styling**: every color/spacing value goes through a `var(--...)` CSS
  custom property already defined in `src/index.css` (light/dark themed).
  Zero hardcoded hex colors, zero Tailwind `dark:` variants. If a phase needs
  a new token, add it to `src/index.css`'s existing `:root[data-theme="..."]`
  blocks (see `--hero-eyebrow` for a recent example of this pattern, added in
  Phase 1's final review).
- **No new npm dependencies** were added in Phases 1-2 and none should be
  needed for Phases 3-5 either — every UI pattern needed so far (bottom
  sheets, modals, pickers, numpads) was built from this repo's own existing
  primitives (`Card`, `Button`, `Tag`, the shared bottom-sheet markup pattern
  used across `PlayerPickerModal`/`CalendarPage.tsx`'s sheets/etc.).
- **No component-test library** (`@testing-library/react` or similar) is
  installed, and none should be added. Every test in this repo is either a
  pure-function unit test, or a hook test using a small hand-rolled harness:
  `createRoot`/`act` from `react-dom/client` + `react`, mounting a one-off
  `Harness` component that calls the hook and captures its return value in a
  closure. See `src/hooks/useSessions.test.tsx` for the canonical example.
- **React-Query hook test settle-polling — do this correctly the first time.**
  This exact bug shape cost real time across three separate tasks in Phase 2
  (see `.superpowers/sdd/tasks-phase2/progress.md`'s Task 2/4/7 entries for the
  full history if useful context). A single fixed `setTimeout(0)` tick, or
  polling a global/cache-level proxy like `queryClient.isFetching()` or a bare
  `useIsFetching()` counter, is NOT reliable — it can read a stale value under
  load because the proxy can settle before the component's own render commits.
  **Always poll the hook's own captured return value** (e.g. its `isPending`
  flag) from inside the test harness, in a bounded loop:
  ```ts
  async function waitForSettled(getHook: () => { isPending: boolean }) {
    for (let i = 0; i < 20; i++) {
      await act(async () => { await new Promise((r) => setTimeout(r, 0)) })
      if (!getHook().isPending) return
    }
  }
  ```
  If a hook composes multiple internal queries and doesn't already expose its
  own `isPending`, add one (see `src/hooks/useSessionHighlights.ts` for a
  worked example of deriving a combined `isPending` from several internal
  `useQuery` results, gated so a never-enabled query doesn't hold it open
  forever).
- **Lint baseline**: `npm run lint` currently reports exactly 5 errors + 1
  warning, all pre-existing and out of scope for any of this work:
  `IOSInstallBanner.tsx` (1), `StatusDot.tsx` (1), `AttendancePage.tsx` (2
  errors + 1 warning), `CompetitiveSetupPage.tsx` (1). Any new work should add
  zero new lint issues — if `npm run lint` reports more than these 6 problems,
  something regressed.
- **Verification before calling anything done**: `npm run build`, `npm test`,
  `npm run lint` all clean. Run the test suite multiple times in a row before
  trusting a "no flakes" claim — Phase 2's experience is that a single green
  run does not prove a React-Query test is race-free.
- **"Today" is a solved problem — use it.** `src/utils/todayISODate.ts`
  exports `todayISODate(d?: Date): string`, the single source of truth for
  "today" as a local-date `'YYYY-MM-DD'` string. Never write
  `new Date().toISOString().split('T')[0]` (UTC) or a new inline local-date
  computation anywhere — both patterns caused a real cross-timezone bug in
  Phase 2 (fixed in that phase's final review).
- **Offline queue**: `src/lib/db.ts` exports `dbInsert`/`dbUpdate`/`dbDelete`,
  which queue a write in IndexedDB and retry via `syncWorker.ts`'s polling
  loop if Supabase is unreachable. Only three call sites use this today
  (`matchStore.endGame()`, `drillStore.commitHeat()`,
  `sessionStore.setNotes()`) — Phase 5 below extends this to everything else,
  but any NEW mutation added in Phase 3 or 4 should go through `dbInsert`/
  `dbUpdate` from the start rather than calling `supabase.from(...)` directly,
  to avoid adding to the debt Phase 5 has to pay down.

---

## Phase 3 — Matches + Competitive Games (PRD §5, §6)

### Rulings already made (don't re-decide these)

- **Team reassignment / Banks elimination order**: tap-to-cycle, not real
  drag-and-drop. `matchStore.ts` already exports `movePlayer(playerId, to:
  'A'|'B'|'sub')` — it's simply never called. Wire it as "tap a chip to cycle
  Team A → Team B → Sub." Banks' elimination order becomes tap-in-sequence
  (tap 1st eliminated, then 2nd, ...; the app assigns rank from tap order).
- **Match tie-breaker**: PRD §5.3's literal wording ("smallest aggregate point
  differential decides the winner") doesn't make sense as written — implement
  **largest** aggregate point differential wins when game-win counts tie,
  Draw if still equal.

### Tasks

1. **Make Duration Wave a real mode.** `MatchSetupPage.tsx` currently renders
   Target/Wave as two tabs that do nothing — `handleStart` hardcodes
   `scoring_style: 'targetScore'` (see line ~28) regardless of which tab is
   selected. Wire the tab `onClick`s to the store's `setScoringStyle` (check
   `matchStore.ts` for the exact action name/shape). Conditionally render
   either the Target quick-picks (7/11/21 + free input, existing) or a
   Duration input (10/20 min + free input) — never both, per PRD §5.1. Wave
   mode needs a running countdown and an audio alarm at zero once a match is
   live (`MatchActivePage.tsx`). Remove the hardcoded `scoring_style` line in
   `handleStart` once the tab state actually drives it.

2. **Wire manual team reassignment.** Add tap handlers on the Team A/B/Sub
   chips in `MatchSetupPage.tsx` that call the store's `movePlayer` action
   (cycle A → B → Sub → A on tap). This is the manual override PRD §5.2 asks
   for alongside the existing Shuffle/Re-shuffle buttons, which should keep
   working exactly as they do today.

3. **Possession / Winners Ball highlight.** Add a possession indicator (border
   or icon — reuse this app's existing accent-border convention, e.g. how
   `PlayerPickerModal` marks a selected player) on whichever team panel won
   the most recent completed game, per PRD §5.3's Winners Ball rule. The
   completed-games list is already in the match store.

4. **Pause + mid-game roster edit.** `MatchActivePage.tsx`'s roster button
   (check `Icons.roster`'s usage — it currently has no `onClick`) should pause
   the match timer and open the shared `PlayerPickerModal`
   (`src/components/ui/PlayerPickerModal.tsx`) for late arrivals or injury
   subs, per PRD §5.5, then resume the timer with all other state (score,
   completed games) intact.

5. **Tie-breaker rule.** Implement the ruling above (largest aggregate point
   differential wins on a game-win tie, Draw if still equal) using the
   already-available `completedGames` array in the match store — the same
   data `MatchRecapPage.tsx` already reduces for its own Closest/Longest
   callouts.

6. **Quick Rematch with roster continuity.** Today, `matchStore.ts`'s
   `reset()` wipes the entire roster. Add a `resetForRematch()` action that
   clears scores/`completedGames`/the timer but preserves `format`/`teamA`/
   `teamB`/`subQueue`, landing back on `MatchSetupPage` pre-filled (and still
   editable) rather than empty.

7. **Dominance and Best-side recap callouts.** Add to `MatchRecapPage.tsx`,
   reusing the same `completedGames` reduction pattern the existing
   Closest/Longest callouts use: Dominance = the team with more game wins,
   average margin across those wins; Best side = the player present on the
   winning team the most games (derive from each completed game's
   `teamAPlayerIds`/`teamBPlayerIds`).

8. **`competitiveStore.ts`.** New Zustand store, same ephemeral-store pattern
   as `drillStore.ts`/`matchStore.ts` (read one of those first for the
   convention). Carries `gameType`/`spot`/`quotaPerPlayer`/`customName`/
   `playerIds` from `CompetitiveSetupPage.tsx` into whichever activity screen
   handles that game type — today, everything `CompetitiveSetupPage.tsx`
   collects is silently discarded except for Banks (its Confirm button only
   navigates to `/activity/banks`, and even that page ignores the setup data
   — see next task).

9. **Banks: real data, tap-to-sequence elimination.** `BanksPage.tsx`
   currently hardcodes a 5-player `PLAYERS` array and has a decorative
   (non-functional) drag handle. Replace the hardcoded roster with the real
   session roster from `competitiveStore.ts` (task 8); replace the decorative
   drag rows with tap-in-elimination-order (per the ruling above); persist a
   `competitive_games` row (`game_type: 'banks'`) plus one `competitive_results`
   row per player (`rank`, and `score` for the winner's margin) on save,
   instead of the current no-op navigation to `/match/recap`.

10. **Middies screen.** New screen — doesn't exist yet. Post-game makes-per-
    player entry grid (tap a number to open the shared `NumberPad` component,
    `src/components/ui/NumberPad.tsx`). Rank is computed client-side by makes
    descending. Persists `makes` + `rank` to `competitive_results`.
    **Important**: Middies' career stat is Mid-Range %, NOT Recreational W/L
    (PRD §6.2) — do not let a Middies result feed any win/loss aggregate
    (there's precedent for this exact exclusion in
    `src/hooks/usePlayerStats.ts`'s `usePlayerRecreationalRecord`, which
    already explicitly filters `game_type` to `'banks'|'next'|'generic'`,
    excluding `'middies'` — read that function for the pattern to follow).

11. **Next screen.** New screen — doesn't exist yet. A target-makes quick-pick
    at setup (default 10, adjustable), then the same post-game count-entry
    grid pattern as Middies. Unlike Middies, a Next result DOES feed
    Recreational W/L (rank === 1 is a win, per the existing
    `usePlayerRecreationalRecord` pattern).

12. **Generic activity screen.** Wire the already-existing
    `CompetitiveGame.custom_name` field (check `src/types/index.ts` — it's
    already typed and in the schema, just unused in any UI) to a text input in
    `CompetitiveSetupPage.tsx`'s setup flow. Ranking uses the same
    tap-sequence entry as Banks.

### Verification

- Start a match, switch to Duration Wave, confirm the Target input disappears
  and a running countdown with an audible alarm at zero appears; confirm
  `matches.scoring_style` persists as `'durationWave'` in Supabase.
- Tap a player chip in Match Setup, confirm it cycles A → B → Sub → A and the
  roster panels update.
- Play a Banks game with real players, confirm a `competitive_games` row
  (`game_type: 'banks'`) and one `competitive_results` row per player land in
  Supabase with correct `rank`.
- Log a Middies result, then check that player's profile's Recreational W/L
  (`/players/:id/wl`) did NOT change — only their Mid-Range % should reflect
  it.
- Log a Next result with `rank === 1`, confirm that player's Recreational W/L
  DID increment.

---

## Phase 4 — Drills completeness (PRD §7, beyond Phase 1's critical fix)

Phase 1 already fixed the critical data-integrity bug (the Player Picker
Modal is wired into `DrillPage.tsx`'s setup Step 4, `drillStore.setPlayers()`
is called, `heat_entries.player_id` is real). This phase is the remaining
polish/completeness pass on top of that fix.

**Before starting, resolve the standing open question above** (group-drill
spot-completion semantics) — it affects at least tasks 3 and 6 below.

### Tasks

1. **Active shooter display and manual override.** Show
   `players[currentPlayerIndex]`'s name prominently on the live drill screen
   (`DrillPage.tsx`) — per PRD §7.1a, this should be the most visually
   prominent thing on screen during a group drill. Add a tap target on the
   player roster strip to jump the active index manually (for a coach
   correcting a rotation mistake mid-drill).

2. **Solo vs Group branching.** `mode = players.length <= 1 ? 'solo' :
   'group'`, now meaningful since Phase 1 made `players.length` real. Group
   mode should hide the optional session-target step entirely (fixed attempt
   quota only, per PRD §7.3 — "make-targets create unacceptable wait times"
   with multiple players rotating). Solo mode keeps the optional target.

3. **Heat-size and target quick-picks to spec.** Current fixed grids
   (`[5,8,10,12,15,20]` for heat size, `[5,8,10,15,20]` for target — check the
   exact current arrays in `DrillPage.tsx`'s setup wizard) should become the
   PRD's actual quick-picks: heat size 5/10/Player Input/Manual; target
   10/50/100/Player Input/None. "Player Input" opens the shared `NumberPad`
   for a custom value. "Manual" mode has no fixed size — Next Spot (task 4)
   auto-saves whatever was tallied when the coach taps it, regardless of
   count.

4. **Add a distinct Next Spot button.** Today only "Save Heat & Next" exists
   — there's no way to move to the next spot before a heat-size/target is hit
   without also force-logging another heat. Add a separate "Next Spot" button
   per PRD §7.2's navigation rule (available once ≥1 heat has been logged on
   the current spot). This likely means splitting the spot-advance logic that
   currently lives inside `commitHeat()` in `drillStore.ts` into its own
   action.

5. **Pause mid-heat.** Same pattern as the Matches-module pause (Phase 3, task
   4): open the shared `PlayerPickerModal` without losing
   `completedHeats`/`currentMakes` (already safe in the Zustand store — this
   is a UI wiring task, not a data-model change).

6. **Full breakdown table on DrillRecapPage.** `DrillRecapPage.tsx` currently
   shows some but not all of PRD §7.5's spec. Add a full players × spots grid
   with the heat-by-heat sequence per cell, plus totals row and column. Add
   the two missing callouts (Efficiency, Heat trend) alongside whichever
   three already exist — rename those existing three to the PRD's exact
   labels ("Spot best"/"Spot to work") if they currently differ.

7. **Shot-type to career-stat rollup.** `src/hooks/usePlayerStats.ts`'s
   `usePlayerShooting` currently reduces drill shot types into a 3-bucket
   career stat (FT/Mid/3PT) but ignores `layup`/`floater`/`postUp` entirely,
   per its current `type === 'midRange'` branch. Extend that branch to also
   match those three types, rolling all of them into the same "Mid-Range
   Interior" bucket per PRD §7.4.

### The 5-orphaned-zones item (already scoped out of Phase 2, still pending)

Phase 2 explicitly deferred extending `ShotSpot`'s type (currently only 5
values: `left0/left45/center/right45/right0`) to cover the 5 zones on
`ShotChart.tsx` that have no matching spot value (the restricted area + 4
interior block/post zones) — those zones permanently render mock numbers
today. This extension needs UI wiring (adding the new positions to the Drill
setup spot-picker) alongside the type change, which is why it landed here
rather than in Phase 2's shot-chart work. If this phase's scope allows it,
add:
- The 5 new `ShotSpot` values to `src/types/index.ts`.
- The new positions to the Drill setup wizard's spot-picker step.
- The 5 new entries to `ShotChart.tsx`'s `spotZoneMap`.

Note: the original plan flagged a real ambiguity in the PRD's own text about
which color-threshold category the 2 low-block zones should use (Paint vs.
Mid-Range thresholds) — the current code (pre-dating this whole project) types
low-block as Paint and mid-post as Mid-Range; the original plan's
recommendation was to keep that as-is. Confirm this is still the right call
before extending the taxonomy, since it directly affects how the new zones
render.

### Verification

- Run a 2+ player group drill end to end; confirm the active-shooter display
  updates correctly as the rotation advances, and that manually tapping a
  different player jumps the active index correctly.
- Confirm Solo mode still shows the optional target step, Group mode does
  not.
- Tap Next Spot after only 1 heat (well under the heat-size target); confirm
  it advances without forcing an extra heat log.
- Open `DrillRecapPage.tsx` for a multi-player, multi-spot drill; confirm the
  breakdown table's totals row/column match the sum of the per-cell heat
  sequences.

---

## Phase 5 — Sheets export, offline sync consistency, remaining bugs (PRD §9, §1.3, §12)

### The one must-fix-first item in this phase

`src/lib/sheetsExport.ts`'s `handleOAuthCallback` sends
`client_secret: CLIENT_SECRET!` (from `VITE_GOOGLE_CLIENT_SECRET`) directly
from the browser to Google's token endpoint. **Any `VITE_*` env var ships in
the client bundle** — this secret is currently readable by anyone who opens
dev tools on the deployed app. This is a live credential-exposure bug, not
just a spec gap, and should be fixed before anything else in this phase.

### Tasks

1. **Move the OAuth token exchange server-side.** Add a Vercel serverless
   function (this project already deploys to Vercel — a serverless function
   needs no new hosting setup), e.g. `api/google-oauth-callback.ts`, that
   holds `GOOGLE_CLIENT_SECRET` as a server-only env var (no `VITE_` prefix)
   and performs the token exchange. The client should post the auth code to
   this endpoint instead of calling Google directly with the secret.

2. **Sheet selection, not just creation.** `exportToSheets()` currently always
   creates a new spreadsheet on first export. Add a picker (the Google Picker
   API, or a simpler "paste a Sheet URL" fallback if that's less integration
   work) so PRD §9.1's "selects or creates" is actually both, not just
   "creates."

3. **Fix the 6-vs-7 tab mismatch.** The export code currently writes 7 tabs
   (`Sessions, Matches, Games, Competitive Games, Drills, Players, Career
   Stats`) while the PRD and in-app copy both say 6. **Ruling already made**:
   fold `Games` into the `Matches` tab (each match's rows followed by its own
   game rows) rather than dropping data or changing the PRD/copy.

4. **True background export + offline queue.** `doExport()` is currently an
   awaited promise inside the export button's click handler — navigating away
   mid-export aborts it. Move it into a durable queued job, reusing the
   existing IndexedDB queue infrastructure (`src/lib/db.ts`,
   `syncWorker.ts`'s polling pattern) so an export survives navigation, making
   PRD §9.3's "queued while offline, fires automatically on reconnect" real
   rather than aspirational.

5. **Route `usePlayers.ts` and `useSessions.ts` mutations through the offline
   queue.** Today only three call sites use `dbInsert`/`dbUpdate`/`dbDelete`
   (`matchStore.endGame()`, `drillStore.commitHeat()`,
   `sessionStore.setNotes()`). Every player mutation
   (`useAddPlayer`/`useUpdatePlayer`/`useDeletePlayer` in `usePlayers.ts`) and
   every session-lifecycle mutation (`useOpenSession`/`useEndSession`/
   `useActivateSession`/`useCreatePlannedSession`/`useCreateRecurringSessions`
   in `useSessions.ts` — the last two added in Phase 2) currently calls
   `supabase.from(...)` directly, so any of them simply throws with no retry
   if offline. Swap each for the matching `dbInsert`/`dbUpdate`/`dbDelete`
   call, matching the pattern already proven at the three existing sites. This
   is a signature-adjustment task at each call site, not new infrastructure —
   the queue, the retry worker, and the `StatusDot` online/offline indicator
   already exist and already work.

6. **Offline read path.** None of this app's `useQuery` reads have a local
   mirror today — an offline read currently just fails or hangs rather than
   showing anything. Add a lightweight IndexedDB read cache (the `idb`
   package is already a dependency) populated on every successful fetch,
   served when offline, so the UI has *something* to show (even if stale) per
   PRD §1.3's "UI always reads from local state" requirement.

### Remaining PRD §12 bug-sweep items

Cross-check these against the actual current code before assuming they're
still open — several §12 items turned out to already be fixed when Phases
1-2 checked them (see `plan.mdx`'s bug-fix table for what was already clean
before this project started). As of Phase 2's close, the only §12 items not
yet folded into a completed task are the ones this phase's tasks above cover
(the OAuth secret and offline-queue items are the last real §12-adjacent gaps
identified). Do a fresh pass against the PRD's §12 list at the start of this
phase in case anything else was missed — don't assume the table in `plan.mdx`
is still 100% current after two phases of changes.

### Verification

- Confirm the Google OAuth client secret no longer appears anywhere in the
  built client bundle (`grep` the `dist/` output after `npm run build` for
  any recognizable secret fragment — it should find nothing).
- Toggle devtools offline, add a new player and end a session, confirm both
  appear in the offline queue's pending count and `StatusDot` shows
  "Offline"; go back online and confirm both rows land in Supabase within one
  poll cycle.
- Export to Sheets, confirm exactly 6 tabs are written and `Games` rows appear
  correctly folded into the `Matches` tab.
- Start an export, navigate away immediately, confirm it still completes in
  the background rather than aborting.

---

## Where to look for more detail

- `plans/tap-v5-8/plan.mdx` — the original, fully-researched plan this
  document is derived from. Has wireframe mockups (`<Canvas>`/`<Screen>`
  blocks) for several of the screens above (Match Setup team assignment,
  live Drill screen) that are worth reading before building those specific
  UIs.
- `plans/tap-v5-8/tasks-phase1.md` / `plans/tap-v5-8/tasks-phase2.md` — the
  exact task breakdowns used to execute Phases 1 and 2. Useful as a reference
  for the level of precision/spec a task brief in this codebase should have,
  even though Phases 3-5 won't necessarily be executed the same way (those
  used a multi-agent dispatch-and-review process; that tooling lives under
  `.superpowers/` and isn't required to continue this work — plain
  implement-test-commit is fine).
- `plans/tap-v5-8/task-*-report.md` and `plans/tap-v5-8/tasks-phase2/task-*-report.md`
  — one detailed report per completed task, written by whoever implemented
  it, explaining exactly what was built and why. Worth skimming the ones for
  adjacent modules (e.g. Task 3's `StartOrReviewModal` before building
  anything similar in Matches/Competitive Games) since they establish
  patterns (bottom-sheet shell reuse, `var(--...)`-only styling, etc.) later
  work should stay consistent with.
- `docs/TAP_PRD_v5_8.md` — the actual product spec every PRD section
  reference above points to.
