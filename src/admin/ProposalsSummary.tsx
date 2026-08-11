import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Cell, LabelList } from "recharts";
import { formatBRL, formatBRLShort } from "./dashboard/format";

// Bloco de resumo das propostas por VALOR (aprovadas x não aprovadas).
// Usado na tela de Propostas (rodapé) e no Resumo Geral.
const GREEN = "#4ade80"; // mesmo verde do Financeiro (padronizado)
const PINK = "#f0506e"; // melancia da marca (não aprovadas)

const IcCheck = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#1a2e05" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M5 12.5l4.5 4.5L19 7" />
  </svg>
);
const IcX = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#4a121f" strokeWidth="3" strokeLinecap="round" aria-hidden>
    <path d="M6 6l12 12M18 6L6 18" />
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
  approvedCount,
  lostCount,
}: {
  totalValue: number;
  approvedValue: number;
  lostValue: number;
  approvedCount: number;
  lostCount: number;
}) {
  const total = totalValue || approvedValue + lostValue;
  const pct = (v: number) => (total > 0 ? Math.round((v / total) * 1000) / 10 : 0);
  const approvedPct = pct(approvedValue);
  const lostPct = pct(lostValue);
  const data = [
    { name: "Aprovadas", value: approvedValue },
    { name: "Não aprovadas", value: lostValue },
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
            Comparativo do valor financeiro entre propostas aprovadas e não aprovadas.
          </div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 22, right: 8, bottom: 0, left: 6 }} barCategoryGap="30%">
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "var(--color-text-secondary)" }} />
                <YAxis tickFormatter={(v) => formatBRLShort(Number(v))} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} width={64} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={90}>
                  <Cell fill={GREEN} />
                  <Cell fill={PINK} />
                  <LabelList dataKey="value" position="top" formatter={(v) => formatBRL(Number(v))} style={{ fontSize: 12, fontWeight: 700, fill: "var(--color-text-primary)" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "flex", gap: 18, justifyContent: "center", marginTop: 4 }}>
            <Legend color={GREEN} label="Propostas aprovadas" />
            <Legend color={PINK} label="Propostas não aprovadas" />
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
          <div style={{ ...cardStyle, background: "rgba(240, 80, 110, 0.10)", border: "1px solid rgba(240, 80, 110, 0.35)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={iconBox(PINK)}><IcX /></span>
              <div style={{ flex: 1 }}>
                <div style={{ ...miniLabel, color: "var(--color-text-secondary)" }}>PROPOSTAS NÃO APROVADAS</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "var(--color-text-primary)", marginTop: 3 }}>{formatBRL(lostValue)}</div>
                <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 3 }}>{lostPct}% do valor total · {lostCount} proposta{lostCount === 1 ? "" : "s"}</div>
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
            <strong style={{ color: PINK }}>{formatBRL(lostValue)}</strong> em propostas não foram aprovadas.
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
