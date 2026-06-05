-- v5.4 additions

-- Hand tracking for drills
ALTER TABLE drills ADD COLUMN IF NOT EXISTS hand text NOT NULL DEFAULT 'right';
DO $$ BEGIN
  ALTER TABLE drills ADD CONSTRAINT drills_hand_valid CHECK (hand IN ('left', 'right'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Hand tracking for heat entries
ALTER TABLE heat_entries ADD COLUMN IF NOT EXISTS hand text NOT NULL DEFAULT 'right';
DO $$ BEGIN
  ALTER TABLE heat_entries ADD CONSTRAINT heat_entries_hand_valid CHECK (hand IN ('left', 'right'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Free-text session notes
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS notes text;
