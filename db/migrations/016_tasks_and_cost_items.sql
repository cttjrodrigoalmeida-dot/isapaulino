-- Módulos "Tarefas" (Produção) e "Tabela de custos" (Gestão).
-- Tarefas: módulo próprio (prioridade, projeto/cliente) conectado ao Calendário
-- por `due_date`. Tabela de custos: catálogo de serviços/preços do estúdio.

CREATE TABLE IF NOT EXISTS tasks (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  notes       TEXT,
  priority    TEXT NOT NULL DEFAULT 'normal',   -- 'baixa' | 'normal' | 'alta'
  status      TEXT NOT NULL DEFAULT 'aberta',   -- 'aberta' | 'fazendo' | 'concluida'
  due_date    TEXT,                             -- 'YYYY-MM-DD' (opcional)
  contract_id TEXT,                             -- projeto (contrato) vinculado
  client_id   TEXT,                             -- cliente vinculado
  done_at     TEXT,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date);

CREATE TABLE IF NOT EXISTS cost_items (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  category    TEXT,
  unit        TEXT,
  cost        REAL NOT NULL DEFAULT 0,
  price       REAL NOT NULL DEFAULT 0,
  notes       TEXT,
  active      INTEGER NOT NULL DEFAULT 1,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_cost_items_cat ON cost_items(category);
