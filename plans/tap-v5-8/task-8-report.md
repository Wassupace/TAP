# Task 8 Report: Point tailwind.config.ts at the live theme tokens instead of a stale static duplicate

## Status: BLOCKED

The color-token mapping was implemented exactly per the brief, and `npm run
build` / `npm test` / `npm run lint` all pass. But the task's own required
verification step — confirm the built CSS actually contains a rule like
`.text-chalk{color:var(--chalk)}` — **fails**, for a reason outside the
`tailwind.config.ts`-only scope this task was given. Details below.

## What I implemented

In `tailwind.config.ts`, `theme.extend.colors` now reads:

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

This matches the brief's exact mapping character-for-character, including
the `teamA→--blue`, `teamB→--red`, `hit→--green`, `warn→--yellow` renames.
No other part of `tailwind.config.ts` (content globs, fontFamily,
borderRadius) was touched. `src/index.css` and all page/component
`className` usage were left untouched, per the global constraint.

## What I verified in the built CSS output — and what I found

Per the task's verification instructions, I ran `npm run build` and
inspected `dist/assets/*.css` for a generated rule like
`.text-chalk{color:var(--chalk)}`.

**Result: no such rule exists — for any of the 14 tokens, in either the
pre-task baseline or the post-edit build.** I searched the minified output
for `text-chalk`, `bg-panel`, `border-orange`, `text-teamA`, `bg-warn`,
`text-dim`, `bg-hit` — zero occurrences of any of them, before or after my
edit.

To rule out "wrong var() syntax," I diffed the actual generated CSS
byte-for-byte between the old-hex config and the var()-based config (same
build, only `tailwind.config.ts` toggled via `git stash`): **the two builds
produce functionally identical CSS.** The only line-level difference found
across the whole stylesheet was one unrelated utility (`.flex-shrink{...}`,
present in one build and not the other — an unrelated non-deterministic
scan artifact, not a color rule). In other words, `tailwind.config.ts`'s
`colors` block has **zero effect on the build's output today, regardless of
what's written inside it** — with the old hardcoded hex values or with my
`var(--*)` replacements.

### Root cause (verified, not assumed)

1. `postcss.config.js` passes `@tailwindcss/postcss` a `config:
   './tailwind.config.ts'` option:
   ```js
   export default {
     plugins: {
       '@tailwindcss/postcss': { config: './tailwind.config.ts' },
       autoprefixer: {},
     },
   }
   ```
