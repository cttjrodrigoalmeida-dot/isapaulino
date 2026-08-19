// /api/portfolio-library/:id
//   PUT    → atualiza a legenda (admin) — corpo = { caption }.
//   DELETE → remove da biblioteca (admin). NÃO apaga o arquivo do R2 (pode
//            estar em uso por propostas); só tira o item da biblioteca.
import type { Env } from "../_lib/types";
import { json, error, readJson, toErrorResponse } from "../_lib/http";
import { requireAuth } from "../_lib/auth";

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const id = String(params.id);
    const body = await readJson<{ caption?: string }>(request);
    const caption = (body.caption ?? "").toString().trim();
    const res = await env.DB.prepare(
      "UPDATE portfolio_library SET caption = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(caption || null, id).run();
    if (!res.meta.changes) return error(404, "Item não encontrado.");
    return json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const id = String(params.id);
    const res = await env.DB.prepare("DELETE FROM portfolio_library WHERE id = ?").bind(id).run();
    if (!res.meta.changes) return error(404, "Item não encontrado.");
    return json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
};
