# 🏀 Talking About Practice (TAP)

**Master Product Specification — Version 5.4**

*A court-ready logging tool for pickup basketball and training sessions.*

---

# 1. Design Philosophy & Scope

## 1.1 Core Principles

These principles govern every design and feature decision in TAP. When in doubt, return to them.

> **P1** — The scribe is always a participant. He is never a neutral observer. He is playing, sweating, competing. The app receives his attention in the breaks — not during play.

> **P2** — Everything is post-fact logging. No live tracking. No real-time tap-by-tap input. TAP is a structured notepad used during natural pauses between games and drills.

> **P3** — Sessions are fluid, not structured. Activities emerge organically from how many people show up and what energy the group has. The app accommodates that fluidity without forcing artificial structure onto it.

> **P4** — Speed over completeness. A slower logging flow that captures every detail is worse than a fast one that captures what matters. Court-ready UI at all times.

> **P5** — Logging fidelity has a ceiling. Approximate data captured without disrupting play is more valuable than precise data that costs attention, rhythm, or flow. The app never asks the scribe to trade a rep for a data point.

## 1.2 Tech Stack & Deployment

TAP is a Progressive Web App (PWA) — installable on iPhone home screen, runs in the browser, feels native. No App Store. No Mac required.

| **Layer** | **Tool & Tier** |
| --- | --- |
| Source control | GitHub — free account. Single repo, master branch linked to Vercel. |
| Hosting | Vercel — Hobby tier (free). Auto-deploys on every push to main. PWA served via Vercel URL. |
| Database | Supabase — free tier. PostgreSQL for all structured data. No local storage. |
| Privacy | Vercel password protection (set in Vercel dashboard, zero dev work). App is unlisted — not indexed, not discoverable. Share URL + password to grant access. |
| Auth | None in codebase. Single user, single scribe. Vercel password is the only gate. |
| Export | Google Sheets via Sheets API. One-tap full export from Settings screen. |

> **NOTE** — Supabase free tier pauses inactive projects after 1 week of inactivity. The developer must implement a lightweight keep-alive ping (scheduled function or cron job) to prevent this.

> **NOTE** — Supabase free tier limits: 500MB database, 50MB file storage. Player photos are removed from v1 scope to stay within storage limits comfortably. Text and numeric data only.

## 1.3 Offline Strategy

TAP is used in gyms where wifi is not guaranteed. The app must function fully offline and sync when connectivity is restored.

- All user interactions write to a local IndexedDB queue first.

- A background sync worker flushes the queue to Supabase when online.

- The UI always reads from local state — never blocks on a network call.

- Conflict resolution: last-write-wins. Single user, no concurrent edits possible.

- A subtle connection indicator (dot in header) shows online/offline/syncing state. Never intrusive.

## 1.4 Light & Dark Mode

TAP ships with full light and dark mode support, respecting the device system setting automatically.

