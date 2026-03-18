-- ============================================================
-- The Ortho Toolbox — Supabase Schema
-- Run this entire file in your Supabase SQL Editor once.
-- ============================================================

-- Practices table
CREATE TABLE IF NOT EXISTS practices (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name           TEXT        NOT NULL,
  phone          TEXT,
  address        TEXT,
  website        TEXT,
  email          TEXT,
  status         TEXT        NOT NULL DEFAULT 'not_contacted'
                             CHECK (status IN (
                               'not_contacted',
                               'called',
                               'left_voicemail',
                               'said_not_right_now',
                               'not_interested',
                               'demo_scheduled'
                             )),
  google_place_id TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partial unique index: two practices can both have NULL phone,
-- but no two practices can share the same non-null phone number.
CREATE UNIQUE INDEX IF NOT EXISTS practices_phone_unique
  ON practices (phone)
  WHERE phone IS NOT NULL;

-- Outreach notes table (running log per practice)
CREATE TABLE IF NOT EXISTS outreach_notes (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  practice_id UUID        NOT NULL REFERENCES practices (id) ON DELETE CASCADE,
  call_date   DATE        NOT NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup of notes by practice
CREATE INDEX IF NOT EXISTS outreach_notes_practice_idx
  ON outreach_notes (practice_id, call_date DESC);

-- Auto-update updated_at on practices
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER practices_updated_at
  BEFORE UPDATE ON practices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