2. I read `@tailwindcss/postcss`'s shipped type definitions
   (`node_modules/@tailwindcss/postcss/dist/index.d.ts`) and its README. In
   v4.3.0 the plugin's `PluginOptions` type is `{ base?, optimize?,
   transformAssetUrls? }` only — **there is no `config` option**. The
   `config` key in `postcss.config.js` is a leftover from Tailwind v3's
   `tailwindcss({ config })` API and is silently ignored by v4's plugin.
3. I confirmed this is a pre-existing migration artifact, not something
   introduced by this task or Task 6: `git log -- postcss.config.js` shows
   commit `368578d` ("fix: eliminate cold-load theme flash..." — actually
   "chore: add idb dependency ... fix Tailwind CSS PostCSS config") changed
   the plugin key from `tailwindcss: { config: ... }` to
   `'@tailwindcss/postcss': { config: ... }` as part of a v3→v4 package
   upgrade, carrying the (now-meaningless) `config` option over unchanged.
4. I checked whether Tailwind v4 has any *automatic* fallback detection of
   a `tailwind.config.{js,ts}` file near the CSS entry (the way, say,
   PostCSS itself auto-discovers `postcss.config.js`): grepping the
   compiled `tailwindcss` and `@tailwindcss/node` packages for the literal
   string `"tailwind.config"` returns **zero matches** anywhere in the
   installed binaries. No such auto-detection exists.
5. I confirmed Tailwind v4's actual supported mechanism for loading a
   legacy JS/TS config: `node_modules/tailwindcss/dist/lib.js` contains
   explicit at-rule handling for `@config` (`name=="@config"` branch that
   loads and merges a JS config module into the design system). This is
   the *only* way v4 loads a `tailwind.config.ts`/`.js` file — via a
   `@config "path/to/file";` directive placed inside a CSS file that
   Tailwind actually processes.
6. The only CSS file in this build's pipeline is `src/index.css` (imported
   by `src/main.tsx`). `src/App.css` exists but is a dead leftover from the
   original Vite template — not imported anywhere, confirmed via grep.
   There is no other place to put a `@config` directive.

**So: `tailwind.config.ts` has never been loaded by this project's Tailwind
v4 build, since the v3→v4 migration commit.** Every "old palette" utility
class named in the brief (`text-chalk`, `bg-panel`, `border-orange`, etc.)
currently generates **no CSS rule at all** — not the frozen old hex value
the brief describes, but nothing, full stop. (In practice this is
partially masked for text-color classes because `body { color:
var(--chalk) }` in `index.css` sets the right color via inheritance on most
elements regardless of whether the `text-chalk` utility itself resolves —
which likely explains why the visual bug wasn't more obvious. Background
and border utilities like `bg-panel`/`border-orange` have no such
inheritance safety net.)

### Why I didn't fix the wiring myself

The only viable fix is adding a `@config "./tailwind.config.ts";` at-rule
(or migrating these tokens into a native v4 `@theme` block) inside
`src/index.css` — the one CSS file Tailwind actually compiles. This task's
Global Constraints explicitly say: "this task touches `tailwind.config.ts`
only. Do not touch `src/index.css`." There is no way to wire a legacy JS
config into Tailwind v4 from `postcss.config.js` or `tailwind.config.ts`
alone — the mechanism lives in the CSS layer by design. Editing
`postcss.config.js` doesn't help either: no plugin option exists for this
in v4, confirmed against its type definitions above.

Rather than unilaterally override an explicit "do not touch" constraint (or
invent an out-of-scope workaround, e.g. hacking a synthetic PostCSS AST
node into `postcss.config.js` to inject an `@config` at-rule before
`@tailwindcss/postcss` runs — technically possible but a fragile, surprising
thing for a future maintainer to find, and still arguably outside this
task's stated scope), I'm stopping here and escalating, per this task's own
explicit instruction to do so "especially if the built CSS output shows the
fix isn't actually working as intended."

## Recommendation (decision needed)

One of:

1. **Approve a one-line, additive-only exception**: add
   `@config "./tailwind.config.ts";` near the top of `src/index.css` (before
   the `@tailwind` directives). Doesn't touch any of the token *values*
   Task 6 already fixed — just wires the file up. This is the minimal,
   standard v4 fix.
2. **Retire `tailwind.config.ts` entirely** and move these 14 tokens into a
   native v4 `@theme { --color-chalk: var(--chalk); ... }` block directly in
   `src/index.css`, referencing the already-correct custom properties. More
   idiomatic v4, but a bigger and more invasive change to `src/index.css`
   than option 1, and outside "touches tailwind.config.ts only."
3. **Leave as a tracked follow-up** and accept that Task 8, scoped exactly
   as written, corrects the *values* in a file that isn't currently loaded
   by the build — i.e., ships correct-but-inert code, with the real fix
   deferred to a task that's allowed to touch `src/index.css`.

I'd lean toward (1) — it's a single additive line, doesn't conflict with
anything Task 6 did, and is exactly the sanctioned Tailwind v4 mechanism —
but it does require lifting the literal "do not touch src/index.css"
constraint, which is why I'm not doing it unilaterally.

## Commands run

- `npm run build` — clean, both before and after the edit.
- `npm test` — 65/65 passing (10 test files), unaffected by this change.
- `npm run lint` — 5 errors / 1 warning, all pre-existing and in files
  unrelated to this task (`IOSInstallBanner.tsx`, `StatusDot.tsx`,
  `AttendancePage.tsx` ×2 errors + 1 warning, `CompetitiveSetupPage.tsx`) —
  matches the "5 pre-existing lint errors... not your concern" note in the
  task instructions exactly.

## Files changed

- `tailwind.config.ts` — `theme.extend.colors` values switched from static
  hex to `var(--*)` references (committed: `01919f9`).

No other files were modified. (Note: this working directory also shows
unrelated in-flight changes from other concurrent tasks —
`.gitignore`, `docs/TAP_PRD_v5_8.md`, `plans/tap-v5-8/plan.mdx`,
`plans/tap-v5-8/tasks-phase1.md`, `plans/tap-v5-8/task-1-report.md` — none
of which I touched or included in my commit.)

## Self-review

- Verified my `tailwind.config.ts` diff against the brief's mapping
  line-by-line — exact match, including the non-obvious
  teamA/teamB/hit/warn → blue/red/green/yellow renames.
- Verified (not assumed) that Tailwind v4 would resolve a plain
  `'var(--foo)'` string literal correctly inside `theme.extend.colors` if
  the config were actually loaded — this is standard, documented v4
  behavior for string-valued theme colors (no special function/wrapper
  syntax needed, unlike e.g. opacity-modifier colors which need the
  `rgb(var(--foo) / <alpha-value>)` pattern). The blocker isn't the syntax
  inside the color value — it's that the whole file is never read by the
  build.
- Double-checked `src/App.css` isn't secretly wired in anywhere (grepped
  all of `src/` for `App.css` imports) before concluding `src/index.css` is
  the only viable place for a `@config` directive.
- Confirmed via `git log` that the broken `config` option in
  `postcss.config.js` predates both Task 6 and Task 8 (introduced in the
  v3→v4 migration, commit `368578d`) — this is not a regression I
  introduced or one caused by prior phase-1 tasks.
- Did not touch `src/index.css`, `postcss.config.js`, or any
  page/component file, per constraints — even though fixing the wiring
  would require touching one of the first two.

## Concerns

- **Primary concern (blocking)**: the task's central acceptance criterion —
  Tailwind utility classes for these tokens following the active theme —
  is not met and cannot be met without a change outside this task's
  allowed file scope. See Recommendation above; this needs a decision
  before the underlying bug described in the brief is actually fixed.
- The brief's description of the bug ("renders the frozen old hex value
  regardless of theme") is not quite accurate given what the build output
  shows — the classes currently resolve to *no rule at all*, not a stale
  hex. Practically similar user-facing risk (light mode is the more
  exposed case, as the brief says), just a different mechanism than
  described.

---

## Follow-up: coordinator lifted the `src/index.css` constraint (RESOLVED)

The coordinator reviewed this report and ruled in favor of Recommendation
(1): approved a scope-lifting exception to add a single `@config` at-rule
to `src/index.css`, explicitly limited to that one line — no color values,
no theme-sync mechanism, nothing else in that file changes (Task 6's
already-reviewed work stays untouched). Everything else about the original
brief stands, including the `var(--*)` mapping already committed in
`01919f9`.

### What I added

```css
@import url('https://fonts.googleapis.com/css2?family=Anton&family=Archivo:...');
@config "../tailwind.config.ts";
@tailwind base;
@tailwind components;
@tailwind utilities;
```

One line, placed after the existing Google Fonts `@import` and before the
`@tailwind` directives. Confirmed via `node_modules/tailwindcss/dist/lib.js`
that `@config` (a) must be top-level/non-nested and (b) cannot have a body
— both satisfied here. I found no additional ordering requirement relative
to `@tailwind`/`@import` in the compiled source beyond that, so I placed it
at the conventional position (top of file, before the utilities are
generated) and verified empirically that it takes effect — see below.

### Verification (same method as before: build, then byte/rule diff)

`npm run build`, then a structural rule-set diff between the previous
build (var() mapping committed, `@config` not yet added — saved at
`/tmp/dist-withvar`) and the new build (`/tmp/dist-wired`):

- **0 rules removed**
- **10 rules added**, including every target utility from the brief that
  is actually used in the source tree:
  - `.text-chalk{color:var(--chalk)}`
  - `.bg-panel{background-color:var(--panel)}`
  - `.border-orange{border-color:var(--orange)}`
  - `.text-teamA{color:var(--blue)}` — confirms the teamA→`--blue` rename
    resolves correctly
  - `.bg-warn{background-color:var(--yellow)}` — confirms warn→`--yellow`
  - `.text-dim{color:var(--dim)}`
  - `.bg-hit{background-color:var(--green)}` — confirms hit→`--green`

  This is the exact `.text-chalk{color:var(--chalk)}`-shaped rule the
  task's verification step asked for, now actually present in the build
  output — not a baked-in hex, not a missing rule.

  (`panel-2`, `panel-3`, `faint`, `orange-2`, `teamB` didn't show up as
  separate rules only because no source file currently uses those exact
  utility class names — confirmed by grep. Nothing wrong; they'll generate
  correctly the moment something uses e.g. `bg-panel-2`.)

- Grepped the built CSS for every old hardcoded hex from the original
  stale palette (`#F9FAFB`, `#1F2937`, `#FF5A1F`, etc.) — none present.
  The hex values that do still appear in the file (`#3B82F6`, `#EF4444`,
  `#10B981`, `#F59E0B`) are the `--blue`/`--red`/`--green`/`--yellow`
  **custom property definitions themselves** inside
  `:root[data-theme="light"|"dark"]` in `src/index.css` — i.e., Task 6's
  actual theme values, unrelated to and unchanged by this fix. The
  generated utility rules reference them via `var(--*)`, never a literal.

