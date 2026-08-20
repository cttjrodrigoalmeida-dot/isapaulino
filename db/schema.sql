-- ============================================================
-- Schema do banco D1 (Isabela Paulino Studio)
-- Aplicar local:  npm run db:apply:local
-- Aplicar remoto: npm run db:apply:remote
-- ============================================================

-- Usuários do painel admin (login). Normalmente 1 linha (a Isabela).
-- A senha é guardada como hash PBKDF2 (ver scripts/hash-password.mjs).
CREATE TABLE IF NOT EXISTS admin_users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE,
  name          TEXT,                          -- nome de exibição (topo do painel)
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
-- NOTA (migração de bancos já criados): rodar UMA vez:
--   ALTER TABLE admin_users ADD COLUMN name TEXT;

-- Propostas. Em vez de normalizar o objeto Proposal (muito aninhado) em
-- dezenas de tabelas, guardamos algumas colunas indexadas para LISTAR e
-- o objeto Proposal INTEIRO em JSON na coluna `data`. A página pública
-- e o editor consomem o mesmo tipo `Proposal` (src/components/proposal/types.ts).
CREATE TABLE IF NOT EXISTS proposals (
  number        TEXT PRIMARY KEY,           -- ex.: "2624" (= /proposta/2624)
  client        TEXT,                       -- para a listagem
  service_title TEXT,                       -- para a listagem
  date          TEXT,                       -- para a listagem
  status        TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'published' (visibilidade)
  -- Resultado comercial (definido manualmente): 'aprovada' | 'nao-aprovada'.
  -- Só 'aprovada' entra no faturamento/indicadores. Nova proposta nasce 'nao-aprovada'.
  outcome       TEXT NOT NULL DEFAULT 'nao-aprovada',
  -- Senha de acesso opcional. Se preenchida, a página pública exige essa senha
  -- (o admin cria e envia ao cliente). NULL/vazio = proposta com link público.
  access_password TEXT,
  -- URL personalizada opcional (ex.: "2650-DaniloFerreira"). É um ALIAS: a
  -- proposta continua resolvendo por `number` E por este slug. NULL = só o número.
  custom_slug   TEXT,
  -- Apoio PESSOAL do admin ao montar a proposta (não vai para o cliente):
  editor_notes  TEXT,                       -- bloco de notas do editor
  editor_done   TEXT,                       -- JSON array de ids de seção "revisadas"
  data          TEXT NOT NULL,              -- JSON do tipo Proposal
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
-- Migração p/ bancos já existentes (rodar uma vez, local e remoto):
--   ALTER TABLE proposals ADD COLUMN outcome TEXT NOT NULL DEFAULT 'nao-aprovada';
--   ALTER TABLE proposals ADD COLUMN access_password TEXT;
--   ALTER TABLE proposals ADD COLUMN custom_slug TEXT;
--   ALTER TABLE proposals ADD COLUMN editor_notes TEXT;
--   ALTER TABLE proposals ADD COLUMN editor_done TEXT;

CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_updated ON proposals(updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_proposals_slug ON proposals(custom_slug) WHERE custom_slug IS NOT NULL;

-- Briefings. Mesmo padrão das propostas: colunas de listagem + objeto
-- Briefing inteiro em JSON. Linkado a uma proposta (proposal_number).
-- (number = número da proposta vinculada → /briefing/<number>.)
CREATE TABLE IF NOT EXISTS briefings (
  number          TEXT PRIMARY KEY,
  proposal_number TEXT,
  title           TEXT,
  status          TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'published'
  data            TEXT NOT NULL,                 -- JSON do tipo Briefing
  -- Apoio PESSOAL do admin ao preencher (não vai para o cliente):
  editor_notes    TEXT,                          -- bloco de notas do editor
  editor_done     TEXT,                          -- JSON array de ids de seção marcadas "preenchidas"
  -- Bloqueio manual das respostas: NULL = cliente pode editar; timestamp = congelado
  -- (o cliente só visualiza; o admin ainda pode editar pelo painel).
  locked_at       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
-- Migração p/ bancos já existentes (rodar uma vez, local e remoto):
--   ALTER TABLE briefings ADD COLUMN editor_notes TEXT;
--   ALTER TABLE briefings ADD COLUMN editor_done TEXT;
--   ALTER TABLE briefings ADD COLUMN locked_at TEXT;

CREATE INDEX IF NOT EXISTS idx_briefings_status ON briefings(status);
CREATE INDEX IF NOT EXISTS idx_briefings_updated ON briefings(updated_at DESC);

-- Respostas enviadas pelos clientes (submit público do briefing).
-- answers = JSON { questionId: resposta }.
CREATE TABLE IF NOT EXISTS briefing_responses (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  briefing_number TEXT NOT NULL,
  client          TEXT,
  answers         TEXT NOT NULL,
  ref_images      TEXT,                          -- JSON { questionId: url } (anexos no R2)
  submitted_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_responses_briefing ON briefing_responses(briefing_number);
CREATE INDEX IF NOT EXISTS idx_responses_submitted ON briefing_responses(submitted_at DESC);

-- Biblioteca de perguntas reutilizáveis do briefing (cadastra 1x, reusa em
-- qualquer briefing). `data` = JSON de uma BriefingQuestion (sem id/pin).
CREATE TABLE IF NOT EXISTS question_library (
  id         TEXT PRIMARY KEY,               -- uuid
  label      TEXT NOT NULL,                  -- nome amigável na biblioteca
  data       TEXT NOT NULL,                  -- JSON da BriefingQuestion
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_qlib_updated ON question_library(updated_at DESC);

-- Biblioteca de PORTFÓLIO reutilizável (sobe 1x, reusa em qualquer proposta).
-- Guarda só a URL da imagem (mesmo objeto no R2) + legenda → não duplica
-- armazenamento: várias propostas apontam para o mesmo arquivo.
CREATE TABLE IF NOT EXISTS portfolio_library (
  id         TEXT PRIMARY KEY,               -- uuid
  image      TEXT NOT NULL,                  -- caminho /api/files/uploads/... (R2)
  caption    TEXT,                           -- legenda opcional
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_plib_created ON portfolio_library(created_at DESC);

-- Biblioteca de BLOCOS de investimento reutilizáveis (salva 1x, reusa em
-- qualquer proposta). `data` = JSON de um InvestmentBlock.
CREATE TABLE IF NOT EXISTS block_library (
  id         TEXT PRIMARY KEY,               -- uuid
  label      TEXT NOT NULL,                  -- nome amigável na biblioteca
  data       TEXT NOT NULL,                  -- JSON do InvestmentBlock
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_blib_updated ON block_library(updated_at DESC);

-- Clientes do estúdio. Campos planos (sem JSON aninhado), CRUD pelo painel.
-- cpf_cnpj e email são opcionais, mas validados quando preenchidos.
CREATE TABLE IF NOT EXISTS clients (
  id            TEXT PRIMARY KEY,            -- uuid
  name          TEXT NOT NULL,
  cpf_cnpj      TEXT,
  email         TEXT,
  phone         TEXT,
  address       TEXT,
  city          TEXT,
  state         TEXT,
  role          TEXT,                        -- profissão/papel (ex.: "ARQUITETO E URBANISTA")
  nacionalidade TEXT,                        -- ex.: "Brasileiro(a)"
  birth_date    TEXT,                        -- nascimento (texto livre; usado p/ aniversariantes)
  photo_url     TEXT,                        -- foto/avatar do cliente (URL pública no R2)
  access_enabled INTEGER NOT NULL DEFAULT 0, -- 1 = acesso à Área do Cliente liberado
  access_token_version INTEGER NOT NULL DEFAULT 1, -- ++ ao "gerar novo link" (revoga os antigos)
  username      TEXT,                        -- usuário de acesso (Área do Cliente); único
  password_hash TEXT,                        -- senha (PBKDF2); só o admin define/altera
  avatar        TEXT,                        -- avatar ilustrado escolhido (id em src/avatars.tsx)
  gender        TEXT,                        -- f|m|n (prioriza avatares compatíveis)
  deleted_at    TEXT,                        -- soft-delete (lixeira); NULL = ativo
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_username ON clients(username) WHERE username IS NOT NULL;
-- NOTA (migração de bancos já criados): rodar UMA vez em bancos existentes:
--   ALTER TABLE clients ADD COLUMN role TEXT;
--   ALTER TABLE clients ADD COLUMN nacionalidade TEXT;
--   ALTER TABLE clients ADD COLUMN birth_date TEXT;
--   ALTER TABLE clients ADD COLUMN photo_url TEXT;
--   ALTER TABLE clients ADD COLUMN access_enabled INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_updated ON clients(updated_at DESC);

-- Contratos. Documento estruturado 100% personalizável (igual proposta/briefing):
-- o objeto ContractDoc INTEIRO fica em JSON na coluna `data`; algumas colunas
-- planas (title, value, status, slug…) são mantidas para LISTAR e para os
-- pagamentos/ASAAS. A coluna `content` (HTML do editor antigo) fica legada.
-- Ao publicar, gera um slug único para a página pública /contrato/<slug>.
-- autentique_url: link de assinatura (colado manualmente nesta fase).
-- NOTA (migração de bancos já criados): a coluna `data` foi adicionada depois.
-- Em bancos existentes rodar UMA vez (SQLite não tem ADD COLUMN IF NOT EXISTS):
--   ALTER TABLE contracts ADD COLUMN data TEXT;
CREATE TABLE IF NOT EXISTS contracts (
  id             TEXT PRIMARY KEY,              -- uuid
  client_id      TEXT NOT NULL,
  title          TEXT NOT NULL,
  content        TEXT NOT NULL DEFAULT '',      -- HTML do Tiptap (legado)
  data           TEXT,                          -- JSON do tipo ContractDoc (documento rico)
  value          REAL,                          -- valor total (para listagem/financeiro)
  deadline       TEXT,                          -- prazo (texto livre, legado)
  status         TEXT NOT NULL DEFAULT 'draft', -- draft|published|signed|cancelled
  slug           TEXT UNIQUE,                   -- gerado ao publicar
  autentique_url TEXT,                          -- link de assinatura (Autentique)
  autentique_document_id TEXT,                  -- id do documento na Autentique (quando enviado)
  signed_at      TEXT,                          -- data/hora da assinatura (preenchida pelo webhook)
  deleted_at     TEXT,                          -- soft-delete (lixeira); NULL = ativo
  -- Apoio PESSOAL do admin ao editar (não vai para o cliente / página pública):
  editor_notes   TEXT,                          -- bloco de notas do editor
  editor_done    TEXT,                          -- JSON array de ids de seção marcadas "revisadas"
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  published_at   TEXT,
  FOREIGN KEY (client_id) REFERENCES clients(id)
);
-- NOTA (migração de bancos já criados): rodar UMA vez em bancos existentes:
--   ALTER TABLE contracts ADD COLUMN autentique_document_id TEXT;
--   ALTER TABLE contracts ADD COLUMN signed_at TEXT;
--   ALTER TABLE contracts ADD COLUMN editor_notes TEXT;
--   ALTER TABLE contracts ADD COLUMN editor_done TEXT;

CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_updated ON contracts(updated_at DESC);

-- Configuração de pagamento de um contrato (valor total, entrada, nº parcelas).
CREATE TABLE IF NOT EXISTS contract_payments (
  id                 TEXT PRIMARY KEY,            -- uuid
  contract_id        TEXT NOT NULL,
  total_value        REAL NOT NULL,
  down_payment       REAL NOT NULL DEFAULT 0,
  installments_count INTEGER NOT NULL,
  status             TEXT NOT NULL DEFAULT 'pending',
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (contract_id) REFERENCES contracts(id)
);

CREATE INDEX IF NOT EXISTS idx_contract_payments_contract ON contract_payments(contract_id);

-- Parcelas individuais de um contrato. asaas_payment_id liga à cobrança no ASAAS
-- (preenchido só quando a integração estiver ativa). installment_number 0 = entrada.
CREATE TABLE IF NOT EXISTS installments (
  id                 TEXT PRIMARY KEY,            -- uuid
  contract_id        TEXT NOT NULL,
  payment_config_id  TEXT,
  asaas_payment_id   TEXT UNIQUE,
  invoice_url        TEXT,                        -- link de pagamento (fatura ASAAS)
  installment_number INTEGER NOT NULL,
  due_date           TEXT NOT NULL,               -- 'YYYY-MM-DD'
  amount             REAL NOT NULL,
  status             TEXT NOT NULL DEFAULT 'pending', -- pending|confirmed|received|overdue|deleted
  payment_date       TEXT,
  payment_method     TEXT,
  notes              TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (contract_id) REFERENCES contracts(id)
);

CREATE INDEX IF NOT EXISTS idx_installments_contract ON installments(contract_id);
CREATE INDEX IF NOT EXISTS idx_installments_status ON installments(status);
CREATE INDEX IF NOT EXISTS idx_installments_asaas ON installments(asaas_payment_id);

-- Log dos webhooks recebidos do ASAAS (auditoria/idempotência).
CREATE TABLE IF NOT EXISTS asaas_logs (
  id               TEXT PRIMARY KEY,              -- uuid
  webhook_event_id TEXT,
  event_type       TEXT NOT NULL,
  asaas_payment_id TEXT,
  installment_id   TEXT,
  payload          TEXT,
  processed_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Histórico Financeiro (HF): lançamentos de serviços/alterações FORA do contrato,
-- por cliente (retrabalho, adicionais, hora técnica…). Somados no admin e podem
-- virar cobrança no ASAAS (asaas_payment_id), rastreada pelo mesmo webhook.
CREATE TABLE IF NOT EXISTS client_history (
  id               TEXT PRIMARY KEY,                  -- uuid
  client_id        TEXT NOT NULL,
  contract_id      TEXT,                              -- opcional: vincula a um contrato
  date             TEXT NOT NULL DEFAULT (date('now')),
  description      TEXT NOT NULL,
  amount           REAL NOT NULL DEFAULT 0,
  kind             TEXT NOT NULL DEFAULT 'adicional', -- adicional|retrabalho|hora-tecnica|outro
  status           TEXT NOT NULL DEFAULT 'pending',   -- pending|charged|paid|cancelled
  asaas_payment_id TEXT UNIQUE,
  invoice_url      TEXT,                              -- link de pagamento (fatura ASAAS)
  paid_at          TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (client_id)   REFERENCES clients(id),
  FOREIGN KEY (contract_id) REFERENCES contracts(id)
);
CREATE INDEX IF NOT EXISTS idx_client_history_client ON client_history(client_id);
CREATE INDEX IF NOT EXISTS idx_client_history_status ON client_history(status);
CREATE INDEX IF NOT EXISTS idx_client_history_asaas ON client_history(asaas_payment_id);

-- Agenda do painel: tarefas e compromissos por dia (calendário da dashboard).
CREATE TABLE IF NOT EXISTS calendar_events (
  id         TEXT PRIMARY KEY,                 -- uuid
  date       TEXT NOT NULL,                    -- 'YYYY-MM-DD'
  time       TEXT,                             -- 'HH:MM' (opcional)
  title      TEXT NOT NULL,
  notes      TEXT,
  kind       TEXT NOT NULL DEFAULT 'tarefa',   -- 'tarefa' | 'compromisso'
  done       INTEGER NOT NULL DEFAULT 0,       -- 0 | 1
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_calendar_date ON calendar_events(date);

-- Notificações do painel (sininho). Geradas por eventos: pagamento recebido,
-- contrato assinado, etc. `link` aponta para a seção relevante do admin.
CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT PRIMARY KEY,                 -- uuid
  type       TEXT NOT NULL DEFAULT 'info',     -- payment|signature|info|...
  title      TEXT NOT NULL,
  body       TEXT,
  link       TEXT,                             -- rota/âncora do admin (opcional)
  read       INTEGER NOT NULL DEFAULT 0,       -- 0 | 1
  dedup_key  TEXT UNIQUE,                      -- evita duplicar o mesmo evento
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

-- Configurações do painel (chave→valor). Ex.: meta anual de receita.
CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Logs de auditoria: registra as ações (POST/PUT/DELETE) feitas no painel.
-- Preenchido automaticamente por functions/api/_middleware.ts.
CREATE TABLE IF NOT EXISTS audit_logs (
  id         TEXT PRIMARY KEY,                 -- uuid
  at         TEXT NOT NULL DEFAULT (datetime('now')),
  user       TEXT,                             -- username do admin (ou null)
  action     TEXT NOT NULL,                    -- rótulo legível ("Publicou contrato")
  method     TEXT NOT NULL,                    -- POST | PUT | DELETE
  path       TEXT NOT NULL,                    -- /api/...
  status     INTEGER,                          -- código HTTP da resposta
  ip         TEXT                              -- CF-Connecting-IP (rate limit login)
);
CREATE INDEX IF NOT EXISTS idx_audit_at ON audit_logs(at);

-- Histórico do Projeto (timeline): eventos por CONTRATO (projeto), preenchidos
-- pelo admin. Liberado ao cliente após a assinatura (functions/api/client/overview.ts).
-- Cada `type` tem uma cor no front (src/projectEvents.ts). Não confundir com
-- client_history (financeiro/HF).
CREATE TABLE IF NOT EXISTS project_history (
  id          TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL,
  date        TEXT NOT NULL DEFAULT (date('now')),
  type        TEXT NOT NULL DEFAULT 'observacao',   -- reuniao|entrega|revisao|alteracao|inicio|marco|observacao
  description TEXT NOT NULL DEFAULT '',
  phase       TEXT,                                  -- status/fase do projeto (opcional)
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_project_history_contract ON project_history(contract_id);
