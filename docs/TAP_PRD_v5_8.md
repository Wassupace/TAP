# 🏀 TALKING ABOUT PRACTICE (TAP)

**Master Product Specification | Version 5.8**

*A court-ready logging tool for pickup basketball and training sessions.*

# 1. Design Philosophy & Scope

## 1.1 Core Principles
These principles govern every design and feature decision in TAP. When in doubt, return to them.

| **P1** | The scribe is always a participant. He is never a neutral observer. He is playing, sweating, competing. The app receives his attention in the breaks — not during play. |
| --- | --- |

| **P2** | Everything is post-fact logging. No live tracking. No real-time tap-by-tap input. TAP is a structured notepad used during natural pauses between games and drills. |
| --- | --- |

| **P3** | Sessions are fluid, not structured. Activities emerge organically from how many people show up and what energy the group has. The app accommodates that fluidity without forcing artificial structure onto it. |
| --- | --- |

| **P4** | Speed over completeness. A slower logging flow that captures every detail is worse than a fast one that captures what matters. Court-ready UI at all times. |
| --- | --- |

| **P5** | Logging fidelity has a ceiling. Approximate data captured without disrupting play is more valuable than precise data that costs attention, rhythm, or flow. The app never asks the scribe to trade a rep for a data point. |
| --- | --- |

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

| **NOTE** | Supabase free tier pauses inactive projects after 1 week of inactivity. The developer must implement a lightweight keep-alive ping (scheduled function or cron job) to prevent this. |
| --- | --- |

| **NOTE** | Supabase free tier limits: 500MB database, 50MB file storage. Player photos are removed from v1 scope to stay within storage limits comfortably. Text and numeric data only. |
| --- | --- |

## 1.3 Offline Strategy
TAP is used in gyms where wifi is not guaranteed. The app must function fully offline and sync when connectivity is restored.

- All user interactions write to a local IndexedDB queue first.
- A background sync worker flushes the queue to Supabase when online.
- The UI always reads from local state — never blocks on a network call.
- Conflict resolution: last-write-wins. Single user, no concurrent edits possible.
- A subtle connection indicator (dot in header) shows online/offline/syncing state. Never intrusive.

## 1.4 Light & Dark Mode
| **GLOBAL RULE** | All buttons in dark mode use white text — no exceptions. Blue text on any button in dark mode is a bug and must be fixed globally, not screen by screen. |
| --- | --- |

| **GLOBAL RULE** | Padding between text and the border of any visual element (card, pill, button, container) is mandatory. No text should ever touch its enclosing border. Apply consistently across all screens. |
| --- | --- |

| **GLOBAL RULE** | Padding between any two adjacent blocks, cards, or sections is mandatory. Two elements should never visually stack directly on top of each other with no gap. Consistent gutters throughout all screens. |
| --- | --- |

| **GLOBAL RULE** | Tapping any score, makes count, or numeric value anywhere in the app opens a numpad for direct entry. This applies universally — match scores, makes counters, targets, heat results. No exceptions. |
| --- | --- |

TAP ships with full light and dark mode support. The app respects the device system setting automatically AND exposes a manual toggle in the Settings screen so the scribe can override the system preference at any time.

| **BUG v5.5** | Current build: no toggle exposed in Settings. Light mode rendering unverified — only dark mode confirmed visible. Both issues require a fix in v5.5. |
| --- | --- |

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
- **Purpose: **Pre-load known sessions before arriving at the gym.
- **Location field: **Text input with history autocomplete — previously used locations surface as tappable suggestions. No typing the same gym name every week.
- **Attendees: **Checklist from player database — expected players pre-selected.
- **Recurring sessions: **Optional weekly recurrence flag. Creates future planned entries automatically (e.g. every Thursday night, every Saturday morning). Weekly recurrence confirmed for v1.
- **Calendar display: **Month view. Each day with a session shows a pill (not just a dot) displaying gym name + duration for past sessions, or gym name + 'Planned' label for future sessions. Multiple sessions on the same day each show their own pill.
- **Tapping a future date: **Shows a + indicator on that date. Opens the plan session form to create a new planned session.
- **Missed sessions: **A planned session whose date passed without activation stays on the calendar marked as Missed in neutral grey. Never auto-deleted.

