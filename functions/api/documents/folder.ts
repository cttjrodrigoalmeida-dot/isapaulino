// /api/documents/folder  (admin)
//   POST   { folder }  → cria uma pasta vazia (marcador docs/<folder>/.keep).
//   DELETE { folder }  → apaga a pasta e TUDO dentro dela (arquivos + .keep).
//     Como os arquivos vivem só no R2, isso também os remove da Área do Cliente.
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

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env);
    const body = await readJson<{ folder?: string }>(request);
    const folder = safeFolder(body.folder);
    if (!folder) return error(400, "Informe um nome de pasta válido.");

    // Apaga todos os objetos sob docs/<folder>/ (arquivos + marcador .keep),
    // paginando por segurança em pastas grandes.
    const prefix = `docs/${folder}/`;
    let deleted = 0;
    let cursor: string | undefined;
    do {
      const page = await env.R2.list({ prefix, cursor, limit: 1000 });
      const keys = page.objects.map((o) => o.key);
      if (keys.length) {
        await env.R2.delete(keys);
        deleted += keys.length;
      }
      cursor = page.truncated ? page.cursor : undefined;
    } while (cursor);

    return json({ ok: true, deleted });
  } catch (e) {
    return toErrorResponse(e);
  }
};
