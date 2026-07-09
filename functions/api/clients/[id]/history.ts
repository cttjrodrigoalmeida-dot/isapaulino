// /api/clients/:id/history
//   GET  → lançamentos do HF do cliente + totais (pendente/cobrado/pago).
//   POST → cria lançamento { description, amount, kind?, contract_id?, date? }.
import type { Env } from "../../_lib/types";
import { json, error, readJson, toErrorResponse } from "../../_lib/http";
import { requireAuth } from "../../_lib/auth";

export interface HistoryInput {
  description?: string;
  amount?: number;
  kind?: string;
  contract_id?: string | null;
  date?: string | null;
  status?: string;
}

export const HISTORY_KINDS = ["adicional", "retrabalho", "hora-tecnica", "pagamento", "outro"];

const COLS = `id, client_id AS clientId, contract_id AS contractId, date, description, amount, kind, status,
  asaas_payment_id AS asaasPaymentId, invoice_url AS invoiceUrl, paid_at AS paidAt, created_at AS createdAt`;

interface Row {
  amount: number;
  status: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const clientId = String(params.id);
    const { results } = await env.DB.prepare(
      `SELECT ${COLS} FROM client_history WHERE client_id = ? ORDER BY date DESC, created_at DESC`
    ).bind(clientId).all<Row>();
    const items = results ?? [];

    let pending = 0, charged = 0, paid = 0;
    for (const it of items) {
      const amt = Number(it.amount) || 0;
      if (it.status === "paid") paid += amt;
      else if (it.status === "charged") charged += amt;
      else if (it.status === "pending") pending += amt;
    }
    return json({ items, totals: { pending, charged, paid } });
  } catch (e) {
    return toErrorResponse(e);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const clientId = String(params.id);
    const body = await readJson<HistoryInput>(request);

    const description = (body.description ?? "").trim();
    if (!description) return error(400, "Informe a descrição do lançamento.");
    const amount = typeof body.amount === "number" && Number.isFinite(body.amount) && body.amount >= 0 ? body.amount : 0;
    const kind = HISTORY_KINDS.includes(body.kind ?? "") ? body.kind! : "adicional";
    const contractId = typeof body.contract_id === "string" && body.contract_id.trim() ? body.contract_id.trim() : null;
    const date = typeof body.date === "string" && body.date.trim() ? body.date.trim() : new Date().toISOString().slice(0, 10);

    const client = await env.DB.prepare("SELECT id FROM clients WHERE id = ?").bind(clientId).first();
    if (!client) return error(404, "Cliente não encontrado.");

    const id = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO client_history (id, client_id, contract_id, date, description, amount, kind)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, clientId, contractId, date, description, amount, kind).run();

    return json({ ok: true, id }, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
};
