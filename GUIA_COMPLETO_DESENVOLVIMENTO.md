# GUIA COMPLETO DE DESENVOLVIMENTO
## Sistema de Contratos — Passo a Passo com Prompts e Configurações Manuais

> **Como ler este guia:**
> - 🔴 **[VOCÊ FAZ]** = Ação manual sua, fora do Claude Code
> - 🤖 **[CLAUDE CODE]** = Prompt para colar no Claude Code
> - ✅ **[VALIDAR]** = Checklist para confirmar que está funcionando

---

# 📌 STATUS ATUAL DO PROJETO (Isabela Paulino) — jul/2026

> Esta seção é o **placar vivo** do que está pronto, o que está em STANDBY e o que
> falta. Atualizar sempre que concluir/adiar algo. (O usuário pergunta com frequência
> "está faltando alguma coisa?" — este é o lugar de responder.)

**✅ PRONTO (em produção):**
- Fase 1 (admin, clientes, contratos com editor rico, propostas, briefing, publicar link).
- Fase 2 (ASAAS, webhook, financeiro, parcelas, cobranças).
- Fase 3 (Área do Cliente — via **link mágico sem senha**, decisão do usuário; contrato, pagamentos, HF).
- **Extras além do guia:** PDF automático do contrato p/ Autentique (Browser Rendering), notificações no sininho, meta anual configurável, Relatórios (KPIs + filtro por ano + comparativo + CSV), Arquivos do admin (R2), botões "Verificar assinatura" e "Sincronizar com ASAAS", Histórico Financeiro (HF).

**🔨 EM ANDAMENTO / A FAZER (decisão jul/2026):**
- **Logs de auditoria** (`audit_logs` + tela) — FAZENDO.
- **Arquivos na Área do Cliente** (cliente baixar arquivos do projeto dele) — FAZENDO.

**⏸️ STANDBY (adiado pelo usuário — fazer depois SE necessário):**
- **Fase 4 — E-mails automáticos (SendGrid):** contrato publicado / conta criada / pagamento recebido / atraso + fila `email_queue` + cron. **Motivo do standby:** a Autentique (assinatura) e o ASAAS (cobrança/lembretes) **já enviam e-mails próprios** ao cliente, então pode não ser necessário. Reavaliar.
- **Timeline do projeto com fotos:** cronograma de marcos com imagens (a seção "Projetos" atual é só resumo de volume, não é isso). Standby — usuário não se recorda de precisar.

**⚠️ FEITO DIFERENTE DO GUIA (de propósito, não é pendência):**
- Login do cliente: guia pedia e-mail+senha+troca na 1ª entrada; feito por **link mágico sem senha**. Logo, "troca de senha"/"1ª entrada" não se aplicam.
- Arquitetura: guia assume Next.js/`/admin/login`/`/cliente/login`; o projeto é **SPA Vite** com painel por seções e Área do Cliente em `/area`.

---

---

# ═══════════════════════════════════════════
# PRÉ-REQUISITOS GLOBAIS
# Faça isso UMA VEZ antes de começar qualquer fase
# ═══════════════════════════════════════════

---

## 🔴 [VOCÊ FAZ] — Verificar Ambiente Local

Antes de tudo, garanta que tem instalado na sua máquina:

**Node.js (mínimo v18)**
```
Verificar: node --version
Instalar: https://nodejs.org
```

**npm (vem com Node)**
```
Verificar: npm --version
```

**Wrangler CLI (ferramenta oficial do Cloudflare)**
```
Instalar: npm install -g wrangler
Verificar: wrangler --version
```

**Git**
```
Verificar: git --version
Instalar: https://git-scm.com
```

---

## 🔴 [VOCÊ FAZ] — Login no Cloudflare via Terminal

```bash
wrangler login
```

Esse comando vai:
1. Abrir o navegador
2. Pedir para fazer login no Cloudflare
3. Autorizar o Wrangler
4. Voltar para o terminal com "Successfully logged in"

---

## 🔴 [VOCÊ FAZ] — Clonar o Projeto Localmente

```bash
git clone https://github.com/SEU-USUARIO/SEU-REPO.git
cd SEU-REPO
npm install
```

---

---

# ═══════════════════════════════════════════
# FASE 1: BASE DO SISTEMA
# Admin + Contratos + Propostas + Briefing
# ═══════════════════════════════════════════

---

## 🔴 [VOCÊ FAZ ANTES] — Criar Banco de Dados D1 no Cloudflare

### Passo 1: Criar o banco pelo terminal

```bash
wrangler d1 create sistema-contratos
```

O terminal vai retornar algo assim:
```
✅ Successfully created DB 'sistema-contratos'

[[d1_databases]]
binding = "DB"
database_name = "sistema-contratos"
database_id = "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
```

**⚠️ COPIE E GUARDE o `database_id` que apareceu. Você vai precisar.**

---

### Passo 2: Criar o arquivo wrangler.toml (se não existir)

Na raiz do seu projeto, crie ou edite o arquivo `wrangler.toml`:

```toml
name = "sistema-contratos"
compatibility_date = "2024-01-01"
pages_build_output_dir = ".next"

[[d1_databases]]
binding = "DB"
database_name = "sistema-contratos"
database_id = "COLE-SEU-DATABASE-ID-AQUI"

[vars]
SITE_URL = "https://isabelapaulino.com.br"
ENCRYPTION_KEY = "gere-uma-string-aleatoria-de-32-caracteres"

[[d1_databases]]
binding = "DB"
database_name = "sistema-contratos"
database_id = "COLE-SEU-DATABASE-ID-AQUI"
```

Para gerar um ENCRYPTION_KEY seguro, rode no terminal:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copie o resultado e cole no `ENCRYPTION_KEY`.

---

### Passo 3: Criar arquivo schema.sql

Crie um arquivo `schema.sql` na raiz do projeto com este conteúdo:

```sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'admin',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cpf_cnpj TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  slug TEXT UNIQUE,
  autentique_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  published_at DATETIME,
  FOREIGN KEY(client_id) REFERENCES clients(id)
);

CREATE TABLE IF NOT EXISTS proposals (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  title TEXT NOT NULL,
  value REAL,
  deadline TEXT,
  description TEXT,
  status TEXT DEFAULT 'draft',
  contract_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(client_id) REFERENCES clients(id)
);

-- Briefing: linkado a uma proposta. Cada briefing tem 1+ blocos de imagem,
-- e cada imagem tem perguntas posicionadas por PINOS NUMERADOS (x,y em %).
-- O cliente responde cada pergunta e pode anexar 1 imagem de referência por pergunta.
-- `blocks` guarda o template em JSON (ver formato no front-end: src/components/briefing/types.ts):
--   blocks: [{ id, title, image, note?, questions: [{ id, text, pin:{x,y}, allowReference }] }]
CREATE TABLE IF NOT EXISTS briefings (
  id TEXT PRIMARY KEY,
  proposal_number TEXT,              -- FK lógica → propostas (puxa cliente/projeto/data)
  title TEXT NOT NULL,
  intro TEXT,
  blocks TEXT,                       -- JSON: blocos de imagem + perguntas + pinos
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS briefing_responses (
  id TEXT PRIMARY KEY,
  briefing_id TEXT NOT NULL,
  client_email TEXT,
  client_name TEXT,
  answers TEXT,                      -- JSON: { [questionId]: "resposta em texto" }
  reference_images TEXT,             -- JSON: { [questionId]: r2_key }  (imagens em R2)
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(briefing_id) REFERENCES briefings(id)
);
```

---

### Passo 4: Executar o schema no banco

```bash
# Para desenvolvimento local:
wrangler d1 execute sistema-contratos --local --file=./schema.sql

# Para produção (quando for fazer deploy):
wrangler d1 execute sistema-contratos --remote --file=./schema.sql
```

---

### Passo 5: Criar usuário admin inicial

Você precisa criar seu usuário de admin para conseguir logar no sistema.

1. Gere o hash da sua senha com Node.js:

```bash
node -e "
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('SUA-SENHA-AQUI', 10);
console.log(hash);
"
```

Se bcryptjs não estiver instalado: `npm install bcryptjs`

2. Copie o hash gerado e rode:

```bash
wrangler d1 execute sistema-contratos --local --command "INSERT INTO users (id, email, password_hash, name, role) VALUES ('admin-1', 'seu-email@email.com', 'HASH-AQUI', 'Seu Nome', 'admin')"
```

---

### Passo 6: Vincular D1 ao seu projeto no Cloudflare Dashboard

