// POST /api/briefings/:number/lock  (admin) — bloqueia/desbloqueia as respostas.
//   Corpo: { locked: boolean }. Bloqueado = o cliente só visualiza (não edita);
//   o admin continua podendo editar as respostas pelo painel. Serve para
//   preservar o briefing que embasou o projeto depois de iniciados os trabalhos.
import type { Env } from "../../_lib/types";
import { json, error, readJson, toErrorResponse } from "../../_lib/http";
import { requireAuth } from "../../_lib/auth";

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const number = String(params.number || "");
    const body = await readJson<{ locked?: boolean }>(request);
    const locked = body.locked === true;

    const res = await env.DB.prepare(
      "UPDATE briefings SET locked_at = ?, updated_at = datetime('now') WHERE number = ?"
    )
      .bind(locked ? new Date().toISOString() : null, number)
      .run();
    if (!res.meta.changes) return error(404, "Briefing não encontrado.");

    return json({ ok: true, locked });
  } catch (e) {
    return toErrorResponse(e);
  }
};
