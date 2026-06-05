-- ============================================================
-- TAP — Talking About Practice · Initial Schema
-- ============================================================

CREATE TABLE IF NOT EXISTS players (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  nickname       text not null,
  photo_url      text,
  target_ft_percent  float default 0.75,
  target_mid_percent float default 0.50,
  target_3pt_percent float default 0.40,
  created_at     timestamptz default now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id                  uuid primary key default gen_random_uuid(),
  date                date not null,
  location            text not null,
  state               text not null default 'planned',
  started_at          timestamptz,
  ended_at            timestamptz,
  is_recurring        boolean default false,
  recurrence_weekday  int,
  expected_player_ids uuid[] default '{}'
);

CREATE TABLE IF NOT EXISTS session_attendances (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid references sessions(id) on delete cascade,
  player_id   uuid references players(id) on delete cascade,
  is_expected boolean default true,
  arrived_at  timestamptz,
  departed_at timestamptz
);

CREATE TABLE IF NOT EXISTS activity_records (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid references sessions(id) on delete cascade,
  activity_type text not null,
  reference_id  uuid not null,
  created_at    timestamptz default now(),
  feed_summary  text
);

CREATE TABLE IF NOT EXISTS matches (
  id                   uuid primary key default gen_random_uuid(),
  session_id           uuid references sessions(id) on delete cascade,
  format               text not null,
  target_score         int not null,
  scoring_style        text not null default 'targetScore',
  started_at           timestamptz default now(),
  ended_at             timestamptz,
  team_a_player_ids    uuid[] default '{}',
  team_b_player_ids    uuid[] default '{}',
  sub_queue_player_ids uuid[] default '{}'
);

CREATE TABLE IF NOT EXISTS games (
  id                uuid primary key default gen_random_uuid(),
  match_id          uuid references matches(id) on delete cascade,
  game_number       int not null,
  team_a_score      int default 0,
  team_b_score      int default 0,
  duration_seconds  int default 0,
  started_at        timestamptz,
  ended_at          timestamptz,
  team_a_player_ids uuid[] default '{}',
  team_b_player_ids uuid[] default '{}'
);

CREATE TABLE IF NOT EXISTS drills (
  id                    uuid primary key default gen_random_uuid(),
  session_id            uuid references sessions(id) on delete cascade,
  shot_type             text not null,
  selected_spots        text[] default '{}',
  heat_size             int default 10,
  makes_target_per_spot int,
  player_ids            uuid[] default '{}',
  started_at            timestamptz default now(),
  ended_at              timestamptz
);

CREATE TABLE IF NOT EXISTS heat_entries (
  id          uuid primary key default gen_random_uuid(),
  drill_id    uuid references drills(id) on delete cascade,
  player_id   uuid references players(id) on delete cascade,
  spot        text,
  makes       int default 0,
  attempts    int default 0,
  heat_number int default 1,
  recorded_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS competitive_games (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid references sessions(id) on delete cascade,
  game_type       text not null,
  spot            text,
  quota_per_player int,
  custom_name     text,
  player_ids      uuid[] default '{}',
  started_at      timestamptz default now(),
  ended_at        timestamptz
);

CREATE TABLE IF NOT EXISTS competitive_results (
  id        uuid primary key default gen_random_uuid(),
  game_id   uuid references competitive_games(id) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  rank      int not null,
  score     int,
  makes     int,
  attempts  int
);

-- Grant anon role access to all tables (role was created in 000_init.sql)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
