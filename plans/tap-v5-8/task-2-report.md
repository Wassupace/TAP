# Task 2 Report: Player Picker Modal component

## What was implemented

- `src/components/ui/PlayerPickerModal.tsx` — new, standalone, reusable component.
  Not wired into any screen (per the brief — that's Tasks 3/4).
  - Props: `{ isOpen: boolean; selectedIds: string[]; onConfirm: (ids: string[]) => void; onClose: () => void }`.
  - Renders the full roster from `usePlayers()` as a scrollable list. Each row
    shows `Avatar` (with the same `playerColor(p.id)` used by `PlayersPage.tsx`
    and `AttendancePage.tsx`) + `nickname` (primary, bold) + `name` (secondary,
    dim) — matches `PlayersPage.tsx`'s roster-row display convention.
  - Text search input filters by `matchesPlayerQuery` (see below), mirroring
    `PlayersPage.tsx`'s existing filter logic exactly.
  - Already-selected rows stay in the list (never hidden/greyed) with a
    distinct treatment: `background: rgba(255,90,31,0.12)`,
    `border: 1px solid rgba(255,90,31,0.3)`, `borderLeft: 3px solid var(--orange)`
    — matching `NewSessionModal`'s existing chip style — plus a trailing
    orange check-circle (reusing the check/plus circle pattern from
    `AttendancePage.tsx`, recolored to the orange selection accent instead of
    green "present" accent).
  - A "+ Add New Player" control is pinned in a fixed footer below the
    scrollable list (not part of the scrolling list itself, so it's always
    visible). Tapping it expands an inline form (Name + Nickname, both
    required) in place — not a second modal. Save calls
    `useAddPlayer().mutateAsync(...)` with the exact same default target
    percentages `PlayersPage.tsx`'s `AddPlayerSheet` uses
    (`target_ft_percent: 0.75, target_mid_percent: 0.5, target_3pt_percent: 0.4`),
    then adds the newly-created player's `id` to the working selection and
    collapses the inline form back to the "+ Add New Player" control. The
    outer picker modal is not closed by this action.
  - Header holds the title, an explicit close (×) button, and a **Confirm**
    button showing the current selection count. Confirm calls
    `onConfirm(selection)` **and** `onClose()` — per the brief ("calls back
    with the final selected ID list and closes"), the component itself
    guarantees the close rather than depending on the caller's `onConfirm`
    handler to also flip `isOpen` off. The backdrop tap and the × button both
    call only `onClose()` (discarding the in-progress draft, since only
    Confirm commits). Tapping a row toggles selection without closing —
    the modal is persistent across multiple taps, exactly as specified.
  - Visual shell copied from `DashboardPage.tsx`'s `NewSessionModal` bottom
    sheet exactly: `position: fixed`, `zIndex: 80`,
    `background: rgba(0,0,0,0.75)`, `backdropFilter: blur(6px)`,
    `borderRadius: var(--r-lg) var(--r-lg) 0 0`, `padding: 24px 18px 40px`,
    `maxHeight: 85dvh`. The one deliberate adaptation: the outer sheet uses
    `display:flex; flexDirection:column; overflow:hidden` instead of
    `overflowY:auto` on the outer div, because the brief explicitly asks for
    a flex-column layout with header/search/footer fixed and only the
    player list scrolling internally (`flex:1; overflowY:auto`) — this is
    the layout behavior the brief describes, achieved with the equivalent
    flex mechanics rather than the single-scroll-region snippet shown
    (which doesn't have a pinned footer).
  - All styling uses `var(--...)` CSS custom properties / rgba tints already
    defined in `src/index.css`, or hex values already established by the
    existing `playerColor` utility (same as `PlayersPage.tsx`/`AttendancePage.tsx`
    already do) — no new hardcoded hex colors were introduced. Headings use
    `"Archivo Expanded", Archivo, sans-serif`; body/labels use `Archivo,
    sans-serif`, matching the repo's typography convention.

- `src/utils/matchesPlayerQuery.ts` — the extracted pure predicate:
  ```ts
  export function matchesPlayerQuery(player: Player, query: string): boolean {
    const q = query.toLowerCase()
    return player.nickname.toLowerCase().includes(q) || player.name.toLowerCase().includes(q)
  }
  ```
  This exactly mirrors the inline filter already in `PlayersPage.tsx`.
  It lives in its own file (not inside `PlayerPickerModal.tsx`) because
  `eslint-plugin-react-refresh`'s `only-export-components` rule errors on a
  file that exports both a component and a plain function — see Concerns.

- `src/utils/matchesPlayerQuery.test.ts` — vitest unit tests (6 cases):
  nickname substring match, name substring match, mid-string substring match,
  case-insensitivity, empty-query matches everything, no-match returns false.

## State-reset pattern (worth flagging for reviewers)

The brief's contract requires the working selection/query/add-form state to
re-seed from `selectedIds` "when opened." A naive `useEffect` keyed on `isOpen`
that calls `setSelection(...)` etc. triggers this repo's
`react-hooks/set-state-in-effect` lint rule (see Concerns — this rule is newer
than most of the codebase and already fails on 2 pre-existing files). Instead
of suppressing the rule, `PlayerPickerModal` uses React's documented
"adjusting state when a prop changes during render" pattern: it tracks a
`wasOpen` state, and when `isOpen !== wasOpen` it updates `wasOpen` and (only
on the closed→open transition) resets the draft state — all directly in the
render body, not inside an effect. This resolves in the same render/commit
pass instead of an extra effect-triggered re-render, and produces zero lint
errors.

## Tests run and results

- `npm run build` (`tsc -b && vite build`) — clean, no errors.
- `npm test` (`vitest run`) — 3 test files, 21 tests, all passing (6 new for
  `matchesPlayerQuery`, 15 pre-existing in `db.test.ts` / `syncQueue.test.ts`).
- `npm run lint` (`eslint .`) — the 3 new files (`PlayerPickerModal.tsx`,
  `matchesPlayerQuery.ts`, `matchesPlayerQuery.test.ts`) produce **zero**
  lint errors or warnings. See Concerns for pre-existing baseline failures
  unrelated to this task.

## Self-review (against the brief's checklist)

- Bottom-sheet visual pattern (backdrop, corner radius, padding, max-height):
  matches `NewSessionModal` exactly — verified line-by-line against
  `DashboardPage.tsx` lines ~64-81.
- Already-selected players stay visible with distinct treatment, never
  hidden/greyed: confirmed — selected rows keep their row, get the
  orange tint/border, and an orange check-circle instead of the neutral
  plus-circle.
- Inline "add new player" form calls `useAddPlayer` and adds the new
  player's id to selection without closing the outer modal: confirmed —
  `handleSaveNewPlayer` calls `addPlayer.mutateAsync(...)`, adds
  `created.id` to `selection`, and only collapses the inline form
  (`showAddForm` → false); no call to `onClose` in that path.
- Search predicate correctly extracted and tested: confirmed — `matchesPlayerQuery`
  is a standalone pure function, unit-tested with 6 cases covering the
  substring/case-insensitivity behavior described in the brief.
- Persistent modal semantics: confirmed — toggling a row never calls
  `onClose`; only the × button, the backdrop tap, and Confirm do.

## Files changed

- `src/components/ui/PlayerPickerModal.tsx` (new)
- `src/utils/matchesPlayerQuery.ts` (new)
- `src/utils/matchesPlayerQuery.test.ts` (new)
- `plans/tap-v5-8/task-2-report.md` (this file)

## Concerns

1. **Pre-existing lint failures on `main`, unrelated to this task.** Before
   any of my changes, `npm run lint` already fails with 5 errors + 1 warning
   in files I never touched: `src/components/ui/IOSInstallBanner.tsx`,
   `src/components/ui/StatusDot.tsx`, `src/pages/AttendancePage.tsx` (2
   issues), `src/pages/CompetitiveSetupPage.tsx`. Verified by stashing my new
   files and re-running `npm run lint` against a clean `main` checkout — the
   same 5 errors/1 warning appear with no involvement from this task's
   files. These look like `eslint-plugin-react-hooks` v7's newer
   `set-state-in-effect` / `purity` rules catching patterns that predate that
   plugin version, plus two unrelated `no-unused-expressions` errors. Overall
   `npm run lint` therefore still exits non-zero after this task — not
   because of anything added here, but because the baseline was already
   broken. Flagging for the controller to decide whether that's tracked
   separately or needs a follow-up task; I did not touch those unrelated
   files since fixing them is out of scope for Task 2.
2. **No component-rendering tests.** Per the task constraints, this repo has
   no `@testing-library/react`/jsdom render-testing setup, so only the
   extracted pure `matchesPlayerQuery` predicate is unit-tested — the modal's
   interactive behavior (toggle, confirm/close semantics, inline add-player
   flow) is untested beyond manual/self-review. I did not add any new test
   dependency, per instructions. If integration coverage of this component
   matters before Tasks 3/4 wire it in, adding `@testing-library/react` would
   be the natural next step, but that's a call for whoever owns test-strategy
   decisions, not something I added unilaterally.
3. **Confirm button also calls `onClose`.** The brief states Confirm "calls
   back with the final selected ID list and closes." Since `onConfirm` and
   `onClose` are two separate props in the contract, I made the component
   call both on Confirm (rather than assuming the caller's `onConfirm`
   handler will also flip `isOpen` off). This seemed like the safer,
   more foolproof reading of "closes," but it's worth the controller
   double-checking against how Tasks 3/4 plan to wire `isOpen` — if a future
   caller's `onConfirm` handler *also* sets `isOpen` false, that's harmless
   (idempotent), but if a caller expected to control closing itself only via
   `onClose` on some other timing, this is worth a second look.