## 3.3 Planned to Active Conversion
The homepage (Dashboard) surfaces the next upcoming planned session as a prominent card above the Start New Session button. This is the primary entry point on session days.

- Tapping the planned session card triggers a two-option modal:
  - Start Now — skips the setup wizard entirely. Opens the live session screen directly, pre-populated with the saved location and attendee list. Scribe can still add or remove players on the live session screen.
  - Review Details — shows the saved session info (date, location, expected players) in a fully editable form before activating.
- Tapping Start Now converts state to Active and timestamps the session open.
- Ad-hoc sessions (no prior planning) tap Start New Session on the dashboard, which goes directly to the setup wizard (location + player selection).
- If the scribe starts an ad-hoc session on a day that has a planned session, the app asks: 'You have a planned session at [location] today — is this it?' Yes converts the planned session. No creates a separate independent session.

## 3.4 Attendance & Absence Tracking
Attendance is tracked per session at the player level. Over time this builds a picture of each player's activity pattern.

- Every session logs which players were present.
- Player profile shows: total sessions attended, last session date and location, attendance streak (current consecutive sessions attended).
- Absence is implicit — any session a player is not marked present counts as an absence.
- No notifications, no pressure mechanics. Attendance data is informational only.

## 3.5 Player Picker Modal
Used in both Session Start wizard and Live Session screen for adding players. Consistent behaviour across both entry points.

- A persistent modal — stays open until explicitly dismissed. Does not close after each player selection.
- Displays the full player database as a scrollable list. Each player shown as a name pill.
- Already-selected players are highlighted (distinct color) but remain visible in the list — not hidden or greyed out.
- A floating Add New Player button sits at the bottom of the list. Tapping it opens an inline player creation form (Name + Nickname, mandatory). On save, the new player is added to the database immediately and automatically selected for the current session.
- Tapping Confirm closes the modal and applies the selection.

## 3.6 Active Session
- Header displays: location name, elapsed session time (informational — not a game clock).
- Action Hub: two large buttons — NEW MATCH and NEW ACTIVITY.
- Activity Feed: scrolling timeline of completed activities (type, outcome, duration).
- Roster chip strip: avatars of active players. Tap to add a walk-in at any point during the session.
- Session Notes: free-text field shown when tapping End Session. Optional, unstructured. No prompts.
- End Session: locks all data, compiles daily metrics, timestamps closure.

## 3.8 Session Roster Model
The roster is session-level, not activity-level. This is a core architectural principle.

| **PRINCIPLE** | The session roster is the single source of truth for who is available. Every activity draws its participants from the current session roster. The roster is open — players can be added at any point during a session and immediately become available for all current and future activities. |
| --- | --- |

- Late arrivals: adding a player mid-session (during a pause or between activities) adds them to the session roster permanently. They are immediately available for the current activity's next roster selection and all subsequent activities.
- Injury subs: if a player is injured mid-activity, the scribe pauses the activity, adds the sub to the session roster if not already present, and assigns them to the injured player's team slot on resume.
- Early departures: no explicit action required. A player who leaves early remains on the session roster. Their participation is captured only by the activities they were logged in. Every new activity starts with a fresh roster selection, which naturally excludes departed players without any tracking overhead.
- Player identity: a player added mid-session who was not previously in the player database is created in the database immediately (Name + Nickname) and attached to the session.

## 3.7 Saturday Two-Session Pattern
Morning gym and afternoon gym are logged as two separate sessions on the same calendar date — different locations, potentially overlapping attendees, fully independent data containers. The calendar view naturally supports multiple sessions per day.

## 3.9 Session History — Read Layer
Every past session is permanently readable from the calendar. This is the primary way to understand what happened on any given day — not just the aggregate stats.

| **PRINCIPLE** | The app is not just a data sink. Every piece of data captured must be readable in context. Session history and activity recaps are the read layer that makes the logged data meaningful. |
| --- | --- |