- **Side effects noticed, checked, and confirmed harmless**: wiring
  `@config` also activates the `fontFamily` and `borderRadius` extensions
  that were already sitting unused in `tailwind.config.ts` (not something
  I added — pre-existing in the file before this task started):
  - `borderRadius.lg/md/sm` (16px/12px/8px): grepped all of `src/**/*.tsx`
    for `rounded-lg`/`rounded-md`/`rounded-sm` — **zero usages** anywhere
    in the codebase (components use arbitrary values like `rounded-[14px]`
    instead), and confirmed no such rule appears in the built CSS before
    or after this change. No visual impact.
  - `fontFamily.display`/`heading`: activates new
    `.font-display{font-family:Anton,sans-serif}` and
    `.font-heading{font-family:Archivo Expanded,Archivo,sans-serif}`
    utility rules — but `src/index.css` already hand-defines
    `.font-display`/`.font-heading` with the same selector plus an
    explicit `font-weight`, later in the same file. Checked the actual
    byte offsets in the built CSS: the hand-written rules land *after* the
    Tailwind-generated ones (10921/10980 vs 5875/5918), so by standard CSS
    cascade (equal specificity, later wins) the hand-written font-weight
    still applies. Confirmed no visual regression — this is now a ~90-byte
    redundant-but-inert duplicate rule pair, not a functional change.
  - The one previously-noted `.flex-shrink{flex-shrink:1}` rule that
    flipped presence between builds in the original report reappeared
    here too, in both the "before" and "after" comparison sets at
    different times across repeated builds — confirmed non-deterministic
    build-to-build noise from Tailwind's content scanner, unrelated to
    colors or this change, and harmless (it's a plain default-value
    utility, not something config-dependent).

