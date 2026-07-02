// /api/installments/:id
//   GET → detalhe da parcela (admin).
//   PUT → marca como paga manualmente: { payment_date, payment_method, notes }.
import type { Env } from "../_lib/types";
import { json, error, readJson, toErrorResponse } from "../_lib/http";
import { requireAuth } from "../_lib/auth";

interface MarkPaidBody {
  payment_date?: string;
  payment_method?: string;
  notes?: string;
  status?: string;
}

const COLS =
  "id, contract_id AS contractId, asaas_payment_id AS asaasPaymentId, installment_number AS installmentNumber, due_date AS dueDate, amount, status, payment_date AS paymentDate, payment_method AS paymentMethod, notes";

const STATUSES = ["pending", "confirmed", "received", "overdue", "deleted"];

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const id = String(params.id);
    const inst = await env.DB.prepare(`SELECT ${COLS} FROM installments WHERE id = ?`).bind(id).first();
    if (!inst) return error(404, "Parcela não encontrada.");
    return json({ installment: inst });
  } catch (e) {
    return toErrorResponse(e);
  }
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const id = String(params.id);
    const body = await readJson<MarkPaidBody>(request);

    const existing = await env.DB.prepare("SELECT id FROM installments WHERE id = ?").bind(id).first();
    if (!existing) return error(404, "Parcela não encontrada.");

    // Default: marcar como recebida. Permite outros status válidos se enviados.
    const status = body.status && STATUSES.includes(body.status) ? body.status : "received";
    const paymentDate = (body.payment_date ?? "").trim() || new Date().toISOString().slice(0, 10);
    const paymentMethod = (body.payment_method ?? "").trim() || null;
    const notes = (body.notes ?? "").trim() || null;

    await env.DB.prepare(
      `UPDATE installments
       SET status = ?, payment_date = ?, payment_method = ?, notes = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(status, paymentDate, paymentMethod, notes, id).run();

    return json({ ok: true, id, status });
  } catch (e) {
    return toErrorResponse(e);
  }
};
