import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  BarChart, Bar, LabelList, Tooltip,
} from "recharts";
import RadialGauge from "./RadialGauge";
import ClientSheet from "./ClientSheet";
import { api, ApiError, type ClientPanorama as Panorama, type ClientPanoramaProject, type ClientPanoramaBriefing, type ClientPanoramaHistory } from "./api";
import { formatBRL, formatBRLShort, formatDate } from "./dashboard/format";
import { formatPhone, formatCpfCnpj } from "./validation";
import { AvatarSVG, avatarById } from "../avatars";
import { eventTypeMeta } from "../projectEvents";
import styles from "./Admin.module.css";

// `blue` na verdade é ROXO (a pedido) — mantido o nome da chave por simplicidade.
// Verde/vermelho reservados p/ positivo/negativo (cores canônicas dos selos).
// `blue` = roxo #8b5cf6 (a cor de "concluído", mantida a pedido). Barras/linhas
// neutras usam `slate` (cinza).
const C = { green: "#4ade80", amber: "#b07a16", blue: "#8b5cf6", red: "#f0506e", slate: "#7c8698" };
const SOFT = {
  green: "rgba(74,222,128,0.12)", amber: "rgba(176,122,22,0.12)",
  blue: "rgba(139,92,246,0.12)", red: "rgba(240,80,110,0.12)", slate: "rgba(124,134,152,0.14)",
};
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

type Situacao = "ativo" | "concluido" | "cancelado" | "andamento";
const SIT_META: Record<Situacao, { label: string; color: string; soft: string }> = {
  ativo: { label: "Ativo", color: C.green, soft: SOFT.green },
  concluido: { label: "Concluído", color: C.blue, soft: SOFT.blue },
  cancelado: { label: "Cancelado", color: C.red, soft: SOFT.red },
  andamento: { label: "Em andamento", color: C.amber, soft: SOFT.amber },
};

