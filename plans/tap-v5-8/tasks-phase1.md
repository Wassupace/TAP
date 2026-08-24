# TAP v5.8 — Phase 1: Foundations

Source spec: `plans/tap-v5-8/plan.mdx` (module: "Global UI primitives", plus the
Drills-module callout on the data-integrity bug). PRD: `docs/TAP_PRD_v5_8.md`.

## Global Constraints

These apply to every task in this file:

- Stack: React 19 + TypeScript + Vite + Tailwind v4 + Zustand + TanStack Query
  + Supabase. Do not introduce a new state-management paradigm (no React
  Context for app state) — this codebase's convention for shared client state
  is a Zustand store per concern (see `src/stores/drillStore.ts`,
  `matchStore.ts`, `sessionStore.ts`, `syncStore.ts`). Follow that pattern for
  any new store.
- Styling: every component references CSS custom properties defined in
  `src/index.css` (e.g. `var(--panel)`, `var(--chalk)`, `var(--orange)`) via
  inline `style={{ ... }}` objects or Tailwind arbitrary-value classes
  (`bg-[var(--panel)]`). Never hardcode a hex color in a component file.
  Typography uses `'Archivo Expanded', Archivo, sans-serif` for headings/labels
  (uppercase, `letterSpacing: '0.08em'`, `fontWeight: 700`, `fontSize: 11` for
  section eyebrows) and `'Archivo', sans-serif` for body text — match the
  existing visual language exactly, don't invent a new one.
- Testing: this repo has **no component-rendering test library** (no
  `@testing-library/react`, no jsdom-based render tests — only `happy-dom` +
  `vitest` for pure-logic tests, see `src/lib/db.test.ts` and
  `src/lib/syncQueue.test.ts` for the existing style: mock the module
  boundary, assert on exported function behavior). For any task below that
  adds a React component: extract genuinely pure logic (a filter/match
  function, a reducer, a formatting helper) into a plain exported function and
  unit-test *that* with vitest. Do not add `@testing-library/react` or any
  new test dependency — if you believe component-level rendering tests would
  meaningfully help, say so in your report as a concern, don't add the
  dependency yourself.
- Commands that must pass before you report DONE: `npm run build` (runs
  `tsc -b && vite build` — zero type errors), `npm test` (`vitest run` — all
  existing tests plus any you add), `npm run lint` (no new errors; existing
  warnings elsewhere in the codebase are not your concern).
- Do not modify `supabase/migrations/001_initial_schema.sql` or
  `002_v54_additions.sql` — additive changes only, in new numbered files.
- Do not add new npm dependencies without flagging it clearly in your report
  (`DONE_WITH_CONCERNS`) and explaining why nothing in `package.json` already
  covers it.
- Commit each task's work as one or more commits on the current branch (you're
  already on a dedicated worktree branch, not `main`). Write clear commit
  messages. Do not amend, do not force-push, do not touch git remotes.

---

## Task 1: Migration — sessions.state CHECK constraint

Add `supabase/migrations/003_v58_additions.sql`:

```sql
alter table sessions
  add constraint sessions_state_valid
  check (state in ('planned', 'active', 'completed'));
```

`sessions.state` is currently plain `text` with no constraint (confirmed in
`001_initial_schema.sql`) even though `hand` on `drills`/`heat_entries` already
has an equivalent `CHECK` (`drills_hand_valid`, `heat_entries_hand_valid`) —
this brings `state` in line with that existing convention.

Also keep two other artifacts in sync with this new migration, both of which
exist for local-dev convenience and are easy to silently drift out of date:

1. `supabase/migrations/combined_migration.sql` is documented elsewhere in
   this repo as a verbatim concatenation of every migration file, for
   reference/dev convenience. Append the same `alter table` statement to its
   end.
2. `docker-compose.yml`'s `db` service mounts `001_initial_schema.sql` and
   `002_v54_additions.sql` individually as `docker-entrypoint-initdb.d`
   scripts (by explicit filename, not a directory glob). Add a third volume
   line mounting `003_v58_additions.sql` the same way, so the local Docker
   Postgres stack stays in parity with what `supabase db push` (used in CI,
   `.github/workflows/migrate.yml`) will apply. Follow the existing two
   lines' exact naming pattern for the target path inside the container
   (`00N_<short-name>.sql`).

