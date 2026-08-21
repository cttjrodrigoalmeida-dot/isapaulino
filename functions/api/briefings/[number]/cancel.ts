// POST /api/briefings/:number/cancel  (admin) — marca o briefing como 'cancelled'.
import type { Env } from "../../_lib/types";
import { json, toErrorResponse } from "../../_lib/http";
import { requireAuth } from "../../_lib/auth";
import { cancelProject } from "../../_lib/contractSync";

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const number = String(params.number || "");
    // Cancela sempre este briefing (mesmo sem proposta vinculada)…
    await env.DB.prepare(
      "UPDATE briefings SET status = 'cancelled', updated_at = datetime('now') WHERE number = ? AND status != 'cancelled'"
    ).bind(number).run();
    // …e, em cascata, todos os documentos da mesma numeração (proposta e
    // contrato/aditivos). O elo é o nº da proposta vinculada; sem ela, o próprio nº.
    const row = await env.DB.prepare("SELECT proposal_number FROM briefings WHERE number = ?")
      .bind(number)
      .first<{ proposal_number: string | null }>();
    await cancelProject(env, (row?.proposal_number || number).trim());
    return json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
};
