# Phase 2 final-review fix wave — report

Scope: the 7 bundled fixes from Phase 2's final whole-branch review (see
`.superpowers/sdd/tasks-phase2/progress.md`'s "Final whole-branch review"
entry for the full findings). Two findings (groupWLByFormat's silent skip
of orphaned-match games, Task 6's lack of series identity) were ruled to
park for a future phase, not fixed here. One finding (PRD §3.3's missing
Dashboard planned-session card) is net-new UI, not a bug fix, and was
routed to the user for a build/defer decision rather than folded in here.

This dispatch was interrupted once by an API session-limit error partway
through (source changes for all 7 fixes were already correct and complete
at that point; two test files and one call site were left unfinished). The
controller (not a fresh subagent) finished the remaining pieces directly,
since the gap was small, well-understood, and mechanical. All work below
is one combined commit.

## Fix 1 — `useTodaysPlannedSession()` had no deterministic order

`src/hooks/useSessions.ts`: added `.order('created_at')` before
`.limit(1).maybeSingle()`. The `sessions` table had no `created_at` column
at all (unlike `players`/`activity_records`) — added via
`supabase/migrations/004_phase2_final_fixes.sql` (`ALTER TABLE sessions ADD
COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now()`), wired
into `docker-compose.yml`'s local-dev init mount and appended to
`supabase/migrations/combined_migration.sql`.

Does not attempt to surface/disambiguate between multiple same-day planned
sessions to the coach — deterministic-but-still-single-result is the
intentional scope of this fix; a real disambiguation UI is a larger,
separate piece of work.

## Fix 2 — Recent Activity Log read the wrong table's player rosters

`src/hooks/useRecentPlayerActivity.ts`: the Matches branch now decides "was
this player in this match" via `games`' per-game
`team_a_player_ids`/`team_b_player_ids` arrays (two `.contains(...)`
queries against `games`, mirroring `usePlayerWLByFormat`'s exact pattern in
`usePlayerStats.ts`) instead of `matches`' own static top-level arrays,
which are set once at setup and never updated. The resulting `match_id`s
are deduped into a `Set`, then fetched in full
(`matches.select('*, games(*), session:sessions(location)').in('id',
matchIds)`) so the existing W/L + game-count computation
(`computeMatchWL`/`tallyBySide`) still runs unchanged over each match's
complete game list.

Test: `src/hooks/useRecentPlayerActivity.test.tsx`'s dedup test was
rewritten to exercise the actual regression — a player found via both the
`team_a` and `team_b` `games`-contains queries (e.g. subbed mid-match)
collapses to one activity card, not two. All existing tests updated to the
new two-round-trip mock shape (`gamesA`/`gamesB`/`matches` instead of
`matchesA`/`matchesB`).

## Fix 3 — "Today" computed three different ways

New `src/utils/todayISODate.ts` — one LOCAL-date `'YYYY-MM-DD'` function
(matching `CalendarPage.tsx`'s original convention), with 5 unit tests
including explicit late-evening/early-morning cases that would break under
a UTC-based implementation. Now the single source of truth for "today",
used by:
- `src/pages/CalendarPage.tsx`'s `todayISODateString`
- `src/hooks/useSessions.ts`'s `useTodaysPlannedSession`
- `src/pages/DashboardPage.tsx`'s `createAdHocSession` and `handleConfirm`
  (both call sites — this second file was the one left unfinished when the
  original dispatch was interrupted; completed directly)

## Fix 4 — `useActivateSession` didn't invalidate today's-planned-session cache

`src/hooks/useSessions.ts`: added
`qc.invalidateQueries({ queryKey: ['todays-planned-session'] })` to
`useActivateSession`'s `onSuccess` (partial-key match invalidates every
`['todays-planned-session', <date>]` entry). Defensive fix for a latent
hazard — no live corruption path existed today, but future code that keeps
`DashboardPage` mounted across an activate/end cycle could otherwise re-run
`useActivateSession` against a stale `planned` row.

## Fix 5 — Completed calendar pills weren't tappable → recap

`src/pages/CalendarPage.tsx`: the grid pill's `onClick` now also handles
`s.state === 'completed'`, navigating to `/session-recap/${s.id}` — the
same route the "Selected day sessions" list below already uses. Planned
and missed-pill behavior (both `state: 'planned'` under the hood)
unchanged.

## Fix 6 — Truncated pills made same-day sessions indistinguishable

`src/pages/CalendarPage.tsx`: added `title={s.location}` (the full,
untruncated location) to each pill `<span>`. Purely additive — `pillLabel`'s
6-char truncation logic itself is unchanged.

## Fix 7 — "lasted 0 min" read as broken data

`src/hooks/useSessionHighlights.ts`: when `duration_seconds` is `0`/falsy
(a genuinely untimed post-fact match, PRD §5.4), the Highlight callout now
omits the duration clause entirely (`"Closest game: 11-10"` instead of
`"Closest game: 11-10, lasted 0 min"`). Any non-zero duration is formatted
exactly as before.

## Testing

- `npm run build` — clean.
- `npm test` — run 6 times after the fix wave was completed, 0 failures
  each time (23 test files, 201 tests).
- `npm run lint` — exactly the pre-existing baseline (5 errors + 1 warning
  in `IOSInstallBanner.tsx`/`StatusDot.tsx`/`AttendancePage.tsx`/
  `CompetitiveSetupPage.tsx`), nothing new.

## Not fixed here (ruled to park or route elsewhere)

- **groupWLByFormat's silent skip of orphaned-match games** vs.
  `usePlayerWL`'s non-filtering behavior (Minor finding #5) — deliberate
  and tested per the Task 12 implementer's own report; needs a real design
  call (add an "Other" bucket vs. match `usePlayerWL`'s behavior), sized as
  its own future task.
- **Task 6's recurring sessions have no series identity / no collision
  check** (Minor finding #7) — real gap, but adding series identity +
  cancel-series UI is meaningfully larger than a fix-wave item.
- **PRD §3.3's missing Dashboard "next planned session" card** (Important
  finding #4) — net-new UI the PRD calls the primary entry point for
  planned sessions, but no task's brief in this phase covered building it.
  `useTodaysPlannedSession`'s data is already available in
  `DashboardPage.tsx`; only the card itself is missing. Routed to the user
  as an explicit build-or-defer decision rather than silently added here.