1. Acesse: https://dash.cloudflare.com
2. Vá em: **Workers & Pages**
3. Clique no seu projeto (isabelapaulino.com.br)
4. Vá em: **Settings → Functions → D1 database bindings**
5. Clique em **Add binding**
6. Variable name: `DB`
7. Selecione o banco: `sistema-contratos`
8. Clique **Save**

---

## 🤖 [CLAUDE CODE] — Prompt Fase 1

Cole este prompt no Claude Code (Antigravity):

```
CONTEXTO DO PROJETO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Projeto: Sistema Web de Gestão de Contratos
Site: isabelapaulino.com.br
Infraestrutura: Cloudflare Pages + Functions + D1 + R2
Frontend: React/Next.js (mesmo padrão do CMS existente)

O projeto JÁ TEM:
- CMS Blog funcionando em /cms
- GitHub conectado ao Cloudflare Pages
- Wrangler.toml configurado com banco D1
- Schema do banco já executado

O QUE VOCÊ VAI FAZER AGORA (Fase 1):
Criar o painel administrativo de contratos integrado ao projeto existente,
sem quebrar nada do que já existe.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSTALE AS DEPENDÊNCIAS NECESSÁRIAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder uuid bcryptjs jose axios react-hook-form zod

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CRIE A SEGUINTE ESTRUTURA DE ARQUIVOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

src/
├─ context/AuthContext.tsx
├─ lib/auth.ts
├─ lib/api.ts
├─ lib/utils.ts
├─ components/admin/
│  ├─ AdminLayout.tsx (sidebar + header)
│  ├─ Sidebar.tsx
│  ├─ Header.tsx
│  ├─ DashboardCard.tsx
│  └─ ContractEditor.tsx (Tiptap WYSIWYG)
├─ components/common/
│  ├─ ProtectedRoute.tsx
│  └─ Loading.tsx
└─ pages/
   ├─ admin/
   │  ├─ login.tsx
   │  ├─ index.tsx (dashboard)
   │  ├─ clients/index.tsx
   │  ├─ clients/[id].tsx
   │  ├─ clients/new.tsx
   │  ├─ contracts/index.tsx
   │  ├─ contracts/[id].tsx
   │  ├─ contracts/new.tsx
   │  ├─ proposals/index.tsx
   │  ├─ proposals/new.tsx
   │  ├─ briefing/index.tsx
   │  └─ briefing/[id].tsx
   ├─ contrato/[id].tsx (página PÚBLICA)
   ├─ proposta/[id].tsx (página PÚBLICA)
   └─ briefing/[id].tsx (página PÚBLICA)

functions/api/
├─ auth/login.ts
├─ auth/logout.ts
├─ auth/validate.ts
├─ clients/index.ts
├─ clients/[id].ts
├─ contracts/index.ts
├─ contracts/[id].ts
├─ proposals/index.ts
├─ proposals/[id].ts
├─ briefing/index.ts
└─ briefing/[id].ts

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FUNCIONALIDADES — IMPLEMENTE NESTA ORDEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. AUTENTICAÇÃO ADMIN (functions/api/auth/)
   - POST /api/auth/login → valida email+senha no D1, retorna JWT
   - POST /api/auth/logout → invalida token
   - GET /api/auth/validate → verifica token ativo
   - JWT com jose, expiração 30min
   - Hash com bcryptjs
   - Rate limiting: máx 5 tentativas/5min por IP

2. PAGES ADMIN (src/pages/admin/)
   - /admin/login → formulário email+senha, chama /api/auth/login
   - /admin → dashboard com cards (total clientes, contratos, etc)
   - Todas as rotas /admin/* verificam token via ProtectedRoute
   - Redireciona para /admin/login se não autenticado

3. LAYOUT ADMIN (src/components/admin/AdminLayout.tsx)
   - Sidebar fixa com menu:
     ├─ Dashboard
     ├─ Clientes
     ├─ Contratos
     ├─ Propostas
     └─ Briefings
   - Header com nome do usuário e botão logout
   - Responsivo (sidebar colapsável no mobile)

4. GESTÃO DE CLIENTES
   - GET /api/clients → listar com paginação
   - POST /api/clients → criar cliente
   - GET /api/clients/[id] → detalhe
   - PUT /api/clients/[id] → editar
   - DELETE /api/clients/[id] → deletar
   - Campos: id(uuid), name, cpf_cnpj, email, phone, address, city, state
   - Validar CPF/CNPJ e email
   - Página /admin/clients → tabela com busca e filtros

5. GESTÃO DE CONTRATOS
   - GET /api/contracts → listar (com filtro: status, cliente, período)
   - POST /api/contracts → criar
   - GET /api/contracts/[id] → detalhe
   - PUT /api/contracts/[id] → editar
   - DELETE /api/contracts/[id] → deletar
   - POST /api/contracts/[id]/publish → publica (gera slug único)
   - Status possíveis: draft, published, signed, cancelled
   - Slug gerado automaticamente: nome-cliente + uuid curto

6. EDITOR DE CONTRATOS (src/components/admin/ContractEditor.tsx)
   - Usar @tiptap/react
   - Toolbar: negrito, itálico, underline, listas, títulos (H1-H3)
   - Preview ao lado direito (live update)
   - Substituir automaticamente no preview:
     {{cliente}} → nome do cliente selecionado
     {{valor}} → valor do contrato
     {{prazo}} → prazo do contrato
     {{data}} → data atual formatada
   - Botão "Salvar Rascunho"
   - Botão "Publicar Contrato" (gera link)

7. GESTÃO DE PROPOSTAS
   - CRUD completo igual ao de contratos (sem editor avançado)
   - Campo adicional: contract_id (opcional, para vincular contrato)

8. BRIEFING ONLINE (briefing sobre imagem, com pinos numerados)

   >>> ATENÇÃO: o desenho deste briefing MUDOU. Não é mais um formulário genérico
   >>> de perguntas. Agora é um briefing VISUAL, linkado a uma proposta:
   >>> a Isabela sobe uma imagem do ambiente (render/foto) e cadastra perguntas
   >>> posicionadas sobre pontos da imagem (PINOS NUMERADOS). O cliente vê a imagem
   >>> com as bolinhas (1,2,3...) e responde cada pergunta no campo correspondente,
   >>> podendo anexar 1 imagem de referência por pergunta.

   >>> ORGANIZAÇÃO POR AMBIENTE: cada bloco do briefing é um AMBIENTE
   >>> (Cozinha/Gourmet, Sala de TV, Banheiro, Quarto, etc.). A página mostra um
   >>> bloco por ambiente (imagem + perguntas) e uma TIMELINE LATERAL (desktop) que
   >>> lista os ambientes, indica a etapa atual (scroll) e marca cada ambiente como
   >>> concluído conforme o cliente responde (ETAPA 0X/0N). No admin será preciso
   >>> CADASTRAR/SELECIONAR ambientes (adicionar "Cozinha", "Quarto", etc.).

   >>> JÁ FEITO (FASE VISUAL, sem backend) — front-end + export PDF:
   >>> - Página pública /briefing/:number (o :number = número da proposta linkada).
   >>>   Arquivos: src/pages/Briefing.tsx, src/components/briefing/{BriefingView.tsx,
   >>>   BriefingView.module.css, types.ts, sampleBriefing.ts}.
   >>> - Modelo de dados editável em src/components/briefing/types.ts:
   >>>     Briefing { number, proposalNumber, title, sections[], contact, studioEmail? }
   >>>     BriefingSection { id, kind: "info" | "ambiente", title, titleLines?, intro?,
   >>>                       image? (só ambiente), questions[] }
   >>>     BriefingQuestion { id, text, hint?, note?, type? (text | longtext | radio |
   >>>                        select | checklist | maquete), options?, placeholder?,
   >>>                        pin?{x,y em %, label?}, required? (default true),
   >>>                        allowReference?, quickFills? }
   >>> - Seção "Informações Iniciais" (kind "info", sem imagem) cobre os vários tipos de
   >>>   pergunta (texto, rádio, checklist de múltipla escolha, card de maquete com
   >>>   e-mail/WhatsApp clicáveis). Cada AMBIENTE (kind "ambiente") = imagem + pinos.
   >>>   Pinos em cor "melancia" (#f0506e) com rótulo opcional abaixo do número (pin.label).
   >>> - Linkagem com a proposta via getProposalByNumber() em
   >>>   src/components/proposal/proposalsRegistry.ts (puxa cliente, projeto, data).
   >>> - TODAS as perguntas são obrigatórias por padrão (required != false); só o
   >>>   anexo de referência é opcional. Ao clicar "Enviar briefing", valida e
   >>>   destaca em vermelho a(s) pergunta(s) pendente(s), rolando até a primeira.
   >>> - Desktop: imagem dá ZOOM ao passar o mouse (transform-origin segue o cursor);
   >>>   timeline lateral animada por progresso; redes fixas no topo-direito e
   >>>   botões flutuantes WhatsApp + Topo (iguais à proposta). Mobile mantém a
   >>>   responsividade (timeline/redes ocultas, blocos empilhados).
   >>> - Respostas do cliente ficam em estado local (texto persiste em localStorage
   >>>   = "salvamento automático"); imagens de referência ficam em memória (object
   >>>   URL). SEM persistência em servidor ainda.
   >>> - Export PDF reutiliza o padrão da proposta (PrintContext + window.print()
   >>>   + @media print): cliente preenche → exporta PDF → envia pra Isabela (WhatsApp).
   >>>   O botão "Exportar PDF" funciona SEMPRE (não é bloqueado pela validação).
   >>> - Botão "Enviar briefing": valida obrigatórias e, se ok, abre o WhatsApp com uma
   >>>   MENSAGEM CURTA avisando que o briefing foi concluído (NÃO manda as respostas
   >>>   inteiras pelo WhatsApp — só o aviso; o conteúdo completo vai pelo PDF/futuro
   >>>   backend). Hoje a "contabilização" é só local: grava um timestamp em
   >>>   localStorage (briefing:<number>:submitted) e mostra "Envio registrado em ..."
   >>>   no rodapé do formulário. Isso NÃO é visível pra Isabela em lugar nenhum — é só
   >>>   feedback pro cliente. Contabilizar de fato pro lado da Isabela depende do
   >>>   backend (ver abaixo).

   >>> A FAZER NESTA FASE (backend + admin):
   Admin (/admin/briefing):
   - CRUD de briefings; cada briefing é LINKADO a uma proposta (selecionar a proposta
     → puxa número/cliente/projeto).
   - Gerenciar AMBIENTES do briefing: adicionar/remover ambientes (Cozinha, Quarto…),
     cada um com sua imagem e seu conjunto de perguntas.
   - >>> CRIAR AMBIENTE DIRETO PELA LINHA DO TEMPO: na timeline lateral, um botão
     >>> "+ adicionar ambiente" cria uma nova etapa; as perguntas de cada ambiente são
     >>> construídas de forma personalizada (texto, escolha, checklist, etc.) SEMPRE
     >>> mantendo o mesmo layout de card mostrado no front (ver tipos em types.ts:
     >>> QuestionType = text | longtext | radio | select | checklist | maquete).
   - Editor visual por ambiente: subir imagem, escrever perguntas e POSICIONAR os pinos
     (clicar na imagem grava x,y em %), definir rótulo do pino (pin.label), marcar se a
     pergunta é obrigatória e se aceita referência.
   - >>> FORMULÁRIO HOJE É FIXO — tornar EDITÁVEL: a Isabela deve poder ADICIONAR e
     >>> EXCLUIR perguntas de cada ambiente (reordenar também seria ideal). Hoje as
     >>> perguntas vêm fixas no sampleBriefing.ts; no admin isso vira CRUD de perguntas.
   - Salvar template em briefings.sections (JSON, formato igual ao types.ts do front).
   - Ver respostas recebidas em /admin/briefing/[id] (texto + imagens de referência do R2),
     incluindo SE E QUANDO o cliente clicou em "Enviar briefing" (status respondido +
     data/hora) — é isso que torna o envio "contabilizado no sistema" de fato (hoje só
     existe um aviso local pro cliente, ver acima; sem backend a Isabela não vê nada).

   Página pública /briefing/[id] (evoluir a página já existente):
   - Já renderiza ambientes + imagem + pinos + caixas de resposta a partir do template.
   - Trocar a fonte dos dados (sample → fetch por número) e ADICIONAR submit:
     - Upload das imagens de referência para o R2 (hoje só preview local).
     - POST /api/briefing/[id]/submit salva answers + reference_images no D1 E marca
       briefings.status = "respondido" + submitted_at (isso é a contabilização real).
   - MANTER SEMPRE o botão "Exportar PDF" (já existe) e a validação de obrigatórias.
   - MANTER a mensagem de WhatsApp curta (não enviar as respostas inteiras por lá).

9. PÁGINAS PÚBLICAS
   /contrato/[id]:
   - GET /api/contracts/public/[slug] (sem auth)
   - Layout profissional: dados do cliente, texto do contrato
   - Botão "Assinar Contrato" → abre link autentique_url (se preenchido)
   - Botão "Download PDF" (placeholder por ora, será Fase 4)

   ┌──────────────────────────────────────────────────────────────────────┐
   │ ⏳ FUTURO — AUTOMATIZAR A AUTENTIQUE VIA API (decisão registrada)       │
   │                                                                        │
   │ HOJE (Fase 1): a Autentique é só um CAMPO DE URL (autentique_url) que  │
   │ a Isabela cola manualmente + botão "Assinar Contrato". SEM API/login   │
   │ de plataforma. Motivo: aguardando a cliente liberar as credenciais.    │
   │                                                                        │
   │ QUANDO HOUVER CONTA + TOKEN, dá para automatizar tudo:                 │
   │ - API GraphQL (https://docs.autentique.com.br/api):                    │
   │     mutation createDocument(document, signers[], file) → retorna o     │
   │     `id` e, por signatário, `link.short_link` (link de assinatura).    │
   │     Upload do arquivo é multipart (PDF; máx 5MB grátis / 20MB pro).    │
   │ - Webhooks: eventos `document.finished` / `signature.accepted`, com    │
   │     header `x-autentique-signature` (HMAC-SHA256) para validar.        │
   │                                                                        │
   │ PRÉ-REQUISITOS p/ implementar:                                         │
   │   (a) gerar o PDF do contrato (hoje é placeholder/Fase 4);             │
   │   (b) secret AUTENTIQUE_TOKEN no Cloudflare;                           │
   │   (c) functions/api/contracts/webhook.ts validando o HMAC e marcando   │
   │       status='signed' automaticamente; o signatário é o e-mail do      │
   │       cliente (clients.email).                                         │
   │ O schema atual (autentique_url + status 'signed') já comporta isso     │
   │ sem migração.                                                          │
   └──────────────────────────────────────────────────────────────────────┘
   
   /proposta/[id]:
   - Layout similar ao contrato
   - Botão "Ver Contrato" → redireciona para /contrato/[slug]
   - Botão "Preencher Briefing" → redireciona para /briefing/[id]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DETALHES TÉCNICOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Todas as Cloudflare Functions recebem:
  export async function onRequest(context) {
    const { request, env, params } = context;
    // env.DB = banco D1
    // env.ENCRYPTION_KEY = chave secreta
  }

Para acessar o D1:
  const result = await env.DB.prepare("SELECT * FROM clients").all();
  const row = await env.DB.prepare("SELECT * FROM clients WHERE id = ?").bind(id).first();
  await env.DB.prepare("INSERT INTO clients VALUES (?,?,?,?)").bind(id,name,email,phone).run();

Para CORS (todas as functions precisam):
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

Autenticação nas functions protegidas:
  const token = request.headers.get("Authorization")?.split(" ")[1];
  if (!token) return new Response("Unauthorized", { status: 401 });
  // Verificar JWT com jose

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RESULTADO ESPERADO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ao final desta fase:
✓ Login admin funciona em /admin/login
✓ Dashboard mostra cards com dados reais do D1
✓ CRUD de clientes 100% funcional
✓ CRUD de contratos com editor visual
✓ Publicar contrato gera link único
✓ Página pública /contrato/[slug] acessível sem login
✓ Briefing criável e respondível pelo cliente
✓ Propostas criáveis com link para briefing/contrato
```

