// /api/clients/:id/access  (admin)
//   GET → { enabled, link } — link = magic link para você enviar ao cliente.
//   PUT { enabled?, regenerate? } → liga/desliga o acesso; regenerate=true
//        incrementa a versão do token (revoga links antigos) e devolve o novo.
import type { Env } from "../../_lib/types";
import { json, error, readJson, toErrorResponse } from "../../_lib/http";
import { requireAuth } from "../../_lib/auth";
import { createClientMagicToken } from "../../_lib/client-auth";

async function buildLink(request: Request, env: Env, id: string, version: number): Promise<string> {
  const token = await createClientMagicToken(id, env.SESSION_SECRET, version);
  const base = new URL(request.url).origin.replace(/\/+$/, "");
  return `${base}/api/client/magic?token=${token}`;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const id = String(params.id);
    const c = await env.DB.prepare("SELECT access_enabled, access_token_version AS v FROM clients WHERE id = ?")
      .bind(id)
      .first<{ access_enabled: number; v: number }>();
    if (!c) return error(404, "Cliente não encontrado.");

    const enabled = !!c.access_enabled;
    const link = enabled ? await buildLink(request, env, id, c.v ?? 1) : "";
    return json({ enabled, link });
  } catch (e) {
    return toErrorResponse(e);
  }
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const id = String(params.id);
    const body = await readJson<{ enabled?: boolean; regenerate?: boolean }>(request);

    const c = await env.DB.prepare("SELECT access_enabled, access_token_version AS v FROM clients WHERE id = ?")
      .bind(id).first<{ access_enabled: number; v: number }>();
    if (!c) return error(404, "Cliente não encontrado.");

    let version = c.v ?? 1;
    if (body.regenerate) {
      version += 1;
      await env.DB.prepare("UPDATE clients SET access_token_version = ?, updated_at = datetime('now') WHERE id = ?")
        .bind(version, id).run();
    }
    if (typeof body.enabled === "boolean") {
      await env.DB.prepare("UPDATE clients SET access_enabled = ?, updated_at = datetime('now') WHERE id = ?")
        .bind(body.enabled ? 1 : 0, id).run();
    }

    const enabled = typeof body.enabled === "boolean" ? body.enabled : !!c.access_enabled;
    const link = enabled ? await buildLink(request, env, id, version) : "";
    return json({ ok: true, enabled, link });
  } catch (e) {
    return toErrorResponse(e);
  }
};