### Commands run (this round)

- `npm run build` — clean.
- `npm test` — 65/65 passing (10 files), unchanged.
- `npm run lint` — same 5 pre-existing errors / 1 warning as both prior
  rounds, all in files untouched by this task.

### Files changed (this round)

- `src/index.css` — single line added (`@config "../tailwind.config.ts";`).
  Confirmed via `git diff` this is the *only* line changed in the file.

### Commit

`92dcf06` — `fix: wire tailwind.config.ts into the build via @config`
(separate from `01919f9` and `c9a5e48`, not an amend, per instruction).

### Status: DONE

The task's original acceptance criterion — Tailwind utility classes for
these tokens following the active theme, verified in the actual built CSS
rather than assumed — is now met. Combined with `01919f9`'s correct
`var(--*)` mapping, `text-chalk`/`bg-panel`/`border-orange`/etc. now
resolve to the live theme tokens, in both light and dark mode, system-wide,
via this one file.

### Residual concerns

- The `@config` line is a one-token addition to a file this task was
  originally told not to touch. The change is minimal and additive
  (verified via `git diff` to be the only line changed), and was
  explicitly approved by the coordinator — flagging only so the scope
  exception is visible to anyone reading history later, not as an
  open risk.
- The now-activated (but pre-existing, not added by me) `fontFamily`/
  `borderRadius` extensions in `tailwind.config.ts` are currently inert or
  shadowed, as detailed above, but are worth a mention to whoever next
  edits `src/index.css`'s hand-written `.font-display`/`.font-heading`
  rules or adds a `rounded-lg`/`rounded-md`/`rounded-sm` class somewhere —
  the config's values (16px/12px/8px, and the two font stacks) will now
  actually take effect where they didn't before.
