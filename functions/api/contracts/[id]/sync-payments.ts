// POST /api/contracts/:id/sync-payments  (admin)
// Reconsulta o ASAAS na hora (não depende do webhook) e atualiza o status de
// cada parcela que já tem cobrança. Gera notificação quando uma parcela passa
// a estar paga. Também preenche invoice_url que esteja faltando.
import type { Env } from "../../_lib/types";
import { json, error, toErrorResponse } from "../../_lib/http";
import { requireAuth } from "../../_lib/auth";
import { asaasConfigured, getPayment } from "../../_lib/asaas";
import { createNotification } from "../../_lib/notifications";

// Status do ASAAS → status interno da parcela.
function mapStatus(asaas: string | undefined): string | null {
  switch (asaas) {
    case "RECEIVED":
    case "RECEIVED_IN_CASH":
      return "received";
    case "CONFIRMED":
      return "confirmed";
    case "OVERDUE":
      return "overdue";
    case "PENDING":
      return "pending";
    default:
      return null; // REFUNDED, etc. — não mexe.
  }
}

const BRL = (v: number | null | undefined) =>
  v == null ? "" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

interface Row {
  id: string;
  asaas_payment_id: string;
  status: string;
  invoice_url: string | null;
  installment_number: number;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    if (!asaasConfigured(env)) {
      return error(400, "Integração ASAAS não configurada (defina ASAAS_API_KEY).");
    }
    const contractId = String(params.id);

    const ctx = await env.DB.prepare(
      `SELECT c.title AS title, cl.name AS clientName
       FROM contracts c LEFT JOIN clients cl ON cl.id = c.client_id WHERE c.id = ?`
    ).bind(contractId).first<{ title: string | null; clientName: string | null }>();
    if (!ctx) return error(404, "Contrato não encontrado.");

    const { results } = await env.DB.prepare(
      "SELECT id, asaas_payment_id, status, invoice_url, installment_number FROM installments WHERE contract_id = ? AND asaas_payment_id IS NOT NULL"
    ).bind(contractId).all<Row>();
    const rows = results ?? [];
    if (rows.length === 0) return json({ ok: true, updated: 0, message: "Nenhuma cobrança gerada para sincronizar." });

    let updated = 0;
    const parcels: { number: number; status: string }[] = [];
    for (const r of rows) {
      let p;
      try {
        p = await getPayment(env, r.asaas_payment_id);
      } catch {
        continue; // não bloqueia as demais
      }
      const mapped = mapStatus(p.status);
      const wasPaid = r.status === "received" || r.status === "confirmed";
      const isPaid = mapped === "received" || mapped === "confirmed";
      const paymentDate = isPaid ? p.paymentDate ?? new Date().toISOString().slice(0, 10) : null;

      if (mapped && (mapped !== r.status || (!r.invoice_url && p.invoiceUrl))) {
        await env.DB.prepare(
          `UPDATE installments
           SET status = ?, payment_date = COALESCE(?, payment_date),
               payment_method = CASE WHEN ? THEN COALESCE(payment_method,'ASAAS') ELSE payment_method END,
               invoice_url = COALESCE(invoice_url, ?), updated_at = datetime('now')
           WHERE id = ?`
        ).bind(mapped, paymentDate, isPaid ? 1 : 0, p.invoiceUrl ?? null, r.id).run();
        updated++;
      }

      // Notifica quando passou a estar paga agora.
      if (isPaid && !wasPaid) {
        await createNotification(env, {
          type: "payment",
          title: `Pagamento recebido${BRL(p.value) ? " · " + BRL(p.value) : ""}`,
          body: `${ctx.clientName ?? "Cliente"} — ${ctx.title ?? "contrato"}`,
          link: "#financeiro",
          dedupKey: `pay:${r.asaas_payment_id}:${mapped}`,
        });
      }
      parcels.push({ number: r.installment_number, status: mapped ?? r.status });
    }

    return json({ ok: true, updated, parcels });
  } catch (e) {
    return toErrorResponse(e);
  }
};
