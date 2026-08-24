-- Biblioteca central: notas reutilizáveis + tag de cliente/projeto no portfólio.
CREATE TABLE IF NOT EXISTS note_library (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL DEFAULT '',
  body       TEXT NOT NULL DEFAULT '',
  pinned     INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_nlib_updated ON note_library(updated_at DESC);

ALTER TABLE portfolio_library ADD COLUMN client_tag TEXT;
