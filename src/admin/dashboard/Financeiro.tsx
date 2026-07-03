import { useEffect, useState, useCallback } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, Cell } from "recharts";
import { api, ApiError, type Installment, type InstallmentStatus, type DashboardOverview } from "../api";
import { formatBRL, formatBRLShort } from "./format";
import s from "./Dashboard.module.css";
import admin from "../Admin.module.css";

const INST_STATUS: Record<InstallmentStatus, { label: string; cls: string }> = {
  pending: { label: "Pendente", cls: "badgeDraft" },
  confirmed: { label: "Confirmado", cls: "badgeSigned" },
  received: { label: "Recebido", cls: "badgePublished" },
  overdue: { label: "Atrasado", cls: "badgeCancelled" },
  deleted: { label: "Cancelado", cls: "badgeCancelled" },
};

const FILTERS: { id: string; label: string }[] = [
  { id: "", label: "Todas" },
  { id: "pending", label: "Pendentes" },
  { id: "received", label: "Recebidas" },
  { id: "overdue", label: "Atrasadas" },
];

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

export default function Financeiro() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ov, { installments }] = await Promise.all([
        api.dashboardOverview(),
        api.listInstallments(filter ? { status: filter } : undefined),
      ]);
      setOverview(ov);
      setInstallments(installments);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const fin = overview?.finance;
  const maxRecv = Math.max(1, ...(fin?.receivedByMonth.map((m) => m.value) ?? [0]));

  return (
    <>
      <div className={s.greeting}>
        <div>
          <h1 className={s.greetTitle}>Financeiro</h1>
          <p className={s.greetSub}>Parcelas, recebimentos e a receber. Cobranças via ASAAS quando configurado.</p>
        </div>
        <button className={`${admin.btn} ${admin.btnGhost}`} onClick={load} disabled={loading}>
          Atualizar
        </button>
      </div>

      {error && <div className={admin.error}>{error}</div>}

      {/* KPIs */}
      <div className={`${s.grid} ${s.cols4}`}>
        <div className={`${s.card} ${s.kpi}`}>
          <span className={s.kpiLabel}>Faturado</span>
          <span className={s.kpiValue}>{formatBRLShort(fin?.faturado ?? 0)}</span>
          <span className={s.kpiNote}>Soma dos contratos</span>
        </div>
        <div className={`${s.card} ${s.kpi}`}>
          <span className={s.kpiLabel}>Recebido</span>
          <span className={s.kpiValue}>{formatBRLShort(fin?.recebido ?? 0)}</span>
        </div>
        <div className={`${s.card} ${s.kpi}`}>
          <span className={s.kpiLabel}>A receber</span>
          <span className={s.kpiValue}>{formatBRLShort(fin?.aReceber ?? 0)}</span>
        </div>
        <div className={`${s.card} ${s.kpi}`}>
          <span className={s.kpiLabel}>Em atraso</span>
          <span className={s.kpiValue}>{fin?.atrasados ?? 0}</span>
          <span className={s.kpiNote}>parcelas vencidas</span>
        </div>
      </div>

      {/* Gráfico recebido/mês */}
      <div className={`${s.grid} ${s.cols3}`}>
        <div className={s.card} style={{ gridColumn: "span 3" }}>
          <div className={s.cardHead}>
            <div>
              <div className={s.cardTitleX}>Recebido por mês</div>
              <div className={s.cardSub}>Últimos 12 meses</div>
            </div>
          </div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fin?.receivedByMonth ?? []} margin={{ top: 6, right: 0, bottom: 0, left: 0 }}>
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} />
                <Tooltip
                  cursor={{ fill: "rgba(127, 127, 127, 0.12)" }}
                  contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 10, fontSize: 12 }}
                  formatter={(v) => [formatBRL(Number(v)), "Recebido"]}
                />
                <Bar dataKey="value" radius={[5, 5, 0, 0]}>
                  {(fin?.receivedByMonth ?? []).map((m, i) => (
                    <Cell key={i} fill={m.value >= maxRecv ? "#4ade80" : "rgba(74, 222, 128, 0.4)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabela de parcelas */}
      <div className={admin.tabs}>
        {FILTERS.map((f) => (
          <button key={f.id} className={`${admin.tab} ${filter === f.id ? admin.tabActive : ""}`} onClick={() => setFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={s.emptyMini}>Carregando…</div>
      ) : installments.length === 0 ? (
        <div className={admin.empty}>Nenhuma parcela {filter ? "neste filtro" : "cadastrada"}. Configure pagamentos em um contrato.</div>
      ) : (
        <table className={admin.table}>
          <thead>
            <tr>
              <th>Contrato / cliente</th>
              <th>Parcela</th>
              <th>Vencimento</th>
              <th>Valor</th>
              <th>Status</th>
              <th>Pago em</th>
            </tr>
          </thead>
          <tbody>
            {installments.map((inst) => {
              const meta = INST_STATUS[inst.status];
              return (
                <tr key={inst.id}>
                  <td>
                    {inst.contractTitle || "—"}
                    {inst.clientName ? <span className={s.listMeta}> · {inst.clientName}</span> : null}
                  </td>
                  <td>{inst.kind === "hf" ? "Adicional" : inst.installmentNumber === 0 ? "Entrada" : `${inst.installmentNumber}ª`}</td>
                  <td>{fmtDate(inst.dueDate)}</td>
                  <td className={admin.mono}>{formatBRL(inst.amount)}</td>
                  <td><span className={`${admin.badge} ${admin[meta.cls]}`}>{meta.label}</span></td>
                  <td>{fmtDate(inst.paymentDate)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
