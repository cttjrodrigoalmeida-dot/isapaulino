import { useEffect, useState, useCallback } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { api, ApiError, type ProposalSummary, type ProposalOutcome } from "./api";
import { formatBRL } from "./dashboard/format";
import { groupByYear } from "./grouping";
import { nextProposalNumber } from "../components/proposal/proposalNumber";
import styles from "./Admin.module.css";

export default function ProposalsList({
  onNew,
  onEdit,
}: {
  onNew: () => void;
  onEdit: (number: string) => void;
}) {
  const [items, setItems] = useState<ProposalSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { proposals } = await api.listProposals();
      setItems(proposals);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (number: string) => {
    if (!confirm(`Excluir a proposta Nº ${number}? Esta ação não pode ser desfeita.`)) return;
    setBusy(number);
    try {
      await api.deleteProposal(number);
      setItems((prev) => prev.filter((p) => p.number !== number));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Erro ao excluir.");
    } finally {
      setBusy(null);
    }
  };

  const duplicate = async (number: string) => {
    setBusy(number);
    try {
      const { proposal } = await api.getProposal(number);
      const clone = structuredClone(proposal);
      clone.number = nextProposalNumber(items.map((p) => p.number));
      await api.createProposal(clone, "draft");
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Erro ao duplicar.");
    } finally {
      setBusy(null);
    }
  };

  const setOutcome = async (number: string, outcome: ProposalOutcome) => {
    setBusy(number);
    try {
      await api.setProposalOutcome(number, outcome);
      setItems((prev) => prev.map((p) => (p.number === number ? { ...p, outcome } : p)));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Erro ao alterar o resultado.");
    } finally {
      setBusy(null);
    }
  };

  const toggleYear = (year: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });

  const groups = groupByYear(items);

  // Faturamento x oportunidades perdidas (por valor).
  const approved = items.filter((p) => p.outcome === "aprovada");
  const lost = items.filter((p) => p.outcome !== "aprovada");
  const approvedValue = approved.reduce((s, p) => s + (p.value || 0), 0);
  const lostValue = lost.reduce((s, p) => s + (p.value || 0), 0);
  const chartData = [
    { name: "Aprovadas", value: approvedValue, fill: "#22c55e" },
    { name: "Não aprovadas", value: lostValue, fill: "#ef4444" },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.pageHead}>
        <div>
          <div className={styles.pageTitle}>Propostas</div>
          <div className={styles.pageHint}>Crie, edite e publique as propostas dos clientes.</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className={styles.btn} onClick={load} disabled={loading}>
            Atualizar
          </button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={onNew}>
            + Nova proposta
          </button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {!loading && items.length > 0 && (
        <div className={styles.card} style={{ marginBottom: 18 }}>
          <div className={styles.cardTitle}>Propostas por valor</div>
          <div className={styles.pageHint} style={{ marginTop: -4, marginBottom: 10 }}>
            Quanto o escritório converteu em vendas x quanto deixou de faturar (oportunidades perdidas).
          </div>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ flex: "1 1 320px", minWidth: 260, height: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 6, right: 16, bottom: 0, left: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={104} tick={{ fontSize: 12, fill: "var(--color-text-secondary)" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: "rgba(127, 127, 127, 0.12)" }}
                    contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 10, fontSize: 12 }}
                    formatter={(v) => [formatBRL(Number(v)), "Valor"]}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {chartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#22c55e" }}>{formatBRL(approvedValue)}</div>
                <div className={styles.pageHint} style={{ margin: 0 }}>Aprovadas · {approved.length}</div>
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#ef4444" }}>{formatBRL(lostValue)}</div>
                <div className={styles.pageHint} style={{ margin: 0 }}>Não aprovadas · {lost.length}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>Carregando…</div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>
          Nenhuma proposta ainda. Clique em <strong>“+ Nova proposta”</strong> para começar.
        </div>
      ) : (
        groups.map((g) => {
          const open = !collapsed.has(g.year);
          return (
            <div key={g.year} className={styles.yearGroup}>
              <button className={styles.yearHead} onClick={() => toggleYear(g.year)}>
                <span className={`${styles.yearCaret} ${open ? styles.yearCaretOpen : ""}`}>
                  <Caret />
                </span>
                <span className={styles.yearLabel}>{g.year}</span>
                <span className={styles.yearCount}>
                  {g.items.length} proposta{g.items.length === 1 ? "" : "s"}
                </span>
              </button>

              {open && (
                <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Nº</th>
                      <th>Cliente</th>
                      <th>Serviço</th>
                      <th>Valor</th>
                      <th>Status</th>
                      <th>Resultado</th>
                      <th style={{ textAlign: "right" }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.items.map((p) => (
                      <tr key={p.number}>
                        <td className={styles.rowNumber}>{p.number}</td>
                        <td>{p.client || "—"}</td>
                        <td>{p.serviceTitle || "—"}</td>
                        <td className={styles.mono}>{p.value ? formatBRL(p.value) : "—"}</td>
                        <td>
                          <span className={`${styles.badge} ${p.status === "published" ? styles.badgePublished : styles.badgeDraft}`}>
                            {p.status === "published" ? "Publicada" : "Rascunho"}
                          </span>
                        </td>
                        <td>
                          <select
                            className={styles.input}
                            style={{ padding: "6px 8px", fontSize: 12, width: "auto", minWidth: 130 }}
                            value={p.outcome}
                            onChange={(e) => setOutcome(p.number, e.target.value as ProposalOutcome)}
                            disabled={busy === p.number}
                          >
                            <option value="aprovada">✓ Aprovada</option>
                            <option value="nao-aprovada">✕ Não aprovada</option>
                          </select>
                        </td>
                        <td>
                          <div className={styles.rowActions}>
                            {p.status === "published" && (
                              <a
                                className={`${styles.btn} ${styles.btnGhost}`}
                                href={`/proposta/${p.number}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Ver
                              </a>
                            )}
                            <button className={styles.btn} onClick={() => onEdit(p.number)}>
                              Editar
                            </button>
                            <button
                              className={`${styles.btn} ${styles.btnGhost}`}
                              onClick={() => duplicate(p.number)}
                              disabled={busy === p.number}
                            >
                              Duplicar
                            </button>
                            <button
                              className={`${styles.btn} ${styles.btnDanger}`}
                              onClick={() => remove(p.number)}
                              disabled={busy === p.number}
                            >
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

function Caret() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}
