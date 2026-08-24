# Final-review fix dispatch report — TAP v5.8 Phase 1

Scope: Findings A–E from the final whole-branch review, everything except the
group-drill spot-completion semantics finding (routed to the user
separately). Work done directly on `main`, four commits.

## Commits

1. `c03da06` — fix: resolve light-theme contrast failures (Finding A)
2. `d04ac78` — fix: sync PWA theme-color meta tag with the active theme (Finding B)
3. `cb8ad33` — fix: reconcile picker deselection and extract shared resolve-ids hook (Findings C, D)
4. `1ddc233` — fix: style Button's disabled state; reframe drillStore empty-players test (Findings E.2, E.3)

Findings E.1, E.4, and E.5 were bundled into commit 3 because they touched
the same files as C/D — see that commit's message for the breakdown.

## Finding A — light theme contrast

### A.1 — `var(--orange-2)` used as text color

Found exactly the three occurrences named in the brief (confirmed via
`grep -n "orange-2"` across the three files, and verified no other `color:`
usage of `--orange-2` existed anywhere else in the repo):

- `src/components/ui/PlayerPickerModal.tsx:231` — "Add New Player" button label
- `src/pages/DrillPage.tsx:265` — Step 4 "Select/Change Players" button label
- `src/pages/DashboardPage.tsx:136` — `NewSessionModal`'s "Select/Change Players" button label

