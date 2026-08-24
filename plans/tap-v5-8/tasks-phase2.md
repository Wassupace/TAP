# TAP v5.8 — Phase 2: Sessions + Player Profiles

Source spec: `plans/tap-v5-8/plan.mdx` ("Sessions module" and "Player profiles &
shot chart" sections). PRD: `docs/TAP_PRD_v5_8.md` §3, §4.

All file states below were re-verified fresh against the current repo (post
Phase 1) immediately before writing this file — `DashboardPage.tsx` now uses
`useResolvePickedPlayers`/`PlayerPickerModal` per Phase 1; every other file
named below is unchanged from the original pre-Phase-1 research.

## Global Constraints

Same conventions as Phase 1 (`plans/tap-v5-8/tasks-phase1.md`'s Global
Constraints — CSS custom properties only, Zustand per concern, no new
component-test-library, `npm run build`/`npm test`/`npm run lint` must be
clean, 5 pre-existing lint errors in `IOSInstallBanner.tsx`/`StatusDot.tsx`/
`AttendancePage.tsx`/`CompetitiveSetupPage.tsx` are not your concern).
Additionally for this phase:

- Reuse `PlayerPickerModal` (`src/components/ui/PlayerPickerModal.tsx`) and
  `useResolvePickedPlayers` (`src/hooks/useResolvePickedPlayers.ts`) for any
  new player-selection UI — do not build a new picker.
- Reuse the bottom-sheet shell pattern already established (backdrop
  `rgba(0,0,0,.75)`+`blur(6px)`, `var(--r-lg) var(--r-lg) 0 0`, `padding: 24px
  18px 40px`, `maxHeight: 85dvh`) for any new modal/sheet.
- `src/pages/CalendarPage.tsx` is touched by Tasks 1, 2, 3, 4, 5, and 6, in
  that order. Each task's dispatch will tell you exactly what the prior
  tasks already built there — do not revert or restructure anything outside
  your own task's stated scope.
- Do NOT extend the `ShotSpot` type or touch `src/components/ui/ShotChart.tsx`'s
  `spotZoneMap` in this phase — extending the taxonomy to the 5 zones that
  currently have no spot mapping (`restricted`, `rblk`, `rpost`, `lpost`,
  `lblk`) requires Drill-setup UI wiring that belongs to Phase 4 ("Drills
  completeness"). Doing the type extension without that UI would just be
  inert — deferred deliberately, not an oversight.

---

## Task 1: Create Planned sessions (PRD §3.2)

### Current state

`src/hooks/useSessions.ts`'s `useOpenSession` always inserts `state:
'active'` (no way to create a `'planned'` row). `src/pages/CalendarPage.tsx`
has one creation path, `handleCreateAndOpen` (search for it), which calls
`useOpenSession` then immediately `setActiveSession(...)` + `nav('/')` —
every session this app creates today is born active, regardless of what
date was tapped. There is no "+" indicator on future dates, and no
distinction between "start now" and "plan for later."

### Fix

1. Add `useCreatePlannedSession()` to `useSessions.ts`, mirroring
   `useOpenSession`'s shape exactly but inserting `state: 'planned'` and no
   `started_at`:
   ```ts
   export function useCreatePlannedSession() {
     const qc = useQueryClient()
     return useMutation({
       mutationFn: async ({ location, date, expectedPlayerIds = [] }: {
         location: string; date: string; expectedPlayerIds?: string[]
       }) => {
         const { data, error } = await supabase
           .from('sessions')
           .insert({ location, date, state: 'planned', is_recurring: false, expected_player_ids: expectedPlayerIds })
           .select()
           .single()
         if (error) throw error
         return data as Session
       },
       onSuccess: (s) => {
         qc.invalidateQueries({ queryKey: ['sessions'] })
         qc.setQueryData(['session', s.id], s)
       },
     })
   }
   ```
2. In `CalendarPage.tsx`, tapping a day currently just does
   `setSelected(day.d)` regardless of date. Add a `+` indicator that renders
   on any **future**, session-less day cell (a small plus glyph inside the
   `.cal-day` cell, alongside where `.cal-dot` renders for days with
   sessions — mutually exclusive, a day never shows both). Tapping such a
   day should open a **new**, distinct sheet — "Plan Session" — reusing the
   existing quick-start sheet's visual shell (`showNewSession`'s JSX) but:
   - Title reads "Plan Session · {date}" instead of "New Session · {date}"
   - The confirm button reads "Plan Session" and calls
     `useCreatePlannedSession()` instead of `useOpenSession()`
   - On success, it does **not** call `setActiveSession`/`nav('/')` — it
     just closes the sheet and stays on the calendar (the new planned
     session's pill will appear once Task 2 builds real pills; for now it's
     enough that the row appears in the existing "Selected day sessions"
     list below the grid).
   - Add an optional "+ Add players" step to this sheet reusing
     `PlayerPickerModal` (selected ids become `expectedPlayerIds`) — per PRD
     3.2 "Attendees: checklist from player database — expected players
     pre-selected," though for this task, collecting the selection at
     creation time is sufficient; the picker's own "already selected"
     highlighting handles the "pre-selected" framing when this session is
     later reviewed.
   - **Today's date and past dates keep the exact current behavior**
     (immediate `state: 'active'` via `handleCreateAndOpen`, unchanged) —
     this task only adds a second, parallel path for future dates. Add a
     `isFutureDate = selectedDate > todayISODateString` check (compute
     `todayISODateString` from `now`, already in scope) to decide which
     sheet opens when `showNewSession` is triggered for the currently
     selected day.

### Verification

A hook-level test for `useCreatePlannedSession` (mock `supabase.from` the
way `db.test.ts` does, assert the insert payload has `state: 'planned'` and
no `started_at` key). Self-review: does tapping today or a past date still
behave exactly as before (unchanged code path)? Does tapping a future date
show the `+` and open the new sheet, and does confirming it leave you on the
calendar (not navigated away)?

**Report file:** `plans/tap-v5-8/tasks-phase2/task-1-report.md`

---

## Task 2: Calendar month pills + missed-session treatment (PRD §3.2, bug §12.3)

### Current state

Depends on Task 1 (adds a second creation path, doesn't change rendering).
`CalendarPage.tsx`'s grid cell rendering (search `hasSess`) shows only a
5px dot (`.cal-dot` in `src/index.css`) for any day with a session, with no
distinction between planned/active/completed, no gym name, no duration, and
no per-session distinction when multiple sessions share a day. `sessionDays`
is a `Set<number>` of day-numbers (presence only) — you'll need to change
this to carry the actual session objects.

### Design decision (already made, implement as specified — not a decision for you)

A `.cal-day` grid cell is a small square (`aspect-ratio: 1`, part of a
7-column mobile grid) — there is not enough room to render full "gym name +
duration" text pills at that scale, especially with 2 sessions on the same
day (PRD 3.7's Saturday two-gym pattern). Implement it this way:

1. Make `.cal-day` taller than square — change the CSS from `aspect-ratio:
   1` to a fixed `min-height: 60px` (keep everything else about the class
   as-is: border-radius, background, border, color, cursor).
2. Change `sessionDays` from `Set<number>` to a `Map<number, Session[]>`
   (day-number → every session on that day, there can be more than one).
3. Inside each `.cal-day` cell, below the day number, render up to 2 compact
   mini-pills (one per session that day, most relevant first — planned
   sessions before completed, since a same-day planned+active pair is rare
   but a plan converted mid-day matters more): each pill is a tiny rounded
   rect, `fontSize: 8px`, showing the location truncated to ~6 characters
   plus a one-word status suffix — `"Levall· 2h"` for a **completed**
   session (duration computed via the same `fmtDuration`-style logic already
   used in `SessionRecapPage.tsx` — extract that function to a shared
   utility if it's cheap to do, otherwise duplicate it, your call), `"Levall·
   Plan"` for a **planned** session (or `"Levall· Miss"` — see missed
   handling below), `"Levall· Live"` for an **active** session. Background
   color: green-tinted for active, blue-tinted for completed, orange-tinted
   for planned, grey for missed (match `stateColor()`'s existing color
   choices in this file). If a day has more than 2 sessions, show 2 pills
   plus a tiny `"+N"` badge — extremely unlikely given PRD 3.7's two-session
   pattern, but don't crash if it happens.
4. Missed-session treatment: derive client-side, no schema change. A
   session with `state === 'planned' && s.date < todayISODate` renders as
   "Missed" in neutral grey (a `stateColor()` branch you add) instead of the
   orange "Planned" treatment — never deleted, exactly matches what's
   already in the DB.
5. The existing "Selected day sessions" list below the grid (rendered from
   `selectedSessions`) can stay as-is — it already shows full location/state
   detail for the tapped day; the grid pills are the new "at a glance"
   layer PRD 3.2 asks for, not a replacement for that list.

### Verification

Confirm a day with 2 sessions (you may need to seed test data for this —
either via a quick script against the local Supabase-compatible stack, or a
narrow unit test around the pill-selection logic) renders 2 distinct pills,
not 1. Confirm a `state: 'planned'` session with a past date renders as
"Missed" grey, not orange "Planned".

**Report file:** `plans/tap-v5-8/tasks-phase2/task-2-report.md`

---

## Task 3: Start Now / Review Details modal (PRD §3.3)

### Current state

Depends on Task 1 (planned sessions now exist) and Task 2 (pills exist to
tap). Today, tapping a planned session's "Open →" button (in the "Selected
day sessions" list, search `s.state === 'planned'`) navigates straight to
`src/pages/AttendancePage.tsx` — no intermediate choice. `AttendancePage.tsx`
already implements almost exactly PRD 3.3's "Review Details" flow: it shows
the session's expected players as a checklist (pre-checked), lets the
scribe adjust, and calls `useActivateSession` on confirm. There is no
"Start Now" fast path (skip the checklist, use the saved expected roster
as-is).

### Fix

1. Add a small 2-option modal (reuse the bottom-sheet shell) that opens when
   a planned session's pill (from Task 2) or its "Open →" row is tapped,
   instead of navigating directly:
   - **"Start Now"** — skips `AttendancePage.tsx` entirely. Calls
     `useActivateSession({ sessionId, presentPlayerIds: session.expected_player_ids })`
     (treating every expected player as present, per PRD 3.3 "pre-populated
     with the saved location and attendee list"), then
     `setActiveSession(sessionId, session.location, expectedPlayers.map(p => p.nickname))`
     (you'll need `usePlayers()` to resolve `expected_player_ids` to
     nicknames — same pattern `AttendancePage.tsx` already uses), then
     `nav('/')`.
   - **"Review Details"** — navigates to `/calendar/attendance/:id` exactly
     as today (no change to that route or `AttendancePage.tsx` itself).
2. Where exactly this modal opens from: both Task 2's new pills (tapping a
   planned pill in the grid) and the existing "Selected day sessions" list's
   "Open →" button should trigger it — consolidate to one shared trigger
   point/component if that's cleaner than duplicating the modal-open call,
   your judgment.

### Explicitly not in scope

Do not modify `AttendancePage.tsx` itself, or `useActivateSession`.

**Report file:** `plans/tap-v5-8/tasks-phase2/task-3-report.md`

---

## Task 4: Ad-hoc-on-a-planned-day disambiguation (PRD §3.3)

### Current state

Depends on Task 1. Two independent creation paths exist for an **ad-hoc**
(non-planned) active session: `DashboardPage.tsx`'s `handleConfirm` (behind
"Start New Session") and `CalendarPage.tsx`'s `handleCreateAndOpen` (behind
the quick-start sheet, for today/past dates per Task 1's split). Neither
checks whether a `state: 'planned'` session already exists for the target
date before creating a brand-new one.

