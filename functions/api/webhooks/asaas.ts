// POST /api/webhooks/asaas  (público, validado por token)
// Recebe eventos do ASAAS, registra em asaas_logs e atualiza o status da
// parcela correspondente (por asaas_payment_id). Valida o header
// `asaas-access-token` contra WEBHOOK_SECRET. Responde 200 rápido.
import type { Env } from "../_lib/types";
import { json, error, toErrorResponse } from "../_lib/http";
import { createNotification } from "../_lib/notifications";

interface AsaasWebhook {
  id?: string;
  event?: string;
  payment?: { id?: string; paymentDate?: string; status?: string; value?: number };
}

const BRL = (v: number | null | undefined) =>
  v == null ? "" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

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

      // Notificação (sininho): pagamento de parcela recebido.
      if (isPaid) {
        const ctx = await env.DB.prepare(
          `SELECT c.title AS title, cl.name AS clientName
           FROM installments i JOIN contracts c ON c.id = i.contract_id
           LEFT JOIN clients cl ON cl.id = c.client_id WHERE i.id = ?`
        ).bind(installmentId).first<{ title: string | null; clientName: string | null }>();
        await createNotification(env, {
          type: "payment",
          title: `Pagamento recebido${BRL(body.payment?.value) ? " · " + BRL(body.payment?.value) : ""}`,
          body: `${ctx?.clientName ?? "Cliente"} — ${ctx?.title ?? "contrato"}`,
          link: "#financeiro",
          dedupKey: `pay:${asaasPaymentId}:${newStatus}`,
        });
      }
    }

    // Histórico Financeiro (HF): a mesma cobrança pode ser de um lançamento do HF.
    if (asaasPaymentId) {
      if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
        const paidDate = body.payment?.paymentDate ?? new Date().toISOString().slice(0, 10);
        const hf = await env.DB.prepare(
          `SELECT h.description AS description, cl.name AS clientName
           FROM client_history h LEFT JOIN clients cl ON cl.id = h.client_id
           WHERE h.asaas_payment_id = ?`
        ).bind(asaasPaymentId).first<{ description: string | null; clientName: string | null }>();
        await env.DB.prepare(
          "UPDATE client_history SET status = 'paid', paid_at = COALESCE(paid_at, ?), updated_at = datetime('now') WHERE asaas_payment_id = ?"
        ).bind(paidDate, asaasPaymentId).run();
        if (hf) {
          await createNotification(env, {
            type: "payment",
            title: `Pagamento recebido${BRL(body.payment?.value) ? " · " + BRL(body.payment?.value) : ""}`,
            body: `${hf.clientName ?? "Cliente"} — ${hf.description ?? "serviço adicional"}`,
            link: "#clientes",
            dedupKey: `payhf:${asaasPaymentId}:${event}`,
          });
        }
      } else if (event === "PAYMENT_DELETED") {
        await env.DB.prepare(
          "UPDATE client_history SET status = 'cancelled', updated_at = datetime('now') WHERE asaas_payment_id = ?"
        ).bind(asaasPaymentId).run();
      }
    }

    return json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
};
