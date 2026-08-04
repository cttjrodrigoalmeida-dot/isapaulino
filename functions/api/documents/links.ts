// GET /api/documents/links?proposal=NNNN  (admin)
// Resolve os documentos vinculados a um número de proposta — proposta, contrato
// e briefing — para os atalhos "Relacionados" nos editores do painel. O elo entre
// os três é sempre o número da proposta.
import type { Env } from "../_lib/types";
import { json, error, toErrorResponse } from "../_lib/http";
import { requireAuth } from "../_lib/auth";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env);
    const proposal = (new URL(request.url).searchParams.get("proposal") || "").trim();
    if (!proposal) return error(400, "Parâmetro 'proposal' é obrigatório.");

    const prop = await env.DB.prepare(
      "SELECT number, client, service_title, outcome, status FROM proposals WHERE number = ?"
    ).bind(proposal).first<{ number: string; client: string | null; service_title: string | null; outcome: string | null; status: string | null }>();

    // Contrato vinculado: prioriza o principal (aditivo por último), mais antigo primeiro.
    const contract = await env.DB.prepare(
      `SELECT slug, status, json_extract(data, '$.contractNumber') AS contractNumber
         FROM contracts
        WHERE deleted_at IS NULL AND json_extract(data, '$.proposalNumber') = ?
        ORDER BY (json_extract(data, '$.kind') = 'aditivo') ASC, created_at ASC
        LIMIT 1`
    ).bind(proposal).first<{ slug: string | null; status: string; contractNumber: string | null }>();

    const briefing = await env.DB.prepare(
      "SELECT number, status FROM briefings WHERE proposal_number = ? ORDER BY updated_at DESC LIMIT 1"
    ).bind(proposal).first<{ number: string; status: string }>();

    return json({
      proposalNumber: proposal,
      client: prop?.client ?? null,
      projectTitle: prop?.service_title ?? null,
      proposal: prop ? { number: prop.number, status: prop.status, outcome: prop.outcome } : null,
      contract: contract ? { slug: contract.slug, number: contract.contractNumber, status: contract.status } : null,
      briefing: briefing ? { number: briefing.number, status: briefing.status } : null,
    });
  } catch (e) {
    return toErrorResponse(e);
  }
};
