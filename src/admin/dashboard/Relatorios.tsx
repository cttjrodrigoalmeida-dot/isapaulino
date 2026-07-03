import { useEffect, useState, useCallback, useMemo } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, Legend } from "recharts";
import { api, ApiError, type DashboardOverview, type ReportMonth } from "../api";
import { formatBRL, formatBRLShort } from "./format";
import s from "./Dashboard.module.css";
import admin from "../Admin.module.css";

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 100) : 0);

export default function Relatorios() {
  const [ov, setOv] = useState<DashboardOverview | null>(null);
  const [received, setReceived] = useState<ReportMonth[]>([]);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [o, r] = await Promise.all([api.dashboardOverview(), api.reports()]);
      setOv(o);
      setReceived(r.received);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Anos disponíveis (dos dados) + ano atual, desc.
  const years = useMemo(() => {
    const set = new Set<number>(received.map((r) => Number(r.ym.slice(0, 4))));
    set.add(new Date().getFullYear());
    return [...set].filter(Boolean).sort((a, b) => b - a);
  }, [received]);

  // 12 meses do ano selecionado.
  const yearMonths = useMemo(
    () =>
      MONTHS.map((label, i) => {
        const mm = String(i + 1).padStart(2, "0");
        const rec = received.find((r) => r.ym === `${year}-${mm}`);
        return { label, Parcelas: rec?.installments ?? 0, Adicionais: rec?.hf ?? 0, total: rec?.total ?? 0 };
      }),
    [received, year]
  );
  const yearTotal = yearMonths.reduce((sum, m) => sum + m.total, 0);
  const prevYearTotal = received.filter((r) => r.ym.startsWith(`${year - 1}-`)).reduce((sum, r) => sum + r.total, 0);
  const delta = prevYearTotal > 0 ? Math.round(((yearTotal - prevYearTotal) / prevYearTotal) * 100) : yearTotal > 0 ? 100 : 0;
  const monthsWithData = yearMonths.filter((m) => m.total > 0).length;
  const avgMonth = monthsWithData > 0 ? yearTotal / monthsWithData : 0;
  const bestMonth = yearMonths.reduce((best, m) => (m.total > best.total ? m : best), yearMonths[0]);

  const exportCsv = () => {
    if (!ov) return;
    const rows: string[][] = [
      [`Relatório ${year} — Isabela Paulino Studio`, new Date().toLocaleString("pt-BR")],
      [],
      ["Recebido no ano", String(yearTotal)],
      [`Recebido ${year - 1}`, String(prevYearTotal)],
      ["Variação %", String(delta)],
      ["Média mensal", String(Math.round(avgMonth))],
      [],
      ["Mês", "Parcelas", "Adicionais", "Total"],
      ...yearMonths.map((m) => [m.label, String(m.Parcelas), String(m.Adicionais), String(m.total)]),
      [],
      ["Acumulado (todos os períodos)", ""],
      ["Faturado", String(ov.finance.faturado)],
      ["Recebido", String(ov.finance.recebido)],
      ["A receber", String(ov.finance.aReceber)],
      ["Contratos assinados", String(ov.contracts.signed)],
      [],
      ["Ranking de clientes", ""],
      ["Cliente", "Valor", "Propostas"],
      ...ov.clientRanking.map((c) => [c.client, String(c.total), String(c.count)]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className={s.greeting}>
        <div>
          <h1 className={s.greetTitle}>Relatórios</h1>
          <p className={s.greetSub}>Desempenho por período — receita, conversão e ranking. Exporte para backup.</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select className={admin.input} style={{ width: 110 }} value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className={`${admin.btn} ${admin.btnGhost}`} onClick={load} disabled={loading}>Atualizar</button>
          <button className={`${admin.btn} ${admin.btnPrimary}`} onClick={exportCsv} disabled={!ov}>Exportar CSV</button>
        </div>
      </div>

      {error && <div className={admin.error}>{error}</div>}
      {loading && !ov ? (
        <div className={s.emptyMini}>Carregando…</div>
      ) : !ov ? null : (
        <>
          {/* KPIs do ano */}
          <div className={`${s.grid} ${s.cols4}`}>
            <div className={`${s.card} ${s.kpi}`}>
              <span className={s.kpiLabel}>Recebido em {year}</span>
              <span className={s.kpiValue}>{formatBRLShort(yearTotal)}</span>
              {ov.finance.annualGoal > 0 && year === new Date().getFullYear() && (
                <span className={s.kpiNote}>{pct(yearTotal, ov.finance.annualGoal)}% da meta</span>
              )}
            </div>
            <div className={`${s.card} ${s.kpi}`}>
              <span className={s.kpiLabel}>vs {year - 1}</span>
              <span className={s.kpiValue} style={{ color: delta >= 0 ? "#5aa06e" : "#d9736f" }}>
                {delta >= 0 ? "+" : ""}{delta}%
              </span>
              <span className={s.kpiNote}>{formatBRLShort(prevYearTotal)} no ano anterior</span>
            </div>
            <div className={`${s.card} ${s.kpi}`}>
              <span className={s.kpiLabel}>Média mensal</span>
              <span className={s.kpiValue}>{formatBRLShort(avgMonth)}</span>
              <span className={s.kpiNote}>meses com receita</span>
            </div>
            <div className={`${s.card} ${s.kpi}`}>
              <span className={s.kpiLabel}>Melhor mês</span>
              <span className={s.kpiValue}>{bestMonth.total > 0 ? formatBRLShort(bestMonth.total) : "—"}</span>
              <span className={s.kpiNote}>{bestMonth.total > 0 ? bestMonth.label : "sem dados"}</span>
            </div>
          </div>

          {/* Recebido por mês do ano */}
          <div className={`${s.grid} ${s.cols3}`}>
            <div className={s.card} style={{ gridColumn: "span 3" }}>
              <div className={s.cardHead}>
                <div>
                  <div className={s.cardTitleX}>Recebido por mês — {year}</div>
                  <div className={s.cardSub}>Parcelas de contrato + serviços adicionais</div>
                </div>
              </div>
              <div style={{ width: "100%", height: 240 }}>
                <ResponsiveContainer>
                  <BarChart data={yearMonths}>
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--color-text-secondary)" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: "rgba(255,255,255,0.04)" }}
                      formatter={(v) => formatBRL(Number(v))}
                      contentStyle={{ background: "#1a1712", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Parcelas" stackId="a" fill="var(--color-accent)" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Adicionais" stackId="a" fill="rgba(212,197,176,0.45)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Funil + Contratos por status (acumulado) */}
          <div className={s.grid} style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className={s.card}>
              <div className={s.cardTitleX}>Funil de conversão</div>
              <div className={s.cardSub} style={{ marginBottom: 12 }}>Acumulado · do interesse ao contrato assinado</div>
              {[
                { label: "Propostas", value: ov.proposals.total },
                { label: "Briefings", value: ov.briefings.total },
                { label: "Contratos", value: ov.contracts.total },
                { label: "Assinados", value: ov.contracts.signed },
              ].map((step) => (
                <div key={step.label} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                    <span>{step.label}</span>
                    <span className={admin.mono}>{step.value}{step.label !== "Propostas" ? ` · ${pct(step.value, ov.proposals.total)}%` : ""}</span>
                  </div>
                  <div style={{ height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${pct(step.value, Math.max(1, ov.proposals.total))}%`, height: "100%", background: "var(--color-accent)", borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>

            <div className={s.card}>
              <div className={s.cardTitleX}>Contratos por status</div>
              <div className={s.cardSub} style={{ marginBottom: 12 }}>Situação atual</div>
              <div className={s.summaryRow}><span className={s.summaryNum}>{ov.contracts.draft}</span><span className={s.summaryLabel}>Rascunho</span></div>
              <div className={s.summaryRow}><span className={s.summaryNum}>{ov.contracts.published}</span><span className={s.summaryLabel}>Publicados (aguardando)</span></div>
              <div className={s.summaryRow}><span className={s.summaryNum}>{ov.contracts.signed}</span><span className={s.summaryLabel}>Assinados</span></div>
              <div className={s.summaryRow}><span className={s.summaryNum}>{ov.contracts.total}</span><span className={s.summaryLabel}>Total</span></div>
            </div>
          </div>

          {/* Ranking de clientes */}
          <div className={`${s.grid} ${s.cols3}`}>
            <div className={s.card} style={{ gridColumn: "span 3" }}>
              <div className={s.cardTitleX}>Ranking de clientes</div>
              <div className={s.cardSub} style={{ marginBottom: 12 }}>Acumulado · por valor em propostas</div>
              {ov.clientRanking.length === 0 ? (
                <div className={s.emptyMini}>Sem propostas para ranquear.</div>
              ) : (
                <table className={admin.table}>
                  <thead>
                    <tr><th>#</th><th>Cliente</th><th>Propostas</th><th style={{ textAlign: "right" }}>Valor total</th></tr>
                  </thead>
                  <tbody>
                    {ov.clientRanking.map((c, i) => (
                      <tr key={c.client}>
                        <td>{i + 1}</td>
                        <td>{c.client}</td>
                        <td>{c.count}</td>
                        <td className={admin.mono} style={{ textAlign: "right" }}>{formatBRL(c.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
