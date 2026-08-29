-- Household sync storage (one row per household code). Apply once:
--   npx wrangler d1 execute parenthood --remote --file=schema.sql
CREATE TABLE IF NOT EXISTS households (
  code TEXT PRIMARY KEY,
  version INTEGER NOT NULL,
  snapshot TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS households_updated_at ON households (updated_at);
