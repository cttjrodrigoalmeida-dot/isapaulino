// /api/contracts/:id/history  (admin)
//   GET  → linha do tempo (histórico do projeto) do contrato.
//   POST → adiciona um evento { date, type, description, phase }.
import type { Env } from "../../_lib/types";
import { json, readJson, toErrorResponse } from "../../_lib/http";
import { requireAuth } from "../../_lib/auth";

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const id = String(params.id || "");
    const { results } = await env.DB.prepare(
      `SELECT id, contract_id AS contractId, date, type, description, phase, categories, created_at AS createdAt
         FROM project_history WHERE contract_id = ? ORDER BY date DESC, created_at DESC`
    ).bind(id).all();
    return json({ history: results ?? [] });
  } catch (e) {
    return toErrorResponse(e);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const id = String(params.id || "");
    const body = await readJson<{ date?: string; type?: string; description?: string; phase?: string; categories?: string }>(request);
    const hid = crypto.randomUUID();
    const date = (body.date || "").trim() || new Date().toISOString().slice(0, 10);
    await env.DB.prepare(
      `INSERT INTO project_history (id, contract_id, date, type, description, phase, categories)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(hid, id, date, (body.type || "observacao").trim(), (body.description || "").trim(), (body.phase || "").trim() || null, (body.categories || "").trim() || null).run();
    return json({ ok: true, id: hid }, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
};
