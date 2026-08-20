// Autenticação da Área do Cliente (separada do admin). Sessão via token HMAC
// assinado com o SESSION_SECRET, com aud="client"; o "magic link" (aud="magic")
// loga o cliente. Cookie: ips_cliente.
//   - Link mágico traz a VERSÃO (v) do cliente; se o admin "gerar novo link"
//     (incrementa access_token_version), os links antigos deixam de valer.
//   - Sessão tem flag `ver` (verificado): se o cliente tem CPF, o 1º acesso
//     exige confirmar o CPF (defesa extra caso o link vaze).
import type { Env } from "./types";
import { HttpError } from "./http";

const CLIENT_COOKIE = "ips_cliente";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // sessão: 30 dias
const MAGIC_TTL_MS = 1000 * 60 * 60 * 24 * 30;   // link de acesso válido: 30 dias

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
  const key = await crypto.subtle.importKey("raw", te(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, te(data));
  return b64url(bytesToB64(new Uint8Array(sig)));
}

type Aud = "client" | "magic";
interface ClientToken { sub: string; aud: Aud; exp: number; v?: number; ver?: boolean; }

async function sign(payload: ClientToken, secret: string): Promise<string> {
  const p = b64url(btoa(JSON.stringify(payload)));
  const sig = await hmac(secret, p);
  return `${p}.${sig}`;
}
async function verify(token: string, secret: string, aud: Aud): Promise<ClientToken | null> {
  const dot = token.indexOf(".");
  if (dot < 0) return null;
  const p = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (sig !== (await hmac(secret, p))) return null;
  try {
    const t = JSON.parse(atob(unb64url(p))) as ClientToken;
    if (!t.exp || t.exp < Date.now() || t.aud !== aud || !t.sub) return null;
    return t;
  } catch {
    return null;
  }
}

export function createClientMagicToken(clientId: string, secret: string, version = 1): Promise<string> {
  return sign({ sub: clientId, aud: "magic", exp: Date.now() + MAGIC_TTL_MS, v: version }, secret);
}
export function createClientSessionToken(clientId: string, secret: string, verified = true): Promise<string> {
  return sign({ sub: clientId, aud: "client", exp: Date.now() + SESSION_TTL_MS, ver: verified }, secret);
}
export function verifyMagicToken(token: string, secret: string): Promise<ClientToken | null> {
  return verify(token, secret, "magic");
}

export function clientSessionCookie(token: string): string {
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  return `${CLIENT_COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}
export function clearClientCookie(): string {
  return `${CLIENT_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
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

/** Sessão do cliente logado (ou null). */
export async function getClientSession(request: Request, env: Env): Promise<ClientToken | null> {
  const token = readCookie(request, CLIENT_COOKIE);
  if (!token) return null;
  return verify(token, env.SESSION_SECRET, "client");
}
/** Exige cliente autenticado (mesmo não verificado); lança 401. Retorna client_id. */
export async function requireClient(request: Request, env: Env): Promise<string> {
  const t = await getClientSession(request, env);
  if (!t) throw new HttpError(401, "Não autenticado.");
  return t.sub;
}
/** Exige cliente autenticado E verificado (CPF confirmado). 428 se faltar verificar. */
export async function requireVerifiedClient(request: Request, env: Env): Promise<string> {
  const t = await getClientSession(request, env);
  if (!t) throw new HttpError(401, "Não autenticado.");
  if (t.ver === false) throw new HttpError(428, "Confirme seu CPF para acessar.");
  return t.sub;
}

/** clientId do cliente logado E verificado, ou null (NÃO lança). Usado nos
 *  documentos públicos p/ liberar o acesso do DONO sem senha por documento. */
export async function verifiedClientId(request: Request, env: Env): Promise<string | null> {
  const t = await getClientSession(request, env);
  if (!t || t.ver === false) return null;
  return t.sub;
}
