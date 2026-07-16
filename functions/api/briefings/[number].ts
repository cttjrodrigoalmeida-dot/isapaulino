// /api/briefings/:number
//   GET    → obtém (público se publicado; admin vê qualquer status).
//   PUT    → atualiza (admin). Corpo = { briefing, status? }.
//   DELETE → remove (admin).
import type { Env } from "../_lib/types";
import { json, error, readJson, toErrorResponse } from "../_lib/http";
import { requireAuth, getSession } from "../_lib/auth";

interface BriefingLike {
  number?: string;
  proposalNumber?: string;
  title?: string;
  [k: string]: unknown;
}

type Row = { data: string; status: string };

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const number = String(params.number);
    const row = await env.DB.prepare("SELECT data, status FROM briefings WHERE number = ?")
      .bind(number)
      .first<Row>();
    if (!row) return error(404, "Briefing não encontrado.");
    if (row.status !== "published") {
      const session = await getSession(request, env);
      if (!session) return error(404, "Briefing não encontrado.");
    }
    return json({ briefing: JSON.parse(row.data), status: row.status });
  } catch (e) {
    return toErrorResponse(e);
  }
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const number = String(params.number);
    const body = await readJson<{ briefing?: BriefingLike; status?: string }>(request);
    const briefing = body.briefing;
    if (!briefing) return error(400, "Briefing inválido.");

    const existing = await env.DB.prepare("SELECT status FROM briefings WHERE number = ?")
      .bind(number)
      .first<{ status: string }>();
    if (!existing) return error(404, "Briefing não encontrado.");

    const status =
      body.status === "published" || body.status === "draft" || body.status === "cancelled" ? body.status : existing.status;

    await env.DB.prepare(
      `UPDATE briefings
       SET proposal_number = ?, title = ?, status = ?, data = ?, updated_at = datetime('now')
       WHERE number = ?`
    )
      .bind(briefing.proposalNumber ?? null, briefing.title ?? null, status, JSON.stringify(briefing), number)
      .run();

    return json({ ok: true, number, status });
  } catch (e) {
    return toErrorResponse(e);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const number = String(params.number);
    const res = await env.DB.prepare("DELETE FROM briefings WHERE number = ?").bind(number).run();
    if (!res.meta.changes) return error(404, "Briefing não encontrado.");
    return json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
};
