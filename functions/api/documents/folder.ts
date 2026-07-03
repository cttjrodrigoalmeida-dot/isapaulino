// POST /api/documents/folder  (admin) → cria uma pasta vazia (marcador .keep).
//   { folder }  → grava docs/<folder>/.keep para a pasta existir mesmo sem arquivos.
import type { Env } from "../_lib/types";
import { json, error, readJson, toErrorResponse } from "../_lib/http";
import { requireAuth } from "../_lib/auth";

function safeFolder(input: unknown): string {
  const s = (typeof input === "string" ? input : "").trim().toLowerCase();
  const clean = s.replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return clean;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env);
    const body = await readJson<{ folder?: string }>(request);
    const folder = safeFolder(body.folder);
    if (!folder) return error(400, "Informe um nome de pasta válido.");
    await env.R2.put(`docs/${folder}/.keep`, new Uint8Array(0), {
      customMetadata: { folder, keep: "1" },
    });
    return json({ ok: true, folder });
  } catch (e) {
    return toErrorResponse(e);
  }
};
