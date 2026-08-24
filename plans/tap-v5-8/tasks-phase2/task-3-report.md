# Task 3 Report: Start Now / Review Details modal (PRD §3.3)

## What I implemented

All changes are contained in **`src/pages/CalendarPage.tsx`** — no other file
was touched (`AttendancePage.tsx` and `useActivateSession` are untouched, per
the brief's explicit scope).

1. **New `choiceSession` state** on `CalendarPage`: `useState<Session | null>(null)`.
   This is the single shared trigger point for the new modal — whichever UI
   element wants to open it for a given planned session just calls
   `setChoiceSession(s)`.

2. **New `StartOrReviewModal` component**, added at the bottom of the file
   next to `PlanSessionSheet` (same "self-contained sub-component in this
   file" convention Task 1 established). Reuses the exact bottom-sheet shell
   markup/styling already used by the quick-start sheet, `PlanSessionSheet`,
   and `PlayerPickerModal` (fixed inset backdrop with blur, bottom-anchored
   panel, `var(--panel)`/`var(--r-lg)` etc. — no new CSS, no hardcoded colors).
   - **"Start Now"** (`handleStartNow`): calls
     `useActivateSession().mutateAsync({ sessionId: session.id, presentPlayerIds: session.expected_player_ids })`,
     then resolves `session.expected_player_ids` against `usePlayers()`'s
     `allPlayers` to get nicknames, then
     `setActiveSession(session.id, session.location, expectedPlayers.map(p => p.nickname))`,
     then `nav('/')`. Wrapped in the same try/catch "keep going even if the
     write fails" fallback `AttendancePage.tsx`'s `open()` already uses —
     `setActiveSession`/`nav('/')` run unconditionally after the try/catch
     rather than being duplicated in both branches (same net effect,
     slightly less repetition).
   - **"Review Details"** (`handleReviewDetails`): `nav('/calendar/attendance/${session.id}')`
     — byte-for-byte the same navigation the "Open →" button used to do
     directly, now just one tap later.

3. **Wiring — both trigger points, per the brief's "your judgment" note**:
   - The "Selected day sessions" list's "Open →" button for
     `s.state === 'planned'`: `onClick` changed from
     `nav(\`/calendar/attendance/${s.id}\`)` to `setChoiceSession(s)`.
   - Task 2's grid mini-pills: added an `onClick` to the pill `<span>`,
     active only when `s.state === 'planned'` (`undefined` otherwise, so
     active/completed/missed pills keep their exact current behavior — a
     plain tap that only bubbles up to the cell's "select this day"
     handler). When present, it calls `e.stopPropagation()` (so the cell's
     own `onClick` doesn't also fire redundantly), `setSelected(day.d)` (so
     the tapped day ends up selected, matching what a normal cell tap does),
     then `setChoiceSession(s)`.
   - Gate is the real `s.state === 'planned'`, not the presentational
     `pillState()` — a "missed" pill is still `state: 'planned'` under the
     hood (per `calendarPills.ts`'s `isMissed` comment: "the DB row is
     untouched, this is presentation only"), and the list's "Open →" button
     was already using that same real-state gate, so missed sessions get the
     same new modal instead of a behavior regression.

## What I tested

- `npm run build` — clean (`tsc -b && vite build`), no new type errors.
- `npm test` — 14 files / 103 tests, all passing. No new test file added:
  `StartOrReviewModal` is pure UI wiring (state → mutation call → store call →
  navigate) with no branching logic worth extracting into a pure function,
  and the repo has no component-rendering test library — consistent with how
  `AttendancePage.tsx`'s structurally identical `open()` has no dedicated
  test either. Self-review below stands in for it.
- `npm run lint` — 5 errors, all pre-existing and in files I didn't touch
  (`IOSInstallBanner.tsx` ×1, `StatusDot.tsx` ×1, `AttendancePage.tsx` ×2,
  `CompetitiveSetupPage.tsx` ×1) — matches the task's stated baseline
  exactly. Zero lint issues in `CalendarPage.tsx`.

## Files changed

- `src/pages/CalendarPage.tsx` — only file touched.

## Self-review

- **Is "Review Details" unchanged from today?** Yes. `handleReviewDetails`
  navigates to the identical route string
  (`` `/calendar/attendance/${session.id}` ``) the old "Open →" `onClick` used,
  and `AttendancePage.tsx` itself has zero diff. The only behavior change is
  that this navigation now happens one tap later, behind the modal's second
  button, instead of directly on the list-row tap (and, newly, also
  reachable from a grid-pill tap).
- **Does "Start Now" correctly resolve `expected_player_ids` to nicknames
  before calling `setActiveSession`?** Yes —
  `allPlayers.filter(p => session.expected_player_ids.includes(p.id))` then
  `.map(p => p.nickname)`, same filter-then-map shape `AttendancePage.tsx`
  already uses for `presentPlayers`. One caveat carried over from that same
  existing pattern (not a new regression): `usePlayers()` is read without
  checking `isLoading` — if a coach opens Calendar cold (roster not yet
  cached anywhere else in the app) and taps "Start Now" before the players
  query resolves, `allPlayers` could momentarily be `[]`, giving an empty
  nickname list even though `expected_player_ids` is non-empty. The
  `useActivateSession` write itself is unaffected (it writes the real ids,
  not nicknames) — this would only under-populate the local
  `sessionStore.players` display array until the next refetch/nav. Flagging
  since it's a real (if narrow, and pre-existing-pattern) gap, not fixing it
  myself since the brief pointed me at "the same pattern AttendancePage.tsx
  already uses" specifically, and patching the loading race there too was
  out of scope for this task.
- Grid-pill click: verified non-planned pills (`active`, `completed`,
  `missed`... wait, `missed` sessions are `state: 'planned'` so they *do* get
  the new `onClick` — see the gate note above, intentional) get
  `onClick={undefined}`, i.e. exactly their old behavior (tap bubbles to the
  cell, selects the day, nothing else).
- Did not touch `stateColor`, `pillBg`, the selected-cell contrast override,
  or any Task 2 rendering logic — only added an `onClick` prop to the
  existing pill `<span>`.

## Concerns

None blocking. The one caveat above (players-not-yet-loaded race on a cold
"Start Now" tap) is worth a follow-up ticket but matches an existing
app-wide pattern rather than introducing a new one, and fixing it would mean
also touching `AttendancePage.tsx`, which is explicitly out of scope here.

---

## Fix round 1: loading state on "Start Now" (review finding)

### Finding

Review flagged the caveat noted above as a real UX gap: `StartOrReviewModal`
read `usePlayers()` without checking `isLoading`, so a coach could tap
"Start Now" during the window before the roster query resolves with no
visual indication anything was off — unlike `AttendancePage.tsx`'s checklist,
which at least visually shows an empty list while loading. Confirmed not a
data-integrity bug: `useActivateSession` writes the real, already-persisted
`session.expected_player_ids` directly, never anything derived from
`allPlayers`. Only the local `setActiveSession(...)` nickname-display array
was at risk of being silently under-populated.

### Fix

In `src/pages/CalendarPage.tsx`'s `StartOrReviewModal` only (no other file
touched, `AttendancePage.tsx` untouched per the fix brief):

- Destructured `isLoading: playersLoading` from the existing `usePlayers()`
  call (was previously only reading `data`).
- "Start Now" button: `disabled` now also checks `playersLoading` (in
  addition to the existing `activateSession.isPending`).
- Label now has a three-way precedence: `activateSession.isPending ?
  'Starting…' : playersLoading ? 'Loading roster…' : 'Start Now'` — mirrors
  the exact `openSession.isPending ? 'Opening…' : 'Open Session'` pattern
  already used by this file's quick-start sheet, just with the extra loading
  rung.
- Updated the block comment above the component to document the new
  behavior and why (write path is unaffected, only the local nickname
  display was at risk).

"Review Details" is untouched — it never depended on `allPlayers`.

### What I tested

- `npm run build` — clean (`tsc -b && vite build`), no new type errors.
- `npm test` — 14 files / 103 tests, all passing (no new tests added: this
  is pure UI-state wiring — a boolean flowing into `disabled` and a label
  string — with no pure-logic extraction point, and the repo has no
  component-rendering test library, consistent with the original
  implementation's rationale for not adding one). Manual self-review below
  stands in.
- `npm run lint` — same 5 pre-existing errors, same files/lines as the
  original report (`IOSInstallBanner.tsx` ×1, `StatusDot.tsx` ×1,
  `AttendancePage.tsx` ×2, `CompetitiveSetupPage.tsx` ×1). Zero lint issues
  in `CalendarPage.tsx`.

### Self-review

- **Does the write path still use the real persisted ids, unaffected by
  this change?** Yes — `handleStartNow`'s `activateSession.mutateAsync`
  call is untouched; it still passes `session.expected_player_ids` directly,
  never `allPlayers`-derived data. This fix only gates *when the button is
  tappable*, not what gets written.
- **Can a coach still get stuck if the players query never resolves (e.g.
  offline, query error)?** `usePlayers()`'s `isLoading` is `true` only
  during the initial fetch; on error it settles to `false` with `data`
  falling back to `[]` (existing default), so the button un-disables and
  "Start Now" becomes tappable again — same "keep going even if a query/
  write fails" tolerance the rest of this modal (and `AttendancePage.tsx`)
  already leans on. Not a new stuck state.
- **Does disabling "Start Now" block "Review Details" too?** No —
  `Review Details`'s `disabled` still only checks
  `activateSession.isPending`, unchanged. A coach can still bail into the
  full checklist flow immediately even while the roster is loading.
- **Any styling added outside `var(--...)` tokens?** No new styling — only
  a `disabled` boolean and a label string changed; no new markup or inline
  styles.

### Files changed

- `src/pages/CalendarPage.tsx` — only file touched (same as original
  implementation).

### Concerns

None. This closes the one caveat flagged in the original report without
touching `AttendancePage.tsx` or any Task 2 code.
