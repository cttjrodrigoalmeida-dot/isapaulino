// GET /api/client/magic?token=...  (público)
// Verifica o magic link, confirma que o acesso está liberado, seta o cookie de
// sessão do cliente e redireciona para /area. Erros → /area?erro=link|acesso.
import type { Env } from "../_lib/types";
import { toErrorResponse } from "../_lib/http";
import { verifyMagicToken, createClientSessionToken, clientSessionCookie } from "../_lib/client-auth";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const url = new URL(request.url);
    const dest = new URL("/area", url.origin);
    const token = url.searchParams.get("token") || "";

    const magic = await verifyMagicToken(token, env.SESSION_SECRET);
    if (!magic) {
      dest.searchParams.set("erro", "link");
      return Response.redirect(dest.toString(), 302);
    }

    const c = await env.DB.prepare("SELECT access_enabled FROM clients WHERE id = ?")
      .bind(magic.sub)
      .first<{ access_enabled: number }>();
    if (!c || !c.access_enabled) {
      dest.searchParams.set("erro", "acesso");
      return Response.redirect(dest.toString(), 302);
    }

    const session = await createClientSessionToken(magic.sub, env.SESSION_SECRET);
    return new Response(null, {
      status: 302,
      headers: { Location: dest.toString(), "Set-Cookie": clientSessionCookie(session) },
    });
  } catch (e) {
    return toErrorResponse(e);
  }
};
