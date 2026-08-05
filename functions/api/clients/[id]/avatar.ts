// POST /api/clients/:id/avatar  (admin)
// O admin também pode escolher/trocar o avatar do cliente.
import type { Env } from "../../_lib/types";
import { json, readJson, toErrorResponse } from "../../_lib/http";
import { requireAuth } from "../../_lib/auth";

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const id = String(params.id);
    const body = await readJson<{ avatar?: string }>(request);
    const avatar = (body.avatar || "").trim() || null;
    await env.DB.prepare("UPDATE clients SET avatar = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(avatar, id).run();
    return json({ ok: true, avatar });
  } catch (e) {
    return toErrorResponse(e);
  }
};