- Tapping any past session pill on the calendar opens the Session Recap for that day.
- The Session Recap shows: date, location, duration, session notes (if any), and the full activity timeline in chronological order.
- Each activity entry in the timeline is tappable — opens the Activity Recap screen for that specific activity.
- Activity Recap screens are identical to the screens shown immediately after an activity ends — the same layout, the same data, accessible retroactively for any past activity.
- For drills: the Activity Recap includes the full heat-by-heat breakdown table (players x spots x heats) as specified in Section 7.5.
- This read path is available for all past sessions without limit — not just recent ones.

# 4. Player Profiles & Progression

## 4.1 Profile Schema
| **Field** | **Details** |
| --- | --- |
| Name | Mandatory — first name or preferred name only. No formal surname expected. Players are on a first-name basis; the Name field stores whatever they go by (e.g. Alexandre, not Smith). |
| Nickname | Mandatory — secondary identifier, used when two players share a similar name. Primary display identifier on court. |
| Photo / Thumbnail | Removed from v1 — deferred to v2 to stay within Supabase free storage limits |
| Target FT % | User-set personal goal (e.g. 75%) |
| Target Mid % | User-set personal goal (e.g. 50%) |
| Target 3PT % | User-set personal goal (e.g. 40%) |

## 4.2 Profile Card Layout
The profile card surfaces the metrics players actually care about. Each shooting % bar is tappable — it opens a half-court shot chart overlay.

| **[Initials avatar]  Jordan / JC**<br>47W — 23L  (67% win rate)    Match record<br>*       [tap -> breaks down by format: 3v3 / 4v4 / 5v5]*<br>FT%   ████████░░  82%  ->  Goal: 75% ✓<br>Mid%  ██████░░░░  61%  ->  Goal: 50% ✓<br>3PT%  ████░░░░░░  38%  ->  Goal: 40% ↑<br>*       [tap any bar -> half-court shot chart overlay]*<br>*Sessions attended: 34  \|  Streak: 6  \|  Last: Sat 31 May — Levallois* |
| --- |

## 4.3 Recent Activity Log
Below the shooting stats on the player profile, a recency-ordered activity log shows the last 10 activities this player participated in — regardless of type (matches, drills, and competitive games all mixed together).

- Each entry is an Activity Card showing: Activity type + name (e.g. 3v3 Match, Free Throws — Right), Location, Date, and the player's personal result for that activity.
- Personal result per type: Match = W or L + game count (e.g. W · 4 of 5 games). Drill = shooting % + hand + volume (e.g. 82% · R · 82/100). Competitive game = finishing position (e.g. 2nd of 6).
- Tapping any Activity Card opens the full Activity Recap screen for that activity — the same screen shown immediately after the activity ended, accessible retroactively.
- A View More button below the 10th card loads the next batch of activities in place. No separate screen — expands inline.

## 4.4 Shot Chart Overlay
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

| **DESIGN NOTE** | Color is applied to the zone fill (background of the polygon). Text label chip (makes/attempts + %) is centered in each zone in dark text for contrast against all fill colors. This makes the chart scannable at a glance — problem zones are visible before you read a single number. |
| --- | --- |

| **CRITICAL** | Zone fills are always semi-transparent (recommended opacity: 40-60%). Court lines — the three-point arc, the lane, the mid-range boundary, and the restricted area circle — are rendered on a separate layer above the zone fills and are never occluded. The court structure must remain fully readable at all times. The color coding enhances the court — it does not replace it. Without visible court geometry the spatial meaning of the chart collapses entirely. |
| --- | --- |

| **CRITICAL** | The restricted area circle and lane lines are especially critical to preserve. They define the paint zones visually. If those disappear under a solid fill, a player can no longer tell where the interior zone ends and the mid-range begins. |
| --- | --- |

### Chart Context Behaviour
- FT% tap: free throw zone highlighted. All other zones neutral grey.
- Mid% tap: all mid-range zones colored. Three-point zones neutral grey.
- 3PT% tap: all three-point zones colored. Interior and mid-range zones neutral grey.
- Zones with no attempts: neutral grey, no chip.
- Dismiss: tap outside chart or swipe down.

