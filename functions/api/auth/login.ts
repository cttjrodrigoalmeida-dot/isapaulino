// POST /api/auth/login  { username, password } → seta cookie de sessão.
import type { Env } from "../_lib/types";
import { json, error, readJson, toErrorResponse } from "../_lib/http";
import { verifyPassword, createSessionToken, sessionCookie } from "../_lib/auth";

interface Body {
  username?: string;
  password?: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const { username, password } = await readJson<Body>(request);
    if (!username || !password) return error(400, "Informe usuário e senha.");

    // Rate limit por IP: 5 falhas de login em 10 minutos → 429 (anti força-bruta).
    // Usa os registros do middleware de auditoria (path + status 401 + ip).
    const ip = request.headers.get("CF-Connecting-IP");
    if (ip) {
      const fails = await env.DB.prepare(
        "SELECT COUNT(*) AS n FROM audit_logs WHERE path = '/api/auth/login' AND status = 401 AND ip = ? AND at > datetime('now', '-10 minutes')"
      ).bind(ip).first<{ n: number }>().catch(() => null);
      if ((fails?.n ?? 0) >= 5) {
        return error(429, "Muitas tentativas de login. Aguarde 10 minutos e tente novamente.");
      }
    }

    const row = await env.DB.prepare(
      "SELECT username, password_hash FROM admin_users WHERE username = ?"
    )
      .bind(username)
      .first<{ username: string; password_hash: string }>();

    if (!row || !(await verifyPassword(password, row.password_hash))) {
      return error(401, "Usuário ou senha inválidos.");
    }

    const token = await createSessionToken(row.username, env.SESSION_SECRET);
    return json(
      { ok: true, user: { username: row.username } },
      { headers: { "Set-Cookie": sessionCookie(token) } }
    );
  } catch (e) {
    return toErrorResponse(e);
  }
};
