// POST /api/upload  (multipart: campo "file") → grava no R2 e devolve a URL.
// Apenas admin autenticado. A URL retornada é servida por /api/files/<key>.
import type { Env } from "./_lib/types";
import { json, error, toErrorResponse } from "./_lib/http";
import { requireAuth } from "./_lib/auth";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];

function extFromType(type: string): string {
  return (
    {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/avif": "avif",
      "image/gif": "gif",
    }[type] ?? "bin"
  );
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env);

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return error(400, "Envie um arquivo no campo 'file'.");
    if (!ALLOWED.includes(file.type)) return error(415, "Formato não suportado (use JPG, PNG, WEBP, AVIF ou GIF).");
    if (file.size > MAX_BYTES) return error(413, "Imagem muito grande (máx. 8 MB).");

    const key = `uploads/${Date.now()}-${crypto.randomUUID()}.${extFromType(file.type)}`;
    await env.R2.put(key, file.stream(), {
      httpMetadata: { contentType: file.type, cacheControl: "public, max-age=31536000, immutable" },
    });

    return json({ ok: true, url: `/api/files/${key}`, key }, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
};
