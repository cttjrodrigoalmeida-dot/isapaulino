// /api/cost-items
//   GET  → catálogo de custos/preços do estúdio (todos)
//   POST { name, category?, unit?, cost?, price?, notes?, active? }
//   Autenticado (painel admin).
import type { Env } from "../_lib/types";
import { json, error, readJson, toErrorResponse } from "../_lib/http";
import { requireAuth } from "../_lib/auth";

export interface CostItem {
  id: string;
  name: string;
  category: string | null;
  unit: string | null;
  cost: number;
  price: number;
  notes: string | null;
  active: boolean;
  createdAt: string;
}

interface CreateBody {
  name?: string;
  category?: string | null;
  unit?: string | null;
  cost?: number | string;
  price?: number | string;
  notes?: string | null;
  active?: boolean;
}

interface Row {
  id: string; name: string; category: string | null; unit: string | null;
  cost: number; price: number; notes: string | null; active: number; created_at: string;
}
const mapRow = (r: Row): CostItem => ({
  id: r.id,
  name: r.name,
  category: r.category,
  unit: r.unit,
  cost: Number(r.cost) || 0,
  price: Number(r.price) || 0,
  notes: r.notes,
  active: !!r.active,
  createdAt: r.created_at,
});

const num = (v: unknown): number => {
  const n = typeof v === "string" ? Number(v.replace(",", ".")) : Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env);
    const { results } = await env.DB.prepare(
      "SELECT id, name, category, unit, cost, price, notes, active, created_at FROM cost_items ORDER BY category ASC, position ASC, name ASC"
    ).all<Row>();
    return json({ items: (results ?? []).map(mapRow) });
  } catch (e) {
    return toErrorResponse(e);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env);
    const body = await readJson<CreateBody>(request);

    const name = (body.name ?? "").trim();
    if (!name) return error(400, "Informe o nome do item.");

    const category = body.category ? String(body.category).slice(0, 120).trim() || null : null;
    const unit = body.unit ? String(body.unit).slice(0, 40).trim() || null : null;
    const notes = body.notes ? String(body.notes).slice(0, 2000) : null;
    const active = body.active === false ? 0 : 1;
    const id = crypto.randomUUID();

    await env.DB.prepare(
      `INSERT INTO cost_items (id, name, category, unit, cost, price, notes, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(id, name.slice(0, 200), category, unit, num(body.cost), num(body.price), notes, active)
      .run();

    const { results } = await env.DB.prepare(
      "SELECT id, name, category, unit, cost, price, notes, active, created_at FROM cost_items WHERE id = ?"
    ).bind(id).all<Row>();

    return json({ ok: true, item: mapRow(results![0]) }, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
};
