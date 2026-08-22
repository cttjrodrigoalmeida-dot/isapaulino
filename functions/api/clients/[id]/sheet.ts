// /api/clients/:id/sheet  (admin)
//   GET → planilha do cliente (linhas + cores das colunas), ou null se ainda não
//         foi criada (o front semeia a partir dos projetos nesse caso).
//   PUT → salva a planilha { rows, colColors }.
// A planilha é um JSON livre por cliente (linhas editáveis + estilo de cores).
import type { Env } from "../../_lib/types";
import { json, error, readJson, toErrorResponse } from "../../_lib/http";
import { requireAuth } from "../../_lib/auth";

// Cria a tabela se ainda não existir (evita depender de migração manual em prod).
async function ensureTable(env: Env): Promise<void> {
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS client_sheet (
       client_id  TEXT PRIMARY KEY,
       data       TEXT NOT NULL,
       updated_at TEXT NOT NULL DEFAULT (datetime('now'))
     )`
  ).run();
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    await ensureTable(env);
    const id = String(params.id || "");
    const row = await env.DB.prepare("SELECT data FROM client_sheet WHERE client_id = ?")
      .bind(id).first<{ data: string | null }>();
    if (!row?.data) return json({ sheet: null });
    let sheet: unknown = null;
    try { sheet = JSON.parse(row.data); } catch { sheet = null; }
    return json({ sheet });
  } catch (e) {
    return toErrorResponse(e);
  }
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    await ensureTable(env);
    const id = String(params.id || "");
    // Confere que o cliente existe (evita órfãos).
    const client = await env.DB.prepare("SELECT id FROM clients WHERE id = ? AND deleted_at IS NULL").bind(id).first();
    if (!client) return error(404, "Cliente não encontrado.");

    const body = await readJson<{ rows?: unknown; colColors?: unknown }>(request);
    const rows = Array.isArray(body.rows) ? body.rows : [];
    const colColors = body.colColors && typeof body.colColors === "object" ? body.colColors : {};
    const data = JSON.stringify({ rows, colColors });

    await env.DB.prepare(
      `INSERT INTO client_sheet (client_id, data, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(client_id) DO UPDATE SET data = excluded.data, updated_at = datetime('now')`
    ).bind(id, data).run();

    return json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
};
