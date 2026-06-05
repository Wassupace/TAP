# 🏀 Talking About Practice (TAP)

**Master Product Specification — Version 5.3**

*A court-ready logging tool for pickup basketball and training sessions.*

---

# 1. Design Philosophy & Scope

## 1.1 Core Principles

These principles govern every design and feature decision in TAP. When in doubt, return to them.

> **P1:** The scribe is always a participant. He is never a neutral observer. He is playing, sweating, competing. The app receives his attention in the breaks — not during play.

> **P2:** Everything is post-fact logging. No live tracking. No real-time tap-by-tap input. TAP is a structured notepad used during natural pauses between rounds, games, and drills.

> **P3:** Sessions are fluid, not structured. Events emerge organically from how many people show up and what energy the group has. The app accommodates that fluidity without forcing artificial structure onto it.

> **P4:** Speed over completeness. A slower logging flow that captures every detail is worse than a fast one that captures what matters. Court-ready UI at all times.

## 1.2 Deployment & Cost

- **Platform:** Native iOS (SwiftUI + SwiftData). iPhone Pro Max screen real estate as primary target.

- **Cost:** $0. Fully offline. All data stored locally on-device. No subscriptions, no row caps, no cloud dependency.

- **User:** Single scribe, single device. No multi-user or sharing features in v1.

# 2. Data Hierarchy

TAP organises all data in a strict four-level hierarchy:

| **SESSION** | The top-level daily container. Groups all activity at a given location on a given date. Can be Planned (future) or Active (in progress). |
| --- | --- |
| **ACTIVITY** | A discrete, independent event within a session — a Pickup Match, a Competitive Game (Banks, Middies, Next, etc.), or a Drill. Every activity starts fresh. The previous activity's roster is inherited as a default but all parameters are independently configurable. |
| **GAME** | A scored sub-unit within a Pickup Match only. One game to the target score, with its own score and duration. The word 'Round' is retired — inside a Match, the sub-units are Games. |
| **HEAT** | A set of shots within a Drill — one player's turn at the line or arc. Used as a display concept in recaps (e.g. 'Heat 3: 8/10'). Not a separate data structure. |
| **ENTRY** | The atomic data point. A game score + duration, a makes/attempts count, or an elimination rank. |

# 3. Sessions Module

## 3.1 Two-State Lifecycle

Every session exists in one of two states:

| **State** | **Planned** | **Active** |
| --- | --- | --- |
| Trigger | Created in advance from Calendar view | Opened on the day (from Planned or ad-hoc) |
| Data captured | Date, Location, Expected attendees | Actual attendees, all events, timestamps |
| Editable? | Yes — roster, location, date | Roster only (arrivals/departures) |
| Ends when | Converted to Active on the day | Scribe taps End Session |

## 3.2 Planned Session — Calendar View

- **Purpose:** Pre-load known sessions (e.g. every Thursday night, every Saturday morning) before arriving at the gym.

- **Fields:** Date, Location (text field with history autocomplete), Expected Players (checklist from player database).

- **Recurring sessions:** Optional flag to mark a session as weekly recurring on a given day. Creates future planned entries automatically.

- **Calendar display:** Month view with dots indicating planned sessions. Tap a day to view or create.

## 3.3 Planned → Active Conversion

- On the day of a planned session, tapping it shows an Attendance Confirmation screen.

- Scribe reviews expected attendees and adjusts: remove no-shows, add walk-ins.

- Tapping Open Session converts state to Active and starts the session timestamp.

- Ad-hoc sessions (no prior planning) skip straight to the attendance screen.

## 3.4 Active Session

- Header displays: location name, elapsed session time (informational only, not a game clock).

- Action Hub: two large buttons — NEW MATCH and NEW EVENT.

- Activity Feed: scrolling timeline of completed events (match results, drill summaries).

- Roster is fluid: players can be marked as departed or arrived at any point during the session.

- End Session: locks all data, compiles daily metrics, timestamps closure.