### Spot History Drill-Down
- Tapping a zone on the shot chart opens a Spot History panel for that zone — a list of past drill sessions where that spot and hand combination was logged.
- Each entry shows: date, location, session total for that spot (makes/attempts + %), and the heat-by-heat sequence (e.g. 7/10 · 8/10 · 9/10).
- This answers the question: am I improving at Left 0° threes over time? Without requiring any aggregate analysis — just the raw per-session record in recency order.
- Hand toggle (L/R) on the chart applies to Spot History too — tapping Left shows only left-hand sessions for that spot.

### Win / Loss Drill-Down
- Match W/L (always visible on profile): tap -> breaks down by format (1v1 / 2v2 / 3v3 / 4v4 / 5v5).
- Recreational W/L: secondary section — accessible but never the headline.

# 5. Matches Module

## 5.1 Match Setup
- Scribe selects format: 1v1, 2v2, 3v3, 4v4, 5v5.
- Scribe sets scoring style first: Target Score (pickup mode) or Duration Wave (timed periods). These are mutually exclusive — selecting one hides the other's input field.
- If Target Score: scribe sets target points via quick-picks (7 / 11 / 21) or a free Player Input field for any other value. No fixed default — scribe chooses on the day.
- If Duration Wave: scribe sets duration in minutes via quick-picks (10 / 20) or a free Player Input field.
- Scribe assigns players to Team A / Team B / Sub Queue — via Randomizer or manually.

## 5.2 Team Randomizer
| **v1** | Pure random split — no weighting, no history, no fairness logic. Fast and unbiased. |
| --- | --- |

- Randomize button: splits active session pool randomly into Team A / Team B / Sub Queue per selected format.
- Re-shuffle button: one tap to re-randomize without leaving setup. Available until the first game starts.
- Manual override: after randomizing, scribe can drag any player between teams before confirming.
- **v2 note: **Avoid-repeat-teammates weighting deferred until sufficient session history exists. No skill-ranking in v1.

## 5.3 Scoring Rules
### Target Score Mode
- Non-5v5: paint / mid-range = 1 pt. Behind the arc = 2 pts. Suggested targets: 7 (short game), 11 (standard), 21 (long game).
- 5v5: standard basketball values (2s and 3s). Suggested target: 21.
- Winners Ball: team that wins a game keeps possession to open the next game.
- Match runs until scribe taps End Match. Team with most game wins takes the match.
- **Tie-breaker: **Smallest aggregate point differential across all games. If still identical: logged as Draw.

### Duration Wave Mode
- Scribe sets a custom countdown timer (e.g. 12 minutes).
- Audio alarm at zero. Scribe logs the wave score, adjusts rosters if needed, resets timer.

## 5.4 Game Logging (Post-Fact)
| **KEY** | The scribe logs game results during the natural break between games — not live. The match screen is a structured notepad, not a scoreboard. |
| --- | --- |

- Per game: Team A score, Team B score, Game duration (tap Start at tip-off, tap End Game when done — duration captured automatically).
- End Game: saves scores, resets to 0-0, increments counter, highlights possession.
- Game duration is a first-class metric — a proxy for intensity, fatigue, and dominance alongside the score.
- Undo Last Entry: available immediately after saving a game entry. Corrects fat-finger miskeys without ending the match.

## 5.5 Roster Flexibility & Pause
- The session roster is the source of truth — see Section 3.8. Team assignments are per-game, not per-match.
- Win/loss credit assigned at game level to every player on the winning team that game.
- A player who switches teams between games accumulates credits independently per game.
- Quick Rematch: after logging a completed match, one tap launches a new match with same format and editable starting roster.

| **PAUSE** | Any active game can be paused mid-flow. During a pause: the session roster can be updated (add late arrival or injury sub), team assignments can be modified, and the game resumes from its paused state with no data loss. Pausing does not end the game or the match. |
| --- | --- |