// Situação do briefing (para a aba Briefings).
const BRIEF_META = {
  respondido: { label: "Respondido", color: C.green, soft: SOFT.green },
  aguardando: { label: "Aguardando", color: C.amber, soft: SOFT.amber },
  cancelado: { label: "Cancelado", color: C.red, soft: SOFT.red },
} as const;
function briefSit(b: ClientPanoramaBriefing): keyof typeof BRIEF_META {
  if (b.status === "cancelled") return "cancelado";
  return b.responseCount > 0 ? "respondido" : "aguardando";
}

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
  const [tab, setTab] = useState<"resumo" | "projetos" | "briefings" | "contratos" | "historico" | "planilha">("resumo");

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
    const mains = projects.filter((p) => p.kind !== "aditivo");
    const counts = { ativo: 0, concluido: 0, cancelado: 0, andamento: 0 };
    for (const p of mains) counts[situacaoOf(p)]++;
    const contratado = projects.filter((p) => p.status === "signed").reduce((s, p) => s + (p.value ?? 0), 0);

    // Evolução mensal (valor assinado) do ano do contrato assinado mais recente.
    const signed = projects.filter((p) => p.status === "signed" && p.signedAt);
    const year = signed.length
      ? Math.max(...signed.map((p) => new Date(p.signedAt!).getFullYear()))
      : new Date().getFullYear();
    const arr = Array(12).fill(0);
    for (const p of signed) {
      const d = new Date(p.signedAt!);
      if (d.getFullYear() === year) arr[d.getMonth()] += p.value ?? 0;
    }
    const evo = MONTHS.map((name, i) => ({ name, value: arr[i] }));

    // Top projetos por valor (principais).
    const top = [...mains]
      .filter((p) => (p.value ?? 0) > 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
      .slice(0, 5)
      .map((p) => ({ name: p.projectName || p.title || `Nº ${p.number}`, value: p.value ?? 0 }));

    return { projects, mains, counts, contratado, total: mains.length, evo, evoYear: year, top };
  }, [data]);

  if (loading) return <div className={styles.container}><div className={styles.loading}>Carregando…</div></div>;
  if (error || !data) return <div className={styles.container}><div className={styles.error}>{error ?? "Cliente não encontrado."}</div></div>;

  const cl = data.client;
  const donut = ([
    ["ativo", m.counts.ativo], ["concluido", m.counts.concluido],
    ["andamento", m.counts.andamento], ["cancelado", m.counts.cancelado],
  ] as [Situacao, number][]).filter(([, v]) => v > 0).map(([k, v]) => ({ name: SIT_META[k].label, value: v, color: SIT_META[k].color }));

  const clienteDesde = cl.createdAt ? new Date(cl.createdAt).toLocaleDateString("pt-BR") : null;

  return (
    <div className={styles.container}>
      {/* ── Cabeçalho ── */}
      <div className={styles.pageHead}>
        <div className={styles.clientNameCell} style={{ gap: 16 }}>
          <span className={styles.clientAvatar} style={{ width: 60, height: 60, fontSize: 20 }}>
            {avatarById(cl.avatar) ? <AvatarSVG id={cl.avatar} size={60} /> : cl.photoUrl ? <img src={cl.photoUrl} alt={cl.name} /> : initials(cl.name)}
          </span>
          <div>
            <div className={styles.pageTitle} style={{ marginBottom: 4 }}>{cl.name}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {cl.email && <Chip>{cl.email}</Chip>}
              {cl.phone && <Chip>{formatPhone(cl.phone)}</Chip>}
              {(cl.city || cl.state) && <Chip>{[cl.city, cl.state].filter(Boolean).join("/")}</Chip>}
              {cl.cpfCnpj && <Chip>{formatCpfCnpj(cl.cpfCnpj)}</Chip>}
              <Chip color={cl.accessEnabled ? C.green : C.slate}>{cl.accessEnabled ? "Acesso liberado" : "Sem acesso"}</Chip>
              {clienteDesde && <Chip>Cliente desde {clienteDesde}</Chip>}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className={styles.btn} onClick={() => onEdit(cl.id)}>Editar cadastro</button>
          <button className={`${styles.btn} ${styles.btnGhost}`} onClick={onBack}>← Voltar</button>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 16 }}>
        <Kpi label="PROJETOS" value={String(m.total)} color={C.slate} soft={SOFT.slate} />
        <Kpi label="ATIVOS" value={String(m.counts.ativo)} color={C.green} soft={SOFT.green} />
        <Kpi label="CONCLUÍDOS" value={String(m.counts.concluido)} color={C.blue} soft={SOFT.blue} />
        <Kpi label="CANCELADOS" value={String(m.counts.cancelado)} color={C.red} soft={SOFT.red} />
        <Kpi label="CONTRATADO" value={formatBRLShort(m.contratado)} color={C.green} soft={SOFT.green} big />
        <Kpi label="A RECEBER" value={formatBRLShort(data.parcelas.aReceber + data.parcelas.atraso)} color={C.amber} soft={SOFT.amber} big />
      </div>

      {/* ── Abas ── */}
      <div className={styles.tabs} style={{ marginBottom: 16 }}>
        {(["resumo", "projetos", "briefings", "contratos", "historico", "planilha"] as const).map((id) => {
          const label = { resumo: "Resumo", projetos: "Projetos", briefings: "Briefings", contratos: "Contratos", historico: "Histórico", planilha: "Planilha" }[id];
          const count = id === "briefings" ? data.briefings.length : id === "historico" ? data.history.length : id === "contratos" || id === "projetos" ? m.projects.length : 0;
          return (
            <button key={id} className={`${styles.tab} ${tab === id ? styles.tabActive : ""}`} onClick={() => setTab(id)}>
              {label}{count > 0 && <span style={{ opacity: 0.6 }}> · {count}</span>}
            </button>
          );
        })}
      </div>

      {/* ── Resumo (financeiro + situação + evolução) ── */}
      {tab === "resumo" && (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 16 }}>
        <div style={card}>
          <PanelTitle title="Resumo financeiro" />
          <MoneyRow label="Total contratado (assinados)" value={m.contratado} color={C.green} strong />
          <MoneyRow label="Parcelas recebidas" value={data.parcelas.recebido} color={C.slate} />
          <MoneyRow label="Parcelas a receber" value={data.parcelas.aReceber} color={C.amber} />
          <MoneyRow label="Parcelas em atraso" value={data.parcelas.atraso} color={C.red} />
          <MoneyRow label="Histórico financeiro (pago)" value={data.hf.pago} color={C.slate} />
          <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 8 }}>
            {data.parcelas.n} parcela{data.parcelas.n === 1 ? "" : "s"} · {data.hf.n} lançamento{data.hf.n === 1 ? "" : "s"} no HF.
          </div>
        </div>

        <div style={card}>
          <PanelTitle title="Projetos por situação" />
          {donut.length === 0 ? <Empty>Sem projetos ainda.</Empty> : (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <RadialGauge data={donut} center={m.total} centerLabel="projetos" size={130} />
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

        <div style={card}>
          <PanelTitle title="Valor contratado por mês" sub={`Contratos assinados em ${m.evoYear}.`} />
          <div style={{ height: 150 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={m.evo} margin={{ top: 6, right: 8, bottom: 0, left: 4 }}>
                <defs>
                  <linearGradient id="cpg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.slate} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={C.slate} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: "var(--color-text-secondary)" }} interval={0} />
                <YAxis tickFormatter={(v) => formatBRLShort(Number(v))} tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: "var(--color-text-muted)" }} width={48} />
                <Tooltip
                  formatter={(v) => [formatBRL(Number(v)), "Assinado"]}
                  contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "var(--color-text-primary)" }} itemStyle={{ color: "var(--color-text-secondary)" }}
                />
                <Area type="monotone" dataKey="value" stroke={C.slate} strokeWidth={2.5} fill="url(#cpg)" dot={{ r: 2, fill: C.slate }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      )}

      {/* ── Projetos + atividades ── */}
      {tab === "projetos" && (
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 1fr)", gap: 16, marginBottom: 16 }}>
        <div style={card}>
          <PanelTitle title="Projetos vinculados" sub="Cada contrato do cliente e sua situação." />
          {m.projects.length === 0 ? <Empty>Nenhum contrato para este cliente ainda.</Empty> : (
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead><tr><th>Nº</th><th>Projeto</th><th>Situação</th><th>Valor</th><th style={{ textAlign: "right" }}>Ações</th></tr></thead>
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
                          <button className={styles.btn} style={{ padding: "4px 10px" }} onClick={() => onOpenHistory(p.id, `${p.number ? `Nº ${p.number} · ` : ""}${p.projectName || p.title || "Projeto"}`, p.status === "signed", cl.name)}>Histórico</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {m.top.length > 1 && (
            <div style={{ height: 150, marginTop: 12 }}>
              <PanelTitle title="Top projetos por valor" />
              <ResponsiveContainer width="100%" height={110}>
                <BarChart data={m.top} layout="vertical" margin={{ top: 0, right: 56, bottom: 0, left: 6 }} barCategoryGap="26%">
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={120} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={20} fill={C.slate}>
                    <LabelList dataKey="value" position="right" formatter={(v) => formatBRLShort(Number(v))} style={{ fontSize: 11, fontWeight: 700, fill: "var(--color-text-primary)" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div style={card}>
          <PanelTitle title="Atividades recentes" sub="Andamento dos projetos." />
          {data.atividades.length === 0 ? (
            <Empty>Nenhum registro de andamento ainda.</Empty>
          ) : (
            <div style={{ display: "grid", gap: 2 }}>
              {data.atividades.map((a, i) => {
                const meta = eventTypeMeta(a.type);
                return (
                  <div key={i} style={{ display: "flex", gap: 12, paddingBottom: 14 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <span style={{ width: 11, height: 11, borderRadius: "50%", background: meta.color, marginTop: 4, flexShrink: 0, boxShadow: `0 0 0 3px ${meta.color}22` }} />
                      {i < data.atividades.length - 1 && <span style={{ flex: 1, width: 2, background: "var(--color-border)", marginTop: 3 }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: meta.color, textTransform: "uppercase", letterSpacing: "0.03em" }}>{meta.label}</span>
                        <span style={{ fontSize: 11.5, color: "var(--color-text-muted)" }}>{formatDate(a.date)}</span>
                      </div>
                      <div style={{ fontSize: 12.5, color: "var(--color-text-primary)", marginTop: 2 }}>{a.description}</div>
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 1 }}>{a.contractTitle}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      )}

      {/* ── Briefings do cliente ── */}
      {tab === "briefings" && (
        <div style={card}>
          <PanelTitle title="Briefings do cliente" sub="Respondidos, aguardando e cancelados." />
          {data.briefings.length === 0 ? <Empty>Nenhum briefing para este cliente ainda.</Empty> : (
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead><tr><th>Nº</th><th>Título</th><th>Situação</th><th>Respostas</th><th style={{ textAlign: "right" }}>Ações</th></tr></thead>
                <tbody>
                  {data.briefings.map((b) => {
                    const bm = BRIEF_META[briefSit(b)];
                    return (
                      <tr key={b.number}>
                        <td className={styles.mono}>{b.number}</td>
                        <td>{b.title || `Briefing Nº ${b.number}`}</td>
                        <td><span style={{ fontSize: 11.5, fontWeight: 600, padding: "3px 10px", borderRadius: 999, color: bm.color, background: bm.soft, border: `1px solid ${bm.color}55` }}>{bm.label}</span></td>
                        <td className={styles.mono}>{b.responseCount}</td>
                        <td style={{ textAlign: "right" }}>
                          <a className={styles.btn} style={{ padding: "4px 10px" }} href={`/briefing/${b.number}`} target="_blank" rel="noopener noreferrer">Abrir</a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Contratos do cliente ── */}
      {tab === "contratos" && (
        <div style={card}>
          <PanelTitle title="Contratos do cliente" sub="Cada contrato/aditivo, valor e situação." />
          {m.projects.length === 0 ? <Empty>Nenhum contrato para este cliente ainda.</Empty> : (
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead><tr><th>Nº</th><th>Projeto</th><th>Situação</th><th>Valor</th><th>Assinado em</th><th style={{ textAlign: "right" }}>Ações</th></tr></thead>
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
                        <td className={styles.mono}>{p.signedAt ? formatDate(p.signedAt) : "—"}</td>
                        <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                          {p.slug && p.status !== "draft" && <a className={styles.btn} style={{ padding: "4px 10px", marginRight: 6 }} href={`/contrato/${p.slug}`} target="_blank" rel="noopener noreferrer">Ver</a>}
                          <button className={styles.btn} style={{ padding: "4px 10px" }} onClick={() => onOpenHistory(p.id, `${p.number ? `Nº ${p.number} · ` : ""}${p.projectName || p.title || "Projeto"}`, p.status === "signed", cl.name)}>Histórico</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Histórico (todos os eventos do projeto, agrupados por projeto) ── */}
      {tab === "historico" && (
        <div style={{ display: "grid", gap: 16 }}>
          {data.history.length === 0 ? (
            <div style={card}><Empty>Nenhum registro de histórico ainda. Abra um projeto e adicione eventos.</Empty></div>
          ) : (() => {
            const groups = new Map<string, ClientPanoramaHistory[]>();
            for (const h of data.history) { const arr = groups.get(h.contractId) || []; arr.push(h); groups.set(h.contractId, arr); }
            return [...groups.entries()].map(([cid, evs]) => {
              const first = evs[0];
              const label = `${first.number ? `Nº ${first.number} · ` : ""}${first.projectName || first.contractTitle || "Projeto"}`;
              const signed = first.contractStatus === "signed";
              return (
                <div key={cid} style={card}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)" }}>{label}</div>
                    <span style={{ fontSize: 11.5, color: "var(--color-text-muted)" }}>{evs.length} registro{evs.length === 1 ? "" : "s"}</span>
                    <span style={{ flex: 1 }} />
                    <button className={styles.btn} onClick={() => onOpenHistory(cid, label, signed, cl.name)}>Gerenciar histórico</button>
                  </div>
                  <div style={{ display: "grid", gap: 2 }}>
                    {evs.map((h, i) => {
                      const meta = eventTypeMeta(h.type);
                      const cats = (h.categories || "").split(",").map((c) => c.trim()).filter(Boolean);
                      return (
                        <div key={h.id} style={{ display: "flex", gap: 12, paddingBottom: 14 }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                            <span style={{ width: 11, height: 11, borderRadius: "50%", background: meta.color, marginTop: 4, flexShrink: 0, boxShadow: `0 0 0 3px ${meta.color}22` }} />
                            {i < evs.length - 1 && <span style={{ flex: 1, width: 2, background: "var(--color-border)", marginTop: 3 }} />}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: meta.color, textTransform: "uppercase", letterSpacing: "0.03em" }}>{meta.label}</span>
                              <span style={{ fontSize: 11.5, color: "var(--color-text-muted)" }}>{formatDate(h.date)}</span>
                              {h.phase && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "var(--color-border)", color: "var(--color-text-secondary)" }}>{h.phase}</span>}
                            </div>
                            <div style={{ fontSize: 12.5, color: "var(--color-text-primary)", marginTop: 2, whiteSpace: "pre-wrap" }}>{h.description}</div>
                            {cats.length > 0 && (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                                {cats.map((cat, j) => <span key={j} style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 999, background: `${meta.color}1e`, color: meta.color, border: `1px solid ${meta.color}44` }}>{cat}</span>)}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* ── Planilha (montada sempre p/ não perder edições ao trocar de aba) ── */}
      <div style={{ display: tab === "planilha" ? "block" : "none" }}>
        <ClientSheet clientId={cl.id} projects={m.mains} />
      </div>
    </div>
  );
}

const card: React.CSSProperties = { background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 14, padding: 18 };

function Chip({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{
      fontSize: 11.5, padding: "3px 10px", borderRadius: 999,
      background: color ? `${color}1e` : "var(--color-border)", color: color ?? "var(--color-text-secondary)",
      border: color ? `1px solid ${color}55` : "1px solid transparent", whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12.5, color: "var(--color-text-muted)" }}>{children}</div>;
}

function PanelTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)" }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Kpi({ label, value, color, soft, big }: { label: string; value: string; color: string; soft: string; big?: boolean }) {
  return (
    <div style={{ ...card, background: soft, border: `1px solid ${color}33`, padding: 15 }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-text-secondary)" }}>{label}</div>
      <div style={{ fontSize: big ? 22 : 28, fontWeight: 700, color: "var(--color-text-primary)", marginTop: 6 }}>{value}</div>
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