---

## 🔴 [VOCÊ FAZ DEPOIS] — Testar Localmente

```bash
# Rodar servidor local com D1 local
npm run dev
# ou
wrangler pages dev --d1=DB:sistema-contratos
```

Acesse: `http://localhost:3000/admin/login`

Faça login com o email e senha que criou no Passo 5 acima.

---

## 🔴 [VOCÊ FAZ DEPOIS] — Fazer Deploy para Produção

```bash
# Rodar as tabelas no banco de produção (remoto)
wrangler d1 execute sistema-contratos --remote --file=./schema.sql

# Criar usuário admin no banco remoto
wrangler d1 execute sistema-contratos --remote --command "INSERT INTO users (id, email, password_hash, name, role) VALUES ('admin-1', 'seu-email@email.com', 'SEU-HASH-AQUI', 'Seu Nome', 'admin')"

# Commit e push para o GitHub (Cloudflare faz deploy automático)
git add .
git commit -m "fase 1: sistema base de contratos"
git push origin main
```

Aguarde o Cloudflare Pages fazer o build (2-5 minutos).

---

## ✅ [VALIDAR] — Checklist Fase 1

- [ ] Login em /admin/login funciona
- [ ] Dashboard abre com cards
- [ ] Criar cliente funciona
- [ ] Criar contrato funciona
- [ ] Editor visual abre e formata texto
- [ ] Campos {{cliente}} substituem no preview
- [ ] Publicar contrato gera link
- [ ] Link público /contrato/[id] abre sem login
- [ ] Criar proposta funciona
- [ ] Criar briefing funciona
- [ ] Cliente consegue responder briefing em /briefing/[id]
- [ ] Deploy no Cloudflare Pages funcionando

