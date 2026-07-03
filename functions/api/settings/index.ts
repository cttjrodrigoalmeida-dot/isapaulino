// /api/settings  (admin)
//   GET            → { settings: { chave: valor, ... } }
//   PUT { key, value } → grava/atualiza uma configuração (upsert)
import type { Env } from "../_lib/types";
import { json, error, readJson, toErrorResponse } from "../_lib/http";
import { requireAuth } from "../_lib/auth";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env);
    const { results } = await env.DB.prepare("SELECT key, value FROM app_settings").all<{ key: string; value: string | null }>();
    const settings: Record<string, string | null> = {};
    for (const r of results ?? []) settings[r.key] = r.value;
    return json({ settings });
  } catch (e) {
    return toErrorResponse(e);
  }
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env);
    const body = await readJson<{ key?: string; value?: string | null }>(request);
    const key = (body.key || "").trim();
    if (!key) return error(400, "Informe a chave da configuração.");
    await env.DB.prepare(
      `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
    ).bind(key, body.value ?? null).run();
    return json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
};
