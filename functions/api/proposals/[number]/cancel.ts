// POST /api/proposals/:number/cancel  (admin) — marca a proposta como 'cancelled'.
import type { Env } from "../../_lib/types";
import { json, toErrorResponse } from "../../_lib/http";
import { requireAuth } from "../../_lib/auth";
import { cancelProject } from "../../_lib/contractSync";

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const number = String(params.number || "");
    // Cancela a proposta e, em cascata, todos os documentos da mesma numeração
    // (contrato/aditivos e briefing vinculados).
    await cancelProject(env, number);
    return json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
};
