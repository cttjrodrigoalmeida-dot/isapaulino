// /api/note-library/:id
//   PUT    → atualiza (admin) — corpo = { title?, body?, pinned? }.
//   DELETE → remove (admin).
import type { Env } from "../_lib/types";
import { json, error, readJson, toErrorResponse } from "../_lib/http";
import { requireAuth } from "../_lib/auth";

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const id = String(params.id);
    const body = await readJson<{ title?: string; body?: string; pinned?: boolean; contractId?: string }>(request);
    const title = (body.title ?? "").toString().trim();
    const text = (body.body ?? "").toString();
    if (!title && !text.trim()) return error(400, "Escreva um título ou o conteúdo da nota.");
    const contractId = (body.contractId ?? "").toString().trim();
    // Atualiza o projeto vinculado só quando o campo veio no corpo.
    const res = "contractId" in body
      ? await env.DB.prepare(
          "UPDATE note_library SET title = ?, body = ?, pinned = ?, contract_id = ?, updated_at = datetime('now') WHERE id = ?"
        ).bind(title, text, body.pinned ? 1 : 0, contractId || null, id).run()
      : await env.DB.prepare(
          "UPDATE note_library SET title = ?, body = ?, pinned = ?, updated_at = datetime('now') WHERE id = ?"
        ).bind(title, text, body.pinned ? 1 : 0, id).run();
    if (!res.meta.changes) return error(404, "Nota não encontrada.");
    return json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const id = String(params.id);
    const res = await env.DB.prepare("DELETE FROM note_library WHERE id = ?").bind(id).run();
    if (!res.meta.changes) return error(404, "Nota não encontrada.");
    return json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
};
