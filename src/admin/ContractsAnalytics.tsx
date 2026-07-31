// Dashboard analítico da aba Contratos — calculado a partir dos contratos do ano
// selecionado (sem storage extra; o ano vem do filtro da lista). Cores padronizadas.
import { useMemo } from "react";
import {
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, LabelList, LineChart, Line, Tooltip,
} from "recharts";
import type { ContractSummary } from "./api";
import { formatBRL, formatBRLShort, formatDate } from "./dashboard/format";

// Paleta padronizada (semântica).
const C = { green: "#2f9e44", red: "#dd5c4e", blue: "#2f6fed", amber: "#b07a16", slate: "#7c8698" };
const SOFT = {
  green: "rgba(47, 158, 68, 0.12)", red: "rgba(221, 92, 78, 0.12)",
  blue: "rgba(47, 111, 237, 0.12)", amber: "rgba(176, 122, 22, 0.12)", slate: "rgba(124, 134, 152, 0.14)",
};
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

// Vencimento = assinatura + vigência (padrão 3 meses). null se não assinado.
function vencOf(c: ContractSummary): number | null {
  if (c.status !== "signed" || !c.signedAt) return null;
  const d = new Date(c.signedAt);
  d.setMonth(d.getMonth() + (c.vigenciaMeses ?? 3));
  return d.getTime();
}

type Agg = { v: number; n: number };

function computeMetrics(items: ContractSummary[]) {
  const now = Date.now();
  const ativos: Agg = { v: 0, n: 0 }, concl: Agg = { v: 0, n: 0 }, canc: Agg = { v: 0, n: 0 };
  const statusCnt: Record<string, number> = { draft: 0, published: 0, signed: 0, cancelled: 0 };
  const byClient = new Map<string, { value: number; count: number }>();
  const monthly = { ativos: Array(12).fill(0), concl: Array(12).fill(0), canc: Array(12).fill(0), evolucao: Array(12).fill(0) };
  const signedTimes: number[] = [];
  let maior: (ContractSummary & { _v: number }) | null = null;
  let menor: (ContractSummary & { _v: number }) | null = null;
  const signedList: ContractSummary[] = [];

  for (const c of items) {
    statusCnt[c.status] = (statusCnt[c.status] ?? 0) + 1;
    const v = c.value ?? 0;
    if (c.clientName) {
      const e = byClient.get(c.clientName) ?? { value: 0, count: 0 };
      e.value += v; e.count += 1; byClient.set(c.clientName, e);
    }
    if (v > 0) {
      if (!maior || v > maior._v) maior = { ...c, _v: v };
      if (!menor || v < menor._v) menor = { ...c, _v: v };
    }
    const mi = c.signedAt ? new Date(c.signedAt).getMonth() : null;
    if (c.status === "cancelled") {
      canc.v += v; canc.n += 1; if (mi != null) monthly.canc[mi] += v;
      continue;
    }
    const venc = vencOf(c);
    if (venc == null) continue; // não assinado (rascunho/aguardando)
    signedList.push(c);
    if (mi != null) monthly.evolucao[mi] += v;
    if (venc > now) { ativos.v += v; ativos.n += 1; if (mi != null) monthly.ativos[mi] += v; }
    else { concl.v += v; concl.n += 1; if (mi != null) monthly.concl[mi] += v; }
    if (c.createdAt && c.signedAt) {
      const days = (new Date(c.signedAt).getTime() - new Date(c.createdAt).getTime()) / 86_400_000;
      if (days >= 0) signedTimes.push(days);
    }
  }

  const clientsSorted = [...byClient.entries()].sort((a, b) => b[1].value - a[1].value);
  const maiorCliente = clientsSorted[0] ? { name: clientsSorted[0][0], ...clientsSorted[0][1] } : null;
  const top5 = clientsSorted.slice(0, 5).map(([name, e]) => ({ name, value: e.value }));
  const tempoMedio = signedTimes.length ? signedTimes.reduce((s, d) => s + d, 0) / signedTimes.length : null;
  const ultimos = [...signedList].sort((a, b) => (b.signedAt ?? "").localeCompare(a.signedAt ?? "")).slice(0, 5);

  return { ativos, concl, canc, statusCnt, maior, menor, maiorCliente, top5, tempoMedio, ultimos, monthly, total: items.length };
}