**Verification:** if the local `docker-compose` Postgres stack is runnable in
this environment, bring it up and confirm
`insert into sessions (date, location, state) values (current_date, 'Test Gym', 'bogus')`
is rejected by the new constraint. If Docker isn't available in this sandbox,
say so in your report and rely on the SQL being syntactically correct
`psql`-valid DDL (it is a single, unambiguous `ALTER TABLE ... ADD CONSTRAINT`
statement) — don't block on infrastructure you don't have.

**Report file:** `plans/tap-v5-8/task-1-report.md`

---

## Task 2: Player Picker Modal component

Build `src/components/ui/PlayerPickerModal.tsx` — a new, standalone, reusable
component. **This task does not wire it into any screen yet** (that's Tasks 3
and 4) — build and validate it in isolation.

### Why this exists

Three different ad-hoc "add a player" UIs exist today, none backed by the real
player database: a free-text nickname input in `DashboardPage.tsx`'s
`NewSessionModal`, another free-text input in `DashboardPage.tsx`'s
`ActiveDashboard`, and a full-page checklist in `AttendancePage.tsx` (the only
one that's actually real-data-backed, via `usePlayers()`). PRD §3.5 specifies
one persistent, searchable, DB-backed modal reused everywhere players get
added — this task builds that component.

### Exact behavior (PRD §3.5)

- A **persistent modal**: stays open across multiple selections, only closes
  on explicit Confirm or the backdrop/close tap — do not close it after each
  player tap.
- Renders the full player database (`usePlayers()`, already real — see
  `src/hooks/usePlayers.ts`) as a scrollable list, each row showing an
  `Avatar` (from `src/components/ui/Avatar.tsx`) + the player's `nickname` (as
  primary label — matches the display convention already used in
  `PlayersPage.tsx`'s roster rows) + `name` as a smaller secondary line.
- A text input at the top filters the list by `nickname` or `name`
  (case-insensitive substring match — mirror the exact filter logic already
  in `PlayersPage.tsx`: `p.nickname.toLowerCase().includes(query.toLowerCase()) || p.name.toLowerCase().includes(query.toLowerCase())`).
  Extract this predicate into a small exported pure function (e.g.
  `matchesPlayerQuery(player: Player, query: string): boolean`) and unit-test
  it — this is the one piece of genuinely pure logic in this component.
- Already-selected players **stay visible in the list** with a distinct
  visual treatment (e.g. an accent-colored left border or background tint
  using `var(--orange)`/`rgba(255,90,31,...)`, matching the existing chip
  style in `NewSessionModal`) — never hidden, never greyed out.
- A floating **"+ Add new player"** control anchored at the bottom of the
  list. Tapping it expands an inline form (not a second modal) with two
  mandatory fields, **Name** and **Nickname**, and a Save action. On save:
  call `useAddPlayer()` (`src/hooks/usePlayers.ts` — `mutateAsync({ name,
  nickname, target_ft_percent: 0.75, target_mid_percent: 0.5,
  target_3pt_percent: 0.4 })`, mirroring the exact default values
  `PlayersPage.tsx`'s existing `AddPlayerSheet` already uses for new players),
  then immediately add the newly-created player's `id` to the current
  selection. Do not close the picker modal itself when this inline form
  saves — only the inline form collapses back to the "+ Add new player"
  control.
- A **Confirm** action in the header (mirror the existing bottom-sheet header
  pattern below) that calls back with the final selected ID list and closes.

### Component contract

```ts
interface PlayerPickerModalProps {
  isOpen: boolean
  selectedIds: string[]
  onConfirm: (ids: string[]) => void
  onClose: () => void
}
```
Internally: local state for the working selection (initialized from
`selectedIds` when opened, so callers control the "already selected" set),
local state for the search query, local state for whether the inline
add-player form is expanded. Toggling a row adds/removes its id from the
working selection; only `onConfirm` commits it back to the caller.

### Visual shell — reuse the existing bottom-sheet pattern exactly

Don't invent new overlay/positioning styles — `DashboardPage.tsx`'s
`NewSessionModal` (lines ~64-81) already defines the exact pattern this repo
uses for a bottom-anchored modal sheet:

```tsx
<div style={{
  position: 'fixed', inset: 0, zIndex: 80,
  background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
  display: 'flex', alignItems: 'flex-end',
}} onClick={onClose}>
  <div onClick={e => e.stopPropagation()} style={{
    width: '100%', background: 'var(--panel)',
    borderRadius: 'var(--r-lg) var(--r-lg) 0 0',
    padding: '24px 18px 40px',
    maxHeight: '85dvh', overflowY: 'auto',
  }}>
    {/* header, search input, list, footer */}
  </div>
</div>
```
Match this exactly (backdrop, corner radius, padding, max-height) so the new
modal reads as the same design system as every other sheet in the app, not a
new one. The player list itself needs its own internal `overflowY: 'auto'`
region so the search input and Confirm/Add-new-player controls stay pinned
while the list scrolls, if the list is long — use a flex column layout for
that (header/search fixed, list `flex: 1` + `overflowY: auto`, footer fixed).

**Report file:** `plans/tap-v5-8/task-2-report.md`

---

## Task 3: Fix the Drills data-integrity bug (depends on Task 2)

This is the single highest-priority item in the whole v5.8 plan. Every
`heat_entries` row committed by the app **today** has `player_id: ''` because
`src/pages/DrillPage.tsx`'s setup wizard never calls
`drillStore.setPlayers()`.

### What's broken, exactly

In `src/pages/DrillPage.tsx`, Step 4 of the setup wizard (search for `Step 4 —
Players (skip-able)`) is a placeholder:

```tsx
{setupStep === 4 && (
  <div className="stagger" style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: 16 }}>
    <p style={{ fontSize: 11, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 10 }}>
      Players
    </p>
    <p style={{ fontSize: 13, color: 'var(--dim)', marginBottom: 16 }}>
      Player selection coming soon. Solo drill by default.
    </p>
    <Button variant="primary" className="w-full !min-h-[54px]" onClick={() => setSetupStep(5)}>
      Next →
    </Button>
  </div>
)}
```
`drillStore.setPlayers(p: Player[])` already exists and is already correct —
it is simply never called. `players` therefore stays `[]` for the entire life
of every drill, `players[currentPlayerIndex]` is always `undefined`, and
`commitHeat()` (in `src/stores/drillStore.ts`) saves every heat with
`playerId: players[currentPlayerIndex]?.id ?? ''`.

### Fix

1. Replace the Step 4 placeholder block with the `PlayerPickerModal` from
   Task 2. Import `usePlayers()` (not currently imported in this file) to
   resolve selected IDs back into full `Player` objects, then call
   `setPlayers(selectedPlayers)` — `setPlayers` takes `Player[]`, not IDs, so
   this resolution step is required. Step 4 should open the picker (it can
   auto-open when the step becomes active, or via a button — match whatever
   reads most naturally against the surrounding wizard's existing step
   pattern) and advance to Step 5 once at least... actually there is no
   "at least N players" requirement — an empty selection is valid (solo
   drill with the scribe as the only shooter is explicitly a supported mode
   per PRD §7.3). Do not block "Next" on a non-empty selection.
2. **Active shooter display**: the live drill screen already computes
   `const activePlayer = players[currentPlayerIndex]` and appends
   `` ` · ${activePlayer.nickname || activePlayer.name} shooting` `` to a
   small caption line next to the spot label (search `activePlayer ? ` in
   `DrillPage.tsx`). Once `players` is populated this will already show real
   names — no change needed there — but PRD §7.1a requires the active
   shooter's name to be **prominently displayed at all times, never
   ambiguous**, and today it's a small trailing caption. Promote it: add a
   clearly larger, standalone line (e.g. a heading-weight line above or
   alongside the makes counter reading just the player's name — see the
   Canvas wireframe in `plans/tap-v5-8/plan.mdx`'s Drills section, "Live Drill
   Screen", for the intended visual weight) so it reads as the primary
   heading of the live-drill view, not a caption.
3. **Manual override**: add a small roster strip (reuse `Avatar` chips, same
   pattern as `DashboardPage.tsx`'s "On Court" strip) below or near the active
   shooter name, rendering every player in the current `players` array;
   tapping one jumps the active shooter to them directly. `drillStore.ts` has
   no action for this today — add one:
   ```ts
   setCurrentPlayerIndex: (i: number) => void
   ```
   implemented the same way the store's other simple setters are (a `set(...)`
   call), and call it from the new tap handler. This is additive to the
   store's existing interface — do not change `commitHeat`'s round-robin
   advance logic, which already correctly computes
   `nextPlayerIndex = (currentPlayerIndex + 1) % players.length` once
   `players.length > 1`.

### Verification

This is the task where the "does the fix actually work" check matters most.
Since there's no component-rendering test library (see Global Constraints),
verify at the logic layer: write a `drillStore` test (new file
`src/stores/drillStore.test.ts`, following `db.test.ts`'s mocking style for
any Supabase calls `commitHeat` makes) asserting that after `setPlayers([...two
players...])` and two `commitHeat()` calls, the two resulting entries in
`completedHeats` have distinct, non-empty `playerId` values matching the two
players' real `id`s — this is a direct regression test for the exact bug
being fixed. Then use the `run` skill (or `npm run dev` directly) to walk
through a real 2-player group drill in the browser and confirm the same thing
end-to-end, note in your report whether you were able to do so.

**Report file:** `plans/tap-v5-8/task-3-report.md`

---

## Task 4: Wire the Player Picker Modal into Dashboard (depends on Task 2)

Replace both of `src/pages/DashboardPage.tsx`'s free-text player-adding UIs
with the `PlayerPickerModal` from Task 2.

### Site 1 — `NewSessionModal`

Currently (lines ~108-176) a free-text nickname input + "Add" button that
pushes raw strings into local `players: string[]` state, rendered as removable
chips. `NewSessionModal`'s `onConfirm(location, players)` signature passes
this string array up to `DashboardPage`'s `handleConfirm`, which calls
`setActiveSession(session.id, location, players)` —
`sessionStore.players: string[]` is documented as "nicknames of players
currently on court" and is read that way everywhere else in the app (e.g.
`ActiveDashboard`'s roster strip renders `players.map(name => <Avatar
nickname={name} ...>)`).

**Keep that contract**: don't change `sessionStore.players`'s type or the
"nicknames" convention in this task — that's a larger change (session rosters
becoming ID-based end-to-end) that belongs to the Sessions module phase, not
this one. Instead: replace the free-text input with the picker, working in
player IDs internally, and **resolve selected IDs to nicknames** (via the
same `usePlayers()` data the picker already loaded) at the point
`onConfirm` is called, so `NewSessionModal`'s existing external contract
(`onConfirm(location: string, players: string[])` where `players` are
nicknames) does not need to change and `handleConfirm`/`useOpenSession`
downstream are untouched.

### Site 2 — `ActiveDashboard`'s inline add-player control

Currently (search `addingPlayer` in `DashboardPage.tsx`) a `+` button expands
an inline single free-text input calling `sessionStore.addPlayer(nickname)`
on submit. Replace the expanding input with opening the `PlayerPickerModal`.
Since `sessionStore.players` only holds nicknames (not IDs), pre-select rows
in the picker whose `nickname` already matches a name in the current
`players` array (a best-effort match — this is the existing data
model's limitation, not something to solve here), and on confirm, call
`addPlayer(nickname)` for every selected player whose nickname isn't already
in the current roster. Removal (`removePlayer(name)`, tapping an existing
avatar chip) is unaffected — leave that as-is.

**Report file:** `plans/tap-v5-8/task-4-report.md`

---

## Task 5: NumberPad component + wire into Match and Drill

Build `src/components/ui/NumberPad.tsx` per PRD §1.4's global rule: "Tapping
any score, makes count, or numeric value anywhere in the app opens a numpad
for direct entry. This applies universally... No exceptions." Today, neither
of the two entry points that exist actually let you tap the number itself —
only separate +/- buttons work.

### Component

A bottom-sheet (reuse the exact same overlay/sheet shell described in Task 2
— by the time you start this task, `PlayerPickerModal` will already exist;
look at it for the pattern rather than re-deriving it from `NewSessionModal`)
containing: the current value large at the top, a 0-9 digit grid plus a
backspace control, and a "Done" primary button. Contract:

```ts
interface NumberPadProps {
  isOpen: boolean
  value: number
  label: string        // e.g. "Team A score", "Makes this heat"
  onConfirm: (value: number) => void
  onClose: () => void
}
```
Internally track the entered digit string as local state (starting empty, not
pre-filled with `value` — direct entry replaces the old value rather than
editing it, matching "for direct entry" in the PRD wording), parse to a
number on Done, clamping to `>= 0`.

### Wire into MatchActivePage

`src/pages/MatchActivePage.tsx` renders scores as plain, non-interactive
spans: `<div ... id="scoreA">{currentAScore}</div>` /
`<div ... id="scoreB">{currentBScore}</div>`, with separate `+1`/`+2` buttons
doing the only interaction via `incrementScore('A'|'B', pts)`. Keep the +/-
buttons — they're the fast path for the common case — but make the score
number itself tappable, opening the `NumberPad` for direct entry.

`matchStore.ts` has no way to *set* a score directly today, only
`incrementScore` (which adds to the current value). Add one:
```ts
setScore: (team: 'A' | 'B', value: number) => void
```
implemented alongside `incrementScore` in the same store, and call it from
the `NumberPad`'s `onConfirm`.

### Wire into DrillPage

`src/pages/DrillPage.tsx` already has `setMakes(n: number)` from
`drillStore.ts` — no store change needed here. The makes counter is rendered
as `<span className="font-display text-[64px] leading-[.9]">{currentMakes}</span>`
with separate `−`/`+` circular buttons calling `changeMakes(-1)`/`changeMakes(1)`
(a local wrapper around `setMakes(currentMakes + delta)`). Make the
`{currentMakes}` span itself tappable, opening the `NumberPad`, calling
`setMakes(value)` directly on confirm.

Do not wire the NumberPad into Banks/Middies/Next/Generic screens — those
don't exist yet (Phase 3 builds them and will wire this component in at that
point).

**Report file:** `plans/tap-v5-8/task-5-report.md`

---

## Task 6: Manual theme control + retheme to PRD v5.8 exact palette

This is the largest task in this phase — it touches the global stylesheet.

### Part A — Theme preference store

New `src/stores/themeStore.ts`, a Zustand store (matching this codebase's
existing state-management convention — see Global Constraints; do not use
React Context) using Zustand's built-in `persist` middleware (part of the
already-installed `zustand` package, `zustand/middleware` — this is not a new
dependency) to back a `light | dark | system` preference with `localStorage`
under a key like `tap-theme`.

The store's job is to resolve the preference to an *effective* theme
(`'light' | 'dark'`, resolving `'system'` via
`window.matchMedia('(prefers-color-scheme: dark)')`) and keep
`document.documentElement.dataset.theme` in sync with that effective value —
including reacting live if the OS-level preference changes while `'system'`
is selected (subscribe to the media query's `change` event). Wire this
sync as a side effect near the app root (`src/main.tsx` or `src/App.tsx` —
whichever already owns comparable app-wide setup, e.g. where
`initSyncWorker()` is called in `main.tsx`) so it runs once on load and
whenever the preference changes.

### Part B — Rewrite src/index.css's color tokens

Currently `src/index.css` defines dark-mode colors on a bare `:root` block
and light-mode overrides inside `@media (prefers-color-scheme: light)`. Since
theme is now controlled by `document.documentElement.dataset.theme` rather
than purely the OS media query, restructure to:

```css
:root[data-theme="light"] { /* light values */ }
:root[data-theme="dark"]  { /* dark values, currently the bare :root block */ }
```
(`data-theme` is always set by Part A's sync effect before first paint is
meaningful — there is no third "no attribute yet" state to design for.)

Apply these **exact** values — computed from the PRD's Section 1.4 color
table, HSL-derived where PRD leaves a token unspecified (shown below) so the
existing tonal relationships between tokens are preserved:

| Token | Dark value | Light value | Source |
| --- | --- | --- | --- |
| `--ink`, `--court` | `#0F0F14` | `#FFFFFF` | PRD "Background" |
| `--panel` | `#1A1A2E` | `#F5F5F5` | PRD "Surface / cards" |
| `--panel-2` | `#272745` | `#FBFBFB` | derived (+7% / −1.5% HSL lightness from `--panel`, same step size as today's panel→panel-2 relationship) |
| `--panel-3` | `#34345C` | `#F2F2F2` | derived (+14% / −5% HSL lightness from `--panel`) |
| `--chalk` | `#FFFFFF` | `#1A1A2E` | PRD "Primary text" |
| `--dim` | `#E8E4D9` | `#666666` | PRD "Secondary text" |
| `--faint` | keep current relationship: a further-muted step off `--dim` (today `--faint` is always a step dimmer than `--dim` in both modes) — pick a value between `--dim` and `--panel-2`/`--panel-3` by the same visual proportion as today's `--dim`→`--faint` step | same rule | PRD doesn't define a second secondary-text tier; preserve the existing two-tier relationship rather than collapsing it to one flat gray |
| `--orange`, `--orange-2` | `#E8500A` / `#F66E2F` | same (accent doesn't change by mode) | PRD "Accent / interactive" (`--orange`); `--orange-2` derived (+10% HSL lightness, same relationship as today) |
| `--orange-soft`, `--accent-glow` | recompute from the new `--orange` at the same alpha/opacity the current values use (`rgba(232,80,10,.14)` etc.) — just swap the RGB, keep the alpha | same | derived, mechanical |
| `--hero-gradient` | `linear-gradient(135deg, #21213B 0%, #0F0F14 100%)` | `linear-gradient(135deg, #F7F7F7 0%, #F5F5F5 100%)` | derived — anchored to the new `--panel`/`--ink` neighborhood instead of the old blue-navy hue, since PRD doesn't specify this token but the old blue-grey (`#1e3a5f`/`#DBEAFE`) will look mismatched against the new base palette |

**Do not touch** `--line`, `--line-2`, `--blue`, `--blue-soft`, `--red`,
`--red-soft`, `--green`, `--yellow`, `--grey-z`, `--r-lg`/`--r-md`/`--r-sm`,
or `--shadow` — these are either alpha-based overlays that are already
theme-appropriate by construction, or semantic/team colors (Team A blue, Team
B red, status green/yellow) that PRD v5.8 does not ask to change.

Also note, for your report, but **do not attempt to fix in this task**: PRD
§1.4 additionally specifies exact colors for the shot chart's court surface,
court lines, and zone fills. Those live inside
`src/components/ui/ShotChart.tsx`'s own drawing logic (hardcoded SVG
`stroke`/`fill` values, not the `index.css` tokens this task touches) and are
out of scope here — flag it as a pointer for whoever next touches
`ShotChart.tsx` (the Phase 2 plan already includes shot-chart work).

### Part C — Settings toggle

In `src/pages/SettingsPage.tsx`, add a new "Appearance" section (styled
exactly like the existing "Data & Export" / "About" sections immediately
below it — same eyebrow-label + `var(--panel)` card treatment) containing a
three-way Light/Dark/System control wired to the Part A store. This directly
resolves the PRD's "Bug v5.5" callout: "no toggle exposed in Settings."

**Report file:** `plans/tap-v5-8/task-6-report.md`

---

## Task 7: Wire drillId so drills actually persist to Supabase

**Added mid-phase, discovered during Task 3's review — not part of the
original plan.mdx.** Task 3 fixed `heat_entries.player_id` always being `''`.
Reviewing that fix surfaced a bigger, pre-existing gap: `drillStore.ts`'s
`commitHeat()` only calls `dbInsert('heat_entries', ...)` `if (drillId)`
(search `if (drillId)` in `src/stores/drillStore.ts`), but **nothing in the
app ever calls `setDrillId`** — `drillId` is permanently `null`. So today,
*no* drill heat has ever reached Supabase at all, regardless of `player_id`.
Task 3's fix is currently inert in production without this.

### Fix

`src/pages/DrillPage.tsx`'s "Start Drill" button (search `Start Drill` — it
currently just does `onClick={() => setSetupStep(null)}`) is where a drill
setup session actually begins. Mirror the exact pattern already used by
`src/pages/MatchSetupPage.tsx`'s `handleStart` for the equivalent moment in
the Matches module:

```ts
const handleStart = async () => {
  try {
    const { data, error } = await supabase
      .from('drills')
      .insert({
        session_id: activeSessionId,
        shot_type: shotType,
        hand,
        selected_spots: selectedSpots,
        heat_size: heatSize,
        makes_target_per_spot: makesTargetPerSpot,
        player_ids: players.map(p => p.id),
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single()
    if (!error && data) setDrillId(data.id)
  } catch {
    // Offline — drillId stays null, heats will be queued without drill FK
  }
  setSetupStep(null)
}
```
(`activeSessionId` comes from `useSessionStore()` — not currently imported in
`DrillPage.tsx`, add it, following `MatchSetupPage.tsx`'s exact import.
`supabase` comes from `src/lib/supabase.ts`, same as `MatchSetupPage.tsx`.
`setDrillId` already exists on `drillStore.ts` — just not currently
destructured/used in `DrillPage.tsx`.)

Wire this as the "Start Drill" button's `onClick` instead of the current bare
`setSetupStep(null)`.

### Explicitly not in scope for this task

Do not route this insert through `src/lib/db.ts`'s offline queue
(`dbInsert`/`dbUpdate`) — `MatchSetupPage.tsx`'s equivalent `matches` insert
doesn't either, today. Making session-start-of-activity inserts offline-first
is a broader, later-phase concern (see `plans/tap-v5-8/plan.mdx`'s "Offline
sync consistency" section) — this task only needs to match the existing
`matches` insert pattern exactly, not improve on it.

### Global Constraints

Same as the rest of this file (see the top of this document) — additionally:
this task touches `src/pages/DrillPage.tsx` only (a store read of
`setDrillId`, which already exists, needs no store change) and does not
touch `src/stores/drillStore.ts`.

### Verification

Write a focused test if practical (mock `supabase.from` the same way
`db.test.ts` does, assert `drillId` gets set from a successful insert
response) — but the more important check is: does `handleStart` actually
call `supabase.from('drills').insert(...)` with all the setup-wizard's
collected fields (shot type, hand, spots, heat size, target, player ids)?
Self-review against that list explicitly in your report.

**Report file:** `plans/tap-v5-8/task-7-report.md`

---

## Task 8: Point tailwind.config.ts at the live theme tokens instead of a stale static duplicate

**Added mid-phase, discovered during Task 6's review — not part of the
original plan.mdx.** Task 6 rewrote `src/index.css`'s CSS custom properties
to the PRD's exact light/dark palette and shipped a working Light/Dark/System
toggle in Settings. Review found that `tailwind.config.ts` holds a second,
completely independent, mode-invariant copy of the OLD palette:

```ts
colors: {
  ink:       '#111827',
  court:     '#111827',
  panel:     '#1F2937',
  'panel-2': '#374151',
  'panel-3': '#4B5563',
  chalk:     '#F9FAFB',
  dim:       '#9CA3AF',
  faint:     '#6B7280',
  orange:    '#FF5A1F',
  'orange-2':'#FF7C40',
  teamA:     '#3B82F6',
  teamB:     '#EF4444',
  hit:       '#10B981',
  warn:      '#F59E0B',
},
```
Any Tailwind utility class built from these tokens (`text-chalk`, `bg-panel`,
`border-orange`, etc. — confirmed live call sites include `WinLossPage.tsx`,
`CalendarPage.tsx`, `PlayersPage.tsx`, `DrillPage.tsx`, `BanksPage.tsx`,
`MatchActivePage.tsx`, `MatchSetupPage.tsx`) renders the frozen old hex value
regardless of which theme is active. In dark mode this is barely
noticeable (the values happen to be close). In light mode it produces
near-invisible text (e.g. `text-chalk` renders `#F9FAFB`, near-white, on a
`#F5F5F5` light-mode card) — a real, user-visible bug the moment someone
actually taps Light in the new Settings toggle Task 6 just shipped.

### Fix

In `tailwind.config.ts`, point every one of these color tokens at the
corresponding CSS custom property from `src/index.css` instead of a static
hex value:

```ts
colors: {
  ink:       'var(--ink)',
  court:     'var(--court)',
  panel:     'var(--panel)',
  'panel-2': 'var(--panel-2)',
  'panel-3': 'var(--panel-3)',
  chalk:     'var(--chalk)',
  dim:       'var(--dim)',
  faint:     'var(--faint)',
  orange:    'var(--orange)',
  'orange-2':'var(--orange-2)',
  teamA:     'var(--blue)',
  teamB:     'var(--red)',
  hit:       'var(--green)',
  warn:      'var(--yellow)',
},
```
(Note `teamA`/`teamB`/`hit`/`warn` map to `--blue`/`--red`/`--green`/
`--yellow` — different names because they predate `index.css`'s token
naming; their computed values don't change, only the mechanism does, so
this is a pure de-duplication with zero visual change to any existing
correctly-rendering usage.)

This makes every Tailwind utility class built from these tokens follow
whichever theme is active, system-wide, in one file — rather than needing to
hunt down and convert each of the ~12+ individual `text-chalk`/etc. call
sites to `text-[var(--chalk)]` one by one.

### Verification

After the change, confirm Tailwind actually resolves `var(--...)` inside
its generated utility classes for this project's Tailwind v4 setup (it
should — Tailwind v4's arbitrary/theme color values support CSS custom
properties natively) by checking the built CSS output (`npm run build`,
inspect `dist/assets/*.css` for a rule like `.text-chalk{color:var(--chalk)}`
rather than a literal hex). If Tailwind v4 requires a different syntax to
reference a CSS variable in `theme.extend.colors` for this to work
correctly (rather than literally resolving `var(--panel)` at class-generation
time in a way that breaks), investigate and use whatever the correct
Tailwind v4 mechanism is — report exactly what you found and why, don't
guess silently.

### Global Constraints

Same as the rest of this file — additionally: this task touches
`tailwind.config.ts` only. Do not touch `src/index.css` (already correct
after Task 6) or any individual page/component file's className usage.

**Report file:** `plans/tap-v5-8/task-8-report.md`

---

## Task 9: Require at least one player before leaving Drill setup Step 4

**Added mid-phase, discovered during Task 7's review — not part of the
original plan.mdx, and a correction to a mistake in this file's own Task 3
brief.** Task 3's brief told its implementer that an empty player selection
at Drill setup Step 4 must remain valid ("solo drill... do not block Next on
a non-empty selection"), reasoning that PRD §7.3's "solo drill" meant "zero
players selected." That reasoning was wrong: PRD §7.1a says "In solo
drills: the single session player is the default shooter" — solo means
**one** real, identified player (the scribe drilling alone), never zero.

With `players: []` (today's actual behavior — Step 4's "Next →" button has
no guard, unlike Step 1's spot-selection which already requires
`selectedSpots.length > 0`), `drillStore.ts`'s `commitHeat()` computes
`playerId: players[currentPlayerIndex]?.id ?? ''` — an empty string. Since
Task 7 now correctly wires `drillId`, this `''` reaches a real
`supabase.from('heat_entries').insert(...)` call against a column that is
`uuid references players(id)` (`supabase/migrations/001_initial_schema.sql`)
— an **invalid UUID literal**, which Postgres rejects outright. Worse:
`src/lib/db.ts`'s `dbInsert` enqueues the operation into the IndexedDB
offline queue *before* attempting the Supabase call, and
`src/lib/syncQueue.ts`'s `flush()` has no retry cap or dead-letter — a
permanently-failing insert is retried forever, every 30 seconds, by
`src/lib/syncWorker.ts`, keeping the sync status indicator stuck
"unsynced" indefinitely for that session.

### Fix

In `src/pages/DrillPage.tsx`, Step 4's "Next →" button currently has no
guard on the picker's selection. Add one, mirroring the exact pattern
Step 1 already uses for `selectedSpots.length > 0`:

```tsx
<Button
  variant="primary"
  className="w-full !min-h-[54px]"
  disabled={players.length === 0}
  onClick={() => players.length > 0 && setSetupStep(5)}
>
  Next →
</Button>
```
(Read the current Step 1 "Next" button's exact JSX for the precise
disabled/onClick styling convention already established — e.g. does a
disabled `Button` already render a visibly-dimmed state via the shared
`Button` component, or does Step 1 handle the disabled look manually? Match
whatever Step 1 already does exactly, don't invent a new disabled-button
treatment.)

This means: in a true solo session, the scribe must select themselves (or
whichever single player is drilling) via the Player Picker Modal at Step 4
— exactly the picker Task 3 already built — before the wizard lets them
proceed. No player identity is ever silently dropped, and no invalid UUID
is ever produced.

### Explicitly not in scope for this task

Do not touch `src/stores/drillStore.ts` — `commitHeat`'s logic is already
correct once `players` is guaranteed non-empty by construction; this task
fixes the precondition, not the consequence. Do not touch anything else in
`DrillPage.tsx` (the active-shooter display, roster strip, makes counter,
or the Step 5/"Start Drill" logic from Task 7) — this is a one-button,
one-condition change.

### Global Constraints

Same as the rest of this file — additionally: this task touches
`src/pages/DrillPage.tsx` only, and only Step 4's "Next →" button.

### Verification

Write or extend a test confirming: with zero players selected, attempting
to advance past Step 4 does not change `setupStep`; with one or more
players selected, it does. If a suitable test harness for this UI
interaction already exists from Task 7's work (it drove the wizard through
real button clicks), extend that pattern rather than inventing a new one.

**Report file:** `plans/tap-v5-8/task-9-report.md`
