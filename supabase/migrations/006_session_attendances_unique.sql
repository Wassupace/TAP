-- Fix: session_attendances.upsert(..., { onConflict: 'session_id,player_id' })
-- has been called since Phase 2 (useActivateSession, AttendancePage) but no
-- migration ever added a matching unique constraint — PostgREST/Postgres
-- reject an upsert whose ON CONFLICT target has no matching unique index
-- with a 400 ("no unique or exclusion constraint matching the ON CONFLICT
-- specification"), silently swallowed by every call site's try/catch. Found
-- via E2E testing of Phase 3's "Start Now" flow (which activates a session
-- and upserts attendance for its expected roster).
ALTER TABLE session_attendances
  ADD CONSTRAINT session_attendances_session_player_unique UNIQUE (session_id, player_id);
