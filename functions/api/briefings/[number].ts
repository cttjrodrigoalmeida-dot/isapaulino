// /api/briefings/:number
//   GET    → obtém (público se publicado; admin vê qualquer status).
//   PUT    → atualiza (admin). Corpo = { briefing, status? }.
//   DELETE → remove (admin).
import type { Env } from "../_lib/types";
import { json, error, readJson, toErrorResponse } from "../_lib/http";
import { requireAuth, getSession } from "../_lib/auth";
import { cancelProject } from "../_lib/contractSync";

interface BriefingLike {
  number?: string;
  proposalNumber?: string;
  title?: string;
  [k: string]: unknown;
}

type Row = { data: string; status: string; editor_notes: string | null; editor_done: string | null; editor_checklist: string | null; locked_at: string | null };

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const number = String(params.number);
    const row = await env.DB.prepare("SELECT data, status, editor_notes, editor_done, editor_checklist, locked_at FROM briefings WHERE number = ? AND deleted_at IS NULL")
      .bind(number)
      .first<Row>();
    if (!row) return error(404, "Briefing não encontrado.");
    const session = await getSession(request, env);
    const isAdmin = !!session;
    if (row.status !== "published" && !isAdmin) {
      return error(404, "Briefing não encontrado.");
    }
    // O apoio pessoal (notas/checklist) só vai para o admin — nunca para o cliente.
    const aid = isAdmin ? { editorNotes: row.editor_notes ?? "", editorDone: safeParseArr(row.editor_done), editorChecklist: safeParseObjArr(row.editor_checklist) } : {};
    // `locked` é público: a página do cliente fica só-leitura quando bloqueado.
    return json({ briefing: JSON.parse(row.data), status: row.status, locked: !!row.locked_at, ...aid });
  } catch (e) {
    return toErrorResponse(e);
  }
};

function safeParseArr(s: string | null): string[] {
  if (!s) return [];
  try { const v = JSON.parse(s); return Array.isArray(v) ? v.map(String) : []; } catch { return []; }
}
// Checklist manual: [{ id, label, done }] — descarta itens malformados.
function safeParseObjArr(s: string | null): { id: string; label: string; done: boolean }[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    if (!Array.isArray(v)) return [];
    return v
      .filter((it) => it && typeof it === "object" && typeof it.label === "string")
      .map((it) => ({ id: String(it.id ?? crypto.randomUUID()), label: String(it.label), done: !!it.done }));
  } catch { return []; }
}

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const number = String(params.number);
    const body = await readJson<{ briefing?: BriefingLike; status?: string; editorNotes?: string; editorDone?: string[]; editorChecklist?: unknown[] }>(request);
    const briefing = body.briefing;
    if (!briefing) return error(400, "Briefing inválido.");

    const existing = await env.DB.prepare("SELECT status, editor_notes, editor_done, editor_checklist FROM briefings WHERE number = ? AND deleted_at IS NULL")
      .bind(number)
      .first<{ status: string; editor_notes: string | null; editor_done: string | null; editor_checklist: string | null }>();
    if (!existing) return error(404, "Briefing não encontrado.");

    const status =
      body.status === "published" || body.status === "draft" || body.status === "cancelled" ? body.status : existing.status;
    // Apoio pessoal: se veio no corpo, atualiza; senão mantém o atual.
    const editorNotes = "editorNotes" in body ? String(body.editorNotes ?? "") : existing.editor_notes;
    const editorDone = "editorDone" in body ? JSON.stringify(body.editorDone ?? []) : existing.editor_done;
    const editorChecklist = "editorChecklist" in body ? JSON.stringify(safeParseObjArr(JSON.stringify(body.editorChecklist ?? []))) : existing.editor_checklist;

    await env.DB.prepare(
      `UPDATE briefings
       SET proposal_number = ?, title = ?, status = ?, data = ?, editor_notes = ?, editor_done = ?, editor_checklist = ?, updated_at = datetime('now')
       WHERE number = ?`
    )
      .bind(briefing.proposalNumber ?? null, briefing.title ?? null, status, JSON.stringify(briefing), editorNotes, editorDone, editorChecklist, number)
      .run();

    // Cancelou por aqui → cascata para todos os documentos da mesma numeração.
    if (status === "cancelled" && existing.status !== "cancelled") {
      await cancelProject(env, (briefing.proposalNumber || number || "").toString().trim());
    }

    return json({ ok: true, number, status });
  } catch (e) {
    return toErrorResponse(e);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const number = String(params.number);
    // Soft-delete: vai para a Lixeira (recuperável / apagável de vez lá).
    const res = await env.DB.prepare(
      "UPDATE briefings SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE number = ? AND deleted_at IS NULL"
    ).bind(number).run();
    if (!res.meta.changes) return error(404, "Briefing não encontrado.");
    return json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
};
