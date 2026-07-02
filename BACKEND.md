# Backend (Cloudflare Pages Functions + D1)

Este projeto é um SPA **Vite** servido pelo **Cloudflare Pages**. As rotas
`/api/*` rodam como **Pages Functions** (pasta [`functions/`](functions/)) e os
dados ficam no **Cloudflare D1** (SQLite gerenciado).

> ⚠️ As Pages Functions **só rodam quando o site está hospedado no Cloudflare
> Pages**. Se hoje o deploy é em outro lugar, o painel admin/API só funcionará
> depois que o site estiver no Cloudflare Pages.

---

## 🔴 Passos manuais (uma vez) — você faz no terminal/painel

Pré-requisito: `npm install` (já inclui o `wrangler` como dependência de dev) e
`npx wrangler login`.

### 1. Criar o banco D1
```bash
npx wrangler d1 create isapaulino-db
```
Copie o `database_id` retornado e cole em [`wrangler.toml`](wrangler.toml) no
lugar de `PREENCHER-APOS-wrangler-d1-create`.

### 2. Criar as tabelas
```bash
# no banco remoto (produção)
npm run db:apply:remote
# e/ou no banco local (para testar com `npm run pages:dev`)
npm run db:apply:local
```

### 3. Criar o usuário admin (login do painel)
Gere o hash da senha:
```bash
npm run hash -- "sua-senha-forte-aqui"
```
Copie o hash impresso (`pbkdf2$...`) e insira o usuário:
```bash
npx wrangler d1 execute isapaulino-db --remote \
  --command "INSERT INTO admin_users (username, password_hash) VALUES ('isabela', 'COLE-O-HASH-AQUI')"
```
(Para testar local, troque `--remote` por `--local`.)

### 4. Definir o segredo da sessão
```bash
# valor aleatório longo (32+ caracteres). Ex. de geração:
#   node -e "console.log(crypto.randomBytes(32).toString('hex'))"
npx wrangler pages secret put SESSION_SECRET
```
(No `npm run pages:dev` local, defina via arquivo `.dev.vars` na raiz:
`SESSION_SECRET=...` — esse arquivo NÃO deve ir pro git.)

### 5. Ligar o binding do D1 no Pages (produção)
No painel: **Workers & Pages → seu projeto → Settings → Functions →
D1 database bindings → Add binding**
- Variable name: `DB`
- Database: `isapaulino-db`

### 6. Habilitar o R2 e criar o bucket (imagens dos ambientes)
O R2 precisa ser **habilitado uma vez no painel** (aceitar os termos):
**Painel → R2 → Enable**. Depois:
```bash
npx wrangler r2 bucket create isapaulino-files
```
E ligue o binding no Pages: **Settings → Functions → R2 bucket bindings →
Add binding** → Variable name `R2`, bucket `isapaulino-files`.
(Local: o `wrangler pages dev` já simula o R2; não precisa do bucket remoto.)

### 7. Migrações do banco já existente (contratos)
Colunas adicionadas depois da criação inicial. Como o `schema.sql` usa
`CREATE TABLE IF NOT EXISTS` (não altera tabelas existentes), rode UMA vez em
bancos que já existem:
```bash
npx wrangler d1 execute isapaulino-db --remote --command "ALTER TABLE contracts ADD COLUMN data TEXT;"
npx wrangler d1 execute isapaulino-db --remote --command "ALTER TABLE contracts ADD COLUMN autentique_document_id TEXT;"
npx wrangler d1 execute isapaulino-db --remote --command "ALTER TABLE contracts ADD COLUMN signed_at TEXT;"
```
(Troque `--remote` por `--local` para o banco local. O `data` guarda o `ContractDoc` rico.)

