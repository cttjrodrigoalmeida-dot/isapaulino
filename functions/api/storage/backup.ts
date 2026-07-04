// GET /api/storage/backup  (admin)
// Exporta TODOS os dados de negócio do D1 num JSON para download (cópia manual).
// Credenciais (admin_users) e tabelas transitórias (logs) ficam de fora.
import type { Env } from "../_lib/types";
import { toErrorResponse } from "../_lib/http";
import { requireAuth } from "../_lib/auth";
import { buildBackup } from "../_lib/backup";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env);
    const { dump, filename } = await buildBackup(env);
    return new Response(dump, {
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
