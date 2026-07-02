// /api/contracts/:id/payments
//   GET  → config de pagamento + parcelas do contrato (admin).
//   POST → calcula e grava parcelas { total_value, down_payment, installments_count, first_due_date }.
//          NÃO chama o ASAAS (isso é feito depois em /generate-asaas).
import type { Env } from "../../_lib/types";
import { json, error, readJson, toErrorResponse } from "../../_lib/http";
import { requireAuth } from "../../_lib/auth";

interface PaymentBody {
  total_value?: number;
  down_payment?: number;
  installments_count?: number;
  first_due_date?: string; // 'YYYY-MM-DD'
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Soma `n` meses a uma data ISO, fixando no último dia do mês quando o dia estoura.
function addMonths(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const base = new Date(y, m - 1 + n, 1);
  const year = base.getFullYear();
  const month = base.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const day = Math.min(d || 1, lastDay);
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const INSTALLMENT_COLS =
  "id, contract_id AS contractId, payment_config_id AS paymentConfigId, asaas_payment_id AS asaasPaymentId, installment_number AS installmentNumber, due_date AS dueDate, amount, status, payment_date AS paymentDate, payment_method AS paymentMethod, notes";

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const contractId = String(params.id);

    const config = await env.DB.prepare(
      `SELECT id, contract_id AS contractId, total_value AS totalValue, down_payment AS downPayment,
              installments_count AS installmentsCount, status, created_at AS createdAt
       FROM contract_payments WHERE contract_id = ?`
    ).bind(contractId).first();

    const { results } = await env.DB.prepare(
      `SELECT ${INSTALLMENT_COLS} FROM installments WHERE contract_id = ? ORDER BY installment_number ASC`
    ).bind(contractId).all();

    return json({ config: config ?? null, installments: results ?? [] });
  } catch (e) {
    return toErrorResponse(e);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    await requireAuth(request, env);
    const contractId = String(params.id);
    const body = await readJson<PaymentBody>(request);

    const contract = await env.DB.prepare("SELECT id FROM contracts WHERE id = ?").bind(contractId).first();
    if (!contract) return error(404, "Contrato não encontrado.");

    const total = Number(body.total_value);
    const down = Number(body.down_payment ?? 0);
    const count = Math.trunc(Number(body.installments_count));
    if (!Number.isFinite(total) || total <= 0) return error(400, "Valor total inválido.");
    if (!Number.isFinite(down) || down < 0 || down > total) return error(400, "Valor de entrada inválido.");
    if (!Number.isFinite(count) || count < 1 || count > 60) return error(400, "Número de parcelas inválido (1 a 60).");
    const firstDue = /^\d{4}-\d{2}-\d{2}$/.test(body.first_due_date ?? "") ? body.first_due_date! : addMonths(todayISO(), 1);

    // Não reconfigurar se já houver parcela paga ou enviada ao ASAAS.
    const lock = await env.DB.prepare(
      "SELECT COUNT(*) AS locked FROM installments WHERE contract_id = ? AND (status != 'pending' OR asaas_payment_id IS NOT NULL)"
    ).bind(contractId).first<{ locked: number }>();
    if ((lock?.locked ?? 0) > 0) {
      return error(409, "Já existem parcelas pagas ou enviadas ao ASAAS; não é possível reconfigurar.");
    }

    // ── Cálculo das parcelas (em centavos para evitar erro de float) ──
    type NewInst = { number: number; due: string; cents: number };
    const list: NewInst[] = [];
    if (down > 0) list.push({ number: 0, due: firstDue, cents: Math.round(down * 100) });

    const remainderCents = Math.round((total - down) * 100);
    const baseCents = Math.floor(remainderCents / count);
    for (let i = 1; i <= count; i++) {
      const cents = i === count ? remainderCents - baseCents * (count - 1) : baseCents;
      // entrada ocupa firstDue; parcelas seguem firstDue + i meses se há entrada, senão + (i-1).
      const due = down > 0 ? addMonths(firstDue, i) : addMonths(firstDue, i - 1);
      list.push({ number: i, due, cents });
    }

    const configId = crypto.randomUUID();

    // Substitui config + parcelas pendentes anteriores.
    const stmts = [
      env.DB.prepare("DELETE FROM installments WHERE contract_id = ?").bind(contractId),
      env.DB.prepare("DELETE FROM contract_payments WHERE contract_id = ?").bind(contractId),
      env.DB.prepare(
        `INSERT INTO contract_payments (id, contract_id, total_value, down_payment, installments_count, status)
         VALUES (?, ?, ?, ?, ?, 'pending')`
      ).bind(configId, contractId, total, down, count),
      ...list.map((it) =>
        env.DB.prepare(
          `INSERT INTO installments (id, contract_id, payment_config_id, installment_number, due_date, amount, status)
           VALUES (?, ?, ?, ?, ?, ?, 'pending')`
        ).bind(crypto.randomUUID(), contractId, configId, it.number, it.due, it.cents / 100)
      ),
    ];
    await env.DB.batch(stmts);

    return json({ ok: true, configId, count: list.length }, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
};
