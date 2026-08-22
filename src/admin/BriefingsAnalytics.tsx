// Dashboard analítico da aba Briefings — mesmo modelo do de contratos, calculado
// do ano selecionado. Cores padronizadas (paleta do layout).
import { useEffect, useId, useMemo, useState } from "react";
import {
  ResponsiveContainer, AreaChart, Area,
  LineChart, Line,
  XAxis, YAxis, Tooltip,
} from "recharts";
import RadialGauge from "./RadialGauge";
import { api, type BriefingSummary } from "./api";

// Verde/vermelho reservados p/ positivo/negativo (mesmas cores dos selos).
// Restante em CINZA (slate); slateSoft = 2ª série da comparação entre anos.
const C = { green: "#4ade80", amber: "#b07a16", red: "#f0506e", slate: "#7c8698", slateSoft: "#aab3c0" };
const SOFT = {
  green: "rgba(74, 222, 128, 0.12)", amber: "rgba(176, 122, 22, 0.12)",
  red: "rgba(240, 80, 110, 0.12)", slate: "rgba(124, 134, 152, 0.14)",
};
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
// Dispositivo é dado NEUTRO → rampa de CINZA (disciplina de cor do sistema),
// do mais escuro ao mais claro; cada opção recebe um tom distinto no anel.
const DEVICE_RAMP = ["#5b6472", "#8b94a3", "#b4bcc8", "#d6dbe2", "#7c8698"];
// Ano derivado do número (AANN): "2624" → "2026".
const yearOf = (number: string) => (/^\d{2}/.test(number) ? `20${number.slice(0, 2)}` : "Outros");

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

