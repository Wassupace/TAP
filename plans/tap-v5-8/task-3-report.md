# Task 3 Report: Fix the Drills data-integrity bug

## What was implemented

### 1. `src/pages/DrillPage.tsx` — Step 4 wired to the real `PlayerPickerModal`

- Replaced the "coming soon. Solo drill by default." placeholder block with a
  real Step 4 UI:
  - When one or more players are already selected, shows their `Avatar` chips
    + nickname/name underneath the eyebrow label.
  - A "Select Players" / "Change Players" button (dashed outline, same visual
    language as the modal's own "+ Add New Player" control) opens
    `PlayerPickerModal`.
  - "Next →" always advances to Step 5 regardless of selection size — an
    empty selection is not blocked, per PRD §7.3's solo-drill mode.
- Added `usePlayers()` (`src/hooks/usePlayers.ts`) to resolve the modal's
  `string[]` of selected IDs back into full `Player[]` objects (`setPlayers`
  takes `Player[]`, not IDs).
- `PlayerPickerModal` is rendered once, at the end of the wizard's outer div,
  controlled by local `playerPickerOpen` state:
  ```tsx
  <PlayerPickerModal
    isOpen={playerPickerOpen}
    selectedIds={players.map(p => p.id)}
    onConfirm={(ids) => {
      const resolved = allPlayers.filter(p => ids.includes(p.id))
      setPlayers(resolved)
    }}
    onClose={() => setPlayerPickerOpen(false)}
  />
  ```
  Per Task 2's settled contract, `onConfirm` only resolves+calls `setPlayers`
  — it does not also flip `playerPickerOpen`, since the modal already calls
  `onClose` internally on Confirm.
- **Auto-open was tried and reverted.** My first pass opened the picker
  automatically via a `useEffect` keyed on `setupStep === 4`. This triggered
  a *new* `react-hooks/set-state-in-effect` lint error in a file this task
  touches (not covered by the "5 pre-existing, unrelated" exemption), so I
  removed the effect and kept the button-only trigger — explicitly one of
  the two options the brief allowed ("it can auto-open ... or via a button").

### 2. Active shooter promoted to a heading (`src/pages/DrillPage.tsx`)

The makes-counter panel on the live drill screen now renders a standalone
`font-display text-[26px]` line with just the player's name
(`activePlayer.nickname || activePlayer.name`) above the spot-label caption,
whenever `activePlayer` exists. The old `` ` · ${name} shooting` `` suffix
appended to the small 11px caption was removed — the name is no longer a
trailing caption, it's the first, largest-after-the-counter thing on the
panel, matching the wireframe's `<h1>Marcus shooting</h1>` treatment in
`plans/tap-v5-8/plan.mdx`. When `players` is empty (solo drill), the line
doesn't render at all — no `undefined`/awkward empty state.

### 3. `setCurrentPlayerIndex` + roster strip (manual override)

- `src/stores/drillStore.ts`: added `setCurrentPlayerIndex: (i: number) => void`
  to the interface and implemented it as a plain setter alongside the store's
  other simple setters:
  ```ts
  setCurrentPlayerIndex: (i) => set({ currentPlayerIndex: i }),
  ```
  Purely additive — `commitHeat`'s round-robin advance logic
  (`nextPlayerIndex = (currentPlayerIndex + 1) % players.length`) was not
  touched.
- `src/pages/DrillPage.tsx`: added a "Shooter" roster strip below the makes
  counter panel, rendered only when `players.length > 0`. Reuses `Avatar`
  (same component/pattern as `DashboardPage.tsx`'s "On Court" strip) with
  `playerColor(p.id)` for per-player color, `variant="active"` + full opacity
  for the current shooter and dimmed (`opacity: 0.5`) default-variant chips
  for the rest. Tapping a chip calls `setCurrentPlayerIndex(idx)`.

### 4. Regression test — `src/stores/drillStore.test.ts` (new file)

Follows `src/lib/db.test.ts`'s mocking style: `vi.mock('idb', ...)` with an
in-memory-free no-op stub, and `vi.mock('../lib/supabase', ...)` with a
`vi.hoisted` `mockFrom`. Four `describe` blocks:

1. **Player assignment regression** (the required test): after
   `setPlayers([PLAYER_A, PLAYER_B])` and two `commitHeat()` calls, asserts
   `completedHeats` has 2 entries with non-empty, distinct `playerId`s that
   match `PLAYER_A.id` / `PLAYER_B.id` exactly (round-robin: heat 1 → A,
   heat 2 → B). A second test in the same block goes one level deeper and
   asserts the *Supabase insert payload itself* (`chain.insert`) was called
   with `player_id: PLAYER_A.id`, using `vi.waitFor` to await the
   fire-and-forget `dbInsert(...).catch(() => {})` call inside `commitHeat`.
   A third test checks the rotation wraps back to player A on heat 3.
2. **`setCurrentPlayerIndex`**: confirms it updates `currentPlayerIndex`
   directly and that a manually-selected player is who the next `commitHeat`
   tags.
3. **Solo drill**: confirms `commitHeat()` with `players: []` still commits
   (doesn't block), and that `playerId` is `''` in that specific, legitimate
   solo case (this is the one place `''` is a *correct*, not buggy, value).

## What was tested and results

- `npm run build` — clean.
- `npm test` — **27/27 passing** (4 test files, including the new
  `drillStore.test.ts`).
- `npm run lint` — **6 problems (5 errors, 1 warning)**, all in files this
  task did not touch (`IOSInstallBanner.tsx`, `StatusDot.tsx`,
  `AttendancePage.tsx`, `CompetitiveSetupPage.tsx`) — matches the "5
  pre-existing lint errors" called out in the task's global constraints.
  `DrillPage.tsx` and `drillStore.ts`/`drillStore.test.ts` are lint-clean.

### Proof the regression test actually tests the bug

I temporarily commented out the `setPlayers([PLAYER_A, PLAYER_B])` call in
the first regression test (simulating the historical bug's actual runtime
shape — `players` staying `[]` because `DrillPage.tsx` never called
`setPlayers`) and reran just that file:

```
AssertionError: expected '' not to be '' // Object.is equality
 ❯ expect(heat1.playerId).not.toBe('')
```

It fails exactly as expected, then I restored the real call and reran the
full suite (`npm run build && npm test && npm run lint`) to confirm the fix
+ test are both correct together — all green. This confirms the test isn't
vacuously true; it genuinely fails against the pre-fix behavior.

### Manual end-to-end check

No project skill exists yet for launching this app (checked
`.claude/skills/*/SKILL.md` up the tree — none found), and no browser
automation tool is available in this environment (no `chromium-cli`, no
cached Playwright browser, and a fresh `npx playwright install` would
require a network download I chose not to force for a non-blocking check).
I did the best available substitute:

- Confirmed `.env.local` has real `VITE_SUPABASE_URL` /
  `VITE_SUPABASE_PUBLISHABLE_KEY` values set (so a live Supabase instance is
  in principle reachable from this machine).
- Started `npm run dev` on a scratch port, confirmed the app serves
  (`HTTP 200`) and that the dev-transformed `DrillPage.tsx` module contains
  the new `"Select Players"` string (i.e., no dev-server transform/syntax
  error), then stopped the server.

I did **not** click through a live 2-player drill and inspect
`heat_entries` rows in the Supabase dashboard. Per the task's own
instructions this doesn't block completion — the `drillStore.test.ts`
regression test (verified above to actually catch the bug) is the required
verification either way. Flagging as a residual gap for whoever does the
interactive QA pass: I'd recommend running `/run-skill-generator` next time
someone needs to drive this app in a browser, so this exists as a reusable
project skill going forward.

## Files changed

- `src/stores/drillStore.ts` — added `setCurrentPlayerIndex` action (interface
  + implementation). No other logic touched.
- `src/pages/DrillPage.tsx` — Step 4 placeholder replaced with
  `PlayerPickerModal` integration; active-shooter name promoted to a
  heading-weight line; new roster strip with tap-to-override.
- `src/stores/drillStore.test.ts` — new file, the regression test suite.

## Self-review

- **Solo drill still works unblocked**: yes — Step 4's "Next →" has no
  selection-length guard (unlike Step 1's spot-selection guard,
  intentionally not copied here). `commitHeat()` with `players: []` was
  explicitly covered by a test and works via the pre-existing
  `players[currentPlayerIndex]?.id ?? ''` fallback, which is exactly correct
  for solo mode.
- **Round-robin still correct once `players` is populated**: not modified.
  `commitHeat`'s `spotComplete` / `nextPlayerIndex` logic is untouched;
  verified indirectly by the regression test's 3rd case (A → B → A across
  three `commitHeat()` calls with 2 players and no spot completion).
- **Regression test genuinely tests the bug**: see "Proof" section above —
  confirmed by literally disabling the fix in the test and watching it fail
  with the exact `''` value the bug produced, then restoring it.

## Concerns

- No new npm dependencies were added.
- The "auto-open on Step 4" option mentioned in the brief was tried first
  but produces a real lint error (`react-hooks/set-state-in-effect`) under
  this repo's ESLint config; I used the button-triggered alternative
  instead, which the brief explicitly permits. Flagging in case reviewers
  expected the auto-open behavior specifically.
- The end-to-end manual walkthrough (real browser, real Supabase writes) was
  not performed — no project run-skill and no browser automation tool
  available in this sandbox. This was explicitly called out as
  non-blocking in the task instructions; the automated regression test
  stands as the required verification.

---

## Fix round 1 — review findings addressed

Two review findings on the above implementation were fixed. This is an
append to the original report; the original implementer's process was not
resumable, so this fix was done fresh against the code as it stood.

### Finding 1 (Critical): stale `currentPlayerIndex` reintroduces the exact bug

**Root cause confirmed**: `setPlayers` (`src/stores/drillStore.ts`) never
touched `currentPlayerIndex`, and `DrillPage.tsx`'s `PlayerPickerModal`
`onConfirm` handler called `setPlayers(resolved)` without resetting it. If a
player's index into a previous, larger roster was left over (e.g. from a
partially-run drill navigated away from without hitting the step-0 `reset()`
path) and the new roster was smaller, `players[currentPlayerIndex]` became
`undefined` again — reproducing the original `playerId: ''` bug.

**Fix**: in `src/pages/DrillPage.tsx`'s `onConfirm` handler, `setCurrentPlayerIndex(0)`
is now called immediately after every `setPlayers(...)` call (both the
immediate-resolve path and the deferred/refetch path added for Finding 2
below — see the diff). No changes were made to `drillStore.ts` — exactly as
the brief for this finding specified, the action already existed and needed
no store-side change.

### Finding 2 (Important): newly-created player could be silently dropped

**Root cause confirmed**: `PlayerPickerModal.handleSaveNewPlayer` adds the
new player's id to local `selection`, but `useAddPlayer`'s `onSuccess` only
calls `qc.invalidateQueries({ queryKey: ['players'] })` — it doesn't await
the refetch. If the user taps Confirm before that refetch lands,
`DrillPage.tsx`'s `allPlayers.filter(p => ids.includes(p.id))` runs against
stale data missing the new player, and that id is silently dropped from what
`setPlayers` receives.

**Fix — chosen approach and why**: the brief suggested either a small
effect/retry loop or "don't act until `usePlayers()` data contains all the
ids," and explicitly said to use judgment if a cleaner approach existed. My
first attempt used a `pendingPlayerIds` state + a `useEffect` that re-checked
`allPlayers` on every change and called `setPlayers`/`setCurrentPlayerIndex`
once fully resolved. That approach **failed lint**: this repo's
`eslint-plugin-react-hooks` v7 config enables `react-hooks/set-state-in-effect`,
which flags any synchronous `setState` call in an effect body (confirmed
empirically — same rule the original implementer hit when trying to
auto-open the picker via an effect). Since `DrillPage.tsx` is a file this fix
touches, that's not covered by the "5 pre-existing lint errors" exemption.

Instead, the mismatch is now resolved **inside the `onConfirm` event handler
itself** — no new component state, no effect:

```tsx
onConfirm={(ids) => {
  const resolved = allPlayers.filter(p => ids.includes(p.id))
  if (resolved.length === ids.length) {
    setPlayers(resolved)
    setCurrentPlayerIndex(0)
    return
  }
  // Race: a selected id (the just-created player) isn't in allPlayers yet.
  // Refetch explicitly and resolve against the fresh result instead of
  // silently dropping it.
  refetchPlayers().then(({ data }) => {
    const freshResolved = (data ?? []).filter(p => ids.includes(p.id))
    setPlayers(freshResolved)
    setCurrentPlayerIndex(0)
  })
}}
```

`refetch` is now destructured from the existing `usePlayers()` call
(`const { data: allPlayers = [], refetch: refetchPlayers } = usePlayers()`).
This is a user-gesture-triggered refetch (a direct reaction to the Confirm
tap), not a derived-state effect, so it doesn't trip the lint rule and needed
no new state. `useAddPlayer`/`usePlayers.ts` were left untouched, per the
brief's preference for the narrower DrillPage.tsx-only fix — react-query's
`refetch()` was sufficient without changing the mutation's `onSuccess`.

### Test coverage added

`src/stores/drillStore.test.ts` gained a new `describe` block covering
Finding 1's exact repro at the store level (the store-side half of the fix —
the UI-layer half, `DrillPage.tsx`'s `onConfirm`, can't be exercised without
a component-rendering test library, per the existing project constraint):