### 8. Integrações opcionais — Pagamentos (ASAAS) e Assinatura (Autentique)
Ambas ficam **INATIVAS** enquanto as chaves não forem definidas — os endpoints
respondem com erro amigável nesse estado (nada quebra). Para ativar:
```bash
# ASAAS (pagamentos)
npx wrangler pages secret put ASAAS_API_KEY
npx wrangler pages secret put WEBHOOK_SECRET        # token esperado no header asaas-access-token
# opcional: ASAAS_API_URL (sandbox: https://api-sandbox.asaas.com/v3)

# Autentique (assinatura)
npx wrangler pages secret put AUTENTIQUE_TOKEN
npx wrangler pages secret put AUTENTIQUE_WEBHOOK_SECRET
# opcional: AUTENTIQUE_API_URL (default https://api.autentique.com.br/v2/graphql)
```
Webhooks a cadastrar em cada serviço (apontando para o site em produção):
- **ASAAS** → `POST https://SEU-SITE/api/webhooks/asaas` (header `asaas-access-token: <WEBHOOK_SECRET>`)
- **Autentique** → `POST https://SEU-SITE/api/webhooks/autentique?secret=<AUTENTIQUE_WEBHOOK_SECRET>`

(No `npm run pages:dev` local, coloque os mesmos valores no `.dev.vars`.)

> **✅ Produção (jul/2026) — já configurados.** Os secrets `SESSION_SECRET`, `WEBHOOK_SECRET`,
> `ASAAS_API_KEY`, `AUTENTIQUE_TOKEN` e `AUTENTIQUE_WEBHOOK_SECRET` já estão no cofre da Cloudflare
> (Pages → isapaulino → Settings → Environment variables / Secrets). **⚠️ Os VALORES NÃO ficam neste
> repositório** (é segredo de produção — a chave ASAAS movimenta dinheiro real). Guarde-os no seu
> **gerenciador de senhas**; a Cloudflare guarda criptografado e não deixa lê-los de volta, então o
> backup pessoal é o que evita perdê-los. Trocar um secret exige um novo deploy para valer.
> - Webhook ASAAS: **cadastrado** (`/api/webhooks/asaas`, token = `WEBHOOK_SECRET`).
> - Webhook Autentique: cadastrar no painel → `https://isabelapaulino.com.br/api/webhooks/autentique?secret=<AUTENTIQUE_WEBHOOK_SECRET>`, evento `document.finished`.

---

## ✅ Testar local
```bash
npm run db:apply:local      # cria as tabelas no D1 local
# crie .dev.vars com SESSION_SECRET=... e um admin no D1 local (passo 3 com --local)
npm run pages:dev           # builda e sobe o site + Functions + D1 local
```
Depois:
- `GET http://localhost:8788/api/health` → `{ "ok": true, "db": true }`
- `POST /api/auth/login` `{ "username":"isabela", "password":"..." }`

---

## Rotas da API (já implementadas)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/api/health` | — | Sanidade (Function + D1) |
| POST | `/api/auth/login` | — | Login; seta cookie de sessão |
| POST | `/api/auth/logout` | — | Encerra sessão |
| GET | `/api/auth/me` | sim | Usuário logado |
| GET | `/api/proposals` | sim | Lista propostas (resumo) |
| POST | `/api/proposals` | sim | Cria proposta (corpo: `{ proposal, status? }`) |
| GET | `/api/proposals/:number` | público* | Obtém proposta (*rascunho só p/ admin) |
| PUT | `/api/proposals/:number` | sim | Atualiza proposta |
| DELETE | `/api/proposals/:number` | sim | Remove proposta |
| GET/POST | `/api/briefings` | sim | Lista / cria briefing |
| GET | `/api/briefings/:number` | público* | Obtém briefing (*rascunho só p/ admin) |
| PUT/DELETE | `/api/briefings/:number` | sim | Atualiza / remove briefing |
| POST | `/api/upload` | sim | Envia imagem (multipart `file`) → R2 |
| GET | `/api/files/:key` | público | Serve arquivo do R2 (imagens) |

Modelo: cada proposta é uma linha com colunas de listagem + o objeto
`Proposal` inteiro em JSON na coluna `data`
(ver [`db/schema.sql`](db/schema.sql) e `src/components/proposal/types.ts`).
