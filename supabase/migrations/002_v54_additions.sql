-- v5.4 additions

-- Hand tracking for drills
ALTER TABLE drills      ADD COLUMN IF NOT EXISTS hand text NOT NULL DEFAULT 'right';

-- Hand tracking for heat entries
ALTER TABLE heat_entries ADD COLUMN IF NOT EXISTS hand text NOT NULL DEFAULT 'right';

-- Free-text session notes
ALTER TABLE sessions    ADD COLUMN IF NOT EXISTS notes text;
