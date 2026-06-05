# TAP — Talking About Practice — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** React PWA basketball session logger — installable on iOS via Safari, data in Supabase (PostgreSQL), deployed on Vercel.

**Architecture:** Vite + React + TypeScript SPA; Supabase for all persistence (anon key, no auth, no RLS); TanStack Query for data fetching and caching; Zustand for in-progress UI state (match timer, drill queue); vite-plugin-pwa for service worker + offline shell caching; React Router v6 for navigation.

**Tech Stack:** React 18, TypeScript, TailwindCSS, @supabase/supabase-js, @tanstack/react-query, Zustand, React Router v6, vite-plugin-pwa, Vercel.

**Auth:** None. Supabase anon key only. Single user, single device.

---

## File Structure

```
tap-pwa/
├── public/
│   └── icons/                      # 192×192, 512×512, apple-touch-icon-180.png
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  # All table definitions
├── src/
│   ├── main.tsx
│   ├── App.tsx                     # Route definitions + QueryClientProvider
│   ├── lib/
│   │   └── supabase.ts             # createClient(); exported as `supabase`
│   ├── types/
│   │   └── index.ts                # All TS interfaces + string-literal unions
│   ├── stores/
│   │   ├── sessionStore.ts         # Active session ID + elapsed timer (Zustand)
│   │   ├── matchStore.ts           # In-progress match/game state (Zustand)
│   │   └── drillStore.ts           # In-progress drill/heat state (Zustand)
│   ├── hooks/
│   │   ├── usePlayers.ts           # TanStack Query: fetch/mutate players
│   │   ├── useSessions.ts          # TanStack Query: fetch/mutate sessions
│   │   ├── useMatch.ts             # TanStack Query: fetch/mutate matches + games
│   │   ├── useDrill.ts             # TanStack Query: fetch/mutate drills + heats
│   │   ├── useCompetitiveGame.ts   # TanStack Query: fetch/mutate competitive games
│   │   └── useCareerStats.ts       # Derived stats computed from heats + games queries
│   ├── utils/
│   │   ├── careerStats.ts          # Pure functions: shooting %, W/L by format
│   │   ├── recapGenerator.ts       # Pure functions: callout strings for all recaps
│   │   └── teamRandomizer.ts       # Pure random split into teams + sub queue
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx          # Large tap-target button (min h-14)
│   │   │   ├── BottomSheet.tsx     # iOS-style slide-up modal
│   │   │   ├── DragRankList.tsx    # Drag-to-rank (Banks elimination order)
│   │   │   └── ShotChart.tsx       # Half-court SVG + zone fills + court lines
│   │   ├── dashboard/
│   │   │   ├── IdleDashboard.tsx
│   │   │   ├── ActiveDashboard.tsx
│   │   │   ├── ActivityFeed.tsx
│   │   │   └── RosterChipStrip.tsx
│   │   ├── sessions/
│   │   │   ├── CalendarView.tsx
│   │   │   ├── PlannedSessionForm.tsx
│   │   │   └── AttendanceConfirmation.tsx
│   │   ├── players/
│   │   │   ├── PlayerList.tsx
│   │   │   ├── PlayerForm.tsx
│   │   │   ├── PlayerProfileCard.tsx
│   │   │   └── WinLossBreakdown.tsx
│   │   ├── matches/
│   │   │   ├── MatchSetup.tsx
│   │   │   ├── ActiveMatch.tsx
│   │   │   ├── RosterSheet.tsx
│   │   │   └── MatchRecap.tsx
│   │   ├── competitiveGames/
│   │   │   ├── CompetitiveGameSetup.tsx
│   │   │   ├── BanksInput.tsx
│   │   │   ├── MiddiesInput.tsx
│   │   │   ├── NextInput.tsx
│   │   │   ├── GenericInput.tsx
│   │   │   └── ActivityRecap.tsx
│   │   └── drills/
│   │       ├── DrillSetup.tsx
│   │       ├── ActiveDrill.tsx
│   │       └── DrillRecap.tsx
│   └── pages/
│       ├── DashboardPage.tsx
│       ├── CalendarPage.tsx
│       ├── PlayerListPage.tsx
│       ├── PlayerProfilePage.tsx
│       ├── MatchPage.tsx
│       ├── DrillPage.tsx
│       ├── CompetitiveGamePage.tsx
│       └── SessionRecapPage.tsx
├── .env.local                      # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── vercel.json
```