export default function BriefingsAnalytics({ items, year, allItems, years, onSeeDetails }: {
  items: BriefingSummary[]; year: string;
  /** Todos os briefings (todos os anos) — comparação entre anos. */
  allItems?: BriefingSummary[];
  /** Anos disponíveis no seletor da lista. */
  years?: string[];
  onSeeDetails?: () => void;
}) {
  const m = useMemo(() => computeMetrics(items), [items]);

  // ── Dispositivo usado para responder (pergunta específica, agregada no servidor) ──
  const [devices, setDevices] = useState<{ name: string; count: number }[]>([]);
  const [devAnswered, setDevAnswered] = useState(0);
  useEffect(() => {
    let alive = true;
    api.briefingDeviceStats(year)
      .then((r) => { if (alive) { setDevices(r.devices); setDevAnswered(r.answered); } })
      .catch(() => { if (alive) { setDevices([]); setDevAnswered(0); } });
    return () => { alive = false; };
  }, [year]);

  // ── Comparação entre anos ──
  const otherYears = (years ?? []).filter((y) => y !== year && y !== "Outros");
  const [compareYear, setCompareYear] = useState<string>("");
  const cy = compareYear && otherYears.includes(compareYear) ? compareYear : "";
  const compareItems = useMemo(
    () => (cy && allItems ? allItems.filter((b) => yearOf(b.number) === cy) : []),
    [allItems, cy],
  );
  const mC = useMemo(() => (cy ? computeMetrics(compareItems) : null), [compareItems, cy]);
  const deltaPct = mC && mC.total > 0 ? ((m.total - mC.total) / mC.total) * 100 : null;

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
  // Anel de dispositivos: uma cor de cinza por opção (na ordem do documento).
  const deviceData = devices.map((d, i) => ({ name: d.name, value: d.count, color: DEVICE_RAMP[i % DEVICE_RAMP.length] }));
  const porMes = MONTHS.map((name, i) => ({
    name,
    value: m.monthly.total[i],
    ...(mC ? { compare: mC.monthly.total[i] } : {}),
  }));

  return (
    // Dashboard mais largo que a lista: recupera o padding lateral do container
    // (28px de cada lado) p/ os painéis terem mais espaço e os rótulos caberem.
    <div style={{ marginTop: 22, display: "grid", gap: 16, width: "calc(100% + 56px)", marginInline: -28 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--color-text-primary)" }}>Dashboard de briefings · {year}</h3>
        {otherYears.length > 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Comparar com:</span>
            <select
              value={cy}
              onChange={(e) => setCompareYear(e.target.value)}
              style={{ fontSize: 12, padding: "5px 8px", borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-surface)", color: "var(--color-text-primary)" }}
            >
              <option value="">— nenhum —</option>
              {otherYears.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        ) : (
          <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Concluído = respondido. Números do ano selecionado.</span>
        )}
      </div>

      {cy && mC && (
        <div style={{ ...card, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 18, padding: "14px 18px" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-text-secondary)" }}>
            Comparativo anual · total
          </span>
          <YearTotal year={year} value={m.total} color={C.slate} />
          <span style={{ color: "var(--color-text-muted)" }}>×</span>
          <YearTotal year={cy} value={mC.total} color={C.slateSoft} />
          {deltaPct != null && (
            <span style={{ fontSize: 13, fontWeight: 700, marginLeft: "auto", color: deltaPct >= 0 ? C.green : C.red }}>
              {deltaPct >= 0 ? "▲" : "▼"} {Math.abs(deltaPct).toFixed(1).replace(".", ",")}% vs {cy}
            </span>
          )}
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 16 }}>
        <Kpi label="TOTAL DE BRIEFINGS" value={m.total} sub="briefings cadastrados" color={C.slate} soft={SOFT.slate} series={m.monthly.total} />
        <Kpi label="CONCLUÍDOS" value={m.concluidos} sub={pct(m.concluidos)} color={C.green} soft={SOFT.green} series={m.monthly.concluido} />
        <Kpi label="PENDENTES" value={m.pendentes} sub={pct(m.pendentes)} color={C.amber} soft={SOFT.amber} series={m.monthly.pendente} />
        <Kpi label="CANCELADOS" value={m.cancelados} sub={pct(m.cancelados)} color={C.red} soft={SOFT.red} series={m.monthly.cancelado} />
      </div>

      {/* Painéis */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
        {/* Briefings por status */}
        <div style={card}>
          <PanelTitle title="Briefings por status" sub="Distribuição no ano." />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <RadialGauge data={donut} center={m.total} centerLabel="total" />
            <div style={{ display: "grid", gap: 8, flex: 1, minWidth: 0 }}>
              {donut.map((d) => (
                <LegendRow key={d.name} color={d.color} name={d.name} value={d.value} pct={m.total ? Math.round((d.value / m.total) * 100) : 0} />
              ))}
            </div>
          </div>
        </div>

        {/* Briefings por mês (criados) */}
        <div style={card}>
          <PanelTitle title="Briefings por mês (criados)" sub={cy ? `Criados por mês · ${year} × ${cy}.` : `Criados por mês em ${year}.`} />
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              {cy ? (
                <LineChart data={porMes} margin={{ top: 8, right: 12, bottom: 0, left: 6 }}>
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "var(--color-text-secondary)" }} interval={0} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: "var(--color-text-muted)" }} width={24} />
                  <Tooltip
                    formatter={(v, n) => [`${v} briefing(s)`, String(n)]}
                    cursor={{ stroke: "var(--color-border)", strokeWidth: 1 }}
                    contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12, boxShadow: "0 6px 20px rgba(0, 0, 0, 0.25)" }}
                    labelStyle={{ color: "var(--color-text-primary)", fontWeight: 600, marginBottom: 2 }}
                    itemStyle={{ color: "var(--color-text-secondary)" }}
                  />
                  <Line name={cy} type="monotone" dataKey="compare" stroke={C.slateSoft} strokeWidth={2} strokeDasharray="5 4" dot={{ r: 2, fill: C.slateSoft }} activeDot={{ r: 4 }} />
                  <Line name={year} type="monotone" dataKey="value" stroke={C.slate} strokeWidth={2.5} dot={{ r: 2.5, fill: C.slate }} activeDot={{ r: 4 }} />
                </LineChart>
              ) : (
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
              )}
            </ResponsiveContainer>
          </div>
          {cy && (
            <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 11.5, color: "var(--color-text-muted)" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 14, height: 3, background: C.slate, borderRadius: 2 }} /> {year}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 14, height: 3, background: C.slateSoft, borderRadius: 2 }} /> {cy}
              </span>
            </div>
          )}
        </div>

        {/* Taxa de respostas */}
        <div style={card}>
          <PanelTitle title="Taxa de respostas" sub="Respondidos ÷ (respondidos + pendentes)." />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <RadialGauge data={taxa} center={`${m.taxaPct}%`} centerLabel="respondidos" />
            <div style={{ display: "grid", gap: 8, flex: 1, minWidth: 0 }}>
              {/* % sobre o total (inclui cancelados) — coerente com os arcos. */}
              {taxa.map((d) => (
                <LegendRow key={d.name} color={d.color} name={d.name} value={d.value} pct={m.total ? Math.round((d.value / m.total) * 100) : 0} />
              ))}
            </div>
          </div>
          {onSeeDetails && (
            <button onClick={onSeeDetails} style={{ marginTop: 12, background: "none", border: "none", padding: 0, cursor: "pointer", color: C.green, fontSize: 12.5, fontWeight: 600 }}>
              Ver detalhes →
            </button>
          )}
        </div>

        {/* Dispositivo usado para responder o briefing */}
        <div style={card}>
          <PanelTitle title="Dispositivo dos clientes" sub="Como responderam ao briefing — para otimizar a experiência." />
          {devAnswered === 0 ? (
            <div style={{ fontSize: 12.5, color: "var(--color-text-muted)", padding: "24px 0", textAlign: "center" }}>
              Ainda sem respostas para esta pergunta em {year}.
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <RadialGauge data={deviceData} center={devAnswered} centerLabel="respostas" />
              <div style={{ display: "grid", gap: 8, flex: 1, minWidth: 0 }}>
                {deviceData.map((d) => (
                  <LegendRow key={d.name} color={d.color} name={d.name} value={d.value} pct={devAnswered ? Math.round((d.value / devAnswered) * 100) : 0} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const card: React.CSSProperties = {
  background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 14, padding: 18,
};

function YearTotal({ year, value, color }: { year: string; value: number; color: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: 9, height: 9, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{year}</span>
      <strong style={{ fontSize: 15, color: "var(--color-text-primary)", fontVariantNumeric: "tabular-nums" }}>{value}</strong>
    </span>
  );
}

// Linha de legenda dos anéis: rótulo por extenso (sem cortar) e os números fixos
// à direita. Os painéis são largos o bastante (grid abaixo) p/ caber tudo.
function LegendRow({ color, name, value, pct }: { color: string; name: string; value: number; pct: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
      <span style={{ width: 9, height: 9, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <span style={{ color: "var(--color-text-secondary)", flex: 1, whiteSpace: "nowrap" }}>{name}</span>
      <span style={{ color: "var(--color-text-primary)", fontWeight: 600, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{value}</span>
      <span style={{ color: "var(--color-text-muted)", fontVariantNumeric: "tabular-nums", minWidth: 34, textAlign: "right", flexShrink: 0 }}>{pct}%</span>
    </div>
  );
}

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
  const gid = "bsp" + useId().replace(/:/g, "");
  const data = series.map((v, i) => ({ v, m: MONTHS[i] }));
  return (
    <div style={{ ...card, background: soft, border: `1px solid ${color}33`, overflow: "visible" }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-text-secondary)" }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 700, color: "var(--color-text-primary)", marginTop: 8 }}>{value}</div>
      <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 2 }}>{sub}</div>
      <div style={{ height: 40, marginTop: 8, overflow: "visible" }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="m" hide />
            <YAxis hide domain={[0, (max: number) => Math.max(1, max)]} />
            <Tooltip
              cursor={{ stroke: color, strokeOpacity: 0.5, strokeWidth: 1 }}
              allowEscapeViewBox={{ x: true, y: true }}
              wrapperStyle={{ zIndex: 30 }}
              contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 11, padding: "3px 9px", boxShadow: "0 6px 20px rgba(0, 0, 0, 0.3)" }}
              labelStyle={{ color: "var(--color-text-primary)", fontWeight: 600, marginBottom: 1 }}
              itemStyle={{ color: "var(--color-text-secondary)", padding: 0 }}
              separator=""
              formatter={(v) => [`${Number(v)} briefing${Number(v) === 1 ? "" : "s"}`, ""]}
            />
            <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#${gid})`} dot={false} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
