// POST /api/payments/manual — registra um RECEBIMENTO MANUAL (fora do ASAAS).
// Ex.: o cliente pagou pelo PIX da proposta e você precisa lançar esse valor.
// Grava como um lançamento do Histórico Financeiro já PAGO (kind 'pagamento'),
// que o dashboard já soma em "Recebido"/"Faturado" e aparece na Área do Cliente.
import type { Env } from "../_lib/types";
import { json, error, readJson, toErrorResponse } from "../_lib/http";
import { requireAuth } from "../_lib/auth";

interface Body {
  client_id?: string;
  contract_id?: string | null;
  amount?: number;
  date?: string | null;   // 'YYYY-MM-DD'
  description?: string;
  method?: string;        // PIX, Dinheiro, Transferência…
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env);
    const body = await readJson<Body>(request);

    const clientId = (body.client_id ?? "").trim();
    if (!clientId) return error(400, "Selecione o cliente.");
    const amount =
      typeof body.amount === "number" && Number.isFinite(body.amount) && body.amount > 0 ? body.amount : 0;
    if (amount <= 0) return error(400, "Informe um valor válido.");

    const date =
      typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date.trim())
        ? body.date.trim()
        : new Date().toISOString().slice(0, 10);
    const method = (body.method ?? "").trim();
    const baseDesc = (body.description ?? "").trim() || "Pagamento recebido";
    const description = method ? `${baseDesc} (${method})` : baseDesc;
    const contractId =
      typeof body.contract_id === "string" && body.contract_id.trim() ? body.contract_id.trim() : null;

    const client = await env.DB.prepare("SELECT id FROM clients WHERE id = ?").bind(clientId).first();
    if (!client) return error(404, "Cliente não encontrado.");

    const id = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO client_history (id, client_id, contract_id, date, description, amount, kind, status, paid_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pagamento', 'paid', ?)`
    )
      .bind(id, clientId, contractId, date, description, amount, date)
      .run();

    return json({ ok: true, id }, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
};