## 3.5 Saturday Two-Session Pattern

Morning (gym A) and Afternoon (gym B) are logged as two separate sessions on the same calendar date. They may share players but are independent data containers. No special logic required — the calendar view naturally supports multiple sessions per day.

# 4. Player Profiles & Progression

## 4.1 Profile Schema

| **Field** | **Details** |
| --- | --- |
| Name | Mandatory |
| Nickname | Mandatory — used as primary display identifier on court |
| Photo / Thumbnail | Optional — pulled from local camera or gallery |
| Target FT % | User-set personal goal (e.g. 75%). Used for progress bar. |
| Target Mid % | User-set personal goal (e.g. 50%). Used for progress bar. |
| Target 3PT % | User-set personal goal (e.g. 40%). Used for progress bar. |

## 4.2 Profile Card Layout

The profile card surfaces the metrics players actually care about, in the order they care about them. Each shooting % bar is tappable — it opens a half-court shot chart overlay, not a list.

```
[Photo]  Jordan / JC      47W — 23L  (67% win rate)   ← Match record, always visible
                                                         [tap → breaks down by format: 3v3 / 4v4 / 5v5]

FT%   ████████░░  82%  →  Goal: 75% ✓
Mid%  ██████░░░░  61%  →  Goal: 50% ✓
3PT%  ████░░░░░░  38%  →  Goal: 40% ↑
                          [tap any bar → half-court shot chart overlay]

Last seen: Sat 31 May — Levallois Gym
```

## 4.3 Shot Chart Overlay

Tapping any shooting % bar on the profile card opens a full-screen half-court shot chart. This replaces the previous list-based spot breakdown. Reference format: NBA.com/Stats shot chart.

### Court Zones — 15 Total

The court is divided into 15 zones matching standard basketball shot zones:

| **Zone Group** | **Zones** |
| --- | --- |
| Paint / Restricted Area (1) | Restricted area — directly under the basket |
| Interior Mid-Range (2) | Left low block / Right low block |
| Mid-Post (2) | Left mid-post / Right mid-post |
| Mid-Range (5) | Left baseline 0° · Left wing 45° · Top of key (center) · Right wing 45° · Right baseline 0° |
| Three-Point (5) | Left corner 0° · Left wing 45° · Top of key (center) · Right wing 45° · Right corner 0° |

### Zone Display — Per Zone

- Makes / Attempts (e.g. 24 / 52)

- Shooting % (e.g. 46%)

- Color fill on the zone polygon — Green / Yellow / Red based on thresholds below

### Color Coding Thresholds

| **Zone Type** | **Green ✓** | **Yellow ~** | **Red ✗** |
| --- | --- | --- | --- |
| Three-Point zones | >= 30% | 11% - 29% | <= 10% |
| Mid-Range (incl. mid-post) | >= 50% | 26% - 49% | <= 25% |
| Free Throw | >= 75% | 51% - 74% | <= 50% |
| Paint / Interior (layups) | >= 80% | 51% - 79% | <= 50% |

> **DESIGN NOTE:** Color is applied to the zone fill (background of the polygon), not just the text label. This makes the chart scannable at a glance — you see the red zones immediately without reading numbers. Text (makes/attempts + %) is displayed in a small label chip centered in each zone, in dark text for contrast against all fill colors.

> **CRITICAL:** Zone fills are always semi-transparent (recommended opacity: 40–60%). Court lines — the three-point arc, the lane, the mid-range boundary, and the restricted area circle — are rendered on a separate layer above the zone fills and are never occluded. The court structure must remain fully readable at all times. The color coding enhances the court; it does not replace it. A developer must not interpret zone fills as opaque blocks. Without visible court geometry, the spatial meaning of the chart collapses entirely — zones are only legible because the court lines define their boundaries.

> **NOTE:** The restricted area circle and lane lines are especially critical to preserve. They define the paint zones visually. If those lines disappear under a red fill, a player can no longer tell where the interior zone ends and the mid-range begins.

