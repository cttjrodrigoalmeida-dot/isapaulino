// Dashboard analítico da aba Briefings — mesmo modelo do de contratos, calculado
// do ano selecionado. Cores padronizadas (paleta do layout).
import { useMemo } from "react";
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, Tooltip,
} from "recharts";
import RadialGauge from "./RadialGauge";
import type { BriefingSummary } from "./api";

const C = { green: "#4ade80", amber: "#b07a16", red: "#dd5c4e", slate: "#7c8698" };
const SOFT = {
  green: "rgba(74, 222, 128, 0.12)", amber: "rgba(176, 122, 22, 0.12)",
  red: "rgba(221, 92, 78, 0.12)", slate: "rgba(124, 134, 152, 0.14)",
};
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

// Concluído = respondido; Cancelado = status; Pendente = o resto.
function classify(b: BriefingSummary): "concluido" | "cancelado" | "pendente" {
  if (b.status === "cancelled") return "cancelado";
  if (b.responseCount > 0) return "concluido";
  return "pendente";
}

function computeMetrics(items: BriefingSummary[]) {
  let concluidos = 0, pendentes = 0, cancelados = 0;
  const monthly = { total: Array(12).fill(0), concluido: Array(12).fill(0), pendente: Array(12).fill(0), cancelado: Array(12).fill(0) };
  for (const b of items) {
    const k = classify(b);
    if (k === "concluido") concluidos++; else if (k === "cancelado") cancelados++; else pendentes++;
    const mi = b.createdAt ? new Date(b.createdAt).getMonth() : null;
    if (mi != null && mi >= 0 && mi < 12) { monthly.total[mi]++; monthly[k][mi]++; }
  }
  const total = items.length;
  const respBase = concluidos + pendentes; // exclui cancelados da taxa
  const taxaPct = respBase ? Math.round((concluidos / respBase) * 100) : 0;
  return { total, concluidos, pendentes, cancelados, monthly, taxaPct, respBase };
}