**Quando tudo marcado → vá para Fase 2.**

---

---

# ═══════════════════════════════════════════
# FASE 2: SISTEMA DE PAGAMENTOS
# ASAAS + Webhooks + Dashboard Financeiro
# ═══════════════════════════════════════════

---

## 🔴 [VOCÊ FAZ ANTES] — Criar Conta ASAAS

### Passo 1: Criar a conta

1. Acesse: https://www.asaas.com
2. Clique em **"Criar conta grátis"**
3. Preencha: Nome, Email, Telefone, CPF
4. Confirme o email (chegará uma mensagem)
5. Faça login

### Passo 2: Completar perfil

1. Preencha dados bancários (para receber pagamentos)
2. Confirme sua identidade (CPF ou CNPJ)
3. Aguarde validação (pode levar algumas horas)

### Passo 3: Obter API Key

1. No menu lateral: **Configurações**
2. Clique em **Integrações → API**
3. Copie a **Chave de API**
4. **Guarde em local seguro — ela não aparece mais!**

> Para testes locais, use a API Sandbox:
> - URL sandbox: `https://sandbox.asaas.com/api/v3`
> - Crie conta sandbox em: https://sandbox.asaas.com

---

## 🔴 [VOCÊ FAZ ANTES] — Adicionar Novas Tabelas no D1

Crie o arquivo `schema-fase2.sql` na raiz do projeto:

```sql
CREATE TABLE IF NOT EXISTS contract_payments (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL,
  total_value REAL NOT NULL,
  down_payment REAL DEFAULT 0,
  installments_count INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(contract_id) REFERENCES contracts(id)
);

CREATE TABLE IF NOT EXISTS installments (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL,
  payment_config_id TEXT,
  asaas_payment_id TEXT UNIQUE,
  installment_number INTEGER NOT NULL,
  due_date TEXT NOT NULL,
  amount REAL NOT NULL,
  status TEXT DEFAULT 'pending',
  payment_date TEXT,
  payment_method TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(contract_id) REFERENCES contracts(id)
);

CREATE TABLE IF NOT EXISTS asaas_logs (
  id TEXT PRIMARY KEY,
  webhook_event_id TEXT,
  event_type TEXT NOT NULL,
  asaas_payment_id TEXT,
  installment_id TEXT,
  payload TEXT,
  processed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Execute no banco:

```bash
# Local:
wrangler d1 execute sistema-contratos --local --file=./schema-fase2.sql

# Produção:
wrangler d1 execute sistema-contratos --remote --file=./schema-fase2.sql
```

---

## 🔴 [VOCÊ FAZ ANTES] — Adicionar Variáveis de Ambiente no Cloudflare

### No wrangler.toml, adicione:

```toml
[vars]
SITE_URL = "https://isabelapaulino.com.br"
ENCRYPTION_KEY = "sua-chave-aqui"
ASAAS_API_URL = "https://api.asaas.com/v3"
ASAAS_API_KEY = "sua-api-key-asaas"
WEBHOOK_SECRET = "gere-outra-chave-aleatoria-aqui"
```

Para gerar WEBHOOK_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### No Cloudflare Dashboard (para produção):

1. Acesse: https://dash.cloudflare.com
2. Vá em: **Workers & Pages → seu projeto**
3. Clique em: **Settings → Environment Variables**
4. Adicione cada variável:
   - `ASAAS_API_KEY` → sua chave de produção
   - `WEBHOOK_SECRET` → a chave gerada acima
   - `ASAAS_API_URL` → https://api.asaas.com/v3
5. Clique **Save**

> ⚠️ Nunca coloque a API Key do ASAAS direto no código.
> Sempre use variáveis de ambiente.

---

## 🔴 [VOCÊ FAZ ANTES] — Configurar Webhook no ASAAS

Você precisará da URL de produção para isso. Faça o deploy primeiro e depois configure.

Após o deploy:

1. Acesse: https://www.asaas.com
2. Vá em: **Configurações → Integrações → Webhooks**
3. Clique em **Adicionar Webhook**
4. Preencha:
   - **URL:** `https://isabelapaulino.com.br/api/webhooks/asaas`
   - **Token de autenticação:** cole o valor do seu `WEBHOOK_SECRET`
5. Ative os eventos:
   - ✅ PAYMENT_CONFIRMED
   - ✅ PAYMENT_RECEIVED
   - ✅ PAYMENT_OVERDUE
   - ✅ PAYMENT_DELETED
6. Clique **Salvar**

Para testar localmente com ngrok:
```bash
# Instalar ngrok: https://ngrok.com/download
ngrok http 3000
# Copie a URL https gerada e use como URL do webhook no ASAAS sandbox
```

---

## 🤖 [CLAUDE CODE] — Prompt Fase 2

Cole este prompt no Claude Code:

