// GET /api/installments?status=&contract=
// Lista parcelas (admin) com título do contrato e nome do cliente (JOIN).
// Usado pela seção Financeiro (visão cruzada). Inclui também os lançamentos do
// Histórico Financeiro (serviços adicionais cobrados/pagos) como linhas, para
// que TODA cobrança apareça no Financeiro — não só as parcelas de contrato.
import type { Env } from "../_lib/types";
import { json, toErrorResponse } from "../_lib/http";
import { requireAuth } from "../_lib/auth";

const STATUSES = ["pending", "confirmed", "received", "overdue", "deleted"];

const COLS = `i.id, i.contract_id AS contractId, i.asaas_payment_id AS asaasPaymentId,
  i.installment_number AS installmentNumber, i.due_date AS dueDate, i.amount, i.status,
  i.payment_date AS paymentDate, i.payment_method AS paymentMethod, i.notes,
  c.title AS contractTitle, cl.name AS clientName`;

// HF: mapeia o status do lançamento para o status de parcela equivalente.
const HF_STATUS_TO_INST: Record<string, string> = { paid: "received", charged: "pending" };

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
    const installments = (results ?? []) as Record<string, unknown>[];

    // Histórico Financeiro como linhas (só na visão global — não por contrato).
    if (!contract) {
      const { results: hf } = await env.DB.prepare(
        `SELECT h.id, h.asaas_payment_id AS asaasPaymentId, h.date AS dueDate, h.amount,
                h.status AS hfStatus, h.paid_at AS paymentDate, h.description AS description,
                cl.name AS clientName
         FROM client_history h LEFT JOIN clients cl ON cl.id = h.client_id
         WHERE h.status IN ('charged','paid')`
      ).all<{ id: string; asaasPaymentId: string | null; dueDate: string; amount: number; hfStatus: string; paymentDate: string | null; description: string; clientName: string | null }>();

      for (const h of hf ?? []) {
        const mapped = HF_STATUS_TO_INST[h.hfStatus] ?? "pending";
        if (status && STATUSES.includes(status) && status !== mapped) continue; // respeita o filtro
        installments.push({
          id: h.id,
          contractId: null,
          asaasPaymentId: h.asaasPaymentId,
          installmentNumber: -1, // marcador de "serviço adicional" (HF)
          dueDate: h.dueDate,
          amount: h.amount,
          status: mapped,
          paymentDate: h.paymentDate,
          paymentMethod: h.asaasPaymentId ? "ASAAS" : null,
          notes: h.description,
          contractTitle: h.description,
          clientName: h.clientName,
          kind: "hf",
        });
      }
      // Reordena por data (parcelas + HF juntos).
      installments.sort((a, b) => String(a.dueDate ?? "").localeCompare(String(b.dueDate ?? "")));
    }

    return json({ installments });
  } catch (e) {
    return toErrorResponse(e);
  }
};