export default function BriefingsAnalytics({ items, year, onSeeDetails }: {
  items: BriefingSummary[]; year: string; onSeeDetails?: () => void;
}) {
  const m = useMemo(() => computeMetrics(items), [items]);
  if (items.length === 0) return null;

  const pct = (v: number) => (m.total ? `${((v / m.total) * 100).toFixed(1).replace(".", ",")}% do total` : "—");
  const donut = [
    { name: "Concluídos", value: m.concluidos, color: C.green },
    { name: "Pendentes", value: m.pendentes, color: C.amber },
    { name: "Cancelados", value: m.cancelados, color: C.red },
  ];
  const taxa = [
    { name: "Respondidos", value: m.concluidos, color: C.green },
    { name: "Pendentes", value: m.pendentes, color: C.amber },
    { name: "Cancelados", value: m.cancelados, color: C.red },
  ];
  const porMes = MONTHS.map((name, i) => ({ name, value: m.monthly.total[i] }));

  return (
    <div style={{ marginTop: 22, display: "grid", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--color-text-primary)" }}>Dashboard de briefings · {year}</h3>
        <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Concluído = respondido. Números do ano selecionado.</span>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 16 }}>
        <Kpi label="TOTAL DE BRIEFINGS" value={m.total} sub="briefings cadastrados" color={C.slate} soft={SOFT.slate} series={m.monthly.total} />
        <Kpi label="CONCLUÍDOS" value={m.concluidos} sub={pct(m.concluidos)} color={C.green} soft={SOFT.green} series={m.monthly.concluido} />
        <Kpi label="PENDENTES" value={m.pendentes} sub={pct(m.pendentes)} color={C.amber} soft={SOFT.amber} series={m.monthly.pendente} />
        <Kpi label="CANCELADOS" value={m.cancelados} sub={pct(m.cancelados)} color={C.red} soft={SOFT.red} series={m.monthly.cancelado} />
      </div>

      {/* Painéis */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
        {/* Briefings por status */}
        <div style={card}>
          <PanelTitle title="Briefings por status" sub="Distribuição no ano." />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <RadialGauge data={donut} center={m.total} centerLabel="total" />
            <div style={{ display: "grid", gap: 8, flex: 1 }}>
              {donut.map((d) => {
                const p = m.total ? Math.round((d.value / m.total) * 100) : 0;
                return (
                  <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: d.color, flexShrink: 0 }} />
                    <span style={{ color: "var(--color-text-secondary)", flex: 1 }}>{d.name}</span>
                    <span style={{ color: "var(--color-text-primary)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{d.value}</span>
                    <span style={{ color: "var(--color-text-muted)", fontVariantNumeric: "tabular-nums", minWidth: 38, textAlign: "right" }}>{p}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Briefings por mês (criados) */}
        <div style={card}>
          <PanelTitle title="Briefings por mês (criados)" sub={`Criados por mês em ${year}.`} />
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={porMes} margin={{ top: 8, right: 12, bottom: 0, left: 6 }}>
                <defs>
                  <linearGradient id="bm-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.slate} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={C.slate} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "var(--color-text-secondary)" }} interval={0} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: "var(--color-text-muted)" }} width={24} />
                <Tooltip
                  formatter={(v) => [`${v} briefing(s)`, "Criados"]}
                  cursor={{ stroke: "var(--color-border)", strokeWidth: 1 }}
                  contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12, boxShadow: "0 6px 20px rgba(0, 0, 0, 0.25)" }}
                  labelStyle={{ color: "var(--color-text-primary)", fontWeight: 600, marginBottom: 2 }}
                  itemStyle={{ color: "var(--color-text-secondary)" }}
                />
                <Area type="monotone" dataKey="value" stroke={C.slate} strokeWidth={2.5} fill="url(#bm-area)" dot={{ r: 2.5, fill: C.slate }} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Taxa de respostas */}
        <div style={card}>
          <PanelTitle title="Taxa de respostas" sub="Respondidos ÷ (respondidos + pendentes)." />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <RadialGauge data={taxa} center={`${m.taxaPct}%`} centerLabel="respondidos" />
            <div style={{ display: "grid", gap: 8, flex: 1 }}>
              {taxa.map((d) => {
                // % sobre o total (inclui cancelados) — coerente com os arcos.
                const p = m.total ? Math.round((d.value / m.total) * 100) : 0;
                return (
                  <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: d.color, flexShrink: 0 }} />
                    <span style={{ color: "var(--color-text-secondary)", flex: 1 }}>{d.name}</span>
                    <span style={{ color: "var(--color-text-primary)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{d.value}</span>
                    <span style={{ color: "var(--color-text-muted)", fontVariantNumeric: "tabular-nums", minWidth: 38, textAlign: "right" }}>{p}%</span>
                  </div>
                );
              })}
            </div>
          </div>
          {onSeeDetails && (
            <button onClick={onSeeDetails} style={{ marginTop: 12, background: "none", border: "none", padding: 0, cursor: "pointer", color: C.green, fontSize: 12.5, fontWeight: 600 }}>
              Ver detalhes →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const card: React.CSSProperties = {
  background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 14, padding: 18,
};

function PanelTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)" }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Kpi({ label, value, sub, color, soft, series }: {
  label: string; value: number; sub: string; color: string; soft: string; series: number[];
}) {
  const data = series.map((v, i) => ({ i, v }));
  const hasSpark = series.some((v) => v > 0);
  return (
    <div style={{ ...card, background: soft, border: `1px solid ${color}33` }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-text-secondary)" }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 700, color: "var(--color-text-primary)", marginTop: 8 }}>{value}</div>
      <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 2 }}>{sub}</div>
      <div style={{ height: 34, marginTop: 8 }}>
        {hasSpark && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`bsp-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#bsp-${label})`} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
