// ============================================================
// Autenticação do painel admin.
// - Senha: hash PBKDF2-SHA256 (formato "pbkdf2$<iter>$<saltB64>$<hashB64>").
//   O mesmo formato é gerado por scripts/hash-password.mjs (Node) e
//   verificado aqui com a Web Crypto (disponível no runtime do Workers).
// - Sessão: token "<payloadB64url>.<hmacB64url>" assinado com HMAC-SHA256
//   usando SESSION_SECRET, guardado num cookie HttpOnly.
// ============================================================

import type { Env, Session } from "./types";
import { HttpError } from "./http";

const SESSION_COOKIE = "ips_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12h
const enc = new TextEncoder();
// Bytes UTF-8 com ArrayBuffer próprio (o TS novo exige ArrayBuffer, não ArrayBufferLike).
const te = (s: string): Uint8Array<ArrayBuffer> => new Uint8Array(enc.encode(s));

// ── base64 / base64url ──────────────────────────────────────
function bytesToB64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
function b64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function b64url(s: string): string {
  return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function unb64url(s: string): string {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return s;
}

// ── PBKDF2 (verificação de senha) ───────────────────────────
async function pbkdf2(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", te(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    key,
    256
  );
  return new Uint8Array(bits);
}

const HASH_ITERATIONS = 100_000;

/** Gera o hash PBKDF2 de uma senha no formato "pbkdf2$iter$saltB64$hashB64".
 *  Mesmo formato de scripts/hash-password.mjs, mas via Web Crypto (runtime Workers). */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16)) as Uint8Array<ArrayBuffer>;
  const derived = await pbkdf2(password, salt, HASH_ITERATIONS);
  return `pbkdf2$${HASH_ITERATIONS}$${bytesToB64(salt)}$${bytesToB64(derived)}`;
}

/** Verifica a senha contra o hash guardado ("pbkdf2$iter$saltB64$hashB64"). */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = parseInt(parts[1], 10);
  const salt = b64ToBytes(parts[2]);
  const expected = b64ToBytes(parts[3]);
  const actual = await pbkdf2(password, salt, iterations);
  return timingSafeEqual(actual, expected);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

// ── Sessão (HMAC) ───────────────────────────────────────────
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

/** Cria o token de sessão assinado para um usuário. */
export async function createSessionToken(username: string, secret: string): Promise<string> {
  const payload: Session = { sub: username, exp: Date.now() + SESSION_TTL_MS };
  const payloadB64 = b64url(btoa(JSON.stringify(payload)));
  const sig = await hmac(secret, payloadB64);
  return `${payloadB64}.${sig}`;
}

/** Valida o token e devolve a sessão, ou null se inválido/expirado. */
export async function verifySessionToken(token: string, secret: string): Promise<Session | null> {
  const dot = token.indexOf(".");
  if (dot < 0) return null;
  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmac(secret, payloadB64);
  if (sig !== expected) return null;
  try {
    const session = JSON.parse(atob(unb64url(payloadB64))) as Session;
    if (!session.exp || session.exp < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

// ── Cookie helpers ──────────────────────────────────────────
export function sessionCookie(token: string): string {
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  return `${SESSION_COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}
export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
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

/** Lê e valida a sessão do request (ou null). */
export async function getSession(request: Request, env: Env): Promise<Session | null> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;
  return verifySessionToken(token, env.SESSION_SECRET);
}

/** Exige autenticação; lança 401 se não houver sessão válida. */
export async function requireAuth(request: Request, env: Env): Promise<Session> {
  const session = await getSession(request, env);
  if (!session) throw new HttpError(401, "Não autenticado.");
  return session;
}
