// GET /api/client/briefings  (cliente autenticado)
// Lista os briefings do cliente (vinculados via proposta → mesmo cliente), com as
// respostas mais recentes (para pré-preencher o formulário e permitir editar).
import type { Env } from "../_lib/types";
import { json, toErrorResponse } from "../_lib/http";
import { requireVerifiedClient } from "../_lib/client-auth";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const clientId = await requireVerifiedClient(request, env);
    const client = await env.DB.prepare("SELECT name FROM clients WHERE id = ?")
      .bind(clientId)
      .first<{ name: string | null }>();
    if (!client?.name) return json({ briefings: [] });

    const { results } = await env.DB.prepare(
      `SELECT b.number, b.title, b.proposal_number AS proposalNumber, b.locked_at AS lockedAt,
         (SELECT r.answers FROM briefing_responses r WHERE r.briefing_number = b.number ORDER BY r.submitted_at DESC LIMIT 1) AS answers,
         (SELECT r.ref_images FROM briefing_responses r WHERE r.briefing_number = b.number ORDER BY r.submitted_at DESC LIMIT 1) AS refImages,
         (SELECT r.submitted_at FROM briefing_responses r WHERE r.briefing_number = b.number ORDER BY r.submitted_at DESC LIMIT 1) AS submittedAt
       FROM briefings b
       JOIN proposals p ON p.number = b.proposal_number
       WHERE b.status = 'published' AND b.deleted_at IS NULL AND p.deleted_at IS NULL AND lower(trim(p.client)) = lower(trim(?))
       ORDER BY b.number DESC`
    )
      .bind(client.name)
      .all<{ number: string; title: string | null; proposalNumber: string | null; lockedAt: string | null; answers: string | null; refImages: string | null; submittedAt: string | null }>();

    const briefings = (results ?? []).map((r) => ({
      number: r.number,
      title: r.title,
      proposalNumber: r.proposalNumber,
      responded: !!r.submittedAt,
      locked: !!r.lockedAt,
      submittedAt: r.submittedAt,
      answers: (r.answers ? JSON.parse(r.answers) : {}) as Record<string, string>,
      refImages: (r.refImages ? JSON.parse(r.refImages) : {}) as Record<string, string | string[]>,
    }));
    return json({ briefings });
  } catch (e) {
    return toErrorResponse(e);
  }
};
