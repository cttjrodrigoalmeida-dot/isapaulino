import { useEffect, useState, useCallback } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, Cell } from "recharts";
import { api, ApiError, type DashboardOverview } from "../api";
import { formatBRL, formatBRLShort } from "./format";
import s from "./Dashboard.module.css";
import admin from "../Admin.module.css";

const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 100) : 0);

export default function Relatorios() {
  const [ov, setOv] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOv(await api.dashboardOverview());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const exportCsv = () => {
    if (!ov) return;
    const f = ov.finance;
    const rows: string[][] = [
      ["Relatório — Isabela Paulino Studio", new Date().toLocaleString("pt-BR")],
      [],
      ["Indicador", "Valor"],
      ["Faturado", String(f.faturado)],
      ["Recebido", String(f.recebido)],
      ["A receber", String(f.aReceber)],
      ["Parcelas em atraso", String(f.atrasados)],
      ["Meta anual", String(f.annualGoal)],
      ["Ticket médio (propostas)", String(ov.proposals.avgTicket)],
      [],
      ["Propostas (total)", String(ov.proposals.total)],
      ["Briefings (total)", String(ov.briefings.total)],
      ["Contratos (total)", String(ov.contracts.total)],
      ["Contratos publicados", String(ov.contracts.published)],
      ["Contratos assinados", String(ov.contracts.signed)],
      [],
      ["Recebido por mês", ""],
      ...f.receivedByMonth.map((m) => [m.label, String(m.value)]),
      [],
      ["Ranking de clientes (por valor em propostas)", ""],
      ["Cliente", "Total", "Propostas"],
      ...ov.clientRanking.map((c) => [c.client, String(c.total), String(c.count)]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fin = ov?.finance;
  const maxRecv = Math.max(1, ...(fin?.receivedByMonth.map((m) => m.value) ?? [0]));

  return (
    <>
      <div className={s.greeting}>
        <div>
          <h1 className={s.greetTitle}>Relatórios</h1>
          <p className={s.greetSub}>Desempenho do estúdio — receita, conversão e ranking. Exporte para backup.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className={`${admin.btn} ${admin.btnGhost}`} onClick={load} disabled={loading}>Atualizar</button>
          <button className={`${admin.btn} ${admin.btnPrimary}`} onClick={exportCsv} disabled={!ov}>Exportar CSV</button>
        </div>
      </div>

      {error && <div className={admin.error}>{error}</div>}
      {loading && !ov ? (
        <div className={s.emptyMini}>Carregando…</div>
      ) : !ov ? null : (
        <>
          {/* KPIs financeiros */}
          <div className={`${s.grid} ${s.cols4}`}>
            <div className={`${s.card} ${s.kpi}`}>
              <span className={s.kpiLabel}>Faturado</span>
              <span className={s.kpiValue}>{formatBRLShort(fin!.faturado)}</span>
              <span className={s.kpiNote}>Contratos + adicionais</span>
            </div>
            <div className={`${s.card} ${s.kpi}`}>
              <span className={s.kpiLabel}>Recebido</span>
              <span className={s.kpiValue}>{formatBRLShort(fin!.recebido)}</span>
              {fin!.annualGoal > 0 && <span className={s.kpiNote}>{pct(fin!.recebido, fin!.annualGoal)}% da meta</span>}
            </div>
            <div className={`${s.card} ${s.kpi}`}>
              <span className={s.kpiLabel}>A receber</span>
              <span className={s.kpiValue}>{formatBRLShort(fin!.aReceber)}</span>
            </div>
            <div className={`${s.card} ${s.kpi}`}>
              <span className={s.kpiLabel}>Ticket médio</span>
              <span className={s.kpiValue}>{formatBRLShort(ov.proposals.avgTicket)}</span>
              <span className={s.kpiNote}>por proposta</span>
            </div>
          </div>

          {/* Receita recebida por mês */}
          <div className={`${s.grid} ${s.cols3}`}>
            <div className={s.card} style={{ gridColumn: "span 3" }}>
              <div className={s.cardHead}>
                <div>
                  <div className={s.cardTitleX}>Recebido por mês</div>
                  <div className={s.cardSub}>Últimos 12 meses (parcelas + serviços adicionais)</div>
                </div>
              </div>
              <div style={{ width: "100%", height: 220 }}>
                <ResponsiveContainer>
                  <BarChart data={fin!.receivedByMonth}>
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--color-text-secondary)" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: "rgba(255,255,255,0.04)" }}
                      formatter={(v) => [formatBRL(Number(v)), "Recebido"]}
                      contentStyle={{ background: "#1a1712", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {fin!.receivedByMonth.map((m, i) => (
                        <Cell key={i} fill={m.value >= maxRecv ? "var(--color-accent)" : "rgba(212,197,176,0.5)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Funil de conversão + Contratos por status */}
          <div className={s.grid} style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className={s.card}>
              <div className={s.cardTitleX}>Funil de conversão</div>
              <div className={s.cardSub} style={{ marginBottom: 12 }}>Do interesse ao contrato assinado</div>
              {[
                { label: "Propostas", value: ov.proposals.total, base: ov.proposals.total },
                { label: "Briefings", value: ov.briefings.total, base: ov.proposals.total },
                { label: "Contratos", value: ov.contracts.total, base: ov.proposals.total },
                { label: "Assinados", value: ov.contracts.signed, base: ov.proposals.total },
              ].map((step) => (
                <div key={step.label} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                    <span>{step.label}</span>
                    <span className={admin.mono}>{step.value}{step.base > 0 && step.label !== "Propostas" ? ` · ${pct(step.value, step.base)}%` : ""}</span>
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
              <div className={s.cardSub} style={{ marginBottom: 12 }}>Por valor em propostas</div>
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
