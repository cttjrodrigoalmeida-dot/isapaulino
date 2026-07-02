// GET /api/storage/usage  (admin)
// Soma o tamanho/contagem dos objetos no bucket R2, agrupados pelos prefixos
// usados pelo app (uploads de proposta e referências de briefing). Serve para
// a Isabela controlar o uso e não estourar o limite gratuito do R2.
import type { Env } from "../_lib/types";
import { json, toErrorResponse } from "../_lib/http";
import { requireAuth } from "../_lib/auth";

interface PrefixUsage {
  prefix: string;
  label: string;
  bytes: number;
  count: number;
}

const PREFIXES: { prefix: string; label: string }[] = [
  { prefix: "uploads/", label: "Imagens de proposta" },
  { prefix: "briefing-refs/", label: "Referências de briefing" },
];

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env);

    const usage: Record<string, PrefixUsage> = {};
    for (const p of PREFIXES) usage[p.prefix] = { ...p, bytes: 0, count: 0 };
    const other: PrefixUsage = { prefix: "", label: "Outros", bytes: 0, count: 0 };

    let totalBytes = 0;
    let objectCount = 0;
    let cursor: string | undefined;

    // Pagina toda a listagem do bucket (R2 retorna no máx. 1000 por página).
    do {
      const page = await env.R2.list({ cursor, limit: 1000 });
      for (const obj of page.objects) {
        totalBytes += obj.size;
        objectCount += 1;
        const bucket = PREFIXES.find((p) => obj.key.startsWith(p.prefix));
        const target = bucket ? usage[bucket.prefix] : other;
        target.bytes += obj.size;
        target.count += 1;
      }
      cursor = page.truncated ? page.cursor : undefined;
    } while (cursor);

    const byPrefix = [...Object.values(usage), other].filter((u) => u.count > 0 || u.prefix);

    return json({ totalBytes, objectCount, byPrefix });
  } catch (e) {
    return toErrorResponse(e);
  }
};
