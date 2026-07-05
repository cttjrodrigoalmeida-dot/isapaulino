// /api/clients/:id/photo  (admin)
//   POST (multipart: file) → grava a foto do cliente no R2 e salva photo_url.
//   DELETE                 → remove a foto (R2 + coluna).
// A foto é um avatar de baixa sensibilidade → fica sob o prefixo PÚBLICO
// `uploads/clients/` (servido por /api/files/...), para <img src> funcionar
// direto na lista, no ranking e nos aniversariantes.
import type { Env } from "../../_lib/types";
import { json, error, toErrorResponse } from "../../_lib/http";
import { requireAuth } from "../../_lib/auth";

const PREFIX = "uploads/clients/";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function extOf(type: string, name: string): string {
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  const m = /\.([a-z0-9]{1,8})$/i.exec(name || "");
  return m ? m[1].toLowerCase() : "jpg";
}

// Chave R2 → URL pública servida por /api/files.
const keyToUrl = (key: string) => `/api/files/${key}`;
// URL pública → chave R2 (para apagar a foto antiga).
function urlToKey(url: string | null): string | null {
  if (!url) return null;
  const i = url.indexOf("/api/files/");
  const key = i >= 0 ? url.slice(i + "/api/files/".length) : "";
  return key.startsWith(PREFIX) ? key : null;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const id = String(params.id);

    const row = await env.DB.prepare("SELECT photo_url FROM clients WHERE id = ?").bind(id).first<{ photo_url: string | null }>();
    if (!row) return error(404, "Cliente não encontrado.");

    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) return error(400, "Envie uma imagem no campo 'file'.");
    if (file.size === 0) return error(400, "Arquivo vazio.");
    if (file.size > MAX_BYTES) return error(413, "Imagem muito grande (máx. 5 MB).");
    if (file.type && !ALLOWED.has(file.type)) return error(415, "Formato inválido (use JPG, PNG, WEBP ou GIF).");

    const key = `${PREFIX}${id}-${crypto.randomUUID()}.${extOf(file.type, file.name)}`;
    await env.R2.put(key, file.stream(), {
      httpMetadata: { contentType: file.type || "image/jpeg" },
      customMetadata: { clientId: id },
    });

    const url = keyToUrl(key);
    await env.DB.prepare("UPDATE clients SET photo_url = ?, updated_at = datetime('now') WHERE id = ?").bind(url, id).run();

    // Remove a foto anterior (se havia) para não acumular lixo no R2.
    const oldKey = urlToKey(row.photo_url);
    if (oldKey && oldKey !== key) await env.R2.delete(oldKey).catch(() => {});

    return json({ ok: true, photo_url: url }, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const id = String(params.id);
    const row = await env.DB.prepare("SELECT photo_url FROM clients WHERE id = ?").bind(id).first<{ photo_url: string | null }>();
    if (!row) return error(404, "Cliente não encontrado.");

    const key = urlToKey(row.photo_url);
    if (key) await env.R2.delete(key).catch(() => {});
    await env.DB.prepare("UPDATE clients SET photo_url = NULL, updated_at = datetime('now') WHERE id = ?").bind(id).run();

    return json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
};