### Fix

1. Add `useTodaysPlannedSession()` to `useSessions.ts` — queries `sessions`
   for `date = <today>` (compute today's ISO date the same way
   `handleConfirm` already does) `AND state = 'planned'`, returns the first
   match (`.limit(1).maybeSingle()`) or `null`.
2. In `DashboardPage.tsx`'s `handleConfirm` and `CalendarPage.tsx`'s
   `handleCreateAndOpen`: before creating a new session, check this hook's
   result. If a planned session exists for that date, show a confirm prompt
   — "You have a planned session at [location] today — is this it?" — with
   Yes/No:
   - **Yes** → activate the existing planned session (same "Start Now"
     logic as Task 3 — consider extracting Task 3's activation logic into a
     small shared helper/hook both call, rather than duplicating it).
   - **No** → proceed with the existing ad-hoc creation flow unchanged
     (creates a second, independent active session — PRD 3.7's two-session
     pattern).
3. If no planned session exists for today, both flows behave exactly as
   they do now — no prompt, no behavior change.

**Report file:** `plans/tap-v5-8/tasks-phase2/task-4-report.md`

---

## Task 5: Location history autocomplete (PRD §3.2)

### Current state

Both location inputs (`DashboardPage.tsx`'s `NewSessionModal`,
`CalendarPage.tsx`'s quick-start sheet, and Task 1's new "Plan Session"
sheet) are plain `<input type="text">` with no suggestions.