### Chart Behaviour

- FT% bar tap: chart highlights only the free throw zone (single zone, full screen for readability).

- Mid% bar tap: chart highlights all mid-range zones — interior, mid-post, and mid-range arcs. Three-point zones shown in neutral grey.

- 3PT% bar tap: chart highlights all three-point zones. Interior and mid-range zones shown in neutral grey.

- Zones with no attempts logged are shown in neutral grey with a dash label (—/— · —%).

- Dismiss: tap anywhere outside the chart or swipe down.

### Win / Loss Drill-Down (unchanged)

- Match W/L record (always visible on profile): tap → breaks down by format (1v1, 2v2, 3v3, 4v4, 5v5).

- Recreational W/L: secondary section, accessible but not the headline.

*No third level. No date range filters. No charts beyond the shot chart in v1. The chart exists to answer one question: where am I leaking?*

# 5. Matches Module

## 5.1 Match Setup

- Scribe selects format: 1v1, 2v2, 3v3, 4v4, 5v5.

- Scribe assigns players from the session pool to Team A and Team B. Remaining session players are in a sub queue.

- Scribe sets target score (default: 11 for non-5v5, 21 for 5v5 — fully adjustable per match).

- Scribe sets scoring style: Target Score (pickup mode) or Duration Wave (timed periods).

## 5.2 Team Randomizer

> **v1:** Pure random split — no weighting, no history, no fairness logic. Fast and unbiased.

- Scribe taps Randomize: app splits the active session pool randomly into Team A / Team B / Sub Queue based on selected format.

- Re-shuffle button: one tap to re-randomize without leaving the setup screen. Available until the first game starts.

- Manual override: after randomizing, scribe can still drag any player between teams before confirming.

- **v2 note:** A fairness-weighted randomizer (e.g. avoid-repeat-teammates) is deferred until sufficient session history exists to make meaningful suggestions. No skill-ranking logic in v1.

## 5.3 Scoring Rules

### Target Score Mode

- Non-5v5: Mid-range / paint = 1 pt. Behind the arc = 2 pts. Default target: 11.

- 5v5: Standard basketball values (2s and 3s). Default target: 21.

- Winners Ball: team that wins a game keeps possession to open the next game.

- Match runs until scribe taps End Match. Team with most game wins takes the match.

- **Tie-breaker:** Smallest aggregate point differential (points scored minus points conceded across all games). If still identical: logged as Draw.

### Duration Wave Mode

- Scribe sets a custom countdown timer (e.g. 12 minutes).

- Audio alarm sounds at zero. Scribe logs the score of that wave, adjusts rosters if needed, resets timer for the next wave.

## 5.4 Game Logging (Post-Fact)

> **KEY:** The scribe logs game results during the natural break between games — not live during play. The match screen is a structured notepad, not a scoreboard.

- Per game, scribe enters: Team A score, Team B score, Game duration (tap Start at tip-off, tap End Game when it concludes — duration captured automatically).

- End Game button: saves scores, resets to 0-0, increments game counter, highlights which team holds possession.

- Game duration is a first-class metric — a proxy for intensity, fatigue, and dominance when read alongside the score.

## 5.5 Roster Flexibility

- Substitutions are made before a new game begins via a Roster Sheet.

- Win/loss credit is assigned at the game level to every player on the winning team that game.

- A player who switches teams between games accumulates credits independently — their record reflects which side they were on for each individual game.

- Players can arrive or depart between activities. The session pool is the source of truth.

- Quick Rematch: after logging a completed match, one tap launches a new match with the same format and an editable starting roster.

## 5.6 Match Activity Recap

Shown immediately when the scribe taps End Match. Designed for the break after the last game.

