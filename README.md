# TAP PWA

Talking About Practice (TAP) is an installable Progressive Web App for logging pickup basketball sessions, matches, competitive mini-games, and shooting drills.

This app is built for fast post-fact logging between runs and games, with an offline queue and background sync to Supabase.

## Product Context

- Primary spec: docs/TAP_PRD_v5_4.md
- Previous spec baseline: docs/TAP_PRD_v5_3.md
- Delivery plan: docs/plans/2026-06-02-tap-implementation.md

## Current Implementation Status

The codebase has a solid technical foundation (routing, state stores, offline queue, sync worker, schema, export plumbing), but several user flows are still using mocked in-page data.

Implemented and wired:
- App shell, routing, dark/light theming, mobile-first UI
- Supabase client setup
- IndexedDB queue for writes (insert, update, delete)
- Background sync worker with online/offline handling
- Zustand stores for session, match, drill, sync
- Database schema migrations for v5.4 fields
- Google OAuth + Sheets export pipeline
- Shot chart component with mode and hand filtering

Partially implemented or mocked UI flows:
- Calendar, attendance, players, profile cards, win/loss, match recap, drill recap, and session recap currently render mostly mocked display data
- Some pages are not yet fully connected to persisted records despite store and schema support

## Tech Stack

- React 19 + TypeScript + Vite
- React Router 7
- TanStack Query 5
- Zustand 5
- Supabase JS 2
- IndexedDB via idb
- Tailwind CSS 4
- Vite PWA plugin

## App Areas and Routes

- Dashboard: /
- Calendar: /calendar
- Attendance: /calendar/attendance/:sessionId
- Players: /players
- Player profile: /players/:id
- Win/Loss breakdown: /players/:id/wl
- Match setup: /match/setup
- Match active: /match/active
- Match recap: /match/recap
- Competitive setup: /activity/setup
- Banks result page: /activity/banks
- Drill: /drill
- Drill recap: /drill/recap
- Session recap: /session-recap/:id
- Settings: /settings
- Sheets export: /settings/sheets

## Data Model

Tables created by migrations:

- players
- sessions
- session_attendances
- activity_records
- matches
- games
- drills
- heat_entries
- competitive_games
- competitive_results

v5.4 additions:
- drills.hand
- heat_entries.hand
- sessions.notes

## Offline and Sync Behavior

Write path:
1. UI calls dbInsert, dbUpdate, or dbDelete
2. Operation is enqueued in IndexedDB first
3. Immediate Supabase write is attempted
4. On success, queue item is removed
5. On failure, queue item remains for later flush

Sync worker:
- Starts on app boot
- Flushes queue every 30 seconds while online
- Reacts to browser online/offline events
- Tracks status and pending count in sync store

## Google Sheets Export

The Settings page includes OAuth connect/disconnect and one-tap export.

Export behavior:
- Creates a spreadsheet if none is linked
- Clears and rewrites tabs on each export
- Writes these tabs:
  - Sessions
  - Matches
  - Competitive Games
  - Drills
  - Players
  - Career Stats

Credentials are optional unless you use Sheets export.

## Prerequisites

- Node.js 20+
- npm 10+
- A Supabase project (recommended for app usage)
- Optional: Google Cloud OAuth credentials for Sheets export

## Environment Variables

Create tap-pwa/.env.local:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

# Optional (only for Google Sheets export)
VITE_GOOGLE_CLIENT_ID=YOUR_GOOGLE_OAUTH_CLIENT_ID
VITE_GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_OAUTH_CLIENT_SECRET
```

Notes:
- The app disables Supabase auth session persistence and token auto-refresh in client config.
- Without Google credentials, the Sheets page shows setup guidance and keeps export disabled.

## Local Development

Install and run:

```bash
cd tap-pwa
npm install
npm run dev
```

Other scripts:

```bash
npm run build
npm run preview
npm run lint
```

## Local Postgres/PostgREST Stack (Optional)

The repo includes a Docker Compose stack for local DB and PostgREST:

- PostgreSQL (port 5433)
- PostgREST
- Nginx gateway (port 54321)

Start it:

```bash
cd tap-pwa
docker compose up -d
```

What this stack is useful for:
- Running migrations locally
- Testing SQL/schema changes
- Basic REST inspection via gateway

## PWA and Deployment

- PWA manifest and service worker are configured in vite.config.ts
- App is installable (standalone display, portrait orientation)
- SPA routing rewrite is configured for Vercel in vercel.json

Deploy flow:
1. Push to repository linked to Vercel
2. Configure environment variables in Vercel project settings
3. Build and deploy

## Project Structure

Top-level workspace:

- docs
  - PRD and implementation planning artifacts
- tap-pwa
  - Vite React app
  - supabase/migrations for schema
  - docker files for local backend stack

Inside tap-pwa/src:

- pages: route-level screens
- components: UI and feature components
- stores: Zustand state containers
- lib: Supabase, queue/sync, Sheets export helpers
- hooks: online status and attendance stats
- types: app domain types and constants

## Known Gaps / Next Work

- Replace mocked page data with Supabase-backed queries/mutations across calendar, attendance, players, and recap flows
- Persist active session lifecycle end-to-end (planned -> active -> completed) from UI
- Connect activity feed to activity_records
- Expand export to include additional derived match and competitive result analytics
- Add automated tests for offline queue, sync retries, and route-level flows
- Add production icon assets in public/icons to fully match the PWA manifest references

## License

Internal project prototype. Add an explicit license before public distribution.