export default function ContractsAnalytics({ items, year }: { items: ContractSummary[]; year: string }) {
  const m = useMemo(() => computeMetrics(items), [items]);
  if (items.length === 0) return null;

  const donut = [
    { name: "Assinados", value: m.statusCnt.signed ?? 0, color: C.green },
    { name: "Aguardando", value: m.statusCnt.published ?? 0, color: C.amber },
    { name: "Rascunho", value: m.statusCnt.draft ?? 0, color: C.slate },
    { name: "Cancelados", value: m.statusCnt.cancelled ?? 0, color: C.red },
  ];
  const evoData = MONTHS.map((name, i) => ({ name, value: m.monthly.evolucao[i] }));

  return (
    <div style={{ marginTop: 22, display: "grid", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--color-text-primary)" }}>Dashboard de contratos · {year}</h3>
        <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Vencimento = assinatura + vigência. Números do ano selecionado.</span>
      </div>

      {/* ── Linha 1: KPIs de valor + últimos assinados ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 16 }}>
        <KpiValue label="VALOR TOTAL CONTRATOS ATIVOS" value={m.ativos.v} count={m.ativos.n} noun="ativos" color={C.green} soft={SOFT.green} series={m.monthly.ativos} />
        <KpiValue label="VALOR TOTAL CONTRATOS CANCELADOS" value={m.canc.v} count={m.canc.n} noun="cancelados" color={C.red} soft={SOFT.red} series={m.monthly.canc} />
        <KpiValue label="CONTRATOS CONCLUÍDOS" value={m.concl.v} count={m.concl.n} noun="concluídos" color={C.blue} soft={SOFT.blue} series={m.monthly.concl} />
        <UltimosAssinados ultimos={m.ultimos} />
      </div>

      {/* ── Linha 2: destaques ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        <MiniCard label="MAIOR CONTRATO DO ANO" color={C.amber}
          value={m.maior ? formatBRL(m.maior._v) : "—"}
          sub={m.maior ? `${m.maior.clientName ?? "—"}${m.maior.contractNumber ? ` · Nº ${m.maior.contractNumber}` : ""}` : "sem valores"}
          extra={m.maior?.signedAt ? `Assinado em ${formatDate(m.maior.signedAt)}` : undefined} />
        <MiniCard label="MENOR CONTRATO DO ANO" color={C.slate}
          value={m.menor ? formatBRL(m.menor._v) : "—"}
          sub={m.menor ? `${m.menor.clientName ?? "—"}${m.menor.contractNumber ? ` · Nº ${m.menor.contractNumber}` : ""}` : "sem valores"} />
        <MiniCard label="MAIOR CLIENTE" color={C.green}
          value={m.maiorCliente?.name ?? "—"} valueSize={20}
          sub={m.maiorCliente ? `${formatBRL(m.maiorCliente.value)} · ${m.maiorCliente.count} contrato${m.maiorCliente.count === 1 ? "" : "s"} no ano` : "—"} />
        <MiniCard label="TEMPO MÉDIO ATÉ A ASSINATURA" color={C.blue}
          value={m.tempoMedio != null ? `${m.tempoMedio.toFixed(1).replace(".", ",")} dias` : "—"}
          sub="da criação até a assinatura" />
      </div>

      {/* ── Linha 3: status / clientes / evolução ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
        <div style={card}>
          <PanelTitle title="Contratos por status" sub="Distribuição no ano." />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 150, height: 150, position: "relative" }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donut} dataKey="value" innerRadius={46} outerRadius={68} paddingAngle={2} stroke="none">
                    {donut.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 26, fontWeight: 700, color: "var(--color-text-primary)" }}>{m.total}</div>
                  <div style={{ fontSize: 10, color: "var(--color-text-muted)" }}>contratos</div>
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gap: 8, flex: 1 }}>
              {donut.map((d) => {
                const pct = m.total ? Math.round((d.value / m.total) * 100) : 0;
                return (
                  <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: d.color, flexShrink: 0 }} />
                    <span style={{ color: "var(--color-text-secondary)", flex: 1 }}>{d.name}</span>
                    <span style={{ color: "var(--color-text-primary)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{d.value}</span>
                    <span style={{ color: "var(--color-text-muted)", fontVariantNumeric: "tabular-nums", minWidth: 38, textAlign: "right" }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div style={card}>
          <PanelTitle title="Valor por cliente (Top 5)" sub="Soma dos valores por cliente no ano." />
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={m.top5} layout="vertical" margin={{ top: 4, right: 56, bottom: 0, left: 6 }} barCategoryGap="26%">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={110} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={22} fill={C.green}>
                  <LabelList dataKey="value" position="right" formatter={(v) => formatBRLShort(Number(v))} style={{ fontSize: 11, fontWeight: 700, fill: "var(--color-text-primary)" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={card}>
          <PanelTitle title="Evolução de contratos (valor)" sub={`Valor assinado por mês em ${year}.`} />
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evoData} margin={{ top: 8, right: 12, bottom: 0, left: 6 }}>
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "var(--color-text-secondary)" }} interval={0} />
                <YAxis tickFormatter={(v) => formatBRLShort(Number(v))} tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: "var(--color-text-muted)" }} width={54} />
                <Tooltip
                  formatter={(v) => [formatBRL(Number(v)), "Valor"]}
                  cursor={{ stroke: "var(--color-border)", strokeWidth: 1 }}
                  contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12, boxShadow: "0 6px 20px rgba(0, 0, 0, 0.25)" }}
                  labelStyle={{ color: "var(--color-text-primary)", fontWeight: 600, marginBottom: 2 }}
                  itemStyle={{ color: "var(--color-text-secondary)" }}
                />
                <Line type="monotone" dataKey="value" stroke={C.green} strokeWidth={2.5} dot={{ r: 2.5, fill: C.green }} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
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

function KpiValue({ label, value, count, noun, color, soft, series }: {
  label: string; value: number; count: number; noun: string; color: string; soft: string; series: number[];
}) {
  const data = series.map((v, i) => ({ i, v }));
  const hasSpark = series.some((v) => v > 0);
  return (
    <div style={{ ...card, background: soft, border: `1px solid ${color}33` }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-text-secondary)" }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: "var(--color-text-primary)", marginTop: 8 }}>{formatBRL(value)}</div>
      <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 2 }}>{count} contrato{count === 1 ? "" : "s"} {noun}</div>
      <div style={{ height: 34, marginTop: 8 }}>
        {hasSpark && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`sp-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#sp-${label})`} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function MiniCard({ label, value, sub, extra, color, valueSize = 24 }: {
  label: string; value: string; sub: string; extra?: string; color: string; valueSize?: number;
}) {
  return (
    <div style={{ ...card, borderLeft: `3px solid ${color}` }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-text-secondary)" }}>{label}</div>
      <div style={{ fontSize: valueSize, fontWeight: 700, color: "var(--color-text-primary)", marginTop: 8, lineHeight: 1.15 }}>{value}</div>
      <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 4 }}>{sub}</div>
      {extra && <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>{extra}</div>}
    </div>
  );
}

function UltimosAssinados({ ultimos }: { ultimos: ContractSummary[] }) {
  return (
    <div style={card}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-text-secondary)", marginBottom: 10 }}>
        ÚLTIMOS CONTRATOS ASSINADOS
      </div>
      {ultimos.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "var(--color-text-muted)" }}>Nenhum contrato assinado no ano.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {ultimos.map((c) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 30, height: 30, borderRadius: 9, background: SOFT.green, color: C.green, display: "grid", placeItems: "center", flexShrink: 0, fontSize: 12, fontWeight: 700 }}>
                {(c.clientName ?? "?").trim().charAt(0).toUpperCase()}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "var(--color-text-primary)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.clientName ?? "—"}</div>
                <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Contrato {c.contractNumber ? `#${c.contractNumber}` : "—"}</div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", fontVariantNumeric: "tabular-nums" }}>{c.value != null ? formatBRL(c.value) : "—"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