---

## Phase 1 — Project Setup

### Task 1: Scaffold the Project

- [ ] Bootstrap:

```bash
npm create vite@latest tap-pwa -- --template react-ts
cd tap-pwa
npm install
```

- [ ] Install dependencies:

```bash
npm install @supabase/supabase-js @tanstack/react-query zustand react-router-dom
npm install -D tailwindcss postcss autoprefixer vite-plugin-pwa
npx tailwindcss init -p
```

- [ ] Configure `tailwind.config.ts`:

```ts
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

- [ ] Add to `src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] Configure `vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'TAP — Talking About Practice',
        short_name: 'TAP',
        theme_color: '#111827',
        background_color: '#111827',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/apple-touch-icon-180.png', sizes: '180x180', type: 'image/png' }
        ]
      },
      workbox: { globPatterns: ['**/*.{js,css,html,ico,png,svg}'] }
    })
  ]
})
```

- [ ] Add `vercel.json`:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

- [ ] Add placeholder icons in `public/icons/`
- [ ] Run `npm run dev` — blank page, no errors
- [ ] Commit: `chore: project scaffold`

---

### Task 2: Supabase Project + Database Schema

- [ ] Go to supabase.com → New Project → name: `tap-app` → note the `Project URL` and `anon public` key
- [ ] Create `.env.local`:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

- [ ] Create `supabase/migrations/001_initial_schema.sql` and run it in the Supabase SQL editor:

```sql
-- Disable RLS on all tables (single-user, anon key only)

create table players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  nickname text not null,
  photo_url text,
  target_ft_percent float default 0.75,
  target_mid_percent float default 0.50,
  target_3pt_percent float default 0.40,
  created_at timestamptz default now()
);
alter table players disable row level security;

create table sessions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  location text not null,
  state text not null default 'planned',
  started_at timestamptz,
  ended_at timestamptz,
  is_recurring boolean default false,
  recurrence_weekday int,
  expected_player_ids uuid[] default '{}'
);
alter table sessions disable row level security;

create table session_attendances (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  is_expected boolean default true,
  arrived_at timestamptz,
  departed_at timestamptz
);
alter table session_attendances disable row level security;

create table activity_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  activity_type text not null,
  reference_id uuid not null,
  created_at timestamptz default now(),
  feed_summary text
);
alter table activity_records disable row level security;

create table matches (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  format text not null,
  target_score int not null,
  scoring_style text not null default 'targetScore',
  started_at timestamptz default now(),
  ended_at timestamptz,
  team_a_player_ids uuid[] default '{}',
  team_b_player_ids uuid[] default '{}',
  sub_queue_player_ids uuid[] default '{}'
);
alter table matches disable row level security;

create table games (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references matches(id) on delete cascade,
  game_number int not null,
  team_a_score int default 0,
  team_b_score int default 0,
  duration_seconds int default 0,
  started_at timestamptz,
  ended_at timestamptz,
  team_a_player_ids uuid[] default '{}',
  team_b_player_ids uuid[] default '{}'
);
alter table games disable row level security;

create table drills (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  shot_type text not null,
  selected_spots text[] default '{}',
  heat_size int default 10,
  makes_target_per_spot int,
  player_ids uuid[] default '{}',
  started_at timestamptz default now(),
  ended_at timestamptz
);
alter table drills disable row level security;

create table heat_entries (
  id uuid primary key default gen_random_uuid(),
  drill_id uuid references drills(id) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  spot text,
  makes int default 0,
  attempts int default 0,
  heat_number int default 1,
  recorded_at timestamptz default now()
);
alter table heat_entries disable row level security;

create table competitive_games (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  game_type text not null,
  spot text,
  quota_per_player int,
  custom_name text,
  player_ids uuid[] default '{}',
  started_at timestamptz default now(),
  ended_at timestamptz
);
alter table competitive_games disable row level security;

create table competitive_results (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references competitive_games(id) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  rank int not null,
  score int,
  makes int,
  attempts int
);
alter table competitive_results disable row level security;
```

- [ ] Verify all 10 tables appear in the Supabase Table Editor
- [ ] Commit: `feat: Supabase schema migration`

---

### Task 3: Supabase Client + TypeScript Types

**Files:** `src/lib/supabase.ts`, `src/types/index.ts`

- [ ] `src/lib/supabase.ts`:

```ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

- [ ] `src/types/index.ts`:

```ts
export type SessionState = 'planned' | 'active' | 'completed'
export type MatchFormat = '1v1' | '2v2' | '3v3' | '4v4' | '5v5'
export type ScoringStyle = 'targetScore' | 'durationWave'
export type ShotType = 'freeThrow' | 'midRange' | 'threePoint' | 'layup' | 'floater' | 'postUp'
export type ShotSpot = 'left0' | 'left45' | 'center' | 'right45' | 'right0'
export type CompetitiveGameType = 'banks' | 'middies' | 'next' | 'generic'
export type ActivityType = 'match' | 'drill' | 'competitiveGame'

export const SHOT_SPOTS: ShotSpot[] = ['left0', 'left45', 'center', 'right45', 'right0']
export const SPOT_LABELS: Record<ShotSpot, string> = {
  left0: 'Left 0°', left45: 'Left 45°', center: 'Center',
  right45: 'Right 45°', right0: 'Right 0°',
}
export const FORMAT_TEAM_SIZE: Record<MatchFormat, number> = {
  '1v1': 1, '2v2': 2, '3v3': 3, '4v4': 4, '5v5': 5,
}
export const FORMAT_DEFAULT_TARGET: Record<MatchFormat, number> = {
  '1v1': 11, '2v2': 11, '3v3': 11, '4v4': 11, '5v5': 21,
}

// Mirror Supabase snake_case column names as camelCase interfaces
export interface Player {
  id: string
  name: string
  nickname: string
  photo_url?: string
  target_ft_percent: number
  target_mid_percent: number
  target_3pt_percent: number
  created_at: string
}

export interface Session {
  id: string
  date: string           // ISO date string "2026-06-02"
  location: string
  state: SessionState
  started_at?: string
  ended_at?: string
  is_recurring: boolean
  recurrence_weekday?: number
  expected_player_ids: string[]
}

export interface SessionAttendance {
  id: string
  session_id: string
  player_id: string
  is_expected: boolean
  arrived_at?: string
  departed_at?: string
}

export interface ActivityRecord {
  id: string
  session_id: string
  activity_type: ActivityType
  reference_id: string
  created_at: string
  feed_summary?: string
}

export interface Match {
  id: string
  session_id: string
  format: MatchFormat
  target_score: number
  scoring_style: ScoringStyle
  started_at: string
  ended_at?: string
  team_a_player_ids: string[]
  team_b_player_ids: string[]
  sub_queue_player_ids: string[]
}

export interface Game {
  id: string
  match_id: string
  game_number: number
  team_a_score: number
  team_b_score: number
  duration_seconds: number
  started_at?: string
  ended_at?: string
  team_a_player_ids: string[]
  team_b_player_ids: string[]
}

export interface Drill {
  id: string
  session_id: string
  shot_type: ShotType
  selected_spots: ShotSpot[]
  heat_size: number
  makes_target_per_spot?: number
  player_ids: string[]
  started_at: string
  ended_at?: string
}

export interface HeatEntry {
  id: string
  drill_id: string
  player_id: string
  spot?: ShotSpot
  makes: number
  attempts: number
  heat_number: number
  recorded_at: string
}

export interface CompetitiveGame {
  id: string
  session_id: string
  game_type: CompetitiveGameType
  spot?: ShotSpot
  quota_per_player?: number
  custom_name?: string
  player_ids: string[]
  started_at: string
  ended_at?: string
}

export interface CompetitiveResult {
  id: string
  game_id: string
  player_id: string
  rank: number
  score?: number
  makes?: number
  attempts?: number
}

export interface RecapCallout {
  label: string
  value: string
}
```

- [ ] Wire `QueryClientProvider` in `src/main.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </QueryClientProvider>
)
```

- [ ] `npm run build` — zero TS errors
- [ ] Commit: `feat: Supabase client, types, QueryClient setup`

---

## Phase 2 — Data Hooks

### Task 4: Players Hook

**File:** `src/hooks/usePlayers.ts`

- [ ] Implement:

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Player } from '../types'

export function usePlayers() {
  return useQuery({
    queryKey: ['players'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('players').select('*').order('nickname')
      if (error) throw error
      return data as Player[]
    },
  })
}

export function useCreatePlayer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (player: Omit<Player, 'id' | 'created_at'>) => {
      const { data, error } = await supabase.from('players').insert(player).select().single()
      if (error) throw error
      return data as Player
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['players'] }),
  })
}

export function useUpdatePlayer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Player> & { id: string }) => {
      const { error } = await supabase.from('players').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['players'] }),
  })
}
```

