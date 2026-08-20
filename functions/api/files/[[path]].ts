// GET /api/files/<key> → serve um arquivo do R2 (público; imagens dos ambientes).
// SEGURANÇA: só serve prefixos PÚBLICOS. Documentos (docs/) são privados e saem
// apenas por /api/documents/download (admin) ou /api/client/download (dono) —
// EXCETO os anexos de referência do briefing, que vivem em docs/<pasta-cliente>/
// (p/ aparecerem no gerenciador de Arquivos) mas precisam ser exibidos na página
// do briefing. Esses são marcados com customMetadata.source === "briefing" e
// liberados por URL (chave UUID não adivinhável) — os demais docs seguem privados.
import type { Env } from "../_lib/types";
import { error } from "../_lib/http";

const PUBLIC_PREFIXES = ["uploads/", "briefing-refs/"];

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const parts = params.path;
  const key = Array.isArray(parts) ? parts.join("/") : String(parts ?? "");
  if (!key) return error(400, "Caminho inválido.");

  const alwaysPublic = PUBLIC_PREFIXES.some((p) => key.startsWith(p));
  const maybeBriefingRef = key.startsWith("docs/");
  if (!alwaysPublic && !maybeBriefingRef) return error(404, "Arquivo não encontrado.");

  const obj = await env.R2.get(key);
  if (!obj) return error(404, "Arquivo não encontrado.");
  // docs/ só é servido aqui se for anexo de briefing; o resto continua privado.
  if (!alwaysPublic && obj.customMetadata?.source !== "briefing") {
    return error(404, "Arquivo não encontrado.");
  }

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("etag", obj.httpEtag);
  if (!headers.has("Cache-Control")) {
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
  }
  return new Response(obj.body, { headers });
};