```
CONTEXTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A Fase 1 está completa. O projeto já tem:
- Painel admin com CRUD de clientes e contratos
- Editor de contratos com Tiptap
- Autenticação admin com JWT
- Banco D1 com tabelas: users, clients, contracts, proposals, briefings

Agora vamos adicionar (Fase 2):
- Configuração de parcelas de pagamento no admin
- Integração com ASAAS API (criar cobranças)
- Endpoint de Webhook para receber confirmações do ASAAS
- Dashboard financeiro com gráficos

Variáveis disponíveis via env:
- env.DB → Cloudflare D1
- env.ASAAS_API_KEY → chave ASAAS
- env.ASAAS_API_URL → https://api.asaas.com/v3
- env.WEBHOOK_SECRET → validar webhook

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NOVAS TABELAS JÁ EXISTEM NO BANCO:
- contract_payments (configuração de pagamento por contrato)
- installments (parcelas individuais)
- asaas_logs (log de webhooks recebidos)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSTALE AS DEPENDÊNCIAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

npm install recharts date-fns

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CRIE OS SEGUINTES ARQUIVOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

src/lib/asaas.ts (funções para chamar a API ASAAS)
src/pages/admin/contracts/[id]/payments.tsx
src/pages/admin/contracts/[id]/installments.tsx
src/pages/admin/reports.tsx
src/components/admin/FinancialChart.tsx
src/components/admin/InstallmentsTable.tsx

functions/api/
├─ contracts/[id]/payments.ts (GET/POST)
├─ contracts/[id]/generate-asaas.ts (POST - cria cobranças ASAAS)
├─ installments/index.ts (GET)
├─ installments/[id].ts (GET/PUT - marcar pago manualmente)
└─ webhooks/asaas.ts (POST - recebe eventos ASAAS)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FUNCIONALIDADES — IMPLEMENTE NESTA ORDEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. src/lib/asaas.ts
   Funções:
   - createCustomer(env, clientData) → cria cliente no ASAAS
   - createPayment(env, paymentData) → cria cobrança
   - deletePayment(env, asaasPaymentId) → cancela cobrança
   
   Para chamar a API ASAAS:
   fetch(env.ASAAS_API_URL + "/customers", {
     method: "POST",
     headers: {
       "access_token": env.ASAAS_API_KEY,
       "Content-Type": "application/json"
     },
     body: JSON.stringify({ name, cpfCnpj, email, phone })
   })

2. functions/api/contracts/[id]/payments.ts
   POST → recebe { total_value, down_payment, installments_count }
   → calcula parcelas e datas
   → salva em contract_payments e installments
   → chama /api/contracts/[id]/generate-asaas
   
   GET → retorna configuração de pagamento do contrato

3. functions/api/contracts/[id]/generate-asaas.ts
   POST → para cada installment do contrato:
   → cria cliente no ASAAS (se não existe)
   → cria cobrança no ASAAS para cada parcela
   → salva asaas_payment_id em installments

4. functions/api/webhooks/asaas.ts
   POST → recebe webhook do ASAAS
   → valida token (header asaas-access-token === env.WEBHOOK_SECRET)
   → salva em asaas_logs
   → trata eventos:
     PAYMENT_CONFIRMED → atualiza installment status = "confirmed"
     PAYMENT_RECEIVED → atualiza installment status = "received"
     PAYMENT_OVERDUE → atualiza installment status = "overdue"
     PAYMENT_DELETED → atualiza installment status = "deleted"
   → retorna 200 imediatamente (Cloudflare Worker: usar ctx.waitUntil)

5. functions/api/installments/[id].ts
   PUT → marcar parcela como paga manualmente
   Recebe: { payment_date, payment_method, notes }
   Atualiza: status = "received", preenche campos

6. src/pages/admin/contracts/[id]/payments.tsx
   Formulário de configuração de pagamento:
   - Campo: Valor Total (R$)
   - Campo: Valor da Entrada (R$)
   - Campo: Número de Parcelas
   - Botão "Calcular" → exibe tabela de parcelas calculadas
   - Tabela mostra: parcela nº, data vencimento, valor
   - Botão "Salvar e Criar Cobranças no ASAAS"
   - Após criar: mostra confirmação e status

7. src/pages/admin/contracts/[id]/installments.tsx
   Tabela com todas as parcelas do contrato:
   - Colunas: nº, vencimento, valor, status, pago em, forma
   - Status com cores: pending=amarelo, received=verde, overdue=vermelho
   - Botão "Marcar como Pago" para parcelas pendentes
     → Modal com campos: data pagamento, forma pagamento, observação
   - Botão "Ver no ASAAS" → abre ASAAS em nova aba (se tem asaas_payment_id)

8. Dashboard financeiro expandido (src/pages/admin/index.tsx - UPDATE)
   Adicionar aos cards:
   - Total faturado (soma de contract_payments.total_value)
   - Total recebido (soma installments onde status = received)
   - A receber (faturado - recebido)
   - Atrasados (count installments onde status = overdue)
   
   Adicionar gráficos com recharts:
   - LineChart: receita por mês (últimos 6 meses)
   - PieChart: status dos contratos (draft/published/signed)
   - BarChart: parcelas pagas vs pendentes por mês

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RESULTADO ESPERADO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Admin configura parcelas em /admin/contracts/[id]/payments
✓ Cobranças criadas no ASAAS automaticamente
✓ Webhook recebe confirmações do ASAAS e atualiza banco
✓ Admin pode marcar parcela como paga manualmente
✓ Dashboard mostra valores financeiros reais
✓ Gráficos de receita funcionando
```

---

## 🔴 [VOCÊ FAZ DEPOIS] — Testar Integração ASAAS

1. No ASAAS, crie um contrato de teste com valor pequeno
2. Acesse `/admin/contracts/[id]/payments`
3. Configure parcelas
4. Clique "Salvar e Criar Cobranças"
5. Verifique no ASAAS se as cobranças apareceram
6. Simule um pagamento no sandbox ASAAS
7. Verifique se o webhook foi recebido (veja asaas_logs no D1)
8. Verifique se o status da parcela mudou no admin

```bash
# Verificar logs do webhook
wrangler d1 execute sistema-contratos --local \
  --command "SELECT * FROM asaas_logs ORDER BY processed_at DESC LIMIT 10"
```

---

## 🔴 [VOCÊ FAZ DEPOIS] — Deploy da Fase 2

```bash
git add .
git commit -m "fase 2: integração ASAAS e dashboard financeiro"
git push origin main
```

Após o deploy, volte ao ASAAS e atualize a URL do webhook para produção:
`https://isabelapaulino.com.br/api/webhooks/asaas`

---

## ✅ [VALIDAR] — Checklist Fase 2

- [ ] Página de configuração de parcelas funciona
- [ ] Cálculo automático de parcelas e datas correto
- [ ] Cobranças aparecem no ASAAS após salvar
- [ ] Webhook recebe evento do ASAAS
- [ ] Parcela muda de status automaticamente (pending → received)
- [ ] Marcar manualmente como pago funciona
- [ ] Cards financeiros no dashboard mostram valores reais
- [ ] Gráficos de receita funcionam
- [ ] Deploy funcionando em produção

**Quando tudo marcado → vá para Fase 3.**

---

## 🧾 FEATURE: Histórico Financeiro (HF) do Cliente

> **O que é:** um registro por **cliente** de serviços/alterações **fora do escopo do contrato**
> (retrabalho, adicionais, hora técnica, etc.). Cada lançamento tem descrição + valor; o sistema
> **soma automaticamente** os pendentes e permite **gerar cobrança no ASAAS** de um item ou do
> total acumulado. É genérico e reaproveitável em qualquer projeto com clientes + cobranças.
>
> *Ex.: o cliente pediu uma alteração além do contrato → lança-se no HF (descrição + valor); ao
> acumular, o total aparece somado; um clique gera a cobrança ASAAS e o pagamento é rastreado pelo
> mesmo webhook das parcelas.* (No contrato-padrão isso já é citado como "Histórico Financeiro (HF)".)

### Tabela no D1 (adicionar ao schema de pagamentos)
```sql
CREATE TABLE IF NOT EXISTS client_history (
  id               TEXT PRIMARY KEY,                  -- uuid
  client_id        TEXT NOT NULL,                     -- dono do lançamento
  contract_id      TEXT,                              -- opcional: vincula a um contrato
  date             TEXT NOT NULL DEFAULT (date('now')),
  description      TEXT NOT NULL,                     -- "Alteração de layout do quarto 02"
  amount           REAL NOT NULL DEFAULT 0,           -- valor do lançamento
  kind             TEXT NOT NULL DEFAULT 'adicional', -- adicional | retrabalho | hora-tecnica | outro
  status           TEXT NOT NULL DEFAULT 'pending',   -- pending | charged | paid | cancelled
  asaas_payment_id TEXT,                              -- cobrança ASAAS gerada (quando houver)
  paid_at          TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (client_id)   REFERENCES clients(id),
  FOREIGN KEY (contract_id) REFERENCES contracts(id)
);
CREATE INDEX IF NOT EXISTS idx_client_history_client ON client_history(client_id);
CREATE INDEX IF NOT EXISTS idx_client_history_status ON client_history(status);
```

### Endpoints (Pages Functions)
- `GET    /api/clients/:id/history` → lista lançamentos + **totais** (pendente / cobrado / pago).
- `POST   /api/clients/:id/history` → cria `{ description, amount, kind, contract_id? }`.
- `PUT    /api/clients/history/:hid` → edita (descrição / valor / status).
- `DELETE /api/clients/history/:hid` → remove.
- `POST   /api/clients/history/:hid/generate-asaas` → gera a cobrança ASAAS do item;
  (opcional `POST /api/clients/:id/history/charge-total` → cobra o total pendente numa cobrança só).
  Reusa `functions/api/_lib/asaas.ts` (`findOrCreateCustomer` + `createPayment`) e é rastreado pelo
  **mesmo webhook** `/api/webhooks/asaas` (casa pelo `asaas_payment_id` → marca `paid`).

### UI (Admin)
- Nova aba **"Histórico"** na tela do cliente (e atalho na tela do contrato).
- Tabela: data · descrição · tipo · valor · status · ações (editar / cobrar no ASAAS / WhatsApp).
- Rodapé com **soma automática dos pendentes** ("Total a cobrar: R$ X") + botão "Cobrar total no ASAAS".
- Botão "Cobrar no WhatsApp" (mesmo padrão das parcelas), usando o link da cobrança gerada.

### Integração e finanças
- Cada lançamento vira uma cobrança ASAAS como uma parcela (billingType UNDEFINED → PIX/boleto/cartão).
- Ao pagar, o webhook do ASAAS casa pelo `asaas_payment_id` e marca o HF como `paid`.
- Os valores do HF entram no **Dashboard Financeiro** junto das parcelas (faturado / recebido / a receber).

> **Onde encaixa:** extensão da Fase 2 (cobranças). Pode ser construída junto da Fase 2 ou como
> incremento depois; não depende da Área do Cliente, mas aparece nela quando existir (Fase 3).

---

