// GET /api/reports  (admin)
// Série de recebimentos por mês (YYYY-MM) em TODO o histórico, separando
// parcelas de contrato e serviços adicionais (HF). A seção Relatórios usa isto
// para filtrar por ano e comparar períodos.
import type { Env } from "../_lib/types";
import { json, toErrorResponse } from "../_lib/http";
import { requireAuth } from "../_lib/auth";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await requireAuth(request, env);

    const [instRes, hfRes] = await Promise.all([
      env.DB.prepare(
        "SELECT substr(payment_date,1,7) AS ym, COALESCE(SUM(amount),0) AS amt FROM installments WHERE status IN ('received','confirmed') AND payment_date IS NOT NULL GROUP BY ym"
      ).all<{ ym: string; amt: number }>(),
      env.DB.prepare(
        "SELECT substr(paid_at,1,7) AS ym, COALESCE(SUM(amount),0) AS amt FROM client_history WHERE status = 'paid' AND paid_at IS NOT NULL GROUP BY ym"
      ).all<{ ym: string; amt: number }>(),
    ]);

    const map = new Map<string, { installments: number; hf: number }>();
    for (const r of instRes.results ?? []) {
      if (!r.ym) continue;
      const cur = map.get(r.ym) ?? { installments: 0, hf: 0 };
      cur.installments += r.amt;
      map.set(r.ym, cur);
    }
    for (const r of hfRes.results ?? []) {
      if (!r.ym) continue;
      const cur = map.get(r.ym) ?? { installments: 0, hf: 0 };
      cur.hf += r.amt;
      map.set(r.ym, cur);
    }

    const received = [...map.entries()]
      .map(([ym, v]) => ({ ym, installments: v.installments, hf: v.hf, total: v.installments + v.hf }))
      .sort((a, b) => a.ym.localeCompare(b.ym));

    return json({ received });
  } catch (e) {
    return toErrorResponse(e);
  }
};
