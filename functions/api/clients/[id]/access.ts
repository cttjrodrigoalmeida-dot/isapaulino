// /api/clients/:id/access  (admin)
//   GET → { enabled, link } — link = magic link para você enviar ao cliente.
//   PUT { enabled } → liga/desliga o acesso à Área do Cliente.
import type { Env } from "../../_lib/types";
import { json, error, readJson, toErrorResponse } from "../../_lib/http";
import { requireAuth } from "../../_lib/auth";
import { createClientMagicToken } from "../../_lib/client-auth";

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const id = String(params.id);
    const c = await env.DB.prepare("SELECT access_enabled FROM clients WHERE id = ?")
      .bind(id)
      .first<{ access_enabled: number }>();
    if (!c) return error(404, "Cliente não encontrado.");

    const enabled = !!c.access_enabled;
    let link = "";
    if (enabled) {
      const token = await createClientMagicToken(id, env.SESSION_SECRET);
      // Usa a origem da requisição (host do admin) — funciona em local e produção.
      const base = new URL(request.url).origin.replace(/\/+$/, "");
      link = `${base}/api/client/magic?token=${token}`;
    }
    return json({ enabled, link });
  } catch (e) {
    return toErrorResponse(e);
  }
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const id = String(params.id);
    const body = await readJson<{ enabled?: boolean }>(request);

    const c = await env.DB.prepare("SELECT id FROM clients WHERE id = ?").bind(id).first();
    if (!c) return error(404, "Cliente não encontrado.");

    await env.DB.prepare("UPDATE clients SET access_enabled = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(body.enabled ? 1 : 0, id)
      .run();
    return json({ ok: true, enabled: !!body.enabled });
  } catch (e) {
    return toErrorResponse(e);
  }
};
