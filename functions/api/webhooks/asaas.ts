// POST /api/webhooks/asaas  (público, validado por token)
// Recebe eventos do ASAAS, registra em asaas_logs e atualiza o status da
// parcela correspondente (por asaas_payment_id). Valida o header
// `asaas-access-token` contra WEBHOOK_SECRET. Responde 200 rápido.
import type { Env } from "../_lib/types";
import { json, error, toErrorResponse } from "../_lib/http";

interface AsaasWebhook {
  id?: string;
  event?: string;
  payment?: { id?: string; paymentDate?: string; status?: string };
}

const EVENT_TO_STATUS: Record<string, string> = {
  PAYMENT_CONFIRMED: "confirmed",
  PAYMENT_RECEIVED: "received",
  PAYMENT_OVERDUE: "overdue",
  PAYMENT_DELETED: "deleted",
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    // Sem WEBHOOK_SECRET não há webhook válido a aceitar.
    if (!env.WEBHOOK_SECRET) return error(401, "Webhook não configurado.");
    const token = request.headers.get("asaas-access-token");
    if (token !== env.WEBHOOK_SECRET) return error(401, "Token de webhook inválido.");

    const body = await request.json<AsaasWebhook>().catch(() => ({} as AsaasWebhook));
    const event = body.event ?? "";
    const asaasPaymentId = body.payment?.id ?? null;

    // Localiza a parcela (se houver) para registrar no log.
    let installmentId: string | null = null;
    if (asaasPaymentId) {
      const inst = await env.DB.prepare("SELECT id FROM installments WHERE asaas_payment_id = ?")
        .bind(asaasPaymentId)
        .first<{ id: string }>();
      installmentId = inst?.id ?? null;
    }

    await env.DB.prepare(
      `INSERT INTO asaas_logs (id, webhook_event_id, event_type, asaas_payment_id, installment_id, payload)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(crypto.randomUUID(), body.id ?? null, event || "UNKNOWN", asaasPaymentId, installmentId, JSON.stringify(body))
      .run();

    const newStatus = EVENT_TO_STATUS[event];
    if (newStatus && installmentId) {
      const isPaid = newStatus === "received" || newStatus === "confirmed";
      const paymentDate = isPaid ? body.payment?.paymentDate ?? new Date().toISOString().slice(0, 10) : null;
      await env.DB.prepare(
        `UPDATE installments
         SET status = ?, payment_date = COALESCE(?, payment_date), payment_method = COALESCE(payment_method, 'ASAAS'), updated_at = datetime('now')
         WHERE id = ?`
      ).bind(newStatus, paymentDate, installmentId).run();
    }

    return json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
};
