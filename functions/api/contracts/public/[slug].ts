// GET /api/contracts/public/:slug  (público, sem auth)
// Retorna o contrato pelo slug, apenas se publicado ou assinado. Inclui o nome
// do cliente para resolver o placeholder {{cliente}} na página pública.
import type { Env } from "../../_lib/types";
import { json, error, toErrorResponse } from "../../_lib/http";

const COLS = `c.title, c.content, c.data, c.value, c.deadline, c.status,
  c.autentique_url AS autentiqueUrl, c.signed_at AS signedAt, c.published_at AS publishedAt, cl.name AS clientName`;

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  try {
    const slug = String(params.slug);
    const contract = await env.DB.prepare(
      `SELECT ${COLS} FROM contracts c LEFT JOIN clients cl ON cl.id = c.client_id WHERE c.slug = ?`
    ).bind(slug).first<{ status: string }>();

    // Só expõe contratos publicados/assinados (rascunho e cancelado ficam ocultos).
    if (!contract || (contract.status !== "published" && contract.status !== "signed")) {
      return error(404, "Contrato não encontrado.");
    }

    return json({ contract });
  } catch (e) {
    return toErrorResponse(e);
  }
};
