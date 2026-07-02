// GET /api/installments?status=&contract=
// Lista parcelas (admin) com título do contrato e nome do cliente (JOIN).
// Usado pela seção Financeiro (visão cruzada de todas as parcelas).
import type { Env } from "../_lib/types";
import { json, toErrorResponse } from "../_lib/http";
import { requireAuth } from "../_lib/auth";

const STATUSES = ["pending", "confirmed", "received", "overdue", "deleted"];

const COLS = `i.id, i.contract_id AS contractId, i.asaas_payment_id AS asaasPaymentId,
  i.installment_number AS installmentNumber, i.due_date AS dueDate, i.amount, i.status,
  i.payment_date AS paymentDate, i.payment_method AS paymentMethod, i.notes,
  c.title AS contractTitle, cl.name AS clientName`;

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env);
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const contract = url.searchParams.get("contract");

    let query = `SELECT ${COLS} FROM installments i
      LEFT JOIN contracts c ON c.id = i.contract_id
      LEFT JOIN clients cl ON cl.id = c.client_id`;
    const where: string[] = [];
    const binds: string[] = [];
    if (status && STATUSES.includes(status)) {
      where.push("i.status = ?");
      binds.push(status);
    }
    if (contract) {
      where.push("i.contract_id = ?");
      binds.push(contract);
    }
    if (where.length) query += ` WHERE ${where.join(" AND ")}`;
    query += " ORDER BY i.due_date ASC";

    const { results } = await env.DB.prepare(query).bind(...binds).all();
    return json({ installments: results ?? [] });
  } catch (e) {
    return toErrorResponse(e);
  }
};
