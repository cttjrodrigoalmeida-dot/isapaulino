// GET /api/documents/download?key=docs/...  (admin)
// Baixa um documento do R2 com autenticação (diferente de /api/files, que é
// público). Força download com o nome original (Content-Disposition).
import type { Env } from "../_lib/types";
import { error, toErrorResponse } from "../_lib/http";
import { requireAuth } from "../_lib/auth";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env);
    const key = new URL(request.url).searchParams.get("key") || "";
    if (!key.startsWith("docs/")) return error(400, "Chave inválida.");

    const obj = await env.R2.get(key);
    if (!obj) return error(404, "Arquivo não encontrado.");

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
