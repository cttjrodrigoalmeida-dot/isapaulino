// POST /api/contracts/:id/generate-asaas  (admin)
// Cria as cobranças no ASAAS para as parcelas ainda sem asaas_payment_id.
// Requer ASAAS_API_KEY (senão retorna 400 amigável) e cpf_cnpj no cliente.
import type { Env } from "../../_lib/types";
import { json, error, toErrorResponse } from "../../_lib/http";
import { requireAuth } from "../../_lib/auth";
import { asaasConfigured, findOrCreateCustomer, createPayment } from "../../_lib/asaas";

interface ContractClientRow {
  title: string;
  name: string | null;
  cpf_cnpj: string | null;
  email: string | null;
  phone: string | null;
}
interface InstallmentRow {
  id: string;
  installment_number: number;
  due_date: string;
  amount: number;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    if (!asaasConfigured(env)) {
      return error(400, "Integração ASAAS não configurada. Defina ASAAS_API_KEY para criar cobranças.");
    }
    const contractId = String(params.id);

    const row = await env.DB.prepare(
      `SELECT c.title AS title, cl.name AS name, cl.cpf_cnpj AS cpf_cnpj, cl.email AS email, cl.phone AS phone
       FROM contracts c LEFT JOIN clients cl ON cl.id = c.client_id WHERE c.id = ?`
    ).bind(contractId).first<ContractClientRow>();
    if (!row) return error(404, "Contrato não encontrado.");
    if (!row.cpf_cnpj) return error(400, "O cliente do contrato precisa ter CPF/CNPJ para gerar cobranças.");

    const { results } = await env.DB.prepare(
      "SELECT id, installment_number, due_date, amount FROM installments WHERE contract_id = ? AND asaas_payment_id IS NULL ORDER BY installment_number ASC"
    ).bind(contractId).all<InstallmentRow>();
    const pending = results ?? [];
    if (pending.length === 0) return json({ ok: true, created: 0, message: "Nenhuma parcela pendente para gerar." });

    const customerId = await findOrCreateCustomer(env, {
      name: row.name || "Cliente",
      cpfCnpj: row.cpf_cnpj,
      email: row.email,
      phone: row.phone,
    });

    let created = 0;
    for (const inst of pending) {
      const label = inst.installment_number === 0 ? "Entrada" : `Parcela ${inst.installment_number}`;
      const payment = await createPayment(env, {
        customer: customerId,
        value: inst.amount,
        dueDate: inst.due_date,
        description: `${row.title} — ${label}`,
        externalReference: inst.id,
      });
      await env.DB.prepare(
        "UPDATE installments SET asaas_payment_id = ?, updated_at = datetime('now') WHERE id = ?"
      ).bind(payment.id, inst.id).run();
      created++;
    }

    await env.DB.prepare(
      "UPDATE contract_payments SET status = 'sent', updated_at = datetime('now') WHERE contract_id = ?"
    ).bind(contractId).run();

    return json({ ok: true, created });
  } catch (e) {
    return toErrorResponse(e);
  }
};