| **Callout** | **Example** |
| --- | --- |
| Dominance | Team A won 4 of 5 games — average margin +6 pts |
| Closest game | Game 3 — decided by 2 points, lasted 18 min |
| Longest game | Game 2 — 23 minutes (competitive one) |
| Best side | Jordan was on the winning side in 4 of 5 games |
| Session total | 6 games played today across 2 matches |

## 5.7 Data Outputs from Matches

| **Metric** | **Detail** |
| --- | --- |
| Game W/L per player | Credited per game, aggregated to career record by format |
| Game score | Team A vs Team B, stored per game |
| Game duration | In minutes:seconds, stored per game |
| Match summary | Total games played, game wins per team, overall match winner |

# 6. Competitive Games Module

Competitive games are player-vs-player recreational activities. They are independent activities within a session — each starts fresh with its own player selection. Results feed into the Recreational W/L record, not the Match record.

## 6.1 Banks (3PT Elimination Challenge)

### Rules (for context)

- Players start with 10 points each. A shared BankPool starts at 0.

- Players shoot clockwise from a chosen 3PT spot. A make adds 1 to BankPool. A miss deducts the current BankPool from that player's total and resets the pool to 0. An airball deducts 1 point instantly regardless of the pool.

- Players are eliminated at 0 points. Clockwise turn order guarantees eliminations are always sequential — simultaneous elimination is impossible.

### Scribe Input (Post-Game)

> **SCRIBE:** The scribe does not track shot-by-shot. After the game concludes, he logs the elimination order and the winner's final margin.

- Spot selection: Left 0° · Left 45° · Center · Right 45° · Right 0°.

- Elimination ranking: drag-to-rank UI or sequential input (1st eliminated → last standing).

- Winner's final score (optional — for margin tracking).

- **Career data:** All Banks participation maps to Recreational W/L record.

### Banks Activity Recap

| **Callout** | **Example** |
| --- | --- |
| Commanding win | JC won by 7 points — largest margin this session |
| Longest survivor | Marcus — eliminated 2nd, outlasted 3 players |
| Quick collapse | 3 players eliminated in the first rotation |

## 6.2 Middies (Mid-Range Challenge)

### Rules (for context)

- Scribe picks a universal mid-range spot. Every player shoots the set quota in succession. Scribe inputs total makes. Highest score wins.

### Scribe Input (Post-Activity)

- Spot selection: Left 0° · Left 45° · Center · Right 45° · Right 0°.

- Shot quota (default 10, adjustable).

- Post-activity: enter makes per player. App calculates rankings automatically.

- Recap: highest score = winner, highest single-heat % = Sharpest, lowest total makes = last.

- **Career data:** All shots map to Mid-Range % (per spot).

## 6.3 Next (1v1 Rotation Game)

### Rules (for context)

- 1v1 format, 3 dribble maximum. A make: shooter stays on offense. A miss: defender becomes the new attacker. First player to reach the target make count wins.

### Scribe Input (Post-Game)

- Target makes (default 10, adjustable).

- Post-game: enter final make count per participant. App ranks results.

- **Career data:** Maps to Recreational W/L record only.

## 6.4 Generic Competitive Activity

For any game not listed above — house rules, invented variants, one-off formats:

- Scribe names the activity freely.

- Selects participants from the session pool.

- Post-game: enters final ranking or scores for each participant.

- **Career data:** Maps to Recreational W/L record only.

# 7. Drills Module

Drills are training activities focused on shot volume and technique. They are independent activities within a session and can involve any subset of session players, including the scribe alone.

## 7.1 Universal Drill Engine

> **PRINCIPLE:** Every drill — solo or group — is makes logged against attempts, organised in heats. The heat size is both a memory aid (solo) and a turn management tool (group). The underlying metric is always the same: Makes / Attempts = %.

