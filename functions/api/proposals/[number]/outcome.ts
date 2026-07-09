// POST /api/proposals/:number/outcome  { outcome: 'aprovada' | 'nao-aprovada' }
// Define manualmente o resultado comercial da proposta. Só 'aprovada' entra no
// faturamento/indicadores financeiros (ver dashboard/overview.ts).
import type { Env } from "../../_lib/types";
import { json, error, readJson, toErrorResponse } from "../../_lib/http";
import { requireAuth } from "../../_lib/auth";

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const number = String(params.number);
    const body = await readJson<{ outcome?: string }>(request);
    const outcome = body.outcome === "aprovada" ? "aprovada" : "nao-aprovada";

    const res = await env.DB.prepare(
      "UPDATE proposals SET outcome = ?, updated_at = datetime('now') WHERE number = ?"
    ).bind(outcome, number).run();
    if (!res.meta.changes) return error(404, "Proposta não encontrada.");

    return json({ ok: true, outcome });
  } catch (e) {
    return toErrorResponse(e);
  }
};
