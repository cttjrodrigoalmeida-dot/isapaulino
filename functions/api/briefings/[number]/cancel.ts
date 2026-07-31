// POST /api/briefings/:number/cancel  (admin) — marca o briefing como 'cancelled'.
import type { Env } from "../../_lib/types";
import { json, toErrorResponse } from "../../_lib/http";
import { requireAuth } from "../../_lib/auth";

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const number = String(params.number || "");
    await env.DB.prepare(
      "UPDATE briefings SET status = 'cancelled', updated_at = datetime('now') WHERE number = ? AND status != 'cancelled'"
    ).bind(number).run();
    return json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
};