# ═══════════════════════════════════════════
# FASE 3: ÁREA PRIVADA DO CLIENTE
# Login Cliente + Dashboard + Contratos + Pagamentos
# ═══════════════════════════════════════════

---

## 🔴 [VOCÊ FAZ ANTES] — Adicionar Novas Tabelas no D1

Crie o arquivo `schema-fase3.sql`:

```sql
CREATE TABLE IF NOT EXISTS client_accounts (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL UNIQUE,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  first_access INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(client_id) REFERENCES clients(id)
);

CREATE TABLE IF NOT EXISTS client_sessions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(account_id) REFERENCES client_accounts(id)
);

CREATE TABLE IF NOT EXISTS client_files (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_r2_key TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(contract_id) REFERENCES contracts(id)
);
```

Execute:

```bash
# Local:
wrangler d1 execute sistema-contratos --local --file=./schema-fase3.sql

# Produção:
wrangler d1 execute sistema-contratos --remote --file=./schema-fase3.sql
```

---

## 🔴 [VOCÊ FAZ ANTES] — Criar Bucket R2 para Arquivos

### Passo 1: Criar o bucket

```bash
wrangler r2 bucket create sistema-contratos-files
```

### Passo 2: Adicionar ao wrangler.toml

```toml
[[r2_buckets]]
binding = "R2"
bucket_name = "sistema-contratos-files"
```

### Passo 3: Vincular ao projeto no Cloudflare Dashboard

1. Acesse: https://dash.cloudflare.com
2. Vá em: **Workers & Pages → seu projeto**
3. Clique em: **Settings → Functions → R2 bucket bindings**
4. Clique em **Add binding**
5. Variable name: `R2`
6. Selecione o bucket: `sistema-contratos-files`
7. Clique **Save**

### Passo 4: Configurar CORS no R2 (para downloads)

1. Acesse: https://dash.cloudflare.com
2. Vá em: **R2 → sistema-contratos-files**
3. Clique em: **Settings → CORS Policy**
4. Adicione:

```json
[
  {
    "AllowedOrigins": ["https://isabelapaulino.com.br"],
    "AllowedMethods": ["GET"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }
]
```

---

## 🤖 [CLAUDE CODE] — Prompt Fase 3

Cole este prompt no Claude Code:

```
CONTEXTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Fases 1 e 2 completas. O projeto já tem:
- Admin com contratos, clientes, propostas, briefings
- Integração ASAAS com webhooks
- Dashboard financeiro

Agora vamos criar (Fase 3):
- Área de login exclusiva para os clientes (/cliente)
- Dashboard privado onde o cliente vê seus projetos
- Acesso a contratos, pagamentos e arquivos

Variáveis via env:
- env.DB → D1
- env.R2 → Cloudflare R2 (armazenamento de arquivos)
- env.ENCRYPTION_KEY → para JWT de clientes
- env.SITE_URL → URL base do site

Novas tabelas já existem no banco:
- client_accounts (credenciais de acesso do cliente)
- client_sessions (sessões ativas)
- client_files (arquivos por contrato)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CRIE OS SEGUINTES ARQUIVOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

src/
├─ context/ClientAuthContext.tsx
├─ components/cliente/
│  ├─ ClientLayout.tsx
│  ├─ ClientNav.tsx
│  ├─ ProjectCard.tsx
│  └─ PaymentStatusBadge.tsx
└─ pages/cliente/
   ├─ login.tsx
   ├─ index.tsx (dashboard)
   ├─ projetos.tsx (lista de projetos)
   ├─ projetos/[id]/contrato.tsx
   ├─ projetos/[id]/pagamentos.tsx
   ├─ projetos/[id]/arquivos.tsx
   └─ conta.tsx

functions/api/
├─ client-auth/login.ts
├─ client-auth/logout.ts
├─ client-auth/validate.ts
├─ client-auth/change-password.ts
├─ portal/projetos.ts
├─ portal/projetos/[id]/contrato.ts
├─ portal/projetos/[id]/pagamentos.ts
├─ portal/projetos/[id]/arquivos.ts
├─ portal/projetos/[id]/arquivos/[fileId]/download.ts
└─ admin/clients/[id]/create-account.ts

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FUNCIONALIDADES — IMPLEMENTE NESTA ORDEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. AUTENTICAÇÃO CLIENTE (functions/api/client-auth/)
   - POST /api/client-auth/login → valida email+senha em client_accounts
   - POST /api/client-auth/logout → invalida sessão
   - GET /api/client-auth/validate → verifica token ativo
   - POST /api/client-auth/change-password → altera senha
   - JWT com jose, expiração 2h
   - Rate limiting: 5 tentativas/5min
   
   DIFERENÇA do admin:
   - Usa tabela client_accounts (não users)
   - JWT tem claim "type": "client" e "client_id"
   - Todas as rotas /api/portal/* exigem type = "client"

2. CRIAR CONTA PARA CLIENTE (via admin)
   POST /api/admin/clients/[id]/create-account
   - Recebe: { email, send_email }
   - Gera senha aleatória temporária (12 chars)
   - Hash e salva em client_accounts
   - Seta first_access = 1 (força troca na 1ª entrada)
   - Se send_email = true → registra para envio (Fase 4)
   - Retorna: { email, temp_password } (para admin mostrar/anotar)
   
   No admin: Adicionar botão "Criar Acesso" em /admin/clients/[id]
   - Modal com campo de email (preenche com o email do cliente)
   - Checkbox "Enviar por email" (placeholder por ora)
   - Após criar: mostra senha temporária para você anotar

3. PORTAL DO CLIENTE (/pages/cliente/)
   
   /cliente/login:
   - Formulário email + senha
   - Se first_access = 1: força trocar senha antes de continuar
   - Guarda token em localStorage
   - Redireciona para /cliente após login
   
   /cliente (dashboard):
   - Exibe: Olá, {nome do cliente}
   - Cards:
     ├─ Total investido (soma dos contratos)
     ├─ Total pago (soma installments received)
     ├─ Próximo vencimento (data + valor)
     └─ Total de projetos
   - Lista dos últimos 3 projetos com link
   
   /cliente/projetos:
   - Lista todos os contratos do cliente
   - Cada card mostra:
     ├─ Título do contrato
     ├─ Status (em andamento, finalizado, etc)
     ├─ Valor total
     ├─ Barra de progresso de pagamento (pago/total)
     └─ Links: Contrato | Pagamentos | Arquivos
   
   /cliente/projetos/[id]/contrato:
   - Exibe o contrato formatado (mesmo HTML do /contrato/[slug])
   - Botão "Download PDF" (placeholder até Fase 4)
   - Botão "Voltar"
   
   /cliente/projetos/[id]/pagamentos:
   - Tabela de parcelas do contrato
   - Cada linha: nº parcela, vencimento, valor, status
   - Status com ícone e cor: pago ✅, pendente 🕐, atrasado ⚠️
   - Se pendente: link de pagamento do ASAAS (quando disponível)
   - Resumo abaixo: total, pago, pendente
   
   /cliente/projetos/[id]/arquivos:
   - Lista de arquivos enviados pelo admin
   - Cada item: nome, tipo, data upload
   - Botão "Download" → chama /api/portal/projetos/[id]/arquivos/[fileId]/download
   
   /cliente/conta:
   - Exibe dados do cliente (somente leitura)
   - Formulário trocar senha: senha atual, nova senha, confirmar
   - Botão "Salvar Nova Senha"

4. FUNÇÕES DE PORTAL (functions/api/portal/)
   Todas exigem token com type="client"
   Todas validam que o client_id do token = client_id do recurso solicitado
   
   GET /api/portal/projetos → lista contratos WHERE client_id = {do token}
   GET /api/portal/projetos/[id]/contrato → retorna contrato se pertence ao cliente
   GET /api/portal/projetos/[id]/pagamentos → retorna installments do contrato
   GET /api/portal/projetos/[id]/arquivos → lista client_files do contrato
   GET /api/portal/projetos/[id]/arquivos/[fileId]/download
     → busca no R2: await env.R2.get(file.file_r2_key)
     → retorna arquivo com headers corretos para download

5. UPLOAD DE ARQUIVOS PELO ADMIN
   No admin em /admin/contracts/[id], adicionar:
   - Seção "Arquivos do Projeto"
   - Upload de arquivo (input type="file")
   - POST /api/admin/contracts/[id]/files
     → faz upload para R2: await env.R2.put(key, file)
     → salva metadados em client_files
   - Lista de arquivos já enviados com botão "Excluir"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SEGURANÇA IMPORTANTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Cliente NUNCA acessa dados de outro cliente (sempre filtrar por client_id do JWT)
- URLs do R2 não são públicas (sempre via função de download protegida)
- Token do cliente e token do admin são diferentes (checar o claim "type")
- Senha temporária é exibida UMA vez (não pode ser recuperada depois)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RESULTADO ESPERADO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Admin cria conta de acesso para o cliente
✓ Cliente loga em /cliente/login com email+senha
✓ Na 1ª entrada: sistema força troca de senha
✓ Cliente vê dashboard com seus projetos
✓ Cliente visualiza contrato
✓ Cliente vê cronograma de pagamentos com status
✓ Cliente baixa arquivos enviados pelo admin
✓ Cliente muda a própria senha
✓ Um cliente NÃO vê dados de outro cliente
```