| **Parameter** | **Detail** |
| --- | --- |
| Shot type | Free Throw · Mid-Range · Three-Point · Layup · Floater · Post-Up |
| Spot selection | Choose active spots from: Left 0° · Left 45° · Center · Right 45° · Right 0° (multi-select for three-point drills) |
| Players | Select any subset of session attendees (min 1) |
| Heat size | How many shots per turn (default 10, adjustable to 5 / 15 / 20 / etc.) |
| Session target | Optional: total makes target per spot (e.g. reach 10 makes). App flags when reached and auto-advances to next spot. |
| Turn rotation | Solo: no rotation. Group: auto-advances to next player after each heat. |
| Input moment | After each heat: scribe enters makes for that player. Not live. |

## 7.2 Spot-Sequential Drill Setup (Three-Point & Mid-Range)

Before launching a three-point or mid-range drill, the scribe configures the spot queue:

- Step 1 — Select active spots: tap to toggle any combination of the 5 court angles. Deselecting a spot removes it from the queue entirely (useful when tired or short on time).

- Step 2 — Set makes target per spot (default 10, adjustable). Applied uniformly across all selected spots.

- Step 3 — Confirm heat size (default 10 attempts per heat).

The drill then flows sequentially through the selected spot queue:

| **Active spot** | **Drill flow** |
| --- | --- |
| Left 0° (active) | Shoot heats until 10 makes reached → auto-advance |
| Left 45° (skipped) | Not selected — removed from queue |
| Center (active) | Shoot heats until 10 makes reached → auto-advance |
| Right 45° (active) | Shoot heats until 10 makes reached → done |

Each spot logs independently: total makes and total attempts. Career stat updates per-spot shooting %. The attempts-to-reach-target metric (how many shots it took to make 10) is the primary signal of improvement over time — more informative than raw percentage alone.

## 7.3 Solo vs Group Behaviour

| **Dimension** | **Solo (1 player)** | **Group (2+ players)** |
| --- | --- | --- |
| Heat size purpose | Memory aid — keeps running count accurate | Turn management — defines when to rotate |
| Session target | Can use make-target per spot (e.g. 10 makes from each selected spot) | Fixed attempt quota only — make-targets unsuitable for group pacing |
| Input style | Scribe enters his own makes after each self-directed heat | Scribe enters each player's makes after their turn |
| Career data | Same as group — makes / attempts per shot type and spot | Same as solo |

> **NOTE:** Group drills use fixed attempt quotas because reaching a make-target in a group context (e.g. 40+ attempts to make 10 threes) makes wait times unacceptable. Solo drills can use make-targets freely.

## 7.4 Supported Shot Types & Spot Mapping

| **Shot Type** | **Career Stat Updated** |
| --- | --- |
| Free Throws (15ft line) | Free Throw % |
| Mid-Range (by spot) | Mid-Range % (per spot) |
| Three-Pointers (by spot) | Three-Point % (per spot) |
| Layups (interior) | Mid-Range % — Interior sub-category |
| Floaters (interior) | Mid-Range % — Interior sub-category |
| Post-Up shots (interior) | Mid-Range % — Interior sub-category |

Interior shots are logged by shot type only in v1. Sub-parameters (approach, finish, footwork) are removed to prioritise logging speed. They can be added as optional tags in v2.

## 7.5 Drill Activity Recap

Shown when the scribe taps End Drill. Surfaces the session story per shot type and spot.

| **Callout** | **Example** |
| --- | --- |
| Session total | 100 free throws today: 82 makes (82%) |
| Spot best | Best spot: Right 0° — 47% (above your 40% goal) |
| Spot to watch | Left 0° — 28%, 12 points below your goal |
| Efficiency | Top key: 10 makes in 24 attempts — personal best this month |
| Heat trend | FT heats today: 7, 8, 9, 8 — strong finish |

# 8. UI Architecture

All screens are optimised for one-handed use on iPhone Pro Max. Buttons are large enough for sweaty thumbs. Input fields are minimal. Every screen respects Principle P1 — the scribe needs to be in and out in under 30 seconds.

## Screen 1 — Dashboard

### State A: No Active Session

- Large centered button: + START NEW SESSION

- Calendar icon (top right): opens planned sessions calendar view.

