import { useEffect, useMemo, useState } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { api, ApiError, type ClientPanorama as Panorama, type ClientPanoramaProject } from "./api";
import { formatBRL } from "./dashboard/format";
import { formatPhone, formatCpfCnpj } from "./validation";
import styles from "./Admin.module.css";

const C = { green: "#2f9e44", amber: "#b07a16", blue: "#2f6fed", red: "#dd5c4e", slate: "#7c8698" };
const SOFT = {
  green: "rgba(47,158,68,0.12)", amber: "rgba(176,122,22,0.12)",
  blue: "rgba(47,111,237,0.12)", red: "rgba(221,92,78,0.12)", slate: "rgba(124,134,152,0.14)",
};

type Situacao = "ativo" | "concluido" | "cancelado" | "andamento";
const SIT_META: Record<Situacao, { label: string; color: string; soft: string }> = {
  ativo: { label: "Ativo", color: C.green, soft: SOFT.green },
  concluido: { label: "Concluído", color: C.blue, soft: SOFT.blue },
  cancelado: { label: "Cancelado", color: C.red, soft: SOFT.red },
  andamento: { label: "Em andamento", color: C.amber, soft: SOFT.amber },
};

// Situação do projeto = assinatura + vigência (padrão 3 meses).
function situacaoOf(p: ClientPanoramaProject): Situacao {
  if (p.status === "cancelled") return "cancelado";
  if (p.status === "signed" && p.signedAt) {
    const d = new Date(p.signedAt);
    d.setMonth(d.getMonth() + (p.vigenciaMeses ?? 3));
    return d.getTime() < Date.now() ? "concluido" : "ativo";
  }
  return "andamento";
}

