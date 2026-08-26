-- Phase 3: Duration Wave mode (PRD §5.1)
-- `matches.target_score` was `not null`, but a Duration Wave match has no
-- target score at all (it's timed, not scored-to). Made nullable rather
-- than defaulting to 0 so a Duration Wave row's absent target is
-- unambiguous. `duration_minutes` is the Wave-mode counterpart, nullable
-- for the same reason a Target match has no duration.
ALTER TABLE matches ALTER COLUMN target_score DROP NOT NULL;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS duration_minutes int;
