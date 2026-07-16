import { useEffect, useState, useMemo } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, Cell } from "recharts";
import { api, ApiError, type ContractSummary, type DashboardOverview } from "../api";
import s from "./Dashboard.module.css";
import admin from "../Admin.module.css";

// Vigência padrão do contrato: 3 meses após assinatura.
const DEFAULT_VALIDADE_MESES = 3;

export default function ContratosCharts() {
  const [items, setItems] = useState<ContractSummary[]>([]);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [{ contracts }, ov] = await Promise.all([
          api.listContracts(),
          api.dashboardOverview(),
        ]);
        if (alive) {
          setItems(contracts);
          setOverview(ov);
        }
      } catch {
        /* silencioso — os gráficos só não aparecem */
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // ── Classificação ──
  const classification = useMemo(() => {
    const now = new Date();
    // Contratos assinados: vigência calculada a partir da data de publicação/assinatura.
    const ativos: ContractSummary[] = [];
    const proximosVencimento: ContractSummary[] = [];
    const vencidos: ContractSummary[] = [];
    const rascunhos: ContractSummary[] = [];
    const aguardando: ContractSummary[] = [];
    const cancelados: ContractSummary[] = [];

    for (const c of items) {
      if (c.status === "cancelled") { cancelados.push(c); continue; }
      if (c.status === "draft") { rascunhos.push(c); continue; }
      if (c.status === "published") { aguardando.push(c); continue; }

      // Assinados: verifica vigência
      const publishedDate = c.publishedAt ? new Date(c.publishedAt) : null;
      if (publishedDate) {
        const vencimento = new Date(publishedDate);
        vencimento.setMonth(vencimento.getMonth() + DEFAULT_VALIDADE_MESES);
        if (vencimento < now) {
          vencidos.push(c);
        } else if (vencimento.getTime() - now.getTime() < 30 * 24 * 60 * 60 * 1000) {
          // Próximo do vencimento (menos de 30 dias)
          proximosVencimento.push(c);
        } else {
          ativos.push(c);
        }
      } else {
        ativos.push(c);
      }
    }
    return { ativos, proximosVencimento, vencidos, rascunhos, aguardando, cancelados };
  }, [items]);

  // ── Dados para gráfico de barras: contratos por mês de assinatura (últimos 12 meses) ──
  const signedByMonth = useMemo(() => {
    const now = new Date();
    const months: { key: string; label: string; assinados: number; total: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
        assinados: 0,
        total: 0,
      });
    }
    for (const c of items) {
      if (!c.publishedAt) continue;
      const d = new Date(c.publishedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const m = months.find((x) => x.key === key);
      if (m) {
        m.total++;
        if (c.status === "signed") m.assinados++;
      }
    }
    return months;
  }, [items]);

  const maxAssinados = Math.max(1, ...signedByMonth.map((m) => m.assinados), ...signedByMonth.map((m) => m.total));

  if (loading) return null;
  if (items.length === 0) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      {/* KPIs */}
      <div className={`${s.grid} ${s.cols4}`} style={{ marginBottom: 16 }}>
        <div className={`${s.card} ${s.kpi}`}>
          <span className={s.kpiLabel}>Ativos</span>
          <span className={s.kpiValue} style={{ color: "#2f9e44" }}>{classification.ativos.length}</span>
          <span className={s.kpiNote}>Dentro da vigência</span>
        </div>
        <div className={`${s.card} ${s.kpi}`}>
          <span className={s.kpiLabel}>Próximos do vencimento</span>
          <span className={s.kpiValue} style={{ color: "#b07a16" }}>{classification.proximosVencimento.length}</span>
          <span className={s.kpiNote}>Menos de 30 dias</span>
        </div>
        <div className={`${s.card} ${s.kpi}`}>
          <span className={s.kpiLabel}>Vencidos</span>
          <span className={s.kpiValue} style={{ color: "#dd5c4e" }}>{classification.vencidos.length}</span>
          <span className={s.kpiNote}>Vigência expirada</span>
        </div>
        <div className={`${s.card} ${s.kpi}`}>
          <span className={s.kpiLabel}>Aguardando assinatura</span>
          <span className={s.kpiValue} style={{ color: "var(--color-text-primary)" }}>{classification.aguardando.length}</span>
          <span className={s.kpiNote}>Publicados</span>
        </div>
      </div>

      {/* Gráfico: Contratos assinados vs total por mês */}
      <div className={`${s.grid} ${s.cols3}`}>
        <div className={s.card} style={{ gridColumn: "span 3" }}>
          <div className={s.cardHead}>
            <div>
              <div className={s.cardTitleX}>Contratos por mês</div>
              <div className={s.cardSub}>Últimos 12 meses · total de publicados vs assinados</div>
            </div>
          </div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={signedByMonth} margin={{ top: 6, right: 0, bottom: 0, left: 0 }}>
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} />
                <Tooltip
                  cursor={{ fill: "rgba(127, 127, 127, 0.12)" }}
                  contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 10, fontSize: 12 }}
                />
                <Bar dataKey="total" radius={[5, 5, 0, 0]} fill="rgba(127,127,127,0.3)" name="Publicados" />
                <Bar dataKey="assinados" radius={[5, 5, 0, 0]}>
                  {signedByMonth.map((m, i) => (
                    <Cell key={i} fill={m.assinados >= maxAssinados ? "#2f9e44" : "rgba(47, 158, 68, 0.4)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Resumo de status */}
      <div className={admin.tabs} style={{ marginTop: 8 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            padding: "6px 14px",
            color: "var(--color-text-primary)",
          }}
        >
          Rascunhos: <strong>{classification.rascunhos.length}</strong>
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            padding: "6px 14px",
            color: "var(--color-text-primary)",
          }}
        >
          Aguardando: <strong>{classification.aguardando.length}</strong>
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            padding: "6px 14px",
            color: "var(--color-text-primary)",
          }}
        >
          Assinados: <strong>{classification.ativos.length + classification.proximosVencimento.length + classification.vencidos.length}</strong>
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            padding: "6px 14px",
            color: "var(--color-text-primary)",
          }}
        >
          Cancelados: <strong>{classification.cancelados.length}</strong>
        </span>
      </div>
    </div>
  );
}
