-- Pass & Verification System schema
-- Single table, no soft deletes, no extra tables.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- CREATE TYPE has no IF NOT EXISTS in Postgres, so this is wrapped to make
-- the migration safely re-runnable (e.g. on every deploy).
DO $$ BEGIN
  CREATE TYPE pass_status AS ENUM ('PENDING', 'USED', 'EXPIRED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS passes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            VARCHAR(16) NOT NULL UNIQUE,
  guest_name      VARCHAR(255) NOT NULL,
  host_reference  VARCHAR(255) NOT NULL,
  valid_date      DATE NOT NULL,
  status          pass_status NOT NULL DEFAULT 'PENDING',
  used_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lookup by code is the hot path (verify endpoint) — unique index covers it,
-- but an explicit index documents intent and survives if the constraint
-- implementation ever changes.
CREATE INDEX IF NOT EXISTS idx_passes_code ON passes (code);
