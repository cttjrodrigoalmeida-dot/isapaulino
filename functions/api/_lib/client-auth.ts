// Autenticação da Área do Cliente (separada do admin). Sessão via token HMAC
// assinado com o SESSION_SECRET, com aud="client"; o "magic link" (aud="magic")
// loga o cliente e troca por um cookie de sessão. Cookie: ips_cliente.
import type { Env } from "./types";
import { HttpError } from "./http";

const CLIENT_COOKIE = "ips_cliente";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // sessão: 30 dias
const MAGIC_TTL_MS = 1000 * 60 * 60 * 24 * 90;   // link de acesso válido: 90 dias

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
interface ClientToken { sub: string; aud: Aud; exp: number; }

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

export function createClientMagicToken(clientId: string, secret: string): Promise<string> {
  return sign({ sub: clientId, aud: "magic", exp: Date.now() + MAGIC_TTL_MS }, secret);
}
export function createClientSessionToken(clientId: string, secret: string): Promise<string> {
  return sign({ sub: clientId, aud: "client", exp: Date.now() + SESSION_TTL_MS }, secret);
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

/** client_id do cliente logado (ou null). */
export async function getClientSession(request: Request, env: Env): Promise<string | null> {
  const token = readCookie(request, CLIENT_COOKIE);
  if (!token) return null;
  const t = await verify(token, env.SESSION_SECRET, "client");
  return t ? t.sub : null;
}
/** Exige cliente autenticado; lança 401. */
export async function requireClient(request: Request, env: Env): Promise<string> {
  const sub = await getClientSession(request, env);
  if (!sub) throw new HttpError(401, "Não autenticado.");
  return sub;
}
