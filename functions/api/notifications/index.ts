// /api/notifications  (admin)
//   GET            → { items: [...], unread } (30 mais recentes)
//   POST { ids? }  → marca como lidas (todas, ou só os ids informados)
import type { Env } from "../_lib/types";
import { json, readJson, toErrorResponse } from "../_lib/http";
import { requireAuth } from "../_lib/auth";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env);
    const { results } = await env.DB.prepare(
      `SELECT id, type, title, body, link, read, created_at AS createdAt
       FROM notifications ORDER BY created_at DESC LIMIT 30`
    ).all();
    const unrow = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM notifications WHERE read = 0"
    ).first<{ n: number }>();
    return json({ items: results ?? [], unread: unrow?.n ?? 0 });
  } catch (e) {
    return toErrorResponse(e);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env);
    const body = await readJson<{ ids?: string[] }>(request).catch(() => ({} as { ids?: string[] }));
    if (Array.isArray(body.ids) && body.ids.length > 0) {
      const marks = body.ids.map(() => "?").join(",");
      await env.DB.prepare(
        `UPDATE notifications SET read = 1 WHERE id IN (${marks})`
      ).bind(...body.ids).run();
    } else {
      await env.DB.prepare("UPDATE notifications SET read = 1 WHERE read = 0").run();
    }
    return json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
};
