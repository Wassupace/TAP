-- ============================================================
-- TAP local dev DB init
-- Runs before the schema migration (000_ prefix = first)
-- ============================================================

-- Enable pgcrypto for any UUID helpers (gen_random_uuid is
-- built-in since PG13, but this doesn't hurt)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- PostgREST anonymous role — used for all unauthenticated requests
CREATE ROLE anon NOLOGIN;

-- Grant anon access to the public schema
GRANT USAGE ON SCHEMA public TO anon;

-- Grant all DML on current and future tables/sequences
-- (ALTER DEFAULT PRIVILEGES covers tables created by migrations)
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO anon;
