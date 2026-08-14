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

type Row = { data: string; status: string; editor_notes: string | null; editor_done: string | null };

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const number = String(params.number);
    const row = await env.DB.prepare("SELECT data, status, editor_notes, editor_done FROM briefings WHERE number = ?")
      .bind(number)
      .first<Row>();
    if (!row) return error(404, "Briefing não encontrado.");
    const session = await getSession(request, env);
    const isAdmin = !!session;
    if (row.status !== "published" && !isAdmin) {
      return error(404, "Briefing não encontrado.");
    }
    // O apoio pessoal (notas/checklist) só vai para o admin — nunca para o cliente.
    const aid = isAdmin ? { editorNotes: row.editor_notes ?? "", editorDone: safeParseArr(row.editor_done) } : {};
    return json({ briefing: JSON.parse(row.data), status: row.status, ...aid });
  } catch (e) {
    return toErrorResponse(e);
  }
};

function safeParseArr(s: string | null): string[] {
  if (!s) return [];
  try { const v = JSON.parse(s); return Array.isArray(v) ? v.map(String) : []; } catch { return []; }
}

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const number = String(params.number);
    const body = await readJson<{ briefing?: BriefingLike; status?: string; editorNotes?: string; editorDone?: string[] }>(request);
    const briefing = body.briefing;
    if (!briefing) return error(400, "Briefing inválido.");

    const existing = await env.DB.prepare("SELECT status, editor_notes, editor_done FROM briefings WHERE number = ?")
      .bind(number)
      .first<{ status: string; editor_notes: string | null; editor_done: string | null }>();
    if (!existing) return error(404, "Briefing não encontrado.");

    const status =
      body.status === "published" || body.status === "draft" || body.status === "cancelled" ? body.status : existing.status;
    // Apoio pessoal: se veio no corpo, atualiza; senão mantém o atual.
    const editorNotes = "editorNotes" in body ? String(body.editorNotes ?? "") : existing.editor_notes;
    const editorDone = "editorDone" in body ? JSON.stringify(body.editorDone ?? []) : existing.editor_done;

    await env.DB.prepare(
      `UPDATE briefings
       SET proposal_number = ?, title = ?, status = ?, data = ?, editor_notes = ?, editor_done = ?, updated_at = datetime('now')
       WHERE number = ?`
    )
      .bind(briefing.proposalNumber ?? null, briefing.title ?? null, status, JSON.stringify(briefing), editorNotes, editorDone, number)
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
