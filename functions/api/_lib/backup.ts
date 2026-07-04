// Backup dos dados do D1. Usado pelo download manual e pelo auto-backup
// (oportunista: quando o admin usa o painel, se o último tiver +24h, gera um e
// guarda no R2 em backups/). admin_users e tabelas transitórias ficam de fora.
import type { Env } from "./types";

const TABLES = [
  "clients", "contracts", "contract_payments", "installments", "client_history",
  "proposals", "briefings", "briefing_responses", "calendar_events", "app_settings",
] as const;

export async function buildBackup(env: Env): Promise<{ dump: string; filename: string }> {
  const data: Record<string, unknown[]> = {};
  for (const table of TABLES) {
    try {
      const { results } = await env.DB.prepare(`SELECT * FROM ${table}`).all();
      data[table] = results ?? [];
    } catch {
      data[table] = [];
    }
  }
  const dump = JSON.stringify(
    { app: "isapaulino-studio", version: 2, generatedAt: new Date().toISOString(), tables: data },
    null,
    2
  );
  const filename = `backup-isapaulino-${new Date().toISOString().slice(0, 10)}.json`;
  return { dump, filename };
}

/** Backup oportunista: no máximo 1 a cada ~24h, guardado no R2 em backups/. */
export async function maybeAutoBackup(env: Env): Promise<void> {
  try {
    const last = await env.DB.prepare("SELECT value FROM app_settings WHERE key = 'last_backup_at'")
      .first<{ value: string | null }>();
    const lastMs = last?.value ? Date.parse(last.value) : 0;
    if (Date.now() - lastMs < 1000 * 60 * 60 * 24) return; // menos de 24h → pula

    const { dump, filename } = await buildBackup(env);
    await env.R2.put(`backups/${filename}`, dump, {
      httpMetadata: { contentType: "application/json" },
    });
    await env.DB.prepare(
      "INSERT INTO app_settings (key, value, updated_at) VALUES ('last_backup_at', ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')"
    ).bind(new Date().toISOString()).run();
  } catch {
    /* nunca deixa o backup atrapalhar a requisição */
  }
}
