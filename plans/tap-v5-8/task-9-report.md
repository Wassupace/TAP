# Task 9 Report: Require at least one player before leaving Drill setup Step 4

## What was implemented

`src/pages/DrillPage.tsx` — Step 4's "Next →" button's `onClick` now guards
on `players.length > 0`, mirroring Step 1's existing spot-selection pattern
exactly:

```tsx
<Button
  variant="primary"
  className="w-full !min-h-[54px]"
  onClick={() => { if (players.length > 0) setSetupStep(5) }}
>
  Next →
</Button>
```

Note on the `disabled` prop: the brief's illustrative snippet included
`disabled={players.length === 0}`, but it also said to match Step 1's
*actual* convention rather than invent a new one. Step 1's own "Next" button
(`selectedSpots.length > 0`) does not use a `disabled` prop at all — it's a
plain `Button` whose `onClick` simply no-ops when the condition fails, with
no visual dimming. I matched that exactly: no `disabled` prop was added.
This is a deliberate, considered deviation from the brief's sample code, not
an oversight — it follows the brief's own higher-priority instruction to
mirror Step 1's real pattern.

Nothing else in the file was touched: the active-shooter display, roster
strip, makes counter, PlayerPickerModal wiring, and Step 5/"Start Drill"
logic (`handleStart`) are all untouched, verified by diff.

## What was tested

Extended `src/pages/DrillPage.test.tsx` (Task 7's harness — real component,
real button clicks, `react-dom/client` + `act`, no new dependencies):

- Refactored the existing `advanceToStartDrillStep()` helper by extracting
  its Step 0→Step 3 portion into a new `advanceToPlayersStep()` helper (ends
  on Step 4, before clicking Step 4's "Next"). `advanceToStartDrillStep()`
  now calls it and then clicks Step 4's "Next" — documented as requiring the
  caller to have already set at least one player via
  `useDrillStore.getState().setPlayers(...)`, since that click is now
  guarded and would otherwise be a no-op.
- Updated Task 7's two insert-failure tests (which previously relied on
  Step 4 being skippable with zero players) to call
  `useDrillStore.getState().setPlayers([PLAYER_A])` before advancing, so
  they still reach Step 5/"Start Drill" as originally intended — those tests
  are about the `drills` insert failure path, not about player selection.
- Added a new `describe('DrillPage — Step 4 requires at least one player
  (Task 9)')` block with two tests:
  1. **Zero players selected** — advances to Step 4, confirms "Select
     Players" (Step 4's own content) is showing, clicks "Next →", and
     asserts the wizard is still on Step 4 (`"Select Players"` still
     present, `"Makes target per spot"` — Step 5's heading — absent).
  2. **One or more players selected** — sets `players` to a single player
     (`PLAYER_A`) via the store (i.e. a true solo drill), advances to Step
     4, clicks "Next →", and asserts the wizard reaches Step 5
     (`"Makes target per spot"` present).

### Results

```
npm run build   → tsc -b && vite build succeeded, no type errors
npm test        → 10 test files, 67 tests, all passed (2 new in DrillPage.test.tsx,
                   plus the 65 pre-existing tests unaffected)
npm run lint    → 5 errors / 1 warning, identical set to the pre-existing baseline
                   (IOSInstallBanner.tsx, StatusDot.tsx, AttendancePage.tsx x2,
                   CompetitiveSetupPage.tsx) — none in DrillPage.tsx or
                   DrillPage.test.tsx.
```

## Files changed

- `src/pages/DrillPage.tsx` — Step 4's "Next →" `onClick` guarded on
  `players.length > 0` (one condition added, nothing else touched).
- `src/pages/DrillPage.test.tsx` — helper refactored into
  `advanceToPlayersStep()` + `advanceToStartDrillStep()`; two existing tests
  updated to set a player before advancing; two new tests added for the
  Step 4 guard itself.
- `plans/tap-v5-8/task-9-report.md` — this report (new).

## Self-review against the brief's checklist

> does this actually prevent every path to `players.length === 0` reaching
> Step 5/"Start Drill"?

Grepped every `setSetupStep` call site in `DrillPage.tsx`: the only
transition into Step 5 is the one guarded button (`setSetupStep(5)` at
Step 4's "Next →"). `setSetupStep(null)` (which exits the wizard into the
active drill view) only happens inside `handleStart`, which is only ever
invoked by the Step 5 "Start Drill" button — and Step 5 is only reachable
through the now-guarded transition. There is no other route from Step 4 (or
anywhere else) to Step 5 or past it. Zero players can no longer reach
`commitHeat()`/`handleStart()` at all.

> does a solo drill (one player selected) still work exactly as before?

Yes — the guard is `players.length > 0`, not `players.length > 1`. The new
"advances to Step 5 when one or more players are selected" test uses exactly
one player (`PLAYER_A`) and confirms the wizard proceeds normally. This
matches the brief's corrected understanding of "solo drill" (PRD §7.1a: one
real, identified player), not the old zero-players interpretation from
Task 3's brief that this task corrects.

## Concerns

None. The production change is a single guarded condition, exactly mirroring
an existing, working pattern in the same file. The test changes needed to
touch two of Task 7's existing tests (because they depended on the old
unguarded behavior to reach Step 5 without selecting a player), but their
actual assertions (drill-insert failure handling) are unaffected — they now
just also select a player first, which is realistic setup, not a change in
what they verify.

`git status` at the start of this task showed the same pre-existing
uncommitted/untracked files noted in Task 7's report (`.gitignore`
modification adding `graphify-out`, and untracked `docs/TAP_PRD_v5_8.md`,
`plans/tap-v5-8/plan.html`, `plans/tap-v5-8/plan.mdx`,
`plans/tap-v5-8/tasks-phase1.md`, `plans/tap-v5-8/task-1-report.md`). These
predate this task and were left out of this task's commit — only
`src/pages/DrillPage.tsx`, `src/pages/DrillPage.test.tsx`, and this report
were staged.
