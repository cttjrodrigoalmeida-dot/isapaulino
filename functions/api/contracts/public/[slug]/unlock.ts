// POST /api/contracts/public/:slug/unlock  { password }
// Libera um contrato protegido por senha. Se a senha bater, grava um cookie
// assinado (30 dias) que autoriza ver aquele contrato sem redigitar.
import type { Env } from "../../../_lib/types";
import { json, error, readJson, toErrorResponse } from "../../../_lib/http";
import { signAccess, accessCookie } from "../../../_lib/proposal-access";

const CONTRACT_ACCESS_PREFIX = "ips_ctr_";

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const slug = String(params.slug);
    const body = await readJson<{ password?: string }>(request);
    const attempt = (body.password ?? "").toString();

    const row = await env.DB.prepare(
      "SELECT status, access_password FROM contracts WHERE slug = ?"
    ).bind(slug).first<{ status: string; access_password: string | null }>();
    if (!row || (row.status !== "published" && row.status !== "signed")) {
      return error(404, "Contrato não encontrado.");
    }

    const pw = (row.access_password ?? "").trim();
    if (!pw) return json({ ok: true }); // sem senha: nada a desbloquear

    if (attempt !== pw) return error(401, "Senha incorreta.");

    const token = await signAccess(slug, env.SESSION_SECRET);
    return json({ ok: true }, { headers: { "Set-Cookie": accessCookie(slug, token, CONTRACT_ACCESS_PREFIX) } });
  } catch (e) {
    return toErrorResponse(e);
  }
};
