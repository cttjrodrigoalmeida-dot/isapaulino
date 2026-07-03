// GET /api/audit?limit=  (admin) → lista os logs de auditoria mais recentes.
// (Rota é /api/audit e não /api/logs porque `logs/` cai no .gitignore.)
import type { Env } from "../_lib/types";
import { json, toErrorResponse } from "../_lib/http";
import { requireAuth } from "../_lib/auth";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env);
    const url = new URL(request.url);
    const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit")) || 200));
    const { results } = await env.DB.prepare(
      `SELECT id, at, user, action, method, path, status FROM audit_logs ORDER BY at DESC LIMIT ?`
    ).bind(limit).all();
    return json({ logs: results ?? [] });
  } catch (e) {
    return toErrorResponse(e);
  }
};
