// Tipos de ambiente compartilhados pelas Pages Functions.

export interface Env {
  /** Banco D1 (binding configurado no wrangler.toml). */
  DB: D1Database;
  /** Armazenamento de arquivos R2 (imagens). */
  R2: R2Bucket;
  /** Segredo para assinar a sessão (HMAC). Definido como Secret no Pages. */
  SESSION_SECRET: string;
  /** URL pública do site (para cookies/links). */
  SITE_URL?: string;

  // ── Pagamentos (ASAAS) — opcionais; sem eles a integração fica inativa ──
  /** Chave de API do ASAAS (Secret). Ausente = integração desligada. */
  ASAAS_API_KEY?: string;
  /** Base da API do ASAAS. Default: https://api.asaas.com/v3 (sandbox: https://api-sandbox.asaas.com/v3). */
  ASAAS_API_URL?: string;
  /** Token esperado no header `asaas-access-token` do webhook. */
  WEBHOOK_SECRET?: string;

  // ── Assinatura (Autentique) — opcionais; sem eles a integração fica inativa ──
  /** Token de API da Autentique (Secret). Ausente = integração desligada. */
  AUTENTIQUE_TOKEN?: string;
  /** Base da API GraphQL da Autentique. Default: https://api.autentique.com.br/v2/graphql. */
  AUTENTIQUE_API_URL?: string;
  /** Segredo esperado no webhook da Autentique (query `?secret=`). */
  AUTENTIQUE_WEBHOOK_SECRET?: string;

  // ── Browser Rendering (REST) — opcional; sem ele o PDF é enviado manual ──
  /** Token da API do Cloudflare Browser Rendering (Secret). */
  BROWSER_RENDER_TOKEN?: string;
  /** ID da conta Cloudflare (var não sensível) — usado na URL da API. */
  CF_ACCOUNT_ID?: string;
}

/** Sessão decodificada do cookie. */
export interface Session {
  /** username do admin. */
  sub: string;
  /** expiração (epoch ms). */
  exp: number;
}