- Late arrival mid-game: scribe pauses, opens session roster, adds the player. Player is added to session permanently. Scribe assigns them to a team slot via the Roster Sheet before resuming.
- Injury sub mid-game: scribe pauses, removes injured player from active team slot (player remains on session roster for bookkeeping), adds sub to the slot. Resume.
- Between games: full roster sheet always available before starting the next game. Any session player can be assigned to either team or the sub queue. No restriction to the previous game's lineup.

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
| **SCRIBE** | No shot-by-shot tracking. After the game: log elimination order and winner's margin only. |
| --- | --- |

- Spot: Left 0° / Left 45° / Center / Right 45° / Right 0°
- Elimination ranking: drag-to-rank (1st eliminated = last place, last standing = winner)
- Winner's final score (optional — for margin)
- **Career data: **Recreational W/L record.

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
- **Career data: **Mid-Range % (per spot).

## 6.3 Next (1v1 Rotation Game)
### Rules (context only)
- 1v1, 3 dribble max. Make: stays on offense. Miss: defender becomes attacker. First to X makes wins.

### Scribe Input
- Target makes (default 10, adjustable)
- Post-game: enter final make count per participant. App ranks results.
- **Career data: **Recreational W/L only.

## 6.4 Generic Competitive Activity
- Scribe names it freely, selects participants, enters final ranking post-game.
- **Career data: **Recreational W/L only.

# 7. Drills Module

Drills are training activities focused on shot volume and technique. Independent activities within a session. Any subset of session players — including the scribe alone.

## 7.1 Universal Drill Engine
| **PRINCIPLE** | Every drill — solo or group — is makes logged against attempts, organised in heats. The heat size is a memory aid (solo) and turn management tool (group). The underlying metric is always: Makes / Attempts = %. |
| --- | --- |

| **PAUSE** | Any active drill can be paused mid-heat. During a pause the session roster can be updated. On resume the drill continues from where it stopped. Partial heat data is not lost. |
| --- | --- |

## 7.1a Active Shooter Tracking
The active shooter must be specified and displayed at all times during a drill. This is a critical data integrity requirement — drill data not tagged to a player cannot be attributed to career stats.

- Before launching any drill, the scribe selects which players are participating from the session roster (via the Player Picker Modal — Section 3.5).
- In group drills: the active shooter rotates automatically after each heat is saved (round-robin). The next player is highlighted before the heat begins. The scribe can override the rotation manually at any time.
- In solo drills: the single session player is the default shooter. If the session has multiple players but only one is drilling, the scribe selects them explicitly at setup.
- The active shooter's name is displayed prominently on the live drill screen at all times — never ambiguous.

## 7.1b Live Drill Screen Layout
The live drill screen is dominated by the makes counter — the primary interaction element. All other elements are secondary.

- Active shooter name: large, top of screen, always visible.
- Active spot: displayed clearly. Spot queue shown as a horizontal strip — spots are large, tappable, and clearly indicate active vs completed vs upcoming.
- Makes counter: a large circle or prominent display dominating the center of the screen. The number is tappable (opens numpad per global rule). - and + flanking buttons for quick increments. The counter and its surrounding controls should occupy the majority of available screen height.
- Heat log: below the counter, a compact strip showing previous heats for the current spot (e.g. Heat 1: 7/10, Heat 2: 8/10). Scrollable if many heats.
- Save Heat & Next: prominent button. In group drills advances to next player. In solo drills stays on current player and logs the heat to the current spot.
- Next Spot: always visible after minimum 1 heat saved. Advances to next spot in queue.
- Remaining screen real estate: use it. The counter should be large enough that it is readable at arm's length without squinting.

| **Parameter** | **Detail** |
| --- | --- |
| Shot type | Free Throw / Mid-Range / Three-Point / Layup / Floater / Post-Up |
| Hand | Left / Right — mandatory selection on every drill. No Both option. Applied universally; displayed in chart only where meaningful (paint zones). |
| Spot selection | Multi-select from 5 court angles. Deselect any spot to remove it from the queue entirely. |
| Heat size | Shots per turn. Quick-picks: 5 / 10 / Player Input / Manual. Player Input: scribe enters any number. Manual: no fixed size — scribe decides wave boundary himself, logs whenever ready, heat size is whatever was shot. In Manual mode, Next Spot auto-saves the current heat with a brief confirmation flash. |
| Session target | Optional makes target per spot. Quick-picks: 10 / 50 / 100 / Player Input. Player Input: scribe enters any number. No target required — if none set, scribe navigates manually via Next Spot. |
| Turn rotation | Solo: no rotation. Group: auto-advances to next player after each heat. |
| Input moment | After each heat (or on Next Spot in Manual mode): scribe enters makes. Never live. |
| Undo | Undo Last Heat available immediately after saving. No data lost to miskeys. |

