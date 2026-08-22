// /api/contracts/:id/history/:hid  (admin)
//   PUT    → edita um evento do histórico do projeto.
//   DELETE → remove um evento.
import type { Env } from "../../../_lib/types";
import { json, readJson, toErrorResponse } from "../../../_lib/http";
import { requireAuth } from "../../../_lib/auth";

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const id = String(params.id || "");
    const hid = String(params.hid || "");
    const body = await readJson<{ date?: string; type?: string; description?: string; phase?: string; categories?: string }>(request);
    await env.DB.prepare(
      `UPDATE project_history SET date = ?, type = ?, description = ?, phase = ?, categories = ?, updated_at = datetime('now')
       WHERE id = ? AND contract_id = ?`
    ).bind(
      (body.date || "").trim() || new Date().toISOString().slice(0, 10),
      (body.type || "observacao").trim(),
      (body.description || "").trim(),
      (body.phase || "").trim() || null,
      (body.categories || "").trim() || null,
      hid, id,
    ).run();
    return json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const id = String(params.id || "");
    const hid = String(params.hid || "");
    await env.DB.prepare("DELETE FROM project_history WHERE id = ? AND contract_id = ?").bind(hid, id).run();
    return json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
};
