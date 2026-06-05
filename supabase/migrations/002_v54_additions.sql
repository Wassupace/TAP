-- v5.4 additions

-- Hand tracking for drills
ALTER TABLE drills ADD COLUMN IF NOT EXISTS hand text NOT NULL DEFAULT 'right';
ALTER TABLE drills ADD CONSTRAINT drills_hand_valid CHECK (hand IN ('left', 'right'));

-- Hand tracking for heat entries
ALTER TABLE heat_entries ADD COLUMN IF NOT EXISTS hand text NOT NULL DEFAULT 'right';
ALTER TABLE heat_entries ADD CONSTRAINT heat_entries_hand_valid CHECK (hand IN ('left', 'right'));

-- Free-text session notes
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS notes text;