- Player roster icon (top left): opens player database.

### State B: Active Session

- Header card: location name + elapsed session time.

- Action Hub: two large blocky buttons — NEW MATCH and NEW ACTIVITY.

- Activity Feed: scrolling timeline of completed activities today (type + outcome + duration).

- Roster chip strip: avatars of active players, tap to mark as departed / add walk-in.

- Footer: low-profile End Session button.

## Screen 2 — Match Logging

- Setup sheet: format selector, target score, Randomize button, team assignment (drag players into Team A / Team B / Sub Queue), Re-shuffle button.

- Active game view: Team A (blue) and Team B (red) sections. Game timer (tap to start / stop). Post-game: enter final scores, tap End Game.

- Game history strip: compact summary of completed games (score + duration).

- Floating bar: Roster Sheet (substitutions) · End Match.

- Match Recap screen: shown on End Match. Callouts + Quick Rematch button.

## Screen 3 — Competitive Activity Logging

- Setup: activity type selector, spot / quota parameters, player selection.

- Banks: post-game elimination ranking input (drag-to-rank).

- Middies / Next / Generic: post-game score entry grid (one row per player).

- Activity Recap screen: shown on save. Contextual callouts per activity type.

## Screen 4 — Drill Logging

- Setup: shot type, spot queue (multi-select with toggle), heat size, players, optional makes target per spot.

- Active drill view: current spot highlighted in queue. Current player highlighted. Makes counter for current heat. Heat history strip.

- Save Heat & Rotate: commits makes, advances to next player (group) or stays on current player (solo).

- Spot completion: when makes target reached, auto-advances to next spot in queue with a brief confirmation flash.

- End Drill: commits all data to career stats. Drill Recap screen shown before returning to session feed.

## Screen 5 — Session Recap

Shown when the scribe taps End Session. The daily story in numbers.

| **Callout** | **Example** |
| --- | --- |
| Session duration | 2h 15min at Levallois Gym |
| Activities | 5 pickup games · 1 Banks · 100 free throws |
| Your day | On winning side in 4 of 5 games · FT 82% (above goal) |
| Highlight | Closest game: 11-10 in game 3, lasted 19 min |
| To work on | Left 0° three-pointer: 28% — 12 pts below goal |

# 9. Deferred to v2

The following features have been deliberately excluded from v1 to keep the first build fast, focused, and court-ready. They are documented here for future reference.

| **Feature** | **Rationale for Deferral** |
| --- | --- |
| Session goals / intentions | Adds a planning layer that is hard to action mid-game. Better framed as Session Intentions in v2. |
| Fairness-weighted team randomizer | Requires sufficient session history before suggestions are meaningful. First candidate: avoid-repeat-teammates weighting, no skill ranking needed. |
| Interior shot sub-parameters (layup finish, floater style, post footwork) | All map to the same Mid% stat. Granularity adds logging friction with no v1 payoff. |
| Date-range filters on stats | Adds UI complexity. Career totals are sufficient for v1 progression. |
| Charts and trend visualisation | Numbers and progress bars are enough for v1. Charts are a v2 reward. |
| Export (CSV / screenshot summary) | Useful but not urgent. Can be added without architectural changes. |
| Session rotation fairness tracker (who sits out) | Organic social decision — app should not enforce it. |
| Third stat drill-down level | Two levels (headline + spot) are sufficient. A third level is noise. |

# 10. Open Questions for Next Iteration

- Planned session recurrence: weekly is the obvious pattern — are there other recurrence patterns needed (bi-weekly, monthly)?

- Activity Feed format: what level of detail should appear in the session timeline — just activity type + outcome, or include game-level breakdown?

- Drill spot completion behaviour: when a makes target is reached mid-heat, does the drill advance to the next spot immediately or complete the current heat first?

- Session Recap delivery: shown automatically on End Session, or opt-in?

TAP — Talking About Practice  |  v5.3  |  Confidential