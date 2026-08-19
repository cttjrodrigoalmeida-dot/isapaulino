// /api/block-library/:id
//   PUT    → renomeia (admin) — corpo = { label }.
//   DELETE → remove (admin).
import type { Env } from "../_lib/types";
import { json, error, readJson, toErrorResponse } from "../_lib/http";
import { requireAuth } from "../_lib/auth";

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const id = String(params.id);
    const body = await readJson<{ label?: string }>(request);
    const label = (body.label ?? "").toString().trim();
    if (!label) return error(400, "Informe um nome.");
    const res = await env.DB.prepare(
      "UPDATE block_library SET label = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(label, id).run();
    if (!res.meta.changes) return error(404, "Bloco não encontrado.");
    return json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const id = String(params.id);
    const res = await env.DB.prepare("DELETE FROM block_library WHERE id = ?").bind(id).run();
    if (!res.meta.changes) return error(404, "Bloco não encontrado.");
    return json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
};
