// GET /api/client/download?key=docs/...  (cliente autenticado)
// Baixa um arquivo do R2 SÓ se ele pertencer ao cliente logado
// (customMetadata.clientId === cliente da sessão). Evita que um cliente baixe
// arquivo de outro.
import type { Env } from "../_lib/types";
import { error, toErrorResponse } from "../_lib/http";
import { requireClient } from "../_lib/client-auth";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const clientId = await requireClient(request, env);
    const key = new URL(request.url).searchParams.get("key") || "";
    if (!key.startsWith("docs/")) return error(400, "Chave inválida.");

    const obj = await env.R2.get(key);
    if (!obj) return error(404, "Arquivo não encontrado.");
    if (obj.customMetadata?.clientId !== clientId) return error(403, "Acesso negado.");

    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set("etag", obj.httpEtag);
    const name = (obj.customMetadata?.name || key.split("/").pop() || "arquivo").replace(/"/g, "");
    headers.set("Content-Disposition", `attachment; filename="${name}"`);
    headers.set("Cache-Control", "private, no-store");
    return new Response(obj.body, { headers });
  } catch (e) {
    return toErrorResponse(e);
  }
};
