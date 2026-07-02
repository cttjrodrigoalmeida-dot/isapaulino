// /api/clients/:id/history/:hid
//   PUT    → edita { description?, amount?, kind?, status?, date? }.
//   DELETE → remove o lançamento.
import type { Env } from "../../../_lib/types";
import { json, error, readJson, toErrorResponse } from "../../../_lib/http";
import { requireAuth } from "../../../_lib/auth";

interface Body {
  description?: string;
  amount?: number;
  kind?: string;
  status?: string;
  date?: string | null;
}

const KINDS = ["adicional", "retrabalho", "hora-tecnica", "outro"];
const STATUSES = ["pending", "charged", "paid", "cancelled"];

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const hid = String(params.hid);
    const body = await readJson<Body>(request);

    const existing = await env.DB.prepare(
      "SELECT description, amount, kind, status, date FROM client_history WHERE id = ?"
    ).bind(hid).first<{ description: string; amount: number; kind: string; status: string; date: string }>();
    if (!existing) return error(404, "Lançamento não encontrado.");

    const description = typeof body.description === "string" && body.description.trim() ? body.description.trim() : existing.description;
    const amount = typeof body.amount === "number" && Number.isFinite(body.amount) && body.amount >= 0 ? body.amount : existing.amount;
    const kind = KINDS.includes(body.kind ?? "") ? body.kind! : existing.kind;
    const status = STATUSES.includes(body.status ?? "") ? body.status! : existing.status;
    const date = typeof body.date === "string" && body.date.trim() ? body.date.trim() : existing.date;
    const paidAt = status === "paid" ? "datetime('now')" : null;

    await env.DB.prepare(
      `UPDATE client_history
       SET description = ?, amount = ?, kind = ?, status = ?, date = ?,
           paid_at = ${paidAt ? "COALESCE(paid_at, datetime('now'))" : "paid_at"},
           updated_at = datetime('now')
       WHERE id = ?`
    ).bind(description, amount, kind, status, date, hid).run();

    return json({ ok: true, id: hid, status });
  } catch (e) {
    return toErrorResponse(e);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const hid = String(params.hid);
    const res = await env.DB.prepare("DELETE FROM client_history WHERE id = ?").bind(hid).run();
    if (!res.meta.changes) return error(404, "Lançamento não encontrado.");
    return json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
};
