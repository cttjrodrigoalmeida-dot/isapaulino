// POST /api/contracts/:id/uncancel  (admin)
// Reverte o cancelamento do contrato e, em cascata, da proposta e do briefing
// vinculados. Contrato que já estava assinado volta como 'signed'.
import type { Env } from "../../_lib/types";
import { json, toErrorResponse } from "../../_lib/http";
import { requireAuth } from "../../_lib/auth";
import { restoreLinkedForContract } from "../../_lib/contractSync";

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const id = String(params.id || "");
    await env.DB.prepare(
      `UPDATE contracts SET status = COALESCE(NULLIF(prev_status, ''), CASE WHEN signed_at IS NOT NULL THEN 'signed' ELSE 'published' END), prev_status = NULL, updated_at = datetime('now')
       WHERE id = ? AND status = 'cancelled' AND deleted_at IS NULL`
    ).bind(id).run();
    await restoreLinkedForContract(env, id);
    return json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
};