### Fix

1. Add `useLocationHistory()` to `useSessions.ts` — fetches up to 50 recent
   sessions' `location` values (`.select('location').order('date', {
   ascending: false }).limit(50)`), dedupes client-side preserving
   most-recent-first order, returns up to 15 unique location strings.
2. Wire a `<datalist>` (native HTML autocomplete, no new UI component
   needed) on all three location `<input>`s — give each input a unique `id`
   and matching `list` attribute pointing at its own `<datalist>` populated
   from this hook.

**Report file:** `plans/tap-v5-8/tasks-phase2/task-5-report.md`

---

## Task 6: Weekly recurrence (PRD §3.2)

### Current state

Depends on Task 1. `sessions.is_recurring`/`recurrence_weekday` columns
exist and are typed (`Session.is_recurring`, `Session.recurrence_weekday?`)
but every insert path hardcodes `is_recurring: false`. No UI toggle exists.

### Fix

1. Add a "Repeat weekly" toggle to Task 1's "Plan Session" sheet.
2. When enabled and the sheet is confirmed: instead of (or in addition to)
   creating the one planned session for the selected date, create a batch
   of 8 future planned sessions at 7-day intervals starting from the
   selected date, each with `is_recurring: true` and
   `recurrence_weekday: <the JS day-of-week 0-6 of the selected date>`. Use
   a single batched `.insert([...])` call (an array of 8 row objects) rather
   than 8 separate requests.
3. No server-side job — this is a fixed horizon created at plan time, not a
   background process. If the scribe wants sessions further out, they
   create a new recurring plan closer to that date (documented as a known
   v1 limitation in your report, not something to solve here).

**Report file:** `plans/tap-v5-8/tasks-phase2/task-6-report.md`

---

## Task 7: Session Recap — Highlight and To-work-on callouts (PRD §8, Screen 5)

### Current state

`src/pages/SessionRecapPage.tsx` shows a duration hero, an activity-count
callout, and a flat per-activity list — no "Highlight" or "To work on"
callout. `src/types/index.ts` already defines `RecapCallout { icon, label,
value }` but it's never used anywhere in this file.

### Fix

Add `useSessionHighlights(sessionId)` (new file, e.g.
`src/hooks/useSessionHighlights.ts`), returning
`{ highlight: RecapCallout | null; toWorkOn: RecapCallout | null }`:

1. From `useActivityFeed(sessionId)`'s activities (already fetched in this
   page), separate `match` and `drill` activity records by `reference_id`.
2. **Highlight**: if any match activity records exist, fetch
   `games` where `match_id IN (<those reference_ids>)`
   (`.in('match_id', ids)`), find the single closest game across all of
   them (smallest `|team_a_score - team_b_score|`, same "closest game"
   concept `MatchRecapPage.tsx` already computes per-match — you're doing
   it session-wide here). Build a `RecapCallout` like `{ icon: 'flame',
   label: 'Highlight', value: 'Closest game: 11-10, lasted 19 min' }`. If no
   match activities exist this session, `highlight` is `null` (omit the
   callout entirely — don't fabricate one).
3. **To work on**: if any drill activity records exist, fetch
   `heat_entries` where `drill_id IN (<drill reference_ids>)`, group by
   `spot`, compute makes/attempts % per spot, find the worst-performing spot
   with `attempts > 0` (lowest %). Build a `RecapCallout` like `{ icon:
   'bolt', label: 'To work on', value: 'Left 0° three-pointer: 28%' }`
   (resolve the spot id to its label via `SPOT_LABELS`). If no drill
   activities exist, `toWorkOn` is `null`.
4. In `SessionRecapPage.tsx`, render these two callouts (when non-null) as
   `Card variant="accent"` blocks matching the existing "Activities" callout
   card's visual style, positioned after it.

### Verification

A hook test with mocked `supabase.from` calls covering: a session with one
close match (assert the correct closest game is picked over a blowout in
the same batch), a session with drills across multiple spots (assert the
lowest-% spot with real attempts wins, not a spot with 0 attempts), and a
session with neither (assert both come back `null`).

**Report file:** `plans/tap-v5-8/tasks-phase2/task-7-report.md`

---

## Task 8: Editable player name, nickname, and shooting targets (PRD §4.1)

### Current state

`src/pages/PlayerProfilePage.tsx` renders `player.name`/`player.nickname`
and the three target percentages (`target_ft_percent` etc.) as read-only
text. `useUpdatePlayer()` (`src/hooks/usePlayers.ts`) already exists,
already works (`mutationFn: async ({ id, ...patch }: Partial<Player> & {
id: string }) => ...`), and has zero call sites anywhere in the app.

### Fix

Add an edit affordance to the profile hero card (e.g. a small pencil icon
next to the name/nickname line) opening a bottom-sheet form (reuse the
standard shell) with five fields: Name, Nickname (both required, mirror
`PlayersPage.tsx`'s `AddPlayerSheet` validation pattern), and three plain
number inputs for Target FT/Mid/3PT % (accept 0-100, convert to the stored
0-1 range on save, pre-filled from the current `target_*_percent` values ×
100). On save, call
`useUpdatePlayer().mutateAsync({ id: player.id, name, nickname, target_ft_percent: ftPct/100, target_mid_percent: midPct/100, target_3pt_percent: tptPct/100 })`.

**Report file:** `plans/tap-v5-8/tasks-phase2/task-8-report.md`

---

## Task 9: Recent Activity Log (PRD §4.3)

### Current state

`activity_records` is session-scoped, not player-scoped (no `player_id`
column) — there is no direct query for "activities this player was in."
`PlayerProfilePage.tsx` has no activity log section at all today.

### Fix

Add `useRecentPlayerActivity(playerId)` (new file,
`src/hooks/useRecentPlayerActivity.ts`) that merges three independent
queries, since player involvement lives in three different tables:

1. **Matches**: `supabase.from('matches').select('*, games(*)').or(\`team_a_player_ids.cs.{${playerId}},team_b_player_ids.cs.{${playerId}}\`)`
   (adjust the `.or()`/`.contains()` syntax to whatever this Supabase JS
   version actually supports — check `usePlayerStats.ts`'s existing
   `.contains('team_a_player_ids', [playerId])` calls for the working
   pattern rather than guessing at `.or()` syntax). For each match, compute
   W/L + game count for this player (reuse `usePlayerWL`'s win-counting
   logic, scoped to just this match's games) → result line `"W · 4 of 5
   games"`.
2. **Drills**: `supabase.from('drills').select('*, heat_entries(*)').contains('player_ids', [playerId])`,
   filtering each drill's `heat_entries` to `player_id === playerId` for
   this player's personal makes/attempts/hand → result line `"82% · R ·
   82/100"`.
3. **Competitive games**: `supabase.from('competitive_results').select('*, competitive_games(*)').eq('player_id', playerId)`
   → result line `"2nd of 6"` (from `rank` and the game's total
   participant count).
4. Merge all three into one list of `{ id, activityType, label, location,
   date, resultLine }` (label = e.g. "3v3 Match", "Free Throws — Right",
   the competitive game's type/custom_name), sort by date descending, no
   cap (matches the recommended default in `plans/tap-v5-8/plan.mdx`'s
   Questions block).
5. In `PlayerProfilePage.tsx`, render the first 10 as Activity Cards below
   the attendance stats strip, each showing type+name, location, date, and
   the result line. Tapping a card should navigate to that activity's full
   recap (`/match/recap` doesn't take an id param today — if the existing
   recap routes can't address a specific past activity by id, make the
   card non-navigable for now and note this gap in your report rather than
   inventing new routes; this phase's scope is the log itself, not
   retrofitting every recap page with historical addressing). A "View More"
   button loads the next 10 in place (no separate screen, expand the
   already-fetched list — you have the full merged+sorted list already, so
   this is just revealing more of it, not a new fetch).

**Report file:** `plans/tap-v5-8/tasks-phase2/task-9-report.md`

---

## Task 10: Real FT marker on the shot chart (PRD §4.4)

### Current state

`src/components/ui/ShotChart.tsx` hardcodes the free-throw marker's data:
`zoneColor(41, 50, 'ft')` and the literal strings `"41/50"`/`"82%"` (search
`ftOn ? '41/50'`), regardless of which player's profile is open.
`PlayerProfilePage.tsx` already computes real `shooting.ftMakes`/
`shooting.ftAttempts` via `usePlayerShooting` and displays them correctly in
the FT% progress bar just above the chart.

### Fix

Add `ftMakes`/`ftAttempts` (numbers, default to `0`/`0` if `shooting` is
undefined) to `ShotChartProps`, pass them from `PlayerProfilePage.tsx`, and
use them in place of the hardcoded `41`/`50` in the FT marker's
`zoneColor(...)` call and its two label strings (compute the makes/attempts
label and the percentage label from the real numbers, matching the format
of the existing hardcoded strings — e.g. `${ftMakes}/${ftAttempts}` and
`${Math.round(ftMakes/ftAttempts*100)}%`, falling back to the existing
"FT"/"—" placeholders when `ftAttempts === 0`).

**Report file:** `plans/tap-v5-8/tasks-phase2/task-10-report.md`

---

## Task 11: Spot History drill-down (PRD §4.4)

### Current state

No zone in `ShotChart.tsx` has an `onClick`. Scoped to the 5 spots that
already have real spot-tagged data (`left0`, `left45`, `center`, `right45`,
`right0` — see this file's Global Constraints for why the other 5 zones are
out of scope this phase).

### Fix

1. Add an `onClick` to each of the 10 mid-range/three-point zone `<path>`
   elements in `ShotChart.tsx` (the ones already covered by `spotZoneMap`),
   opening a new panel (reuse the bottom-sheet shell) listing past
   `heat_entries` for that zone's underlying `(spot, hand)` — note a single
   spot covers 2 zones (one mid, one three), so clicking either the mid or
   three zone for "Top of Key" should show history for `spot: 'center'`
   filtered to the chart's *current* `handMode` if one is selected
   (`'all' | 'left' | 'right'` — pass the currently-active hand through, and
   if `handMode` is `'all'`, show all hands mixed, matching the chart's own
   current aggregation behavior).
2. Query: `supabase.from('heat_entries').select('*, drill:drills(started_at, session:sessions(location))').eq('player_id', playerId).eq('spot', spot)`
   (filter to `hand` too if `handMode !== 'all'`), ordered by
   `drill.started_at` descending (or `recorded_at`, whichever gives a more
   accurate recency order — your call, but be consistent).
3. Group entries by `drill_id` (one drill = one session's worth of heats at
   that spot) and render each as a row: date, location, that drill's total
   makes/attempts+% at this spot, and the heat-by-heat sequence (e.g. "7/10
   · 8/10 · 9/10" — one segment per `heat_number`, ordered).

**Report file:** `plans/tap-v5-8/tasks-phase2/task-11-report.md`

---

## Task 12: Real per-format + Recreational W-L, and a W-L pill on the roster list (PRD §4.4, §6, bug §12.1)

### Current state

`src/pages/WinLossPage.tsx` renders a hardcoded `DATA` array for every
player regardless of the `:id` route param (it never reads `useParams()`),
and its back button is hardcoded to `nav('/players/1')`. `usePlayerWL`
(`src/hooks/usePlayerStats.ts`) is real but aggregate-only, no format
breakdown. `src/pages/PlayersPage.tsx`'s roster rows show nickname+name only,
no W-L.

### Fix

1. Add `usePlayerWLByFormat(playerId)` to `usePlayerStats.ts` — join
   `games` to `matches(format)` (mirror `usePlayerShooting`'s existing
   `.select('makes, attempts, drill:drills(shot_type)')` embed pattern, but
   for `games`/`matches`/`format`), group client-side by format into
   `{ format: MatchFormat; wins: number; losses: number }[]` for all 5
   `ALL_FORMATS`.
2. Add `usePlayerRecreationalRecord(playerId)` — aggregate
   `competitive_results` (joined to `competitive_games` for `game_type`)
   for this player where `game_type` is `'banks'`, `'next'`, or `'generic'`
   (explicitly **excluding** `'middies'` — PRD 6.2 says Middies' career stat
   is Mid-Range %, not W/L, so it must not feed this number). A result
   counts as a win when `rank === 1`, loss otherwise.
3. Fix `WinLossPage.tsx`: read `useParams<{ id: string }>()`, use both new
   hooks instead of the hardcoded `DATA`/Recreational row, and fix the back
   button to `nav(\`/players/${id}\`)`.
4. Add a W-L pill to each `PlayersPage.tsx` roster row (reuse the already-real
   `usePlayerWL` — one extra hook call per visible row is acceptable at this
   roster's expected scale) — the "wasted space" fix from PRD bug §12.1,
   showing e.g. `"12-4"` or `"–"` if no games yet.

### Verification

Open two different players' `/players/:id/wl` and confirm the numbers
differ and match each player's actual `games`/`competitive_results` history
— this is the literal regression the current mock silently hides.

**Report file:** `plans/tap-v5-8/tasks-phase2/task-12-report.md`
