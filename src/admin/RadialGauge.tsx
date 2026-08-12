import { ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis, Cell } from "recharts";

// Gráfico de ARCOS CONCÊNTRICOS (substitui os antigos donuts/pizza).
// Cada categoria vira um anel próprio, com uma TRILHA de fundo em destaque
// (estilo padrão do sistema: fundo transparente + trilha marcada) e o total no
// centro. Mais espaçoso e visualmente diferente da pizza tradicional.
//
// `max` define o comprimento total do arco: se ausente, usa a soma dos valores
// (distribuição — cada anel é a fatia daquela categoria). Passe 100 p/ %.
export default function RadialGauge({
  data,
  center,
  centerLabel,
  size = 150,
  max,
}: {
  data: { name: string; value: number; color: string }[];
  center: number | string;
  centerLabel: string;
  size?: number;
  max?: number;
}) {
  const total = max ?? (data.reduce((s, d) => s + d.value, 0) || 1);
  return (
    <div style={{ width: size, height: size, position: "relative", flexShrink: 0 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          data={data}
          innerRadius="52%"
          outerRadius="100%"
          startAngle={270}
          endAngle={0}
          barSize={6}
        >
          <PolarAngleAxis type="number" domain={[0, total]} tick={false} axisLine={false} />
          <RadialBar
            dataKey="value"
            cornerRadius={4}
            background={{ fill: "rgba(128, 128, 128, 0.2)" }}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </RadialBar>
        </RadialBarChart>
      </ResponsiveContainer>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: size >= 150 ? 24 : 22, fontWeight: 700, color: "var(--color-text-primary)" }}>{center}</div>
          <div style={{ fontSize: 10, color: "var(--color-text-muted)" }}>{centerLabel}</div>
        </div>
      </div>
    </div>
  );
}