- [ ] Commit: `feat: usePlayers hook`

---

### Task 5: Sessions Hook

**File:** `src/hooks/useSessions.ts`

- [ ] Implement:

```ts
export function useSessions(filters?: { state?: SessionState; date?: string }) {
  return useQuery({
    queryKey: ['sessions', filters],
    queryFn: async () => {
      let q = supabase.from('sessions').select('*').order('date', { ascending: false })
      if (filters?.state) q = q.eq('state', filters.state)
      if (filters?.date) q = q.eq('date', filters.date)
      const { data, error } = await q
      if (error) throw error
      return data as Session[]
    },
  })
}

export function useActiveSession() {
  return useQuery({
    queryKey: ['sessions', { state: 'active' }],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions').select('*').eq('state', 'active').maybeSingle()
      if (error) throw error
      return data as Session | null
    },
  })
}

export function useCreateSession() { /* insert + invalidate ['sessions'] */ }
export function useUpdateSession() { /* update by id + invalidate */ }

export function useOpenSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ sessionId, presentPlayerIds }: { sessionId: string, presentPlayerIds: string[] }) => {
      const now = new Date().toISOString()
      await supabase.from('sessions').update({ state: 'active', started_at: now }).eq('id', sessionId)
      const attendances = presentPlayerIds.map(pid => ({
        session_id: sessionId, player_id: pid,
        is_expected: true, arrived_at: now,
      }))
      await supabase.from('session_attendances').insert(attendances)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  })
}

export function useEndSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (sessionId: string) => {
      await supabase.from('sessions')
        .update({ state: 'completed', ended_at: new Date().toISOString() })
        .eq('id', sessionId)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  })
}

export function useSessionAttendances(sessionId: string | null) {
  return useQuery({
    queryKey: ['attendances', sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_attendances').select('*').eq('session_id', sessionId!)
      if (error) throw error
      return data as SessionAttendance[]
    },
  })
}
```

- [ ] Commit: `feat: useSessions hook`

---

### Task 6: Match, Drill, Competitive Game Hooks

**Files:** `src/hooks/useMatch.ts`, `useDrill.ts`, `useCompetitiveGame.ts`

- [ ] `useMatch.ts` — queries + mutations for `matches` and `games`:

```ts
export function useMatches(sessionId: string) { /* select where session_id */ }
export function useGames(matchId: string) { /* select where match_id */ }

export function useSaveMatch() {
  // inserts MatchRecord, then its GameRecord[], then ActivityRecord
  // invalidates ['sessions', 'matches', 'games', 'activities']
}
```

- [ ] `useDrill.ts` — queries + mutations for `drills` and `heat_entries`:

```ts
export function useSaveDrill() {
  // inserts DrillRecord, then HeatEntry[], then ActivityRecord
  // For Middies competitive games that write heat entries: handled in useCompetitiveGame
}
```

- [ ] `useCompetitiveGame.ts` — queries + mutations for `competitive_games` and `competitive_results`:

```ts
export function useSaveCompetitiveGame() {
  // inserts CompetitiveGame, then CompetitiveResult[]
  // For Middies: also inserts HeatEntry[] (for Mid% career stats)
  // then ActivityRecord
}
```

- [ ] `useActivityRecords.ts`:

```ts
export function useActivityRecords(sessionId: string) {
  return useQuery({
    queryKey: ['activities', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_records').select('*')
        .eq('session_id', sessionId).order('created_at', { ascending: false })
      if (error) throw error
      return data as ActivityRecord[]
    },
  })
}
```

- [ ] Commit: `feat: match, drill, competitive game, activity hooks`

---

### Task 7: Career Stats Hook

**Files:** `src/hooks/useCareerStats.ts`, `src/utils/careerStats.ts`

- [ ] `careerStats.ts` — pure functions (no Supabase, takes plain arrays):

