// /api/portfolio-library
//   GET  → lista (admin)  — imagens de portfólio reutilizáveis salvas.
//   POST → cria (admin)   — corpo = { image, caption? }.
import type { Env } from "../_lib/types";
import { json, error, readJson, toErrorResponse } from "../_lib/http";
import { requireAuth } from "../_lib/auth";

interface Row { id: string; image: string; caption: string | null; client_tag: string | null }

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env);
    const { results } = await env.DB.prepare(
      "SELECT id, image, caption, client_tag FROM portfolio_library ORDER BY created_at DESC"
    ).all<Row>();
    const items = (results ?? []).map((r) => ({
      id: r.id,
      image: r.image,
      caption: r.caption ?? "",
      clientTag: r.client_tag ?? "",
    }));
    return json({ items });
  } catch (e) {
    return toErrorResponse(e);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env);
    const body = await readJson<{ image?: string; caption?: string; clientTag?: string }>(request);
    const image = (body.image ?? "").toString().trim();
    if (!image) return error(400, "Informe a imagem (URL).");
    const caption = (body.caption ?? "").toString().trim();
    const clientTag = (body.clientTag ?? "").toString().trim();

    const id = crypto.randomUUID();
    await env.DB.prepare(
      "INSERT INTO portfolio_library (id, image, caption, client_tag) VALUES (?, ?, ?, ?)"
    ).bind(id, image, caption || null, clientTag || null).run();

    return json({ ok: true, id }, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
};
