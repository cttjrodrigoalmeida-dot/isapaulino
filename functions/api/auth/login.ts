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
