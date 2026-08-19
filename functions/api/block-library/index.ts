// /api/block-library
//   GET  → lista (admin)  — blocos de investimento reutilizáveis salvos.
//   POST → cria (admin)   — corpo = { label, block }.
import type { Env } from "../_lib/types";
import { json, error, readJson, toErrorResponse } from "../_lib/http";
import { requireAuth } from "../_lib/auth";

interface Row { id: string; label: string; data: string }

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env);
    const { results } = await env.DB.prepare(
      "SELECT id, label, data FROM block_library ORDER BY updated_at DESC"
    ).all<Row>();
    const items = (results ?? []).map((r) => ({
      id: r.id,
      label: r.label,
      block: JSON.parse(r.data),
    }));
    return json({ items });
  } catch (e) {
    return toErrorResponse(e);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env);
    const body = await readJson<{ label?: string; block?: unknown }>(request);
    const label = (body.label ?? "").toString().trim();
    if (!label) return error(400, "Informe um nome para o bloco.");
    if (!body.block || typeof body.block !== "object") return error(400, "Bloco inválido.");

    const id = crypto.randomUUID();
    await env.DB.prepare(
      "INSERT INTO block_library (id, label, data) VALUES (?, ?, ?)"
    ).bind(id, label, JSON.stringify(body.block)).run();

    return json({ ok: true, id }, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
};