1. **Reproduces the bug**: 3 players, one `commitHeat()` (index advances to
   1), then `setPlayers([PLAYER_A])` alone (no index reset) — asserts
   `players[currentPlayerIndex]` is `undefined` and that a subsequent
   `commitHeat()` writes `playerId: ''`, exactly the historical bug.
2. **Confirms the fix ingredient**: same setup, but followed by
   `setCurrentPlayerIndex(0)` (mirroring what `DrillPage.tsx`'s `onConfirm`
   now does) — asserts `players[currentPlayerIndex]` resolves to the right
   player and `commitHeat()` writes the real id.

Finding 2's race condition (query-refetch timing) was judged not worth a new
test: it's inherently async/timing-dependent, the fix is a small,
directly-readable `if/else` in a UI event handler with no new store logic,
and simulating react-query's refetch timing would require new mocking
infrastructure disproportionate to a one-branch integration fix — consistent
with the task's "don't over-engineer test infrastructure for a UI
integration fix" guidance.

### Verification

- `npm run build` — clean.
- `npm test` — **29/29 passing** (4 test files; 2 new tests added to
  `drillStore.test.ts`, no existing tests changed).
- `npm run lint` — **6 problems (5 errors, 1 warning)**, identical set to
  the pre-existing baseline (`IOSInstallBanner.tsx`, `StatusDot.tsx`,
  `AttendancePage.tsx`, `CompetitiveSetupPage.tsx`). `DrillPage.tsx` and
  `drillStore.test.ts` are lint-clean. (Confirmed empirically that my first
  `useEffect`-based attempt at Finding 2 added a 7th, new-file error before
  being replaced with the refetch-in-handler approach above.)

### Files changed (this fix round)

- `src/pages/DrillPage.tsx` — `onConfirm` handler now resets
  `currentPlayerIndex` to 0 after every `setPlayers` call, and defers/retries
  resolution via an explicit `refetch()` when the picker's selected ids don't
  fully resolve against the current `usePlayers()` cache.
- `src/stores/drillStore.test.ts` — added a regression test pair for the
  stale-index scenario.

### Concerns

- None. Both findings are fixed at their narrowest correct scope; no store
  logic, `useAddPlayer`, or `usePlayers.ts` changes were needed.
- The three deferred Minor findings (Avatar `variant="active"` no-op,
  roster-alphabetical vs. tap-order selection, hardcoded font-family at
  DrillPage.tsx:236) and the separate `setDrillId`-never-called issue (Task 7)
  were left untouched, per the fix-round scope.