const initials = (name: string) =>
  (name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";

export default function ClientPanorama({ clientId, onBack, onEdit, onOpenHistory }: {
  clientId: string;
  onBack: () => void;
  onEdit: (id: string) => void;
  onOpenHistory: (contractId: string, projectLabel: string, signed: boolean, clientName: string) => void;
}) {
  const [data, setData] = useState<Panorama | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.clientPanorama(clientId)
      .then((d) => { if (alive) setData(d); })
      .catch((e) => { if (alive) setError(e instanceof ApiError ? e.message : "Erro ao carregar."); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [clientId]);

  const m = useMemo(() => {
    const projects = data?.projects ?? [];
    // Projetos = contratos principais (aditivos entram no financeiro, não na contagem).
    const mains = projects.filter((p) => p.kind !== "aditivo");
    const counts = { ativo: 0, concluido: 0, cancelado: 0, andamento: 0 };
    for (const p of mains) counts[situacaoOf(p)]++;
    const contratado = projects
      .filter((p) => p.status === "signed")
      .reduce((s, p) => s + (p.value ?? 0), 0);
    return { projects, mains, counts, contratado, total: mains.length };
  }, [data]);

  if (loading) return <div className={styles.container}><div className={styles.loading}>Carregando…</div></div>;
  if (error || !data) return <div className={styles.container}><div className={styles.error}>{error ?? "Cliente não encontrado."}</div></div>;

  const cl = data.client;
  const donut = ([
    ["ativo", m.counts.ativo], ["concluido", m.counts.concluido],
    ["andamento", m.counts.andamento], ["cancelado", m.counts.cancelado],
  ] as [Situacao, number][]).filter(([, v]) => v > 0).map(([k, v]) => ({ name: SIT_META[k].label, value: v, color: SIT_META[k].color }));

  return (
    <div className={styles.container}>
      <div className={styles.pageHead}>
        <div className={styles.clientNameCell} style={{ gap: 14 }}>
          <span className={styles.clientAvatar} style={{ width: 52, height: 52, fontSize: 18 }}>
            {cl.photoUrl ? <img src={cl.photoUrl} alt={cl.name} /> : initials(cl.name)}
          </span>
          <div>
            <div className={styles.pageTitle} style={{ marginBottom: 2 }}>{cl.name}</div>
            <div className={styles.pageHint}>
              {[cl.email, cl.phone ? formatPhone(cl.phone) : null, [cl.city, cl.state].filter(Boolean).join("/")].filter(Boolean).join("  ·  ") || "—"}
              {cl.cpfCnpj ? `  ·  ${formatCpfCnpj(cl.cpfCnpj)}` : ""}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className={styles.btn} onClick={() => onEdit(cl.id)}>Editar cadastro</button>
          <button className={`${styles.btn} ${styles.btnGhost}`} onClick={onBack}>← Voltar</button>
        </div>
      </div>

      {/* KPIs de projetos */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 16 }}>
        <Kpi label="PROJETOS" value={m.total} color={C.slate} soft={SOFT.slate} />
        <Kpi label="ATIVOS" value={m.counts.ativo} color={C.green} soft={SOFT.green} />
        <Kpi label="CONCLUÍDOS" value={m.counts.concluido} color={C.blue} soft={SOFT.blue} />
        <Kpi label="EM ANDAMENTO" value={m.counts.andamento} color={C.amber} soft={SOFT.amber} />
        <Kpi label="CANCELADOS" value={m.counts.cancelado} color={C.red} soft={SOFT.red} />
      </div>

      {/* Financeiro + gráfico de situação */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 16 }}>
        <div style={card}>
          <PanelTitle title="Resumo financeiro" />
          <MoneyRow label="Total contratado (assinados)" value={m.contratado} strong color={C.green} />
          <MoneyRow label="Histórico financeiro — pago" value={data.hf.pago} color={C.blue} />
          <MoneyRow label="Histórico financeiro — pendente" value={data.hf.pendente} color={C.amber} />
          <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 8 }}>{data.hf.n} lançamento{data.hf.n === 1 ? "" : "s"} no HF.</div>
        </div>
        <div style={card}>
          <PanelTitle title="Projetos por situação" />
          {donut.length === 0 ? (
            <div style={{ fontSize: 12.5, color: "var(--color-text-muted)" }}>Sem projetos ainda.</div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 130, height: 130, position: "relative" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donut} dataKey="value" innerRadius={40} outerRadius={60} paddingAngle={2} stroke="none">
                      {donut.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "var(--color-text-primary)" }}>{m.total}</div>
                    <div style={{ fontSize: 10, color: "var(--color-text-muted)" }}>projetos</div>
                  </div>
                </div>
              </div>
              <div style={{ display: "grid", gap: 7, flex: 1 }}>
                {donut.map((d) => (
                  <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: d.color, flexShrink: 0 }} />
                    <span style={{ color: "var(--color-text-secondary)", flex: 1 }}>{d.name}</span>
                    <span style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lista de projetos */}
      <div style={card}>
        <PanelTitle title="Projetos vinculados" sub="Cada contrato do cliente e sua situação." />
        {m.projects.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "var(--color-text-muted)" }}>Nenhum contrato para este cliente ainda.</div>
        ) : (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr><th>Nº</th><th>Projeto</th><th>Situação</th><th>Valor</th><th style={{ textAlign: "right" }}>Ações</th></tr>
              </thead>
              <tbody>
                {m.projects.map((p) => {
                  const sit = SIT_META[situacaoOf(p)];
                  const isAditivo = p.kind === "aditivo";
                  return (
                    <tr key={p.id}>
                      <td className={styles.mono}>
                        {p.number || "—"}
                        {isAditivo && <span style={{ marginLeft: 6, fontSize: 9, fontFamily: "var(--font-mono)", padding: "2px 6px", borderRadius: 6, color: "#8a5a00", background: SOFT.amber, border: `1px solid ${C.amber}66` }}>ADITIVO</span>}
                      </td>
                      <td>{p.projectName || p.title || "—"}</td>
                      <td><span style={{ fontSize: 11.5, fontWeight: 600, padding: "3px 10px", borderRadius: 999, color: sit.color, background: sit.soft, border: `1px solid ${sit.color}55` }}>{sit.label}</span></td>
                      <td className={styles.mono}>{p.value != null ? formatBRL(p.value) : "—"}</td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: 6, justifyContent: "flex-end" }}>
                          <button
                            className={styles.btn}
                            style={{ padding: "4px 10px" }}
                            onClick={() => onOpenHistory(p.id, `${p.number ? `Nº ${p.number} · ` : ""}${p.projectName || p.title || "Projeto"}`, p.status === "signed", cl.name)}
                            title="Histórico (linha do tempo) deste projeto"
                          >
                            Histórico
                          </button>
                          {(p.status === "signed" || p.status === "published") && p.slug && (
                            <a className={`${styles.btn} ${styles.btnGhost}`} href={`/contrato/${p.slug}`} target="_blank" rel="noopener noreferrer">Ver ↗</a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 10 }}>
          Clique em <strong>Histórico</strong> para registrar a linha do tempo do projeto — após a assinatura, ela aparece automaticamente na Área do Cliente.
        </div>
      </div>
    </div>
  );
}

const card: React.CSSProperties = { background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 14, padding: 18 };

function PanelTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)" }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Kpi({ label, value, color, soft }: { label: string; value: number; color: string; soft: string }) {
  return (
    <div style={{ ...card, background: soft, border: `1px solid ${color}33`, padding: 16 }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-text-secondary)" }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 700, color: "var(--color-text-primary)", marginTop: 6 }}>{value}</div>
    </div>
  );
}

function MoneyRow({ label, value, color, strong }: { label: string; value: number; color: string; strong?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid var(--color-border)" }}>
      <span style={{ fontSize: 12.5, color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: 7 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />{label}
      </span>
      <span style={{ fontSize: strong ? 16 : 14, fontWeight: strong ? 700 : 600, color: "var(--color-text-primary)", fontVariantNumeric: "tabular-nums" }}>{formatBRL(value)}</span>
    </div>
  );
}
