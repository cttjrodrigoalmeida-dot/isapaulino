// POST /api/client/verify  { cpf }  (cliente logado, não verificado)
// Confere o CPF/CNPJ informado contra o cadastro do cliente e, se bater, reemite
// a sessão como "verificada". Defesa extra caso o link mágico vaze.
import type { Env } from "../_lib/types";
import { json, error, readJson, toErrorResponse } from "../_lib/http";
import { requireClient, createClientSessionToken, clientSessionCookie } from "../_lib/client-auth";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const clientId = await requireClient(request, env); // aceita sessão não verificada
    const body = await readJson<{ cpf?: string }>(request);
    const given = (body.cpf || "").replace(/\D+/g, "");
    if (given.length < 4) return error(400, "Informe seu CPF/CNPJ.");

    const c = await env.DB.prepare("SELECT cpf_cnpj FROM clients WHERE id = ?")
      .bind(clientId).first<{ cpf_cnpj: string | null }>();
    const real = (c?.cpf_cnpj || "").replace(/\D+/g, "");
    if (!real || real !== given) {
      return error(403, "CPF/CNPJ não confere. Tente novamente.");
    }

    const session = await createClientSessionToken(clientId, env.SESSION_SECRET, true);
    return json({ ok: true }, { headers: { "Set-Cookie": clientSessionCookie(session) } });
  } catch (e) {
    return toErrorResponse(e);
  }
};