---

## 🔴 [VOCÊ FAZ DEPOIS] — Testar Fluxo Completo

1. No admin, crie um cliente de teste
2. Crie um contrato para esse cliente
3. Configure parcelas e gere cobranças ASAAS
4. Suba um arquivo de teste para o contrato
5. Vá em `/admin/clients/[id]` → clique "Criar Acesso"
6. Anote o email e senha temporária gerados
7. Acesse `/cliente/login`
8. Faça login com as credenciais
9. Valide que o sistema pede troca de senha
10. Navegue por projetos, contrato, pagamentos, arquivos

---

## 🔴 [VOCÊ FAZ DEPOIS] — Deploy da Fase 3

```bash
git add .
git commit -m "fase 3: área privada do cliente"
git push origin main
```

---

## ✅ [VALIDAR] — Checklist Fase 3

- [ ] Admin cria conta para cliente com senha temporária
- [ ] Cliente loga em /cliente/login
- [ ] 1ª entrada força troca de senha
- [ ] Dashboard do cliente mostra dados reais
- [ ] Lista de projetos mostra contratos do cliente
- [ ] Contrato exibe corretamente
- [ ] Tabela de pagamentos com status correto
- [ ] Download de arquivos funciona
- [ ] Cliente NÃO vê dados de outro cliente (testar!)
- [ ] Troca de senha funciona
- [ ] Logout funciona
- [ ] Deploy funcionando em produção

**Quando tudo marcado → vá para Fase 4.**

---

---

# ═══════════════════════════════════════════
# FASE 4: REFINAMENTOS
# PDF + Histórico + Email + Logs + Otimizações
# ═══════════════════════════════════════════

---

## 🔴 [VOCÊ FAZ ANTES] — Criar Conta SendGrid para Emails

### Passo 1: Criar a conta

1. Acesse: https://sendgrid.com
2. Clique em **"Start For Free"**
3. Preencha: Email, Senha, Nome, Empresa
4. Confirme o email
5. Complete o onboarding (tipo de uso, volume estimado)

### Passo 2: Verificar domínio de envio

Para enviar emails com seu domínio (@isabelapaulino.com.br):

1. No menu: **Settings → Sender Authentication**
2. Clique em **Authenticate Your Domain**
3. Escolha seu provedor DNS (Cloudflare)
4. Preencha o domínio: `isabelapaulino.com.br`
5. O SendGrid vai gerar registros DNS para adicionar
6. Adicione esses registros no Cloudflare:
   - Acesse: https://dash.cloudflare.com
   - Vá em: **seu domínio → DNS**
   - Adicione cada registro CNAME que o SendGrid indicar
7. Volte ao SendGrid e clique "Verify"
8. Aguarde até 48h para verificar (geralmente 5-10min no Cloudflare)

### Passo 3: Obter API Key

1. No menu SendGrid: **Settings → API Keys**
2. Clique **Create API Key**
3. Nome: "sistema-contratos"
4. Permissão: **Restricted Access → Mail Send: Full Access**
5. Clique **Create & View**
6. Copie a chave (aparece só uma vez!)

### Passo 4: Adicionar ao wrangler.toml

```toml
[vars]
SENDGRID_API_KEY = "sua-chave-sendgrid"
FROM_EMAIL = "noreply@isabelapaulino.com.br"
FROM_NAME = "Isabela Paulino"
```

E no Cloudflare Dashboard (Settings → Environment Variables):
- `SENDGRID_API_KEY` → sua chave
- `FROM_EMAIL` → noreply@isabelapaulino.com.br
- `FROM_NAME` → Isabela Paulino

---

## 🔴 [VOCÊ FAZ ANTES] — Adicionar Novas Tabelas no D1

Crie `schema-fase4.sql`:

```sql
CREATE TABLE IF NOT EXISTS project_history (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_date TEXT NOT NULL,
  additional_value REAL DEFAULT 0,
  images TEXT,
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(contract_id) REFERENCES contracts(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_type TEXT NOT NULL,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  details TEXT,
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_queue (
  id TEXT PRIMARY KEY,
  to_email TEXT NOT NULL,
  to_name TEXT,
  subject TEXT NOT NULL,
  template TEXT NOT NULL,
  variables TEXT,
  status TEXT DEFAULT 'pending',
  sent_at DATETIME,
  error TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Execute:

```bash
# Local:
wrangler d1 execute sistema-contratos --local --file=./schema-fase4.sql

# Produção:
wrangler d1 execute sistema-contratos --remote --file=./schema-fase4.sql
```

---

## 🤖 [CLAUDE CODE] — Prompt Fase 4

Cole este prompt no Claude Code:

```
CONTEXTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Fases 1, 2 e 3 completas! Sistema 80% pronto.

Falta apenas (Fase 4):
- Geração de PDF de contratos e propostas
- Histórico visual do projeto (timeline)
- Notificações por email (SendGrid)
- Logs de auditoria
- Polimentos de UX

Novas variáveis via env:
- env.SENDGRID_API_KEY → chave SendGrid
- env.FROM_EMAIL → email remetente
- env.FROM_NAME → nome remetente

Novas tabelas já existem no banco:
- project_history (timeline de eventos)
- audit_logs (registro de ações)
- email_queue (fila de emails)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSTALE AS DEPENDÊNCIAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

npm install @react-pdf/renderer @sendgrid/mail

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CRIE OS SEGUINTES ARQUIVOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

src/
├─ lib/email.ts (integração SendGrid)
├─ lib/audit.ts (funções de log)
├─ lib/pdf.ts (geração PDF)
├─ components/admin/Timeline.tsx
├─ components/admin/AuditTable.tsx
└─ pages/admin/
   ├─ contracts/[id]/history.tsx
   └─ logs.tsx

functions/api/
├─ contracts/[id]/history.ts (GET/POST)
├─ contracts/[id]/history/[eventId].ts (PUT/DELETE)
├─ email/send.ts (POST - dispara email)
├─ admin/logs.ts (GET - lista logs de auditoria)
└─ cron/email-worker.ts (processa fila de emails)

src/templates/emails/
├─ welcome.html
├─ contract_created.html
├─ payment_received.html
├─ payment_overdue.html
└─ account_created.html

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FUNCIONALIDADES — IMPLEMENTE NESTA ORDEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. GERAÇÃO DE PDF
   Usando @react-pdf/renderer no client-side (browser):
   
   src/lib/pdf.ts:
   - generateContractPDF(contract, client) → retorna Blob
   - Inclui: dados do cliente, texto do contrato, tabela de parcelas
   
   Na página /contrato/[slug] e /cliente/projetos/[id]/contrato:
   - Botão "Download PDF" → chama generateContractPDF
   - Usa document.createElement("a") + URL.createObjectURL para baixar
   
   Na página /proposta/[slug]:
   - Botão "Download PDF" → gera PDF da proposta

2. HISTÓRICO DO PROJETO (TIMELINE)
   
   functions/api/contracts/[id]/history.ts:
   - GET → lista eventos do project_history WHERE contract_id = id
   - POST → cria novo evento:
     { title, description, event_date, additional_value, images[] }
     → faz upload de imagens para R2
     → salva URLs no campo images (JSON array)
   
   functions/api/contracts/[id]/history/[eventId].ts:
   - PUT → editar evento
   - DELETE → deletar evento (remove imagens do R2 também)
   
   src/components/admin/Timeline.tsx:
   - Renderiza lista de eventos em ordem cronológica
   - Cada item: data, título, descrição, valor adicional, fotos
   - Fotos clicáveis em modal fullscreen
   - Totalizador: "Valor Original: R$ X | Adições: R$ Y | Total: R$ Z"
   
   src/pages/admin/contracts/[id]/history.tsx:
   - Timeline + formulário para adicionar evento:
     ├─ Data do evento
     ├─ Título (ex: "Entrega 1 Realizada")
     ├─ Descrição
     ├─ Valor adicional (R$)
     └─ Upload de até 5 imagens
   - Botão editar/deletar em cada evento
   
   Cliente também vê (atualizar /cliente/projetos/[id]):
   - Adicionar aba/link "Histórico" → /cliente/projetos/[id]/historico
   - Exibe mesma timeline em modo somente leitura

