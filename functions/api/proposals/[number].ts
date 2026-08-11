// /api/proposals/:number
//   GET    → obtém a proposta.
//            • público: só se status = 'published'.
//            • admin (autenticado): qualquer status (para editar/pré-visualizar).
//   PUT    → atualiza (admin). Corpo = { proposal, status? }.
//   DELETE → remove (admin).
import type { Env } from "../_lib/types";
import { json, error, readJson, toErrorResponse } from "../_lib/http";
import { requireAuth, getSession } from "../_lib/auth";
import { hasAccess } from "../_lib/proposal-access";

interface ProposalLike {
  number?: string;
  client?: string;
  serviceTitle?: string;
  date?: string;
  [k: string]: unknown;
}

type Row = { data: string; status: string; access_password: string | null };

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const number = String(params.number);
    const row = await env.DB.prepare("SELECT data, status, access_password FROM proposals WHERE number = ?")
      .bind(number)
      .first<Row>();
    if (!row) return error(404, "Proposta não encontrada.");

    const session = await getSession(request, env);
    const isAdmin = !!session;

    // Rascunho só aparece para admin autenticado.
    if (row.status !== "published" && !isAdmin) {
      return error(404, "Proposta não encontrada.");
    }

    // Admin enxerga tudo (inclusive a senha, para reenviar ao cliente).
    if (isAdmin) {
      return json({ proposal: JSON.parse(row.data), status: row.status, accessPassword: row.access_password ?? "" });
    }

    // Proposta protegida por senha: sem token válido, não devolve o conteúdo.
    const pw = (row.access_password ?? "").trim();
    if (pw) {
      const ok = await hasAccess(request, env.SESSION_SECRET, number);
      if (!ok) return json({ locked: true });
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
    const body = await readJson<{ proposal?: ProposalLike; status?: string; accessPassword?: string | null }>(request);
    const proposal = body.proposal;
    if (!proposal) return error(400, "Proposta inválida.");

    const existing = await env.DB.prepare("SELECT status, access_password FROM proposals WHERE number = ?")
      .bind(number)
      .first<{ status: string; access_password: string | null }>();
    if (!existing) return error(404, "Proposta não encontrada.");

    const status = body.status === "published" || body.status === "draft" || body.status === "cancelled" ? body.status : existing.status;
    // Se `accessPassword` veio no corpo, atualiza (vazio → NULL = pública);
    // se não veio, mantém a senha atual.
    const accessPassword =
      "accessPassword" in body
        ? ((body.accessPassword ?? "").toString().trim() || null)
        : existing.access_password;

    await env.DB.prepare(
      `UPDATE proposals
       SET client = ?, service_title = ?, date = ?, status = ?, access_password = ?, data = ?, updated_at = datetime('now')
       WHERE number = ?`
    )
      .bind(
        proposal.client ?? null,
        proposal.serviceTitle ?? null,
        proposal.date ?? null,
        status,
        accessPassword,
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
