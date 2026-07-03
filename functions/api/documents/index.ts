// /api/documents  (admin) — gerenciador de documentos no R2 (prefixo docs/).
//   GET            → { files: [{ key, name, folder, size, uploaded, contentType }] }
//   POST (multipart: file, folder?) → grava em docs/<folder>/<uuid>.<ext>
//   DELETE { key } → remove (só chaves sob docs/).
// Download é autenticado em /api/documents/download?key=... (docs podem ser sensíveis).
import type { Env } from "../_lib/types";
import { json, error, readJson, toErrorResponse } from "../_lib/http";
import { requireAuth } from "../_lib/auth";

const PREFIX = "docs/";
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB por arquivo

function safeFolder(input: unknown): string {
  const s = (typeof input === "string" ? input : "").trim().toLowerCase();
  const clean = s.replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return clean || "geral";
}
function extOf(name: string): string {
  const m = /\.([a-z0-9]{1,8})$/i.exec(name || "");
  return m ? m[1].toLowerCase() : "bin";
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env);
    const files: { key: string; name: string; folder: string; size: number; uploaded: string; contentType: string | null; clientId: string | null; clientName: string | null }[] = [];
    let cursor: string | undefined;
    do {
      // `include` existe em runtime (traz customMetadata/httpMetadata) mas falta
      // no tipo desta versão do workers-types — cast só nas opções.
      const listOpts = { prefix: PREFIX, cursor, limit: 1000, include: ["customMetadata", "httpMetadata"] } as unknown as R2ListOptions;
      const page = await env.R2.list(listOpts);
      for (const obj of page.objects) {
        const rel = obj.key.slice(PREFIX.length);
        const folder = rel.includes("/") ? rel.split("/")[0] : "geral";
        files.push({
          key: obj.key,
          name: obj.customMetadata?.name || rel.split("/").pop() || obj.key,
          folder: obj.customMetadata?.folder || folder,
          size: obj.size,
          uploaded: obj.uploaded instanceof Date ? obj.uploaded.toISOString() : String(obj.uploaded),
          contentType: obj.httpMetadata?.contentType ?? null,
          clientId: obj.customMetadata?.clientId || null,
          clientName: obj.customMetadata?.clientName || null,
        });
      }
      cursor = page.truncated ? page.cursor : undefined;
    } while (cursor);
    files.sort((a, b) => b.uploaded.localeCompare(a.uploaded));
    return json({ files });
  } catch (e) {
    return toErrorResponse(e);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return error(400, "Envie um arquivo no campo 'file'.");
    if (file.size === 0) return error(400, "Arquivo vazio.");
    if (file.size > MAX_BYTES) return error(413, "Arquivo muito grande (máx. 25 MB).");

    const folder = safeFolder(form.get("folder"));
    const name = (file.name || "arquivo").slice(0, 160);
    const key = `${PREFIX}${folder}/${crypto.randomUUID()}.${extOf(name)}`;

    // Associação opcional a um cliente (para aparecer na Área do Cliente dele).
    const clientId = typeof form.get("clientId") === "string" ? String(form.get("clientId")).trim() : "";
    const meta: Record<string, string> = { name, folder };
    if (clientId) {
      const cl = await env.DB.prepare("SELECT name FROM clients WHERE id = ?").bind(clientId).first<{ name: string }>();
      if (cl) {
        meta.clientId = clientId;
        meta.clientName = cl.name;
      }
    }

    await env.R2.put(key, file.stream(), {
      httpMetadata: { contentType: file.type || "application/octet-stream" },
      customMetadata: meta,
    });

    return json({ ok: true, key, name, folder, clientId: meta.clientId ?? null }, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env);
    const body = await readJson<{ key?: string }>(request);
    const key = (body.key || "").trim();
    if (!key || !key.startsWith(PREFIX)) return error(400, "Chave inválida.");
    await env.R2.delete(key);
    return json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
};
