# Task 5 Report: NumberPad component + wiring

## Implementation Summary

### 1. New component: `src/components/ui/NumberPad.tsx`

Bottom-sheet component matching the `PlayerPickerModal` shell exactly (same
overlay: `position: fixed`, `inset: 0`, `zIndex: 80`, `rgba(0,0,0,0.75)`
background with `backdropFilter: blur(6px)`, `alignItems: flex-end`; same
sheet: full width, `background: var(--panel)`, `borderRadius: 'var(--r-lg)
var(--r-lg) 0 0'`, `padding: '24px 18px 40px'`, `maxHeight: '85dvh'`, flex
column, `overflow: hidden`; header close button styled identically).

Contract matches the brief exactly:
```ts
interface NumberPadProps {
  isOpen: boolean
  value: number
  label: string
  onConfirm: (value: number) => void
  onClose: () => void
}
```

Internals:
- `digits` local state starts at `''` (empty) every time the sheet opens —
  reset via the same "closed→open" resync-during-render pattern
  `PlayerPickerModal` uses (a `wasOpen` state comparison, not an effect).
- Large digit display at top (`font-display`, 64px) shows `digits` (falling
  back to `'0'` when empty), plus a small "Current: {value}" hint below it so
  the old value is visible while entering a replacement without prefilling
  the input — this also gives the `value` prop a real use (see Concerns).
- 0-9 digit grid (3 columns) + backspace (⌫) button, capped at 4 digits
  (0-9999) to keep the display from wrapping — no PRD requirement drove this,
  it's a defensive UI bound.
- "Done" button (same gradient/style as `PlayerPickerModal`'s confirm button)
  calls `onConfirm(parseNumberPadDigits(digits))` then `onClose()`.

### 2. New pure util: `src/utils/parseNumberPadDigits.ts` (+ test)

Extracted the digit-string→number parsing/clamping exactly as suggested by
the task constraints, since it's genuinely pure logic:
```ts
export function parseNumberPadDigits(digits: string): number
```
Empty string → `0`; parses with `parseInt` (handles leading zeros); clamps to
`>= 0` defensively (digit-only input can't actually go negative, but this
guards the contract regardless). Unit tested in
`src/utils/parseNumberPadDigits.test.ts` (7 cases), following the existing
`matchesPlayerQuery.test.ts` convention.

### 3. `matchStore.ts`: added `setScore`

```ts
setScore: (team: 'A' | 'B', value: number) => void
```
implemented alongside `incrementScore`, clamping to `>= 0` before writing
`currentAScore`/`currentBScore`. `incrementScore` and all other store logic
untouched.

### 4. Wired into `MatchActivePage.tsx`

- The `<div id="scoreA">{currentAScore}</div>` / `id="scoreB"` elements are
  now `<button>`s (same classes, `id`s preserved, transparent
  background/border/padding added) that open the `NumberPad` for their team.
- Existing `+1`/`+2` buttons (`incrementScore`) are untouched.
- One `NumberPad` instance rendered at the bottom of the page, driven by a
  new `numberPadTeam: 'A' | 'B' | null` state; `onConfirm` calls
  `setScore(numberPadTeam, v)`.

### 5. Wired into `DrillPage.tsx` (narrowly scoped, per instructions)

Only change: the `<span className="font-display text-[64px] leading-[.9]">
{currentMakes}</span>` became a `<button>` with the same classes (plus
transparent background/border/padding/`color: inherit`) that opens the
`NumberPad`, and one `<NumberPad>` instance was added at the end of the
active-drill-view JSX, wired to `setMakes` directly (not the `changeMakes`
wrapper — drillStore's `setMakes` already clamps to `[0, heatSize]`). The
`−`/`+` buttons (`changeMakes`) are untouched. No other part of the file
(active-shooter heading, roster strip, Step 4 picker, setup wizard) was
touched — confirmed via `git diff` showing only the import line, one new
`useState`, the span→button change, and the new `<NumberPad>` block.

## Verification

- `npm run build` — passes clean (tsc -b + vite build).
- `npm test` — 43/43 tests pass across 6 files (5 pre-existing + the new
  `parseNumberPadDigits.test.ts`).
- `npm run lint` — 5 errors / 1 warning, all in files this task never
  touched (`IOSInstallBanner.tsx`, `StatusDot.tsx`, `AttendancePage.tsx`,
  `CompetitiveSetupPage.tsx`) — pre-existing per the task instructions.
  Zero lint issues in any file this task changed or added.

## Files Changed

- `src/components/ui/NumberPad.tsx` (new)
- `src/utils/parseNumberPadDigits.ts` (new)
- `src/utils/parseNumberPadDigits.test.ts` (new)
- `src/stores/matchStore.ts` (added `setScore`)
- `src/pages/MatchActivePage.tsx` (tappable score buttons + `NumberPad`)
- `src/pages/DrillPage.tsx` (tappable makes-counter button + `NumberPad`,
  narrowly scoped)

## Self-Review

- NumberPad starts empty (not prefilled with `value`): confirmed —
  `useState('')`, reset on every closed→open transition.
- Clamps to `>= 0`: confirmed in `parseNumberPadDigits` and again
  defensively in `matchStore.setScore`; `drillStore.setMakes` already
  clamped `[0, heatSize]` before this task and is unchanged.
- Matches `PlayerPickerModal`'s bottom-sheet visual pattern: confirmed —
  overlay, sheet radius/padding/maxHeight, and close-button styling are
  copied verbatim.
- `+`/`-` and `+1`/`+2` buttons still call the same handlers they did
  before, unchanged, on both pages.
- `DrillPage.tsx` diff is limited to exactly the makes-counter span→button
  and the `NumberPad` wiring; active-shooter heading, roster strip, and
  Step 4 picker are byte-for-byte unchanged (verified via `git diff`).

## Concerns

- None blocking. One minor design addition beyond the letter of the brief:
  the "Current: {value}" hint line under the digit display. It's not called
  for in the task's three-item UI list (value display, digit grid, Done
  button), but it (a) gives the `value` prop a genuine purpose — without it,
  `value` would be an unused destructured parameter under this repo's
  `noUnusedParameters` tsconfig setting — and (b) seemed like a reasonable,
  minimal UX aid (shows what's being replaced) rather than scope creep.
  Easy to remove if a reviewer disagrees.
- No new npm dependencies were added.
- Unrelated pre-existing working-tree changes (`.gitignore`, several
  untracked `docs/`/`plans/` files from earlier tasks) were left out of this
  task's commit — they aren't part of Task 5.