```ts
export function matchWinLoss(playerId: string, games: Game[]) {
  const wins = games.filter(g =>
    (g.team_a_player_ids.includes(playerId) && g.team_a_score > g.team_b_score) ||
    (g.team_b_player_ids.includes(playerId) && g.team_b_score > g.team_a_score)
  ).length
  const losses = games.filter(g =>
    (g.team_a_player_ids.includes(playerId) && g.team_a_score < g.team_b_score) ||
    (g.team_b_player_ids.includes(playerId) && g.team_b_score < g.team_a_score)
  ).length
  return { wins, losses }
}

export function winLossByFormat(playerId: string, games: Game[], matches: Match[]) {
  const formats: MatchFormat[] = ['1v1', '2v2', '3v3', '4v4', '5v5']
  return formats.map(format => {
    const matchIds = matches.filter(m => m.format === format).map(m => m.id)
    const formatGames = games.filter(g => matchIds.includes(g.match_id))
    return { format, ...matchWinLoss(playerId, formatGames) }
  })
}

export function shootingPct(playerId: string, type: ShotType, spot: ShotSpot | undefined, heats: HeatEntry[]) {
  const relevant = heats.filter(h =>
    h.player_id === playerId &&
    (spot !== undefined ? h.spot === spot : true)
  )
  const makes = relevant.reduce((s, h) => s + h.makes, 0)
  const attempts = relevant.reduce((s, h) => s + h.attempts, 0)
  return attempts > 0 ? { pct: makes / attempts, makes, attempts } : null
}

export function zoneColor(makes: number, attempts: number, zoneType: 'paint' | 'mid' | 'three' | 'ft'): string {
  if (attempts === 0) return 'rgba(156,163,175,0.2)'
  const pct = makes / attempts
  const [green, yellow] =
    zoneType === 'three' ? [0.30, 0.11] :
    zoneType === 'mid'   ? [0.50, 0.26] :
    zoneType === 'ft'    ? [0.75, 0.51] :
                           [0.80, 0.51]
  const rgb = pct >= green ? '34,197,94' : pct >= yellow ? '234,179,8' : '239,68,68'
  return `rgba(${rgb},0.5)`
}
```

- [ ] `useCareerStats(playerId)`: fetches all games (via matches) and all heat_entries for a player, calls careerStats functions, returns aggregated data

```ts
export function useCareerStats(playerId: string) {
  const gamesQ = useQuery({
    queryKey: ['career-games', playerId],
    queryFn: async () => {
      // join: get all games where playerId appears in team_a_player_ids or team_b_player_ids
      const { data } = await supabase.from('games')
        .select('*, match:matches(format)')
        .contains('team_a_player_ids', [playerId])  // Postgres array contains
      // also fetch for team_b, merge, deduplicate
      return data as (Game & { match: { format: MatchFormat } })[]
    },
  })
  const heatsQ = useQuery({
    queryKey: ['career-heats', playerId],
    queryFn: async () => {
      const { data } = await supabase.from('heat_entries').select('*').eq('player_id', playerId)
      return data as HeatEntry[]
    },
  })
  // return derived stats from careerStats pure functions
}
```

- [ ] Commit: `feat: career stats hook + pure stat functions`

---

## Phase 3 — Zustand Stores (Runtime State)

### Task 8: Session + Match + Drill Stores

**Files:** `src/stores/sessionStore.ts`, `matchStore.ts`, `drillStore.ts`

- [ ] `sessionStore.ts`:

```ts
import { create } from 'zustand'

interface SessionStore {
  activeSessionId: string | null
  elapsedSeconds: number
  setActiveSession: (id: string) => void
  clearActiveSession: () => void
  tick: () => void
}

export const useSessionStore = create<SessionStore>((set) => ({
  activeSessionId: null,
  elapsedSeconds: 0,
  setActiveSession: (id) => set({ activeSessionId: id, elapsedSeconds: 0 }),
  clearActiveSession: () => set({ activeSessionId: null, elapsedSeconds: 0 }),
  tick: () => set((s) => ({ elapsedSeconds: s.elapsedSeconds + 1 })),
}))
```

- [ ] `matchStore.ts`:

```ts
interface MatchStore {
  format: MatchFormat
  targetScore: number
  scoringStyle: ScoringStyle
  teamA: Player[]
  teamB: Player[]
  subQueue: Player[]
  currentAScore: number
  currentBScore: number
  gameTimerStart: number | null
  isTimerRunning: boolean
  completedGames: Omit<Game, 'id' | 'match_id'>[]
  // actions
  setFormat: (f: MatchFormat) => void
  randomize: (pool: Player[]) => void
  startTimer: () => void
  stopTimer: () => number   // returns elapsed seconds
  incrementScore: (team: 'A' | 'B', pts: number) => void
  commitGame: () => void
  reset: () => void
}
```

- [ ] `drillStore.ts`:

