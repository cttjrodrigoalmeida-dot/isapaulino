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

type Row = { data: string; status: string; access_password: string | null; custom_slug: string | null };

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    // O parâmetro da URL pode ser o número OU a URL personalizada (custom_slug).
    const key = String(params.number);
    const row = await env.DB.prepare(
      "SELECT data, status, access_password, custom_slug FROM proposals WHERE number = ? OR custom_slug = ?"
    ).bind(key, key).first<Row>();
    if (!row) return error(404, "Proposta não encontrada.");

    const session = await getSession(request, env);
    const isAdmin = !!session;

    // Rascunho só aparece para admin autenticado.
    if (row.status !== "published" && !isAdmin) {
      return error(404, "Proposta não encontrada.");
    }

    // Admin enxerga tudo (inclusive a senha e a URL personalizada, para reenviar).
    if (isAdmin) {
      return json({ proposal: JSON.parse(row.data), status: row.status, accessPassword: row.access_password ?? "", customSlug: row.custom_slug ?? "" });
    }

    // Proposta protegida por senha: sem token válido, não devolve o conteúdo.
    const pw = (row.access_password ?? "").trim();
    if (pw) {
      const ok = await hasAccess(request, env.SESSION_SECRET, key);
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
    const body = await readJson<{ proposal?: ProposalLike; status?: string; accessPassword?: string | null; customSlug?: string | null }>(request);
    const proposal = body.proposal;
    if (!proposal) return error(400, "Proposta inválida.");

    const existing = await env.DB.prepare("SELECT status, access_password, custom_slug FROM proposals WHERE number = ?")
      .bind(number)
      .first<{ status: string; access_password: string | null; custom_slug: string | null }>();
    if (!existing) return error(404, "Proposta não encontrada.");

    const status = body.status === "published" || body.status === "draft" || body.status === "cancelled" ? body.status : existing.status;
    // Se `accessPassword` veio no corpo, atualiza (vazio → NULL = pública);
    // se não veio, mantém a senha atual.
    const accessPassword =
      "accessPassword" in body
        ? ((body.accessPassword ?? "").toString().trim() || null)
        : existing.access_password;

    // URL personalizada (alias). Vazio → NULL. Só letras/números/hífen/underscore.
    // Não pode colidir com o número ou o slug de OUTRA proposta.
    let customSlug = existing.custom_slug;
    if ("customSlug" in body) {
      const s = (body.customSlug ?? "").toString().trim();
      if (!s) {
        customSlug = null;
      } else if (!/^[A-Za-z0-9_-]+$/.test(s)) {
        return error(400, "URL personalizada inválida: use apenas letras, números, hífen (-) e underscore (_), sem espaços.");
      } else {
        const clash = await env.DB.prepare(
          "SELECT 1 AS x FROM proposals WHERE (number = ? OR custom_slug = ?) AND number != ?"
        ).bind(s, s, number).first();
        if (clash) return error(409, "Essa URL personalizada já está em uso por outra proposta.");
        customSlug = s;
      }
    }

    await env.DB.prepare(
      `UPDATE proposals
       SET client = ?, service_title = ?, date = ?, status = ?, access_password = ?, custom_slug = ?, data = ?, updated_at = datetime('now')
       WHERE number = ?`
    )
      .bind(
        proposal.client ?? null,
        proposal.serviceTitle ?? null,
        proposal.date ?? null,
        status,
        accessPassword,
        customSlug,
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
