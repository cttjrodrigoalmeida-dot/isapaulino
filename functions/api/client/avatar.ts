// POST /api/client/avatar  (cliente autenticado)
// O cliente escolhe/troca o próprio avatar. Fica no cadastro (sincroniza com o
// painel admin, que lê o mesmo campo).
import type { Env } from "../_lib/types";
import { json, error, readJson, toErrorResponse } from "../_lib/http";
import { requireVerifiedClient } from "../_lib/client-auth";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const clientId = await requireVerifiedClient(request, env);
    const body = await readJson<{ avatar?: string }>(request);
    const avatar = (body.avatar || "").trim();
    if (!avatar) return error(400, "Escolha um avatar.");
    await env.DB.prepare("UPDATE clients SET avatar = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(avatar, clientId).run();
    return json({ ok: true, avatar });
  } catch (e) {
    return toErrorResponse(e);
  }
};