```ts
interface DrillStore {
  shotType: ShotType
  selectedSpots: ShotSpot[]
  heatSize: number
  makesTargetPerSpot: number | undefined
  players: Player[]
  currentSpotIndex: number
  currentPlayerIndex: number
  currentMakes: number
  completedHeats: Omit<HeatEntry, 'id' | 'drill_id'>[]
  setMakes: (n: number) => void
  commitHeat: () => { spotComplete: boolean; drillComplete: boolean }
  reset: () => void
}
```

- [ ] Commit: `feat: Zustand stores for runtime session/match/drill state`

---

## Phase 4 — Screens

### Task 9: Dashboard

**Files:** `src/pages/DashboardPage.tsx`, `src/components/dashboard/`

- [ ] `DashboardPage`: calls `useActiveSession()`. Shows `IdleDashboard` if null, `ActiveDashboard` if session exists. On mount, syncs `sessionStore.activeSessionId` from query result
- [ ] `IdleDashboard`: "START NEW SESSION" button + calendar icon (top-right) + roster icon (top-left)
- [ ] `ActiveDashboard`:
  - Header: location + elapsed timer (ticks via `useEffect` calling `sessionStore.tick()`)
  - Action Hub: NEW MATCH + NEW ACTIVITY (full-width blocky buttons, min h-16)
  - `ActivityFeed`: `useActivityRecords(sessionId)` → scrollable list, each row `type icon + feedSummary`
  - `RosterChipStrip`: `useSessionAttendances` filtered to present → avatar chips, tap → BottomSheet (Mark Departed / Add Walk-in)
  - End Session footer button → calls `useEndSession`, clears store, navigates to `/session-recap/:id`
- [ ] Commit: `feat: dashboard`

---

### Task 10: Calendar & Sessions

**Files:** `src/pages/CalendarPage.tsx`, `src/components/sessions/`

- [ ] `CalendarView`: month grid from `date-fns` date arithmetic; dots for days with sessions (from `useSessions`); tap day → list + "+" to create
- [ ] `PlannedSessionForm`: date picker, location, expected players multi-select, recurring toggle + weekday picker; on submit calls `useCreateSession` (+ bulk-creates 12 weekly recurrences if `is_recurring`)
- [ ] `AttendanceConfirmation`: list expected players with checkmarks; walk-in search; "Open Session" → `useOpenSession` → update store → navigate to dashboard
- [ ] Commit: `feat: calendar + session open flow`

---

### Task 11: Players + Shot Chart

**Files:** `src/pages/PlayerListPage.tsx`, `src/pages/PlayerProfilePage.tsx`, `src/components/players/`, `src/components/ui/ShotChart.tsx`

- [ ] `PlayerList`: `usePlayers()` + search input + "+" FAB → `PlayerForm`
- [ ] `PlayerForm`: name/nickname fields, photo capture (`<input type="file" accept="image/*" capture="environment">` → upload to Supabase Storage → store `photo_url`), target % sliders; calls `useCreatePlayer` / `useUpdatePlayer`

> **Supabase Storage for photos:** Create a `player-photos` bucket (public). Upload compressed image file, get public URL, store in `players.photo_url`. Compress client-side to ≤150KB before uploading using a canvas `toBlob('image/jpeg', 0.7)`.

- [ ] `PlayerProfileCard`: photo + nickname + match W/L (tap → `WinLossBreakdown` sheet) + FT/Mid/3PT progress bars (% vs goal, tap bar → `ShotChart` with mode)
- [ ] `WinLossBreakdown`: sheet with W/L per format from `useCareerStats`
- [ ] `ShotChart.tsx` — **SVG half-court** (critical rendering rules):
  - ViewBox `0 0 500 470`
  - Zone polygons rendered first (fill layer)
  - Court lines (`<path>`, `<circle>`, `<rect>`) rendered **last** — always on top, never occluded
  - Zone fill: `zoneColor()` from `careerStats.ts` at 50% opacity
  - 15 zones: restricted area, interiorL/R, midPostL/R, mid×5 spots, three×5 spots
  - Label chip per zone: makes/attempts + %
  - Mode prop `'ft' | 'mid' | 'three'` — inactive zones shown in `rgba(156,163,175,0.2)`
  - Full-screen overlay; tap outside or swipe down to dismiss
- [ ] Commit: `feat: players, profile card, shot chart`

---

### Task 12: Matches

