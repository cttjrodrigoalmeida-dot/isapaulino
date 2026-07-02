// /api/proposals/:number
//   GET    → obtém a proposta.
//            • público: só se status = 'published'.
//            • admin (autenticado): qualquer status (para editar/pré-visualizar).
//   PUT    → atualiza (admin). Corpo = { proposal, status? }.
//   DELETE → remove (admin).
import type { Env } from "../_lib/types";
import { json, error, readJson, toErrorResponse } from "../_lib/http";
import { requireAuth, getSession } from "../_lib/auth";

interface ProposalLike {
  number?: string;
  client?: string;
  serviceTitle?: string;
  date?: string;
  [k: string]: unknown;
}

type Row = { data: string; status: string };

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const number = String(params.number);
    const row = await env.DB.prepare("SELECT data, status FROM proposals WHERE number = ?")
      .bind(number)
      .first<Row>();
    if (!row) return error(404, "Proposta não encontrada.");

    // Rascunho só aparece para admin autenticado.
    if (row.status !== "published") {
      const session = await getSession(request, env);
      if (!session) return error(404, "Proposta não encontrada.");
    }

    return json({ proposal: JSON.parse(row.data), status: row.status });
  } catch (e) {
    return toErrorResponse(e);
  }
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const number = String(params.number);
    const body = await readJson<{ proposal?: ProposalLike; status?: string }>(request);
    const proposal = body.proposal;
    if (!proposal) return error(400, "Proposta inválida.");

    const existing = await env.DB.prepare("SELECT status FROM proposals WHERE number = ?")
      .bind(number)
      .first<{ status: string }>();
    if (!existing) return error(404, "Proposta não encontrada.");

    const status = body.status === "published" || body.status === "draft" ? body.status : existing.status;

    await env.DB.prepare(
      `UPDATE proposals
       SET client = ?, service_title = ?, date = ?, status = ?, data = ?, updated_at = datetime('now')
       WHERE number = ?`
    )
      .bind(
        proposal.client ?? null,
        proposal.serviceTitle ?? null,
        proposal.date ?? null,
        status,
        JSON.stringify(proposal),
        number
      )
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
    const res = await env.DB.prepare("DELETE FROM proposals WHERE number = ?").bind(number).run();
    if (!res.meta.changes) return error(404, "Proposta não encontrada.");
    return json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
};