| **Element** | **Light Mode** | **Dark Mode** |
| --- | --- | --- |
| Background | White (#FFFFFF) | Near-black (#0F0F14) |
| Surface / cards | Light grey (#F5F5F5) | Dark charcoal (#1A1A2E) |
| Primary text | Dark navy (#1A1A2E) | White (#FFFFFF) |
| Secondary text | Medium grey (#666666) | Cream (#E8E4D9) |
| Accent / interactive | Orange (#E8500A) | Orange (#E8500A) |
| Progress bars | Orange fill on grey track | Orange fill on dark track |
| Shot chart court | Light hardwood / pale grey surface | Dark grey court surface |
| Shot chart lines | Dark grey, always visible above zone fills | White, always visible above zone fills |
| Zone fills | Semi-transparent (40-60% opacity) Green / Yellow / Red | Same — opacity kept identical, colors slightly more saturated for dark bg |

# 2. Data Hierarchy

TAP organises all data in a four-level hierarchy stored in Supabase:

| **SESSION** | The top-level daily container. Groups all activity at a given location on a given date. Can be Planned (future) or Active (in progress). |
| --- | --- |
| **ACTIVITY** | A discrete, independent event within a session — a Pickup Match, a Competitive Game (Banks, Middies, Next, etc.), or a Drill. Every activity starts fresh. The previous activity's roster is inherited as a default but all parameters are independently configurable. |
| **GAME** | A scored sub-unit within a Pickup Match only. One game to the target score, with its own score and duration. Inside a Match, sub-units are Games — not Rounds. |
| **HEAT** | A set of shots within a Drill — one player's turn. Used as a display concept in recaps. Not a separate data structure — stored as makes/attempts rows tagged to a drill activity. |

# 3. Sessions Module

## 3.1 Two-State Lifecycle

| **State** | **Planned** | **Active** |
| --- | --- | --- |
| Trigger | Created in advance from Calendar view | Opened on the day (from Planned or ad-hoc) |
| Data captured | Date, Location, Expected attendees | Actual attendees, all activities, timestamps |
| Editable? | Yes — roster, location, date | Roster only (arrivals / departures) |
| Ends when | Converted to Active on the day | Scribe taps End Session |

## 3.2 Planned Session — Calendar View

- **Purpose:** Pre-load known sessions before arriving at the gym.

- **Location field:** Text input with history autocomplete — previously used locations surface as tappable suggestions. No typing 'Levallois' every Saturday.

- **Attendees:** Checklist from player database — expected players pre-selected.

- **Recurring sessions:** Optional weekly recurrence flag. Creates future planned entries automatically (e.g. every Thursday, every Saturday morning).

- **Calendar display:** Month view with dots indicating planned sessions. Tap a day to view or create.

## 3.3 Planned to Active Conversion

- On the day of a planned session, tapping it shows an Attendance Confirmation screen.

- Scribe reviews expected attendees — removes no-shows, adds walk-ins.

- Tapping Open Session converts state to Active and starts the session timestamp.

- Ad-hoc sessions (no prior planning) skip straight to the attendance screen.

## 3.4 Attendance & Absence Tracking

Attendance is tracked per session at the player level. Over time this builds a picture of each player's activity pattern.

- Every session logs which players were present.

- Player profile shows: total sessions attended, last session date and location, attendance streak (current consecutive sessions attended).

- Absence is implicit — any session a player is not marked present counts as an absence.

- No notifications, no pressure mechanics. Attendance data is informational only.

## 3.5 Active Session

- Header displays: location name, elapsed session time (informational — not a game clock).

- Action Hub: two large buttons — NEW MATCH and NEW ACTIVITY.

- Activity Feed: scrolling timeline of completed activities (type, outcome, duration).

- Roster chip strip: avatars of active players. Tap to mark departed or add a walk-in mid-session.

- Session Notes: free-text field shown when tapping End Session. Optional, unstructured. No prompts. Captures context the numbers cannot — 'JC was on fire', 'rain cut it short', 'knee felt off'.

- End Session: locks all data, compiles daily metrics, timestamps closure.

## 3.6 Saturday Two-Session Pattern

Morning gym and afternoon gym are logged as two separate sessions on the same calendar date — different locations, potentially overlapping attendees, fully independent data containers. The calendar view naturally supports multiple sessions per day.

# 4. Player Profiles & Progression

## 4.1 Profile Schema

| **Field** | **Details** |
| --- | --- |
| Name | Mandatory |
| Nickname | Mandatory — primary display identifier on court |
| Photo / Thumbnail | Removed from v1 — deferred to v2 to stay within Supabase free storage limits |
| Target FT % | User-set personal goal (e.g. 75%) |
| Target Mid % | User-set personal goal (e.g. 50%) |
| Target 3PT % | User-set personal goal (e.g. 40%) |

## 4.2 Profile Card Layout

The profile card surfaces the metrics players actually care about. Each shooting % bar is tappable — it opens a half-court shot chart overlay.

```
[Initials avatar] Jordan / JC 47W — 23L (67% win rate) Match record  [tap -> breaks down by format: 3v3 / 4v4 / 5v5] FT% ████████░░ 82% -> Goal: 75% ✓ Mid% ██████░░░░ 61% -> Goal: 50% ✓ 3PT% ████░░░░░░ 38% -> Goal: 40% ↑  [tap any bar -> half-court shot chart overlay] Sessions attended: 34 │ Streak: 6 │ Last: Sat 31 May — Levallois
```

## 4.3 Shot Chart Overlay

Tapping any shooting % bar opens a full-screen half-court shot chart. Reference format: NBA.com/Stats shot chart.

### Court Zones — 15 Total

| **Zone Group** | **Zones** |
| --- | --- |
| Paint / Restricted Area (1) | Restricted area — directly under the basket |
| Interior Mid-Range (2) | Left low block / Right low block |
| Mid-Post (2) | Left mid-post / Right mid-post |
| Mid-Range (5) | Left baseline 0° · Left wing 45° · Top of key · Right wing 45° · Right baseline 0° |
| Three-Point (5) | Left corner 0° · Left wing 45° · Top of key · Right wing 45° · Right corner 0° |

### L / R Hand Toggle

A Left / Right toggle sits at the top of the shot chart overlay. This applies universally across all zone types.

- Default (no selection): aggregate view — all logged attempts regardless of hand.

- Tap L: chart recolors using left-hand data only.

- Tap R: chart recolors using right-hand data only.

- Zones with no data for the selected hand show neutral grey — no color hue, no label chip. Court lines remain fully visible.

- The toggle is meaningful primarily in paint zones (where hand matters). For other zones it reflects deliberate hand-specific drill data if it exists — e.g. left-hand mid-range practice sessions.

### Zone Display — Per Zone

- Makes / Attempts (e.g. 24 / 52)

- Shooting % (e.g. 46%)

- Color fill on the zone polygon — Green / Yellow / Red per thresholds below

### Color Coding Thresholds

| **Zone Type** | **Green (good)** | **Yellow (ok)** | **Red (poor)** |
| --- | --- | --- | --- |
| Three-Point zones | >= 30% | 11% - 29% | <= 10% |
| Mid-Range (incl. mid-post) | >= 50% | 26% - 49% | <= 25% |
| Free Throw | >= 75% | 51% - 74% | <= 50% |
| Paint / Interior | >= 80% | 51% - 79% | <= 50% |

> **DESIGN NOTE** — Color is applied to the zone fill (background of the polygon). Text label chip (makes/attempts + %) is centered in each zone in dark text for contrast against all fill colors. This makes the chart scannable at a glance — problem zones are visible before you read a single number.

> **CRITICAL** — Zone fills are always semi-transparent (recommended opacity: 40-60%). Court lines — the three-point arc, the lane, the mid-range boundary, and the restricted area circle — are rendered on a separate layer above the zone fills and are never occluded. The court structure must remain fully readable at all times. The color coding enhances the court — it does not replace it. Without visible court geometry the spatial meaning of the chart collapses entirely.

> **CRITICAL** — The restricted area circle and lane lines are especially critical to preserve. They define the paint zones visually. If those disappear under a solid fill, a player can no longer tell where the interior zone ends and the mid-range begins.

### Chart Context Behaviour

- FT% tap: free throw zone highlighted. All other zones neutral grey.

- Mid% tap: all mid-range zones colored. Three-point zones neutral grey.

- 3PT% tap: all three-point zones colored. Interior and mid-range zones neutral grey.

- Zones with no attempts: neutral grey, no chip.

- Dismiss: tap outside chart or swipe down.

### Win / Loss Drill-Down

- Match W/L (always visible on profile): tap -> breaks down by format (1v1 / 2v2 / 3v3 / 4v4 / 5v5).

- Recreational W/L: secondary section — accessible but never the headline.

# 5. Matches Module

## 5.1 Match Setup

- Scribe selects format: 1v1, 2v2, 3v3, 4v4, 5v5.

- Scribe sets target score (default: 11 for non-5v5, 21 for 5v5 — adjustable per match).

- Scribe sets scoring style: Target Score (pickup mode) or Duration Wave (timed periods).

- Scribe assigns players to Team A / Team B / Sub Queue — via Randomizer or manually.

## 5.2 Team Randomizer

> **v1** — Pure random split — no weighting, no history, no fairness logic. Fast and unbiased.

- Randomize button: splits active session pool randomly into Team A / Team B / Sub Queue per selected format.

- Re-shuffle button: one tap to re-randomize without leaving setup. Available until the first game starts.

- Manual override: after randomizing, scribe can drag any player between teams before confirming.

- **v2 note:** Avoid-repeat-teammates weighting deferred until sufficient session history exists. No skill-ranking in v1.

## 5.3 Scoring Rules

### Target Score Mode

- Non-5v5: paint / mid-range = 1 pt. Behind the arc = 2 pts. Default target: 11.

- 5v5: standard basketball values (2s and 3s). Default target: 21.

- Winners Ball: team that wins a game keeps possession to open the next game.

- Match runs until scribe taps End Match. Team with most game wins takes the match.

- **Tie-breaker:** Smallest aggregate point differential across all games. If still identical: logged as Draw.

### Duration Wave Mode

- Scribe sets a custom countdown timer (e.g. 12 minutes).

- Audio alarm at zero. Scribe logs the wave score, adjusts rosters if needed, resets timer.

## 5.4 Game Logging (Post-Fact)

> **KEY** — The scribe logs game results during the natural break between games — not live. The match screen is a structured notepad, not a scoreboard.

- Per game: Team A score, Team B score, Game duration (tap Start at tip-off, tap End Game when done — duration captured automatically).

- End Game: saves scores, resets to 0-0, increments counter, highlights possession.

- Game duration is a first-class metric — a proxy for intensity, fatigue, and dominance alongside the score.

- Undo Last Entry: available immediately after saving a game entry. Corrects fat-finger miskeys without ending the match.

## 5.5 Roster Flexibility

- Substitutions made before a new game begins via Roster Sheet.

- Win/loss credit assigned at game level to every player on the winning team that game.

- A player who switches teams between games accumulates credits independently per game.

- Players can arrive or depart between activities — session pool is the source of truth.

- Quick Rematch: after logging a completed match, one tap launches a new match with same format and editable starting roster.

## 5.6 Match Activity Recap

Shown when scribe taps End Match. Designed for the break after the last game.

| **Callout** | **Example** |
| --- | --- |
| Dominance | Team A won 4 of 5 games — average margin +6 pts |
| Closest game | Game 3 — decided by 2 points, lasted 18 min |
| Longest game | Game 2 — 23 minutes |
| Best side | Jordan was on the winning side in 4 of 5 games |
| Session total | 6 games played today across 2 matches |

## 5.7 Data Outputs

| **Metric** | **Detail** |
| --- | --- |
| Game W/L per player | Credited per game, aggregated to career record by format |
| Game score | Team A vs Team B per game |
| Game duration | Minutes:seconds per game |
| Match summary | Total games, game wins per team, overall winner |

# 6. Competitive Games Module

Competitive games are player-vs-player recreational activities — independent within a session. Results feed into the Recreational W/L record, not the Match record.

## 6.1 Banks (3PT Elimination Challenge)

### Rules (context only)

- Players start with 10 points. Shared BankPool starts at 0. Players shoot clockwise from a chosen 3PT spot.

- Make: adds 1 to BankPool. Miss: deducts current BankPool from shooter's total, resets pool to 0. Airball: deducts 1 point instantly.

- Eliminated at 0 points. Clockwise order guarantees sequential elimination — simultaneous is impossible.

### Scribe Input (Post-Game)

> **SCRIBE** — No shot-by-shot tracking. After the game: log elimination order and winner's margin only.

- Spot: Left 0° / Left 45° / Center / Right 45° / Right 0°

- Elimination ranking: drag-to-rank (1st eliminated = last place, last standing = winner)

- Winner's final score (optional — for margin)

- **Career data:** Recreational W/L record.

### Banks Recap

| **Callout** | **Example** |
| --- | --- |
| Commanding win | JC won by 7 — largest margin this session |
| Last survivor | Marcus eliminated 2nd — outlasted 3 players |

## 6.2 Middies (Mid-Range Challenge)

### Rules (context only)

- Universal mid-range spot, set shot quota, each player shoots in succession, highest makes wins.

### Scribe Input

- Spot: Left 0° / Left 45° / Center / Right 45° / Right 0°

- Shot quota (default 10, adjustable)

- Post-activity: enter makes per player. Rankings calculated automatically.

- **Career data:** Mid-Range % (per spot).

## 6.3 Next (1v1 Rotation Game)

### Rules (context only)

- 1v1, 3 dribble max. Make: stays on offense. Miss: defender becomes attacker. First to X makes wins.

### Scribe Input

- Target makes (default 10, adjustable)

- Post-game: enter final make count per participant. App ranks results.

- **Career data:** Recreational W/L only.

## 6.4 Generic Competitive Activity

- Scribe names it freely, selects participants, enters final ranking post-game.

- **Career data:** Recreational W/L only.

# 7. Drills Module

Drills are training activities focused on shot volume and technique. Independent activities within a session. Any subset of session players — including the scribe alone.

## 7.1 Universal Drill Engine

> **PRINCIPLE** — Every drill — solo or group — is makes logged against attempts, organised in heats. The heat size is a memory aid (solo) and turn management tool (group). The underlying metric is always: Makes / Attempts = %.

| **Parameter** | **Detail** |
| --- | --- |
| Shot type | Free Throw / Mid-Range / Three-Point / Layup / Floater / Post-Up |
| Hand | Left / Right — mandatory selection on every drill. No 'Both' option. Applied universally; displayed in chart only where meaningful (paint zones). |
| Spot selection | Multi-select from 5 court angles. Deselect any spot to remove it from the queue entirely. |
| Heat size | Shots per turn (default 10, adjustable: 5 / 15 / 20 / etc.) |
| Session target | Optional makes target per spot (e.g. 10 makes). Auto-advances to next spot when reached. |
| Turn rotation | Solo: no rotation. Group: auto-advances to next player after each heat. |
| Input moment | After each heat: scribe enters makes. Never live. |
| Undo | Undo Last Heat available immediately after saving. No data lost to miskeys. |

## 7.2 Spot-Sequential Flow (Three-Point & Mid-Range)

- Setup: select active spots (multi-select toggle), set makes target per spot, confirm heat size.

- Drill flows sequentially through the selected spot queue only — deselected spots are skipped entirely.

- When makes target is reached mid-queue, app auto-advances to the next spot with a brief confirmation flash.

- Each spot logs independently: total makes and total attempts. Career % updates per spot.

- Attempts-to-reach-target is the primary improvement signal over time — richer than raw percentage alone.

## 7.3 Solo vs Group

| **Dimension** | **Solo (1 player)** | **Group (2+ players)** |
| --- | --- | --- |
| Heat purpose | Memory aid — keeps count accurate | Turn management — defines rotation |
| Session target | Make-target per spot (e.g. 10 makes from each) | Fixed attempt quota only — make-targets create unacceptable wait times |
| Input | Scribe enters his own makes after each heat | Scribe enters each player's makes after their turn |

> **NOTE** — Group drills use fixed attempt quotas because reaching a make-target (e.g. 40+ attempts for 10 threes) makes wait times unacceptable. Solo drills can use make-targets freely.

## 7.4 Shot Type to Career Stat Mapping

| **Shot Type** | **Career Stat Updated** |
| --- | --- |
| Free Throws (15ft line) | Free Throw % — per hand |
| Mid-Range (by spot) | Mid-Range % — per spot, per hand |
| Three-Pointers (by spot) | Three-Point % — per spot, per hand |
| Layups | Mid-Range % — Interior sub-category, per hand |
| Floaters | Mid-Range % — Interior sub-category, per hand |
| Post-Up | Mid-Range % — Interior sub-category, per hand |

Interior shot sub-parameters (approach, finish, footwork) are excluded from v1 to prioritise logging speed. Optional tags in v2.

## 7.5 Drill Activity Recap

| **Callout** | **Example** |
| --- | --- |
| Session total | 100 free throws: 82 makes (82%) — right hand |
| Spot best | Best spot: Right 0° corner — 47% (above 40% goal) |
| Spot to work | Left 0° — 28%, 12 pts below goal |
| Efficiency | Top key: 10 makes in 24 attempts |
| Heat trend | FT heats today: 7, 8, 9, 8 — strong finish |

# 8. UI Architecture

All screens optimised for one-handed mobile use. Buttons large enough for sweaty thumbs. Every screen respects P1 — the scribe needs to be in and out in under 30 seconds.

## Screen 1 — Dashboard

### State A: No Active Session

- Large centered button: + START NEW SESSION

- Calendar icon (top right): planned sessions calendar view.

- Players icon (top left): player database.

### State B: Active Session

- Header card: location name + elapsed session time + subtle online/offline indicator.

- Action Hub: NEW MATCH and NEW ACTIVITY — large, blocky, thumb-friendly.

- Activity Feed: scrolling timeline of completed activities (type + outcome + duration).

- Roster chip strip: player avatars. Tap to mark departed / add walk-in.

- Footer: low-profile End Session button.

## Screen 2 — Match Logging

- Setup: format, target score, Randomize button + Re-shuffle, team drag-assignment.

- Active game view: Team A (blue) / Team B (red). Game timer. Post-game score entry. End Game button.

- Game history strip: compact completed game summaries (score + duration).

- Floating bar: Roster Sheet (subs) + End Match.

- Match Recap + Quick Rematch button on End Match.

## Screen 3 — Competitive Activity Logging

- Setup: activity type, spot / quota, player selection.

- Banks: drag-to-rank elimination order post-game.

- Middies / Next / Generic: post-game score grid (one row per player).

- Activity Recap on save.

## Screen 4 — Drill Logging

- Setup wizard: shot type -> hand (L/R) -> spot multi-select -> heat size -> players -> optional makes target.

- Active drill: current spot highlighted in queue. Current player highlighted. Makes counter. Heat history strip.

- Save Heat & Rotate: commits makes, advances to next player (group) or stays on current player (solo).

- Spot auto-advance: when makes target reached, brief flash confirmation, moves to next spot.

- Undo Last Heat: always visible during active drill.

- End Drill: commits to career stats. Drill Recap shown before returning to session feed.

## Screen 5 — Session Recap

Shown when scribe taps End Session — after the optional Session Notes field is submitted.

| **Callout** | **Example** |
| --- | --- |
| Duration | 2h 15min at Levallois Gym |
| Activities | 5 pickup games · 1 Banks · 100 free throws |
| Your day | Winning side in 4 of 5 games · FT 82% (above goal) |
| Highlight | Closest game: 11-10, lasted 19 min |
| To work on | Left 0° three-pointer: 28% — 12 pts below goal |

# 9. Google Sheets Export

A one-tap full data export from Supabase to a linked Google Sheet. Available from the Settings screen. Serves as both backup and deeper analysis layer.

## 9.1 Setup (One-Time)

- Scribe links a Google account via OAuth in Settings.

- Scribe selects or creates a destination Google Sheet in their Drive.

- Link is persisted — future exports go to the same Sheet automatically.

## 9.2 Export Structure

| **Sheet Tab** | **Contents** |
| --- | --- |
| Sessions | All sessions: date, location, duration, notes, player attendance |
| Matches | All match activities: format, game-by-game scores, durations, team assignments, winners |
| Competitive Games | Banks / Middies / Next / Generic results: players, rankings, scores |
| Drills | All drill heats: player, shot type, hand, spot, makes, attempts, date, session |
| Players | Player roster: name, nickname, goals, career aggregates |
| Career Stats | Per-player shooting % by spot and hand — the full stat cube |

## 9.3 Export Behaviour

- Triggered manually from Settings — never automatic.

- Overwrites the destination Sheet entirely on each export (clean slate, no duplicates).

- Export runs as a background job — UI remains usable. A toast notification confirms completion.

- If offline, export is queued and fires automatically when connectivity is restored.

# 10. Deferred to v2

| **Feature** | **Rationale** |
| --- | --- |
| Player photos | Removed from v1 — Supabase 50MB storage limit. Initials avatar used instead. |
| Fairness-weighted randomizer | Needs sufficient session history first. Candidate: avoid-repeat-teammates weighting. |
| Session goals / intentions | Planning layer hard to action mid-game. Better as v2 Session Intentions. |
| Interior shot sub-parameters | All map to same Mid% stat. Logging friction with no v1 payoff. |
| Date-range stat filters | Career totals sufficient for v1. Filters add UI complexity. |
| Charts and trend visualisation | Numbers + progress bars enough for v1. Charts are a v2 reward. |
| Catch-and-shoot vs off-dribble tagging | All v1 shots assumed catch-and-shoot. Tag in v2 for richer 3PT splits. |
| Apple Watch companion | Violates P5 — trades reps for data points. |
| Friends / slave app data ingestion | Trust and data integrity problem. Gate via scribe approval in v2 if revisited. |

# 11. Open Questions

- Planned session recurrence: weekly confirmed — bi-weekly or monthly needed?

- Activity Feed detail level: activity type + outcome only, or include game-by-game breakdown inline?

- Drill spot completion: when makes target reached mid-heat, complete the heat first or advance immediately?

- Session Recap: shown automatically on End Session, or opt-in?

- Google Sheets export: overwrite (clean) vs append (cumulative)? Overwrite is simpler; append risks duplicates.

TAP — Talking About Practice | v5.4 | Confidential