## 7.2 Spot-Sequential Flow (Three-Point & Mid-Range)
- Setup: select active spots (multi-select toggle), set makes target per spot (optional), confirm heat size.
- Drill flows sequentially through the selected spot queue only — deselected spots are skipped entirely.
- Each spot in the queue is an independent container. The active spot is always clearly highlighted in the queue.
- A spot progress indicator shows position in queue (e.g. Spot 2 of 4).

| **NAVIGATION** | After each heat, a Next Spot button is always available regardless of whether a makes target is set. Minimum 1 heat completed on the current spot before Next Spot becomes tappable. If a target is set and reached, the app auto-advances with a confirmation flash. If no target is set, the scribe manually taps Next Spot whenever ready. In Manual heat size mode, tapping Next Spot auto-saves the current in-progress heat with a brief confirmation flash before advancing — no explicit Save step required. Tapping a spot directly in the queue navigates to it immediately, with a confirmation prompt if a heat is in progress. |
| --- | --- |

- Each spot logs independently: total makes and total attempts across all heats at that spot. Career % updates per spot.
- Attempts-to-reach-target is the primary improvement signal over time — richer than raw percentage alone.

## 7.3 Solo vs Group
| **Dimension** | **Solo (1 player)** | **Group (2+ players)** |
| --- | --- | --- |
| Heat purpose | Memory aid — keeps count accurate | Turn management — defines rotation |
| Session target | Make-target per spot (e.g. 10 makes from each) | Fixed attempt quota only — make-targets create unacceptable wait times |
| Input | Scribe enters his own makes after each heat | Scribe enters each player's makes after their turn |

| **NOTE** | Group drills use fixed attempt quotas because reaching a make-target (e.g. 40+ attempts for 10 threes) makes wait times unacceptable. Solo drills can use make-targets freely. |
| --- | --- |

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
The drill recap shows two levels: a highlight callout strip and a full breakdown table. Both are always shown.

| **Callout** | **Example** |
| --- | --- |
| Session total | 100 free throws: 82 makes (82%) — right hand |
| Spot best | Best spot: Right 0° corner — 47% (above 40% goal) |
| Spot to work | Left 0° — 28%, 12 pts below goal |
| Efficiency | Top key: 10 makes in 24 attempts |
| Heat trend | FT heats today: 7, 8, 9, 8 — strong finish |

Full breakdown table — always shown below the callouts:

| **SPEC** | Breakdown table rows = players. Columns = spots selected for this drill. Each cell shows the heat-by-heat sequence for that player at that spot (e.g. 7/10 · 8/10 · 9/10) followed by the spot total (24/30 · 80%). A totals row at the bottom aggregates across all players per spot. A totals column on the right aggregates across all spots per player. |
| --- | --- |

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
| Cross-session heat trend aggregates | Per-session detail is available in Activity Recaps and the player profile activity log. Aggregate trend analysis (e.g. average % by heat position across many sessions) is a BI layer deferred to v2. Only relevant once sufficient session history exists to be meaningful. |
| Catch-and-shoot vs off-dribble tagging | All v1 shots assumed catch-and-shoot. Tag in v2 for richer 3PT splits. |
| Apple Watch companion | Violates P5 — trades reps for data points. |
| Friends / slave app data ingestion | Trust and data integrity problem. Gate via scribe approval in v2 if revisited. |

# 11. Open Questions

