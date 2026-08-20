// GET /api/contracts/public/:slug  (público, sem auth)
// Retorna o contrato pelo slug, apenas se publicado ou assinado. Inclui o nome
// do cliente para resolver o placeholder {{cliente}} na página pública.
// Se o contrato tiver senha (access_password), só devolve o conteúdo com o
// cookie de acesso válido; senão responde { locked: true } (o cliente digita a
// senha em POST /api/contracts/public/:slug/unlock).
import type { Env } from "../../_lib/types";
import { json, error, toErrorResponse } from "../../_lib/http";
import { getSession } from "../../_lib/auth";
import { hasAccess, verifyAccessToken } from "../../_lib/proposal-access";
import { verifiedClientId } from "../../_lib/client-auth";

// Namespace de cookie separado do da proposta (evita colisão de slug).
export const CONTRACT_ACCESS_PREFIX = "ips_ctr_";

const COLS = `c.title, c.content, c.data, c.value, c.deadline, c.status,
  c.access_password AS accessPassword, c.client_id AS clientId,
  c.autentique_url AS autentiqueUrl, c.signed_at AS signedAt, c.published_at AS publishedAt, cl.name AS clientName`;

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const slug = String(params.slug);
    // Token de bypass assinado (?access=) — usado só na renderização de PDF no
    // servidor (Browser Rendering), que não carrega cookie nem sessão admin.
    const accessToken = new URL(request.url).searchParams.get("access");
    const contract = await env.DB.prepare(
      `SELECT ${COLS} FROM contracts c LEFT JOIN clients cl ON cl.id = c.client_id WHERE c.slug = ?`
    ).bind(slug).first<{ status: string; accessPassword: string | null; clientId: string | null }>();

    // Só expõe contratos publicados/assinados (rascunho e cancelado ficam ocultos).
    if (!contract || (contract.status !== "published" && contract.status !== "signed")) {
      return error(404, "Contrato não encontrado.");
    }

    // Protegido por senha: sem admin nem cookie válido, não devolve o conteúdo.
    const pw = (contract.accessPassword ?? "").trim();
    if (pw) {
      const isAdmin = !!(await getSession(request, env));
      // Dono logado na Área (login único) — sem senha por documento.
      const ownerLoggedIn = contract.clientId
        ? (await verifiedClientId(request, env)) === contract.clientId
        : false;
      const ok =
        isAdmin ||
        ownerLoggedIn ||
        (accessToken ? await verifyAccessToken(accessToken, env.SESSION_SECRET, slug) : false) ||
        (await hasAccess(request, env.SESSION_SECRET, slug, CONTRACT_ACCESS_PREFIX));
      if (!ok) return json({ locked: true });
    }
    // Nunca expõe senha nem o client_id na resposta pública.
    delete (contract as { accessPassword?: string | null }).accessPassword;
    delete (contract as { clientId?: string | null }).clientId;

    return json({ contract });
  } catch (e) {
    return toErrorResponse(e);
  }
};
