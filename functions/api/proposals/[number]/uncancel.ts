// POST /api/proposals/:number/uncancel  (admin)
// Reverte o cancelamento: a proposta e todos os documentos da mesma numeração
// (briefing e contrato/aditivos) voltam ao status que tinham antes. O registro
// nunca foi apagado — só muda de status, então o processo continua de onde parou.
import type { Env } from "../../_lib/types";
import { json, toErrorResponse } from "../../_lib/http";
import { requireAuth } from "../../_lib/auth";
import { restoreProject } from "../../_lib/contractSync";

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    await restoreProject(env, String(params.number || ""));
    return json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
};
