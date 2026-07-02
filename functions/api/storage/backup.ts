// GET /api/storage/backup  (admin)
// Exporta os dados do D1 (propostas, briefings, respostas e agenda) num único
// arquivo JSON para download. Credenciais (admin_users) ficam de fora de
// propósito. Serve como cópia de segurança manual antes de mudanças grandes.
import type { Env } from "../_lib/types";
import { toErrorResponse } from "../_lib/http";
import { requireAuth } from "../_lib/auth";

const TABLES = ["proposals", "briefings", "briefing_responses", "calendar_events"] as const;

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env);

    const data: Record<string, unknown[]> = {};
    for (const table of TABLES) {
      const { results } = await env.DB.prepare(`SELECT * FROM ${table}`).all();
      data[table] = results ?? [];
    }

    const dump = {
      app: "isapaulino-studio",
      version: 1,
      generatedAt: new Date().toISOString(),
      tables: data,
    };

    const stamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const filename = `backup-isapaulino-${stamp}.json`;

    return new Response(JSON.stringify(dump, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return toErrorResponse(e);
  }
};