**Files:** `src/pages/MatchPage.tsx`, `src/components/matches/`

- [ ] `teamRandomizer.ts`:

```ts
export function randomizeTeams(pool: Player[], format: MatchFormat) {
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  const size = FORMAT_TEAM_SIZE[format]
  return {
    teamA: shuffled.slice(0, size),
    teamB: shuffled.slice(size, size * 2),
    subQueue: shuffled.slice(size * 2),
  }
}
```

- [ ] `MatchSetup`: format picker, target score stepper, Randomize button (calls `matchStore.randomize`), player assignment (tap to move between Team A / Sub / Team B), Re-shuffle, Start Match
- [ ] `ActiveMatch`:
  - Team A (blue) | Team B (red) score sections with large numerals
  - `+1` / `+2` buttons (non-5v5) or `+2` / `+3` (5v5) per team
  - "START GAME" button → records `gameTimerStart`; "END GAME" → `matchStore.commitGame()`
  - Compact game history strip: scrollable chips `G1: 11–7 (12m)`
  - Floating bar: Roster button → `RosterSheet` | End Match button → `useSaveMatch` → `MatchRecap`
- [ ] `RosterSheet`: bottom sheet, three columns, tap to move players; confirm
- [ ] `MatchRecap`: callout cards from `recapGenerator.matchRecap()`; Quick Rematch button
- [ ] On save: insert match + games + activity record; invalidate queries; navigate to recap
- [ ] Commit: `feat: match logging flow`

---

### Task 13: Competitive Games

**Files:** `src/pages/CompetitiveGamePage.tsx`, `src/components/competitiveGames/`

- [ ] `CompetitiveGameSetup`: type selector chips; conditional params per type; player picker from active session pool; Start
- [ ] `BanksInput`: spot display + `DragRankList` (drag chips to set elimination order) + optional winner score
- [ ] `MiddiesInput`: player grid with stepper per player (0 to quota)
- [ ] `NextInput`: target makes display + number input per participant
- [ ] `GenericInput`: activity name + rank/score per participant
- [ ] On save: `useSaveCompetitiveGame` (Middies also writes HeatEntries for Mid%) + `ActivityRecord` + navigate to `ActivityRecap`
- [ ] `ActivityRecap`: callouts from `recapGenerator.competitiveRecap()`
- [ ] Commit: `feat: competitive games`

---

### Task 14: Drills

**Files:** `src/pages/DrillPage.tsx`, `src/components/drills/`

- [ ] `DrillSetup`: shot type picker, spot multi-select toggles (5 buttons, shown for midRange + threePoint), heat size picker (5/10/15/20), makes target (solo only), player multi-select; Start
- [ ] `ActiveDrill`:
  - Spot queue strip: horizontal row, active = white, completed = green, upcoming = grey
  - Current player in large text
  - Makes counter: `−` and `+` buttons (min 44px) + attempts display `X / heatSize`
  - Heat history: scrollable list `H1: 8/10 · 80%`
  - "Save Heat & Rotate" button: calls `drillStore.commitHeat()` → auto-advance with green flash when target hit
  - "End Drill" floating button → `useSaveDrill` → `DrillRecap`
- [ ] `DrillRecap`: session total, best spot, spot to watch, heat trend from `recapGenerator.drillRecap()`
- [ ] Commit: `feat: drill logging`

---

### Task 15: Recap Engine + Session Recap

**Files:** `src/utils/recapGenerator.ts`, `src/pages/SessionRecapPage.tsx`

- [ ] `recapGenerator.ts` — pure functions, no network calls:

```ts
export function matchRecap(match: Match, games: Game[], players: Player[]): RecapCallout[] {
  const aWins = games.filter(g => g.team_a_score > g.team_b_score).length
  const bWins = games.filter(g => g.team_b_score > g.team_a_score).length
  const closest = games.reduce((p, g) =>
    Math.abs(g.team_a_score - g.team_b_score) < Math.abs(p.team_a_score - p.team_b_score) ? g : p
  )
  const longest = games.reduce((p, g) => g.duration_seconds > p.duration_seconds ? g : p)
  return [
    { label: 'Result', value: `Team A ${aWins} – ${bWins} Team B` },
    { label: 'Closest game', value: `Game ${closest.game_number} — ${closest.team_a_score}–${closest.team_b_score}, ${Math.round(closest.duration_seconds/60)} min` },
    { label: 'Longest game', value: `Game ${longest.game_number} — ${Math.round(longest.duration_seconds/60)} min` },
  ]
}

export function drillRecap(drill: Drill, heats: HeatEntry[], player?: Player): RecapCallout[] { ... }
export function sessionRecap(session: Session, games: Game[], heats: HeatEntry[]): RecapCallout[] { ... }
export function competitiveRecap(game: CompetitiveGame, results: CompetitiveResult[], players: Player[]): RecapCallout[] { ... }
```

