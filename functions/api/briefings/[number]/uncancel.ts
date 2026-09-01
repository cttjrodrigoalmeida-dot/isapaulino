// POST /api/briefings/:number/uncancel  (admin)
// Reverte o cancelamento do briefing e, em cascata, do projeto inteiro (mesma
// numeração). Cada documento volta ao status que tinha antes de ser cancelado.
import type { Env } from "../../_lib/types";
import { json, toErrorResponse } from "../../_lib/http";
import { requireAuth } from "../../_lib/auth";
import { restoreProject } from "../../_lib/contractSync";

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const number = String(params.number || "");
    // Reverte sempre este briefing (mesmo sem proposta vinculada)…
    await env.DB.prepare(
      `UPDATE briefings SET status = COALESCE(NULLIF(prev_status, ''), 'published'), prev_status = NULL, updated_at = datetime('now')
       WHERE number = ? AND status = 'cancelled' AND deleted_at IS NULL`
    ).bind(number).run();
    // …e, em cascata, os demais documentos da mesma numeração.
    const row = await env.DB.prepare("SELECT proposal_number FROM briefings WHERE number = ?")
      .bind(number)
      .first<{ proposal_number: string | null }>();
    await restoreProject(env, (row?.proposal_number || number).trim());
    return json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
};
