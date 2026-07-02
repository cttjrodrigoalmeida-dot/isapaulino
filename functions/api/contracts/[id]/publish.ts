// POST /api/contracts/:id/publish  (admin)
// Publica o contrato: gera um slug único (se ainda não tiver), marca como
// 'published' e registra published_at. Devolve o slug para montar o link público.
import type { Env } from "../../_lib/types";
import { json, error, toErrorResponse } from "../../_lib/http";
import { requireAuth } from "../../_lib/auth";
import { uniqueSlug } from "../../_lib/slug";

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const id = String(params.id);

    const row = await env.DB.prepare(
      `SELECT c.slug AS slug, c.title AS title, cl.name AS clientName
       FROM contracts c LEFT JOIN clients cl ON cl.id = c.client_id
       WHERE c.id = ?`
    ).bind(id).first<{ slug: string | null; title: string; clientName: string | null }>();
    if (!row) return error(404, "Contrato não encontrado.");

    const slug = row.slug || uniqueSlug(row.clientName || row.title || "contrato");

    await env.DB.prepare(
      `UPDATE contracts
       SET slug = ?, status = 'published', published_at = COALESCE(published_at, datetime('now')), updated_at = datetime('now')
       WHERE id = ?`
    ).bind(slug, id).run();

    // Fase 3: publicar um contrato libera o acesso do cliente à Área do Cliente.
    await env.DB.prepare(
      "UPDATE clients SET access_enabled = 1, updated_at = datetime('now') WHERE id = (SELECT client_id FROM contracts WHERE id = ?)"
    ).bind(id).run();

    return json({ ok: true, slug, status: "published" });
  } catch (e) {
    return toErrorResponse(e);
  }
};
