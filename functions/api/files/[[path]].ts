// GET /api/files/<key> → serve um arquivo do R2 (público; imagens dos ambientes).
import type { Env } from "../_lib/types";
import { error } from "../_lib/http";

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const parts = params.path;
  const key = Array.isArray(parts) ? parts.join("/") : String(parts ?? "");
  if (!key) return error(400, "Caminho inválido.");

  const obj = await env.R2.get(key);
  if (!obj) return error(404, "Arquivo não encontrado.");

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("etag", obj.httpEtag);
  if (!headers.has("Cache-Control")) {
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
  }
  return new Response(obj.body, { headers });
};
