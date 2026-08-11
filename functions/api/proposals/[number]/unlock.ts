// POST /api/proposals/:number/unlock  { password }
// Libera uma proposta protegida por senha. Se a senha bater, grava um cookie
// assinado (30 dias) que autoriza ver aquela proposta sem redigitar.
import type { Env } from "../../_lib/types";
import { json, error, readJson, toErrorResponse } from "../../_lib/http";
import { signAccess, accessCookie } from "../../_lib/proposal-access";

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const number = String(params.number);
    const body = await readJson<{ password?: string }>(request);
    const attempt = (body.password ?? "").toString();

    const row = await env.DB.prepare(
      "SELECT status, access_password FROM proposals WHERE number = ?"
    ).bind(number).first<{ status: string; access_password: string | null }>();
    if (!row || row.status !== "published") return error(404, "Proposta não encontrada.");

    const pw = (row.access_password ?? "").trim();
    // Sem senha configurada: nada a desbloquear (proposta é pública).
    if (!pw) return json({ ok: true });

    if (attempt !== pw) return error(401, "Senha incorreta.");

    const token = await signAccess(number, env.SESSION_SECRET);
    return json({ ok: true }, { headers: { "Set-Cookie": accessCookie(number, token) } });
  } catch (e) {
    return toErrorResponse(e);
  }
};
