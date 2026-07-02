// GET /api/auth/me → { user } se autenticado, 401 caso contrário.
import type { Env } from "../_lib/types";
import { json, toErrorResponse } from "../_lib/http";
import { requireAuth } from "../_lib/auth";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const session = await requireAuth(request, env);
    const row = await env.DB.prepare("SELECT name FROM admin_users WHERE username = ?")
      .bind(session.sub)
      .first<{ name: string | null }>();
    return json({ user: { username: session.sub, name: row?.name ?? "" } });
  } catch (e) {
    return toErrorResponse(e);
  }
};
