// POST /api/briefings/:number/upload  (multipart: campo "file")
//   PÚBLICO, mas só aceita anexo se o briefing está publicado (limita abuso).
//   Usado pelo cliente para enviar imagens/arquivos de referência junto do briefing.
//   Devolve { url, key }; a URL é servida por /api/files/<key>.
import type { Env } from "../../_lib/types";
import { json, error, toErrorResponse } from "../../_lib/http";

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB (arquivos de referência podem ser maiores)
// Tipos de imagem que podem ser servidos inline com segurança (SVG fica de fora — risco de XSS).
const INLINE_IMAGES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

// Extensão a partir do nome original (sanitizada) p/ anexos não-imagem (pdf, dwg, zip…).
function extFromName(name: string): string {
  const m = /\.([a-z0-9]{1,8})$/i.exec(name ?? "");
  return m ? m[1].toLowerCase() : "bin";
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const number = String(params.number);

    // só aceita anexo para briefing publicado
    const b = await env.DB.prepare("SELECT status FROM briefings WHERE number = ?")
      .bind(number)
      .first<{ status: string }>();
    if (!b || b.status !== "published") return error(404, "Briefing não encontrado.");

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return error(400, "Envie um arquivo no campo 'file'.");
    if (file.size > MAX_BYTES) return error(413, "Arquivo muito grande (máx. 15 MB).");

    const inlineExt = INLINE_IMAGES[file.type];
    const ext = inlineExt ?? extFromName(file.name);
    const key = `briefing-refs/${number}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    // Imagens conhecidas: servidas inline. Demais: octet-stream + download (evita XSS armazenado).
    const httpMetadata: R2HTTPMetadata = inlineExt
      ? { contentType: file.type, cacheControl: "public, max-age=31536000, immutable" }
      : {
          contentType: "application/octet-stream",
          contentDisposition: `attachment; filename="${(file.name || "anexo").replace(/"/g, "")}"`,
          cacheControl: "public, max-age=31536000, immutable",
        };

    await env.R2.put(key, file.stream(), { httpMetadata });

    return json({ ok: true, url: `/api/files/${key}`, key }, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
};