All three changed from `color: 'var(--orange-2)'` to `color: 'var(--orange)'`.
Background/gradient usages of `--orange-2` (button fills, icon-box tint in
`ActiveDashboard`'s activity feed) were left untouched — they weren't part of
this finding and aren't on `--panel-2`.

### A.2 — hardcoded `#93C5FD` hero-eyebrow color

Added a new theme-aware token to `src/index.css`:

```css
:root[data-theme="light"] { --hero-eyebrow: #1D4ED8; }
:root[data-theme="dark"]  { --hero-eyebrow: #93C5FD; }
```

Replaced all 9 hardcoded `#93C5FD` occurrences (`DashboardPage.tsx`,
`SettingsPage.tsx`, `PlayersPage.tsx`, `CalendarPage.tsx`, `WinLossPage.tsx`,
`BanksPage.tsx`, `SheetsExportPage.tsx`, `SessionRecapPage.tsx`,
`CompetitiveSetupPage.tsx`) with `var(--hero-eyebrow)`.

**Computed contrast ratios** (WCAG relative-luminance formula, script run via
Python, not eyeballed):

| Pair | Ratio |
|---|---|
| `#93C5FD` on light `--hero-gradient` lighter stop `#F7F7F7` (old, broken) | 1.68:1 |
| `#93C5FD` on light `--hero-gradient` darker stop `#F5F5F5` (old, broken) | 1.65:1 |
| `#1D4ED8` on `#F7F7F7` (new) | **6.26:1** |
| `#1D4ED8` on `#F5F5F5` (new) | **6.15:1** |
| `#93C5FD` on dark `--hero-gradient` darker stop `#21213B` (unchanged, dark mode) | 8.66:1 |

`#1D4ED8` clears WCAG AA (4.5:1) against both ends of the light gradient with
solid margin.

### A.3 — `--faint` fails contrast in light mode

Changed light-mode `--faint` in `src/index.css` from `#969696` to `#6B6B6B`.
Dark-mode `--faint` (`#C4BA9D`) and `--dim` (both modes) are untouched.

**Computed contrast ratios:**

| Color | vs `--panel` `#F5F5F5` |
|---|---|
| `#969696` (old, broken) | 2.71:1 |
| `#767676` (the finding's own example) | 4.17:1 — **still fails AA**, computed and rejected |
| `#707070` | 4.54:1 — passes, but too close to the boundary for comfort |
| **`#6B6B6B` (chosen)** | **4.89:1** — passes with a healthy margin |
| `#666666` (identical to `--dim`, rejected to keep the two tokens visually distinct) | 5.27:1 |

Note: the finding's suggested example (`#767676`) was checked and found to
fail (4.17:1, below 4.5:1) — computing rather than eyeballing caught this.
`#6B6B6B` was chosen instead for a reliable pass without collapsing `--faint`
into `--dim`'s value.

Verified via `grep` that every `--faint` usage in the codebase is a text
`color`, never a `background` — the darkening is uniformly beneficial.

## Finding B — PWA chrome theme sync

- `index.html`: static `<meta name="theme-color">` default changed from
  `#080A0F` to `#0F0F14` (matches dark `--ink`).
- `src/lib/themeSync.ts`: `applyTheme()` now also writes the resolved
  theme's `--ink` value to the meta tag's `content` attribute
  (`#0F0F14` dark / `#FFFFFF` light) every time it runs — on init, on a
  live OS `prefers-color-scheme` change (while on "system"), and whenever
  the stored preference changes. Values are a small, commented, literal
  `Record<EffectiveTheme, string>` mirroring `--ink` rather than reading
  `getComputedStyle` at runtime — this matches the codebase's own existing
  convention for this exact tension (see `index.html`'s bootstrap script /
  `src/lib/initialTheme.ts`, which duplicate theme-resolution logic with an
  explicit "keep these in sync" comment) and keeps the behavior unit-testable
  without a real stylesheet loaded (the vitest environment doesn't load
  `index.css`).
- Added two new tests to `src/lib/themeSync.test.ts` asserting the meta
  tag's `content` on init and on a subsequent preference change.
- `vite.config.ts`'s static PWA manifest `theme_color`/`background_color`
  left untouched, per the explicit scope note in the brief.

## Finding C — picker's silent no-op bug in `ActiveDashboard`

Added `noLongerSelectedNicknames(players, roster, selectedIds)` to
`src/utils/rosterPlayerMatch.ts` — the mirror-image of `idsMatchingRoster`:
given the full player list, the on-court roster (nicknames), and the
picker's confirmed id selection, it returns roster nicknames whose matching
player id is no longer in the selection (i.e., what to remove). A roster
nickname with no matching player record (e.g. deleted) is left alone rather
than guessed at — same posture as the existing helpers.

`ActiveDashboard.handlePlayerPickerConfirm` now calls both directions:
`noLongerSelectedNicknames(...).forEach(removePlayer)` synchronously (removal
only concerns already-existing roster players, so it doesn't need to wait on
the race-handling refetch), and `resolveIds(ids).then(resolved =>
newNicknamesFor(resolved, players).forEach(addPlayer))` for additions.

Tested in `src/utils/rosterPlayerMatch.test.ts` (5 new cases): unchecking one
of two on-court players, everything still selected, empty selection, a
roster nickname with no matching player, and an empty roster.

## Finding D — extracted `useResolvePickedPlayers`

New `src/hooks/useResolvePickedPlayers.ts`. Read all three original call
sites first (`DrillPage.tsx`; `DashboardPage.tsx`'s `NewSessionModal` and
`ActiveDashboard`) — they were genuinely identical in the "resolve ids,
detect a race, refetch, re-resolve" part and differed only in what happened
with the resolved list afterward (`setPlayers` + reset player index vs.
`onConfirm(location, nicknames)` vs. the two-directional reconciliation from
Finding C). That "what happens after" logic stayed at each call site; only
the resolution/race-handling moved into the hook.

API: `useResolvePickedPlayers()` returns `{ allPlayers, resolveIds }`, where
`resolveIds(ids: string[]): Promise<Player[]>` resolves synchronously from
the cached list when everything's already present, or refetches once and
re-resolves against the fresh result otherwise.

This also closes **Finding E.4** (the three `refetchPlayers().then(...)`
sites had no `.catch`) at the source: `resolveIds`'s internal refetch is
wrapped in try/catch and falls back to the best-effort stale-cache match on
failure (e.g. offline) instead of leaving an unhandled rejection — one fix
covering all three former call sites instead of three separate `.catch`
additions.

New `src/hooks/useResolvePickedPlayers.test.tsx` (4 cases, using the same
`createRoot`/`act` harness style as `DrillPage.test.tsx` since this repo has
no `@testing-library/react` and no new dependencies were allowed): resolves
synchronously when everything's cached, refetches and resolves fresh data
when an id is missing, falls back to the stale match when the refetch
rejects, and returns empty when nothing resolves at all.

## Finding E — assorted small fixes

- **E.1**: `PlayerPickerModal.tsx`'s three `rgba(255,90,31,...)` occurrences
  (row background/border for a selected player) now use
  `var(--orange-soft)`. Scoped exactly to this file/count per the brief —
  similar hardcoded `rgba(255,90,31,...)` patterns exist elsewhere
  (`DrillPage.tsx`'s setup-wizard selection backgrounds,
  `CompetitiveSetupPage.tsx`, `DashboardPage.tsx`'s player chips, a couple of
  `boxShadow`s) but weren't named in this finding, so left alone — flagging
  as a possible future cleanup, not touched here.
- **E.2**: `drillStore.test.ts`'s `'still commits heats when players is
  empty, without being blocked'` renamed to `'store-level fallback: commits a
  heat with playerId '' when players is empty (unreachable via the UI since
  Task 9)'`, with an expanded comment explaining it pins the store's
  unchanged fallback behavior rather than asserting desired product
  behavior, since Task 9 closed the UI path that could reach it. Test body
  and assertions unchanged.
- **E.3**: `Button.tsx` had no visual styling for `disabled` — three real
  call sites already pass `disabled` (`AttendancePage.tsx`,
  `CalendarPage.tsx`, `MatchSetupPage.tsx`) and looked identical whether
  enabled or not. Added `disabled:opacity-40 disabled:cursor-not-allowed
  disabled:pointer-events-none disabled:active:scale-100` to the base class
  list. Scoped to the component itself, as the finding specifies — did not
  rewire DrillPage's Step 1/Step 4 "Next →" buttons (which guard inside
  `onClick` and never pass `disabled` at all) to start passing `disabled`,
  since that's a behavior change to those specific screens beyond what was
  asked; noted below as a candidate follow-up.
- **E.4**: folded into Finding D's hook (see above) rather than three
  separate `.catch()` additions.
- **E.5**: corrected the offline-fallback comments in `DrillPage.tsx`
  (`handleStart`) and `MatchSetupPage.tsx` (`handleStart`) — verified against
  `drillStore.ts`'s `commitHeat()` (`if (drillId) { dbInsert(...) }`) and
  `matchStore.ts`'s `endGame()` (`if (matchId) { dbInsert(...) }`): when the
  initial `drills`/`matches` insert fails, `drillId`/`matchId` stays `null`
  and that gate is simply never entered, so the data is dropped, not queued.

## Testing

- `npx tsc -b` — clean, no errors.
- `npm run build` (`tsc -b && vite build`) — succeeds; only pre-existing
  "chunk larger than 500kB" warning, unrelated to this work.
- `npx vitest run` — **11 test files, 78 tests, all passing** (includes 11
  new test cases added across `rosterPlayerMatch.test.ts`,
  `useResolvePickedPlayers.test.tsx`, and `themeSync.test.ts`).
- `npx eslint .` — 6 problems (5 errors, 1 warning), all in the four
  pre-existing files called out as out of scope (`IOSInstallBanner.tsx`,
  `StatusDot.tsx`, `AttendancePage.tsx` ×2, `CompetitiveSetupPage.tsx`) — no
  new lint issues introduced.
- Ran build/test/lint after each logical group of changes, not just once at
  the end.

## Self-review notes

- Double-checked with `grep` before editing that each finding's stated
  occurrence count matched reality (A.1's "3 places", A.2's "~9 page
  headers" → exactly 9, E.1's "three occurrences") — all matched exactly,
  so no scope guessing was needed.
- Double-checked every `var(--faint)` usage in the codebase is a text
  `color`, never a `background`, before darkening it — confirmed via grep,
  so A.3's change is contrast-only with no other visual side effect.
- Rejected the brief's own suggested example color for A.3 (`#767676`)
  after computing it actually fails AA (4.17:1) — used `#6B6B6B` instead.
  Flagging this explicitly since the brief suggested it as an example, not
  a fixed value, but it's worth knowing that specific hex was checked and
  rejected.
- `noLongerSelectedNicknames`'s removal call in `ActiveDashboard` runs
  synchronously off the current `allPlayers`/`players` closures rather than
  waiting on `resolveIds`' promise — this is intentional (removal only
  concerns players already known to exist, so there's no race to guard
  against there), not an oversight; called out in the code comment.
- No new npm dependencies were added anywhere, including for the new hook's
  test (used the existing `react-dom/client` + `act` pattern already
  established in `DrillPage.test.tsx` rather than reaching for
  `@testing-library/react`).
- Did not add a dedicated test for `Button.tsx`'s new disabled Tailwind
  classes — there's no existing `Button.test.tsx` and no established
  convention in this repo for asserting on generated Tailwind CSS output
  (contrast tokens etc. are verified by computation/inspection, not
  vitest); the class names are present and verified by build/lint, but the
  actual rendered opacity/cursor isn't independently unit-tested.

## Concerns / things worth a second look

1. **Button.tsx disabled styling is not wired up at DrillPage's Step
   1/Step 4 "Next →" buttons.** Those two buttons guard inside `onClick`
   without ever passing `disabled`, so they still silently no-op with zero
   visual feedback — the styling fix only benefits the three call sites that
   already pass `disabled` today. Fixing that fully would mean changing
   those two buttons' behavior (adding `disabled={condition}` and dropping
   the inline guard), which felt like a scope decision beyond "add
   styling to Button.tsx" as literally asked. Flagging it in case the
   intent was broader.
2. **E.1's scope** (three `rgba(255,90,31,...)` occurrences in
   `PlayerPickerModal.tsx` only) leaves visually-identical hardcoded
   `rgba(255,90,31,...)` patterns in `DrillPage.tsx`, `DashboardPage.tsx`,
   and `CompetitiveSetupPage.tsx` untouched. Left alone since the finding
   named one file and one count, but it's the same category of issue and
   may be worth a follow-up finding of its own.

No blockers. All four commits build, test, and lint clean.
