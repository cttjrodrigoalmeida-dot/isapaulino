// POST /api/client/login  (público)
// Login da Área do Cliente por USUÁRIO + SENHA (definidos pelo admin). Cria a
// sessão do cliente (cookie ips_cliente) já verificada — a senha é a prova de
// identidade, então não pede o passo do CPF.
import type { Env } from "../_lib/types";
import { error, readJson, toErrorResponse } from "../_lib/http";
import { verifyPassword } from "../_lib/auth";
import { createClientSessionToken, clientSessionCookie } from "../_lib/client-auth";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body = await readJson<{ username?: string; password?: string }>(request);
    const username = (body.username || "").trim().toLowerCase();
    const password = body.password || "";
    if (!username || !password) return error(400, "Informe usuário e senha.");

    const c = await env.DB.prepare(
      "SELECT id, password_hash AS hash, access_enabled AS enabled FROM clients WHERE username = ? AND deleted_at IS NULL"
    ).bind(username).first<{ id: string; hash: string | null; enabled: number }>();

    // Mensagem genérica para não revelar se o usuário existe.
    if (!c || !c.hash || !(await verifyPassword(password, c.hash))) {
      return error(401, "Usuário ou senha inválidos.");
    }
    if (!c.enabled) return error(403, "Seu acesso ainda não foi liberado. Fale com o estúdio.");

    const session = await createClientSessionToken(c.id, env.SESSION_SECRET, true);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Set-Cookie": clientSessionCookie(session) },
    });
  } catch (e) {
    return toErrorResponse(e);
  }
};