- [ ] `SessionRecapPage`: fetches session + all child data by session ID from route params; renders `RecapCallout` cards; "Done" → navigate to `/`
- [ ] Commit: `feat: recap engine + session recap page`

---

### Task 16: Routing

**File:** `src/App.tsx`

- [ ] Wire all routes:

```tsx
<Routes>
  <Route path="/" element={<DashboardPage />} />
  <Route path="/calendar" element={<CalendarPage />} />
  <Route path="/players" element={<PlayerListPage />} />
  <Route path="/players/:id" element={<PlayerProfilePage />} />
  <Route path="/match" element={<MatchPage />} />
  <Route path="/drill" element={<DrillPage />} />
  <Route path="/activity" element={<CompetitiveGamePage />} />
  <Route path="/session-recap/:id" element={<SessionRecapPage />} />
</Routes>
```

- [ ] Every page has an explicit `←` back button (no relying on browser back — iOS standalone mode has no back gesture)
- [ ] Commit: `feat: all routes wired`

---

## Phase 5 — Deploy

### Task 17: Vercel Deploy

- [ ] Push repo to GitHub
- [ ] Vercel → New Project → import from GitHub
- [ ] Framework preset: Vite (auto-detected)
- [ ] Add environment variables in Vercel dashboard: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- [ ] Deploy → get `*.vercel.app` URL
- [ ] Open URL in iPhone Safari → Share → "Add to Home Screen" → install
- [ ] Verify: opens fullscreen, no browser chrome, data persists across app restarts
- [ ] Commit: `chore: production deploy`

---

## Definition of Done

- [ ] Installable from Safari on iPhone — standalone, no browser chrome
- [ ] Can log a full session: open → match → drill → competitive game → end → recap
- [ ] Player profile shows correct W/L and shooting % from Supabase data
- [ ] Shot chart zones colored correctly; court lines always visible above fills
- [ ] Data persists across app restarts (Supabase)
- [ ] Vercel deploy is live and reachable

---

## Deferred (v2)

- Auth / multi-device sync (upgrade anon key to user auth)
- Fairness-weighted team randomizer
- Interior shot sub-parameters
- Date-range stat filters
- Trend charts
- CSV export

---

## Open Questions (resolve before starting)

1. **Drill spot completion mid-heat:** Auto-advance immediately when makes target hit, or finish the heat? → Recommend: finish the heat.
2. **Session Recap:** Automatic on End Session, or opt-in? → Recommend: automatic.
3. **Activity Feed detail:** Type + outcome only, or game-level? → Recommend: one line per activity.

---

## Implementation Kickoff Prompt

```
You are implementing TAP (Talking About Practice) — a React PWA basketball session logger.

Stack: Vite + React 18 + TypeScript, TailwindCSS, @supabase/supabase-js, @tanstack/react-query,
Zustand, React Router v6, vite-plugin-pwa. Deployed on Vercel.

Full implementation plan: docs/plans/2026-06-02-tap-implementation.md — read it in full first.
PRD (source of truth for product behavior): docs/TAP_PRD_v5_3.md

Architecture rules:
1. Supabase is the only persistence layer. No localStorage, no IndexedDB.
2. No auth — anon key only. RLS is disabled on all tables.
3. Zustand stores hold ONLY in-progress runtime state (match timer, drill heat state, active session ID).
   All persisted data goes through TanStack Query → Supabase.
4. All input is post-fact. Never build live tracking flows.
5. All tap targets min 44px height. One-handed use. Large buttons throughout.
6. Shot chart: zone fills rgba opacity 0.5. Court lines rendered LAST in SVG (always on top). Hard requirement.
7. Every page has an explicit ← back button. Do not rely on browser history in PWA standalone mode.

Environment variables (in .env.local, also set in Vercel):
  VITE_SUPABASE_URL=...
  VITE_SUPABASE_ANON_KEY=...

Start at Task 1. npm run build must pass with zero TS errors before moving to each next task.
```
