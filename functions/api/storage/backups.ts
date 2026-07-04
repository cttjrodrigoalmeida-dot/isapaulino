// /api/storage/backups  (admin)
//   GET               → lista os backups automáticos guardados no R2 (backups/).
//   GET ?key=backups/… → baixa aquele backup (autenticado).
import type { Env } from "../_lib/types";
import { json, error, toErrorResponse } from "../_lib/http";
import { requireAuth } from "../_lib/auth";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env);
    const key = new URL(request.url).searchParams.get("key");

    if (key) {
      if (!key.startsWith("backups/")) return error(400, "Chave inválida.");
      const obj = await env.R2.get(key);
      if (!obj) return error(404, "Backup não encontrado.");
      return new Response(obj.body, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${key.split("/").pop()}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const files: { key: string; size: number; uploaded: string }[] = [];
    let cursor: string | undefined;
    do {
      const page = await env.R2.list({ prefix: "backups/", cursor, limit: 1000 });
      for (const o of page.objects) {
        files.push({ key: o.key, size: o.size, uploaded: o.uploaded instanceof Date ? o.uploaded.toISOString() : String(o.uploaded) });
      }
      cursor = page.truncated ? page.cursor : undefined;
    } while (cursor);
    files.sort((a, b) => b.uploaded.localeCompare(a.uploaded));
    return json({ backups: files });
  } catch (e) {
    return toErrorResponse(e);
  }
};