3. NOTIFICAÇÕES POR EMAIL
   
   src/lib/email.ts:
   - loadTemplate(templateName, variables) → carrega HTML, substitui {{variáveis}}
   - queueEmail(env, { to_email, to_name, subject, template, variables })
     → insere em email_queue com status = pending
   - sendEmail(env, emailData) → chama SendGrid API diretamente
   
   Integrar envio em momentos chave:
   - Contrato publicado (functions/api/contracts/[id]/publish.ts)
     → queueEmail template: "contract_created"
     → variáveis: cliente, valor, link_contrato
   
   - Conta de cliente criada (functions/api/admin/clients/[id]/create-account.ts)
     → queueEmail template: "account_created"
     → variáveis: nome, email, senha_temporaria, link_login
   
   - Webhook ASAAS: PAYMENT_RECEIVED
     → queueEmail template: "payment_received"
     → variáveis: cliente, valor, data, proximo_vencimento
   
   - Webhook ASAAS: PAYMENT_OVERDUE
     → queueEmail template: "payment_overdue"
     → variáveis: cliente, valor, data_vencimento, link_pagamento
   
   functions/api/email/send.ts:
   - Chamado como job ou direto
   - Pega emails pendentes da email_queue
   - Envia via SendGrid: 
     fetch("https://api.sendgrid.com/v3/mail/send", {
       method: "POST",
       headers: { Authorization: "Bearer " + env.SENDGRID_API_KEY },
       body: JSON.stringify({ ... })
     })
   - Atualiza status para "sent" ou "failed"
   
   Templates em src/templates/emails/ (HTML simples e bonito):
   
   welcome.html: Boas-vindas com link de primeiro acesso
   account_created.html: Credenciais de acesso criadas
   contract_created.html: Contrato pronto para assinar
   payment_received.html: Confirmação de pagamento
   payment_overdue.html: Alerta de atraso

4. LOGS DE AUDITORIA
   
   src/lib/audit.ts:
   - log(env, { user_type, user_id, action, resource_type, resource_id, details, request })
     → insere em audit_logs
   
   Adicionar logs em pontos importantes:
   - Login admin e cliente
   - Criar/editar/deletar contrato
   - Publicar contrato
   - Criar cliente
   - Criar conta cliente
   - Marcar pagamento
   - Upload de arquivo
   - Download de arquivo
   
   src/pages/admin/logs.tsx:
   - Tabela com: data, usuário, ação, recurso, IP
   - Filtros: tipo (admin/cliente), ação, período
   - Exportar como CSV

5. POLIMENTOS DE UX
   
   Em todo o sistema, adicione:
   - Toast notifications para feedback (sucesso, erro, aviso)
     Use uma biblioteca simples ou implemente com useState
   - Loading states em botões (não desabilitar, mostrar spinner)
   - Confirmação antes de deletar (modal: "Tem certeza?")
   - Mensagens de erro específicas (não genéricas)
   - Empty states com mensagem quando lista está vazia
   - Formatação de moeda: R$ 1.500,00 (pt-BR)
   - Formatação de data: 29/06/2024 (dd/MM/yyyy)
   - Máscara em campos CPF/CNPJ e telefone

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RESULTADO ESPERADO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Download de PDF do contrato funciona (admin e cliente)
✓ Admin cria timeline de eventos no projeto
✓ Cliente vê histórico em modo somente leitura
✓ Email enviado quando contrato é publicado
✓ Email enviado quando conta do cliente é criada
✓ Email enviado quando pagamento é confirmado
✓ Email enviado quando parcela está atrasada
✓ Todas as ações importantes registradas nos logs
✓ Admin vê e filtra logs em /admin/logs
✓ UX polida com toasts, confirmações e loading states
```

---

## 🔴 [VOCÊ FAZ DEPOIS] — Testar Envio de Email

1. Publique um contrato de teste
2. Verifique se email foi para a fila: `SELECT * FROM email_queue ORDER BY created_at DESC LIMIT 5`
3. Acesse `/api/email/send` para processar a fila (ou faça manualmente)
4. Confirme que email chegou na caixa do destinatário
5. Teste para cada template (contrato, pagamento, atraso)

---

## 🔴 [VOCÊ FAZ DEPOIS] — Configurar Processamento Periódico de Emails

Para processar a fila de emails automaticamente, configure um Cron no Cloudflare:

1. No `wrangler.toml`:

```toml
[triggers]
crons = ["*/5 * * * *"]
```

2. Isso vai chamar uma função a cada 5 minutos para processar emails pendentes.

3. Adicione a função no seu Worker:

```typescript
// functions/scheduled.ts
export async function scheduled(event, env, ctx) {
  // Processa fila de emails pendentes
  const pending = await env.DB.prepare(
    "SELECT * FROM email_queue WHERE status = 'pending' LIMIT 20"
  ).all();
  
  for (const email of pending.results) {
    // envia via SendGrid e atualiza status
  }
}
```

---

## 🔴 [VOCÊ FAZ DEPOIS] — Deploy Final

```bash
git add .
git commit -m "fase 4: PDFs, histórico, emails e logs - sistema completo"
git push origin main
```

---

## ✅ [VALIDAR] — Checklist Final COMPLETO

### Sistema Admin
- [ ] Login admin funciona
- [ ] Dashboard com cards e gráficos corretos
- [ ] CRUD de clientes completo
- [ ] CRUD de contratos com editor visual
- [ ] Publicar contrato gera link único
- [ ] Configuração de parcelas funciona
- [ ] Cobranças criadas no ASAAS
- [ ] Timeline de eventos criável com fotos
- [ ] Upload de arquivos para cliente
- [ ] Download de PDF do contrato
- [ ] Criar conta de acesso para cliente
- [ ] Logs de auditoria registrando ações
- [ ] Visualizar logs em /admin/logs

### Área do Cliente
- [ ] Login em /cliente/login funciona
- [ ] 1ª entrada força troca de senha
- [ ] Dashboard mostra projetos e resumo financeiro
- [ ] Visualizar contrato formatado
- [ ] Download de PDF do contrato
- [ ] Cronograma de pagamentos com status
- [ ] Histórico do projeto (somente leitura)
- [ ] Download de arquivos
- [ ] Trocar senha funciona
- [ ] Logout funciona

### Integrações
- [ ] ASAAS cria cobranças automaticamente
- [ ] ASAAS envia lembretes (validar em sandbox)
- [ ] Webhook recebe pagamento e atualiza parcela
- [ ] Email de contrato publicado sendo enviado
- [ ] Email de conta criada sendo enviado
- [ ] Email de pagamento recebido sendo enviado
- [ ] Email de atraso sendo enviado

### Qualidade
- [ ] Responsivo em mobile e tablet
- [ ] Funciona em Chrome, Firefox e Safari
- [ ] Mensagens de erro claras
- [ ] Loading states nos botões
- [ ] Confirmação antes de deletar

---

## 🚀 PÓS-LANÇAMENTO: Configurações Finais em Produção

### 1. Mudar ASAAS de Sandbox para Produção

1. Acesse: https://www.asaas.com (produção, não sandbox)
2. Obtenha a API Key de produção
3. Atualize no Cloudflare Dashboard → Environment Variables:
   - `ASAAS_API_URL` = `https://api.asaas.com/v3`
   - `ASAAS_API_KEY` = nova chave de produção
4. Atualize a URL do webhook no ASAAS produção:
   `https://isabelapaulino.com.br/api/webhooks/asaas`

### 2. Verificar Domínio no SendGrid

1. Certifique-se que os registros DNS estão verificados
2. Faça um envio de teste real
3. Verifique que email não cai no spam

### 3. Configurar Custom Domain nas Variáveis

```
SITE_URL = "https://isabelapaulino.com.br"
FROM_EMAIL = "noreply@isabelapaulino.com.br"
```

### 4. Monitoramento

1. Ative alertas no Cloudflare Pages:
   - Deploy failures
   - Function errors
2. Configure alertas de email para falhas no ASAAS
3. Monitore a tabela `audit_logs` periodicamente

