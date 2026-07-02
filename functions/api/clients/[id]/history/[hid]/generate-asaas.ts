// POST /api/clients/:id/history/:hid/generate-asaas  (admin)
// Gera uma cobrança no ASAAS para um lançamento do HF. Requer ASAAS_API_KEY e
// CPF/CNPJ no cliente. Guarda asaas_payment_id e marca o lançamento como 'charged'.
// A baixa (paid) vem pelo mesmo webhook /api/webhooks/asaas.
import type { Env } from "../../../../_lib/types";
import { json, error, readJson, toErrorResponse } from "../../../../_lib/http";
import { requireAuth } from "../../../../_lib/auth";
import { asaasConfigured, findOrCreateCustomer, createPayment } from "../../../../_lib/asaas";

interface Row {
  id: string;
  amount: number;
  description: string;
  status: string;
  asaas_payment_id: string | null;
  name: string | null;
  cpf_cnpj: string | null;
  email: string | null;
  phone: string | null;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    if (!asaasConfigured(env)) {
      return error(400, "Integração ASAAS não configurada. Defina ASAAS_API_KEY para gerar cobranças.");
    }
    const hid = String(params.hid);
    const body = await readJson<{ due_date?: string }>(request).catch(() => ({} as { due_date?: string }));

    const row = await env.DB.prepare(
      `SELECT h.id, h.amount, h.description, h.status, h.asaas_payment_id,
              c.name, c.cpf_cnpj, c.email, c.phone
       FROM client_history h JOIN clients c ON c.id = h.client_id
       WHERE h.id = ?`
    ).bind(hid).first<Row>();
    if (!row) return error(404, "Lançamento não encontrado.");
    if (row.asaas_payment_id) return json({ ok: true, asaasPaymentId: row.asaas_payment_id, message: "Cobrança já gerada." });
    if (!row.amount || row.amount <= 0) return error(400, "O lançamento precisa ter um valor maior que zero.");
    if (!row.cpf_cnpj) return error(400, "O cliente precisa ter CPF/CNPJ para gerar cobranças.");

    // Vencimento: informado ou +3 dias.
    let dueDate = typeof body.due_date === "string" && body.due_date.trim() ? body.due_date.trim() : "";
    if (!dueDate) {
      const d = new Date();
      d.setDate(d.getDate() + 3);
      dueDate = d.toISOString().slice(0, 10);
    }

    const customerId = await findOrCreateCustomer(env, {
      name: row.name || "Cliente",
      cpfCnpj: row.cpf_cnpj,
      email: row.email,
      phone: row.phone,
    });

    const payment = await createPayment(env, {
      customer: customerId,
      value: row.amount,
      dueDate,
      description: `HF — ${row.description}`,
      externalReference: row.id,
    });

    await env.DB.prepare(
      "UPDATE client_history SET asaas_payment_id = ?, status = 'charged', updated_at = datetime('now') WHERE id = ?"
    ).bind(payment.id, row.id).run();

    return json({ ok: true, asaasPaymentId: payment.id, url: payment.invoiceUrl || `https://www.asaas.com/i/${payment.id}` });
  } catch (e) {
    return toErrorResponse(e);
  }
};
