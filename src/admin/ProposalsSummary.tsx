import { useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Cell, LabelList } from "recharts";
import { formatBRL, formatBRLShort } from "./dashboard/format";

// Bloco de resumo das propostas por VALOR (aprovadas x não aprovadas x canceladas).
// Usado na tela de Propostas (rodapé).
const GREEN = "#4ade80"; // mesmo verde do Financeiro (padronizado) — aprovadas
const AMBER = "#b07a16"; // amarelo padrão do sistema — não aprovadas
const PINK = "#f0506e"; // melancia da marca — canceladas
const SLATE_SOFT = "#aab3c0"; // cinza claro (2ª série da comparação)

type YearAgg = { approvedValue: number; lostValue: number; cancelledValue: number; approvedCount: number; lostCount: number; cancelledCount: number };

const IcCheck = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#1a2e05" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M5 12.5l4.5 4.5L19 7" />
  </svg>
);
const IcX = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#3a2900" strokeWidth="3" strokeLinecap="round" aria-hidden>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
const IcMinus = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#4a121f" strokeWidth="3" strokeLinecap="round" aria-hidden>
    <path d="M6 12h12" />
  </svg>
);
const IcMoney = ({ color }: { color: string }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 2v20M17 6.5c0-2-2.2-3-5-3s-5 1-5 3 2.2 3 5 3.5 5 1.5 5 3.5-2.2 3-5 3-5-1-5-3" />
  </svg>
);
const IcTrend = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--color-accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3 17l6-6 4 4 8-8M15 7h6v6" />
  </svg>
);

