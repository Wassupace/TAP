-- v5.8 additions

-- State validation for sessions
ALTER TABLE sessions
  ADD CONSTRAINT sessions_state_valid
  CHECK (state IN ('planned', 'active', 'completed'));
