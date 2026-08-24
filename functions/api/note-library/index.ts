// /api/note-library
//   GET  → lista (admin)  — notas reutilizáveis do estúdio.
//   POST → cria (admin)   — corpo = { title?, body?, pinned? }.
import type { Env } from "../_lib/types";
import { json, error, readJson, toErrorResponse } from "../_lib/http";
import { requireAuth } from "../_lib/auth";

interface Row { id: string; title: string; body: string; pinned: number; contract_id: string | null; updated_at: string }

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env);
    const { results } = await env.DB.prepare(
      "SELECT id, title, body, pinned, contract_id, updated_at FROM note_library ORDER BY pinned DESC, updated_at DESC"
    ).all<Row>();
    const items = (results ?? []).map((r) => ({
      id: r.id,
      title: r.title ?? "",
      body: r.body ?? "",
      pinned: !!r.pinned,
      contractId: r.contract_id ?? "",
      updatedAt: r.updated_at,
    }));
    return json({ items });
  } catch (e) {
    return toErrorResponse(e);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env);
    const body = await readJson<{ title?: string; body?: string; pinned?: boolean; contractId?: string }>(request);
    const title = (body.title ?? "").toString().trim();
    const text = (body.body ?? "").toString();
    if (!title && !text.trim()) return error(400, "Escreva um título ou o conteúdo da nota.");
    const contractId = (body.contractId ?? "").toString().trim();

    const id = crypto.randomUUID();
    await env.DB.prepare(
      "INSERT INTO note_library (id, title, body, pinned, contract_id) VALUES (?, ?, ?, ?, ?)"
    ).bind(id, title, text, body.pinned ? 1 : 0, contractId || null).run();

    return json({ ok: true, id }, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
};
