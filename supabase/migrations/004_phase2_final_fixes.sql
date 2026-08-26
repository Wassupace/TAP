-- Phase 2 final review fix wave

-- Fix 1: useTodaysPlannedSession() (src/hooks/useSessions.ts) now orders by
-- `created_at` so that when two `state: 'planned'` sessions land on the same
-- date (a collision Task 6's weekly-recurrence feature makes newly easy),
-- the earliest-created one wins deterministically instead of whichever row
-- Postgres happened to return first. The `sessions` table (001_initial_
-- schema.sql) never had a `created_at` column — unlike `players` and
-- `activity_records`, which do — so this adds it, defaulting existing rows
-- to `now()` at migration time and every future insert to its own creation
-- time.
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
