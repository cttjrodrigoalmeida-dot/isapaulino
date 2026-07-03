// GET /api/client/overview  (cliente autenticado)
// Dados da Área do Cliente: seus contratos (publicados/assinados), suas parcelas
// e o Histórico Financeiro (lançamentos que viraram cobrança).
import type { Env } from "../_lib/types";
import { json, error, toErrorResponse } from "../_lib/http";
import { requireClient } from "../_lib/client-auth";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const clientId = await requireClient(request, env);

    const client = await env.DB.prepare("SELECT name, email, phone FROM clients WHERE id = ?")
      .bind(clientId)
      .first();
    if (!client) return error(404, "Cliente não encontrado.");

    const contracts = (await env.DB.prepare(
      `SELECT id, title, status, slug, value, autentique_url AS autentiqueUrl, signed_at AS signedAt
       FROM contracts WHERE client_id = ? AND status IN ('published','signed') ORDER BY updated_at DESC`
    ).bind(clientId).all()).results ?? [];

    const installments = (await env.DB.prepare(
      `SELECT i.id, i.installment_number AS number, i.due_date AS dueDate, i.amount, i.status,
              i.payment_date AS paymentDate, i.asaas_payment_id AS asaasPaymentId, i.invoice_url AS invoiceUrl, c.title AS contractTitle
       FROM installments i JOIN contracts c ON c.id = i.contract_id
       WHERE c.client_id = ? AND i.status != 'deleted' ORDER BY i.due_date ASC`
    ).bind(clientId).all()).results ?? [];

    const history = (await env.DB.prepare(
      `SELECT id, date, description, amount, kind, status, asaas_payment_id AS asaasPaymentId, invoice_url AS invoiceUrl
       FROM client_history WHERE client_id = ? AND status IN ('charged', 'paid') ORDER BY date DESC`
    ).bind(clientId).all()).results ?? [];

    return json({ client, contracts, installments, history });
  } catch (e) {
    return toErrorResponse(e);
  }
};
