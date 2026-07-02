// GET /api/health → sanidade: confirma que a Function roda e o D1 responde.
import type { Env } from "./_lib/types";
import { json, error } from "./_lib/http";

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const row = await env.DB.prepare("SELECT 1 AS ok").first<{ ok: number }>();
    return json({ ok: true, db: row?.ok === 1 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao acessar o banco";
    return error(500, message);
  }
};