export default function ProposalsSummary({
  totalValue,
  approvedValue,
  lostValue,
  cancelledValue,
  approvedCount,
  lostCount,
  cancelledCount,
  year,
  years,
  perYear,
}: {
  totalValue: number;
  approvedValue: number;
  lostValue: number;
  cancelledValue: number;
  approvedCount: number;
  lostCount: number;
  cancelledCount: number;
  /** Ano selecionado + anos disponíveis + agregados por ano (comparação). */
  year?: string;
  years?: string[];
  perYear?: Record<string, YearAgg>;
}) {
  const total = totalValue || approvedValue + lostValue + cancelledValue;

  // ── Comparação entre anos ──
  const otherYears = (years ?? []).filter((y) => y !== year && y !== "Outros");
  const [compareYear, setCompareYear] = useState<string>("");
  const cy = compareYear && otherYears.includes(compareYear) ? compareYear : "";
  const cmp = cy && perYear ? perYear[cy] : undefined;
  const cmpApproved = cmp?.approvedValue ?? 0;
  const cmpTotal = cmp ? cmp.approvedValue + cmp.lostValue + cmp.cancelledValue : 0;
  const apprDelta = cmp && cmpApproved > 0 ? ((approvedValue - cmpApproved) / cmpApproved) * 100 : null;
  const pct = (v: number) => (total > 0 ? Math.round((v / total) * 1000) / 10 : 0);
  const approvedPct = pct(approvedValue);
  const lostPct = pct(lostValue);
  const cancelledPct = pct(cancelledValue);
  const data = [
    { name: "Aprovadas", value: approvedValue },
    { name: "Não aprovadas", value: lostValue },
    { name: "Canceladas", value: cancelledValue },
  ];

  const iconBox = (bg: string): React.CSSProperties => ({
    width: 44, height: 44, borderRadius: 12, background: bg,
    display: "grid", placeItems: "center", flexShrink: 0,
  });
  const moneyCircle = (color: string): React.CSSProperties => ({
    width: 40, height: 40, borderRadius: "50%", border: `1.5px solid ${color}`,
    display: "grid", placeItems: "center", flexShrink: 0,
  });

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {otherYears.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
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
      )}
      {cy && cmp && (
        <div style={{ ...cardStyle, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 18, padding: "14px 18px" }}>
          <span style={miniLabel}>Comparativo anual · aprovado</span>
          <YearTotal year={year ?? ""} value={approvedValue} color={GREEN} />
          <span style={{ color: "var(--color-text-muted)" }}>×</span>
          <YearTotal year={cy} value={cmpApproved} color={SLATE_SOFT} />
          <span style={{ fontSize: 11.5, color: "var(--color-text-muted)" }}>
            (total {formatBRLShort(total)} × {formatBRLShort(cmpTotal)})
          </span>
          {apprDelta != null && (
            <span style={{ fontSize: 13, fontWeight: 700, marginLeft: "auto", color: apprDelta >= 0 ? GREEN : PINK }}>
              {apprDelta >= 0 ? "▲" : "▼"} {Math.abs(apprDelta).toFixed(1).replace(".", ",")}% vs {cy}
            </span>
          )}
        </div>
      )}
      {/* Linha 1: total · gráfico · cards aprovada/não aprovada */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1fr) minmax(300px, 1.6fr) minmax(280px, 1.1fr)", gap: 16 }} className="ps-row1">
        {/* Valor total */}
        <div style={cardStyle}>
          <div style={labelRow}>
            <span style={miniLabel}>VALOR TOTAL DAS PROPOSTAS</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 14 }}>
            <div>
              <div style={{ fontSize: 30, fontWeight: 700, color: "var(--color-text-primary)" }}>{formatBRL(total)}</div>
              <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 6 }}>100% do valor total</div>
            </div>
            <span style={moneyCircle("var(--color-text-muted)")}><IcMoney color="var(--color-text-muted)" /></span>
          </div>
        </div>

        {/* Gráfico */}
        <div style={cardStyle}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)" }}>Resumo das propostas (por valor)</div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2, marginBottom: 8 }}>
            Comparativo do valor financeiro entre propostas aprovadas, não aprovadas e canceladas.
          </div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 22, right: 8, bottom: 0, left: 6 }} barCategoryGap="26%">
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "var(--color-text-secondary)" }} />
                <YAxis tickFormatter={(v) => formatBRLShort(Number(v))} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} width={64} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={80}>
                  <Cell fill={GREEN} />
                  <Cell fill={AMBER} />
                  <Cell fill={PINK} />
                  <LabelList dataKey="value" position="top" formatter={(v) => formatBRL(Number(v))} style={{ fontSize: 12, fontWeight: 700, fill: "var(--color-text-primary)" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 4, flexWrap: "wrap" }}>
            <Legend color={GREEN} label="Propostas aprovadas" />
            <Legend color={AMBER} label="Propostas não aprovadas" />
            <Legend color={PINK} label="Propostas canceladas" />
          </div>
        </div>

        {/* Cards aprovada / não aprovada */}
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ ...cardStyle, background: "rgba(74, 222, 128, 0.10)", border: "1px solid rgba(74, 222, 128, 0.35)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={iconBox(GREEN)}><IcCheck /></span>
              <div style={{ flex: 1 }}>
                <div style={{ ...miniLabel, color: "var(--color-text-secondary)" }}>PROPOSTAS APROVADAS</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "var(--color-text-primary)", marginTop: 3 }}>{formatBRL(approvedValue)}</div>
                <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 3 }}>{approvedPct}% do valor total · {approvedCount} proposta{approvedCount === 1 ? "" : "s"}</div>
              </div>
              <span style={moneyCircle(GREEN)}><IcMoney color={GREEN} /></span>
            </div>
          </div>
          <div style={{ ...cardStyle, background: "rgba(176, 122, 22, 0.10)", border: "1px solid rgba(176, 122, 22, 0.38)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={iconBox(AMBER)}><IcX /></span>
              <div style={{ flex: 1 }}>
                <div style={{ ...miniLabel, color: "var(--color-text-secondary)" }}>PROPOSTAS NÃO APROVADAS</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "var(--color-text-primary)", marginTop: 3 }}>{formatBRL(lostValue)}</div>
                <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 3 }}>{lostPct}% do valor total · {lostCount} proposta{lostCount === 1 ? "" : "s"}</div>
              </div>
              <span style={moneyCircle(AMBER)}><IcMoney color={AMBER} /></span>
            </div>
          </div>
          <div style={{ ...cardStyle, background: "rgba(240, 80, 110, 0.10)", border: "1px solid rgba(240, 80, 110, 0.35)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={iconBox(PINK)}><IcMinus /></span>
              <div style={{ flex: 1 }}>
                <div style={{ ...miniLabel, color: "var(--color-text-secondary)" }}>PROPOSTAS CANCELADAS</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "var(--color-text-primary)", marginTop: 3 }}>{formatBRL(cancelledValue)}</div>
                <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 3 }}>{cancelledPct}% do valor total · {cancelledCount} proposta{cancelledCount === 1 ? "" : "s"}</div>
              </div>
              <span style={moneyCircle(PINK)}><IcMoney color={PINK} /></span>
            </div>
          </div>
        </div>
      </div>

      {/* Linha 2: frases-resumo */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="ps-row2">
        <div style={{ ...cardStyle, display: "flex", gap: 14, alignItems: "center" }}>
          <span style={moneyCircle(GREEN)}><IcMoney color={GREEN} /></span>
          <div style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--color-text-secondary)" }}>
            Clientes aprovaram <strong style={{ color: GREEN }}>{formatBRL(approvedValue)}</strong> em propostas este ano.
            <br />
            <strong style={{ color: AMBER }}>{formatBRL(lostValue)}</strong> não foram aprovadas
            {cancelledValue > 0 && <> · <strong style={{ color: PINK }}>{formatBRL(cancelledValue)}</strong> canceladas</>}.
          </div>
        </div>
        <div style={{ ...cardStyle, display: "flex", gap: 14, alignItems: "center" }}>
          <span style={moneyCircle("var(--color-accent)")}><IcTrend /></span>
          <div style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--color-text-secondary)" }}>
            <strong style={{ color: "var(--color-text-primary)" }}>Taxa de conversão: {approvedPct}%</strong>
            <br />
            de valor financeiro em propostas aprovadas.
          </div>
        </div>
      </div>
    </div>
  );
}

function YearTotal({ year, value, color }: { year: string; value: number; color: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: 9, height: 9, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{year}</span>
      <strong style={{ fontSize: 15, color: "var(--color-text-primary)", fontVariantNumeric: "tabular-nums" }}>{formatBRL(value)}</strong>
    </span>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--color-text-secondary)" }}>
      <span style={{ width: 9, height: 9, borderRadius: "50%", background: color }} />
      {label}
    </span>
  );
}

const cardStyle: React.CSSProperties = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: 14,
  padding: 18,
};
const miniLabel: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--color-text-muted)",
};
const labelRow: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between" };
