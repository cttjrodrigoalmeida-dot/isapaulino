// POST /api/contracts/:id/cancel  (admin)
// Marca o contrato como 'cancelled' e cancela em cascata o briefing e a proposta
// vinculados (mesma sincronização do PUT). Idempotente.
import type { Env } from "../../_lib/types";
import { json, toErrorResponse } from "../../_lib/http";
import { requireAuth } from "../../_lib/auth";
import { cancelLinkedForContract } from "../../_lib/contractSync";

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const id = String(params.id || "");
    await env.DB.prepare(
      "UPDATE contracts SET prev_status = status, status = 'cancelled', updated_at = datetime('now') WHERE id = ? AND status != 'cancelled'"
    ).bind(id).run();
    await cancelLinkedForContract(env, id);
    return json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
};
