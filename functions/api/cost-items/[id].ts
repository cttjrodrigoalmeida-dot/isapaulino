// /api/cost-items/:id
//   PUT    { name?, category?, unit?, cost?, price?, notes?, active? }
//   DELETE → remove o item do catálogo
//   Autenticado (painel admin).
import type { Env } from "../_lib/types";
import { json, error, readJson, toErrorResponse } from "../_lib/http";
import { requireAuth } from "../_lib/auth";

interface UpdateBody {
  name?: string;
  category?: string | null;
  unit?: string | null;
  cost?: number | string;
  price?: number | string;
  notes?: string | null;
  active?: boolean;
}

const num = (v: unknown): number => {
  const n = typeof v === "string" ? Number(v.replace(",", ".")) : Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const id = String(params.id);
    const body = await readJson<UpdateBody>(request);

    const sets: string[] = [];
    const binds: (string | number | null)[] = [];

    if (body.name !== undefined) {
      const t = body.name.trim();
      if (!t) return error(400, "O nome não pode ficar vazio.");
      sets.push("name = ?");
      binds.push(t.slice(0, 200));
    }
    if (body.category !== undefined) {
      sets.push("category = ?");
      binds.push(body.category ? String(body.category).slice(0, 120).trim() || null : null);
    }
    if (body.unit !== undefined) {
      sets.push("unit = ?");
      binds.push(body.unit ? String(body.unit).slice(0, 40).trim() || null : null);
    }
    if (body.cost !== undefined) { sets.push("cost = ?"); binds.push(num(body.cost)); }
    if (body.price !== undefined) { sets.push("price = ?"); binds.push(num(body.price)); }
    if (body.notes !== undefined) {
      sets.push("notes = ?");
      binds.push(body.notes ? String(body.notes).slice(0, 2000) : null);
    }
    if (body.active !== undefined) { sets.push("active = ?"); binds.push(body.active ? 1 : 0); }

    if (sets.length === 0) return error(400, "Nada para atualizar.");
    sets.push("updated_at = datetime('now')");

    binds.push(id);
    const res = await env.DB.prepare(`UPDATE cost_items SET ${sets.join(", ")} WHERE id = ?`)
      .bind(...binds)
      .run();

    if (!res.meta.changes) return error(404, "Item não encontrado.");
    return json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const id = String(params.id);
    const res = await env.DB.prepare("DELETE FROM cost_items WHERE id = ?").bind(id).run();
    if (!res.meta.changes) return error(404, "Item não encontrado.");
    return json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
};
