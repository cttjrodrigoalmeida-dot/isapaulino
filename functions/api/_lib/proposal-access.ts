// ============================================================
// Acesso protegido por senha a uma proposta pública.
// Quando a proposta tem `access_password`, o visitante precisa digitar a senha
// (POST /api/proposals/:number/unlock). Em caso de acerto, gravamos um cookie
// com um token assinado (HMAC-SHA256, mesmo SESSION_SECRET) que libera aquela
// proposta por 30 dias — assim o cliente não redigita a cada visita.
// ============================================================

const ACCESS_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 dias
const enc = new TextEncoder();
const te = (s: string): Uint8Array<ArrayBuffer> => new Uint8Array(enc.encode(s));

function bytesToB64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
function b64url(s: string): string {
  return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function unb64url(s: string): string {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return s;
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    te(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, te(data));
  return b64url(bytesToB64(new Uint8Array(sig)));
}

interface AccessPayload {
  n: string;   // número da proposta liberada
  exp: number; // expiração (ms)
}

/** Nome do cookie por documento (ex.: ips_prop_2624). O `prefix` separa os
 *  namespaces (proposta = "ips_prop_", contrato = "ips_ctr_") p/ não colidirem. */
function cookieName(number: string, prefix = "ips_prop_"): string {
  return `${prefix}${number.replace(/[^A-Za-z0-9_-]/g, "")}`;
}

/** Cria o token assinado que libera esta proposta. */
export async function signAccess(number: string, secret: string): Promise<string> {
  const payload: AccessPayload = { n: number, exp: Date.now() + ACCESS_TTL_MS };
  const payloadB64 = b64url(btoa(JSON.stringify(payload)));
  const sig = await hmac(secret, payloadB64);
  return `${payloadB64}.${sig}`;
}

/** Cookie Set-Cookie que grava o token (HttpOnly, 30 dias). */
export function accessCookie(number: string, token: string, prefix = "ips_prop_"): string {
  const maxAge = Math.floor(ACCESS_TTL_MS / 1000);
  return `${cookieName(number, prefix)}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("Cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}

/** Verifica um token cru (assinatura + expiração + chave). Usado tanto pelo
 *  cookie quanto pelo parâmetro ?access= (renderização de PDF no servidor). */
export async function verifyAccessToken(token: string, secret: string, number: string): Promise<boolean> {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot < 0) return false;
  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmac(secret, payloadB64);
  if (sig !== expected) return false;
  try {
    const payload = JSON.parse(atob(unb64url(payloadB64))) as AccessPayload;
    return payload.n === number && !!payload.exp && payload.exp >= Date.now();
  } catch {
    return false;
  }
}

/** true se o request já tem um cookie válido liberando este documento. */
export async function hasAccess(request: Request, secret: string, number: string, prefix = "ips_prop_"): Promise<boolean> {
  const token = readCookie(request, cookieName(number, prefix));
  return token ? verifyAccessToken(token, secret, number) : false;
}