- Activity Feed detail level: activity type + outcome only, or include game-by-game breakdown inline?
- Drill spot completion: when makes target reached mid-heat, complete the heat first or advance immediately?
- Session Recap: shown automatically on End Session, or opt-in?
- Recurring session recurrence: weekly confirmed. Are bi-weekly or monthly patterns needed in v1?
- View More in activity log: loads next 10 in place — confirmed. Should there be a maximum cap or always load all?
- Drill recap Compare to Previous: how many past sessions to show — last 3, last 5, or all?

# 12. Bugs & UI Fixes — v5.5 / v5.6

Issues identified during testing phases v5.5 and v5.6. Organised by screen. Each entry follows Current / Expected format for direct use with Claude Code.

| **GLOBAL RULE** | All buttons in dark mode: white text, no exceptions. Any orange, grey, or colored button showing blue or non-white text is a bug. Fix globally in one pass — do not fix screen by screen. |
| --- | --- |

## 12.1 Players — Roster Screen
| **Current** | **Expected** |
| --- | --- |
| Search bar is too narrow | Search bar is taller / thicker |
| Search bar and player table are stacked directly against each other | Add the same padding between search bar and player list as between search bar and header |
| Player pill shows the two first letters of nickname | Player pill shows the player Name field (first name / preferred name) |
| Player name and nickname displayed with no padding, nickname in black on dark grey background | Add padding. Remove the full name label — it appears in the pill. Show Nickname only in white, larger font size |
| Wasted space to the right of the player pill and nickname | Use that space to show a W/L record pill or bold white text (same style as detailed profile). Show match W/L. If no data: display '-' |

## 12.2 Player Card Screen
| **Current** | **Expected** |
| --- | --- |
| Player Name and Nickname fields are locked / not editable | Nickname is editable directly from the profile card. Name editable too. |
| Header pill shows two first letters of nickname | Header pill shows the Name field — align with roster pill behaviour |
| No padding between pill and rest of header card content | Add padding consistent with roster row |
| Header shows Full Name / Nickname labels | Remove Full Name label — it appears in the pill. Show Nickname only, styled like current Full Name |

## 12.3 Calendar Screen
| **Current** | **Expected** |
| --- | --- |
| Day squares touch each other | Reduce square size slightly so squares have visible gaps between them |
| Past session on a day shows only an orange dot | Show a pill with gym name + session duration. Tapping it shows the session recap for that day. |
| Planned session on a future day shows only an orange dot | Show a pill with gym name + 'Planned' label |
| Tapping a date just highlights it | Tapping a future date shows a + indicator and opens the plan session form. Tapping a past session pill shows the session recap. |

## 12.4 Session Start — Player Selection
| **Current** | **Expected** |
| --- | --- |
| Player add is a free-text nickname field + ADD button. Pattern matching to existing DB unclear. | Player picker is a persistent modal (stays open until dismissed). Shows full player DB as name pills. Selected players highlighted. Add New Player button at bottom creates and immediately adds to DB and session. |
| Location field is free text only | Free text + typeahead autocomplete from previous location entries |

## 12.5 Live Session Screen
| **Current** | **Expected** |
| --- | --- |
| Player add is a free-text field + ADD button | Same player picker modal as Session Start — persistent, full DB list, add new player inline |

## 12.6 Live Session — New Match Setup
| **Current** | **Expected** |
| --- | --- |
| Target points and Scoring option fields shown in wrong order — target points visible even when Wave mode selected | Flip order: Scoring Style selector first. Conditionally show: Target points input (suggested values 7 / 11 / 21) if Target selected. Duration input (default 10 min) if Wave selected. Never show both at once. |
| Team section is clunky with no clear team creation flow | Add a Players section above Teams showing all session-present players. Team section has: Shuffle button (random split), Re-shuffle button, manual drag-to-assign to Team A / Team B / Sub Queue. N teams determined by format selected. |

## 12.7 Light / Dark Mode
| **Current** | **Expected** |
| --- | --- |
| No theme toggle exposed in the UI | Add a Light / Dark / System toggle in the Settings screen |
| Only dark mode confirmed visible — light mode rendering unverified | Verify light mode renders correctly across all screens. Fix any screens where light mode palette is not applied. |

TAP — Talking About Practice  |  v5.8  |  Confidential
