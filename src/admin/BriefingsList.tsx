import { useEffect, useState, useMemo, useCallback } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, Cell } from "recharts";
import { api, ApiError, type BriefingSummary } from "./api";
import { groupByYear } from "./grouping";
import { nextProposalNumber } from "../components/proposal/proposalNumber";
import styles from "./Admin.module.css";
import dash from "./dashboard/Dashboard.module.css";

const STATUS_META: Record<string, { label: string; cls: string }> = {
  draft: { label: "Aguardando respostas", cls: "badgeDraft" },
  published: { label: "Aguardando respostas", cls: "badgeDraft" },
  responded: { label: "Respondido", cls: "badgeSigned" },
  cancelled: { label: "Cancelado", cls: "badgeCancelled" },
};

function getStatus(b: BriefingSummary): "responded" | "draft" | "cancelled" {
  if (b.status === "cancelled") return "cancelled";
  if (b.responseCount > 0) return "responded";
  return "draft";
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return iso.slice(0, 10);
  }
}

export default function BriefingsList({
  onNew,
  onEdit,
  onResponses,
}: {
  onNew: () => void;
  onEdit: (number: string) => void;
  onResponses: (number: string) => void;
}) {
  const [items, setItems] = useState<BriefingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { briefings } = await api.listBriefings();
      setItems(briefings);
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
    if (!confirm(`Excluir o briefing Nº ${number}?`)) return;
    setBusy(number);
    try {
      await api.deleteBriefing(number);
      setItems((prev) => prev.filter((b) => b.number !== number));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Erro ao excluir.");
    } finally {
      setBusy(null);
    }
  };

  const duplicate = async (number: string) => {
    setBusy(number);
    try {
      const { briefing } = await api.getBriefing(number);
      const clone = structuredClone(briefing);
      clone.number = nextProposalNumber(items.map((b) => b.number));
      await api.createBriefing(clone, "draft");
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Erro ao duplicar.");
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

  // ── Dados para gráfico ──
  const chartData = useMemo(() => {
    const responded = items.filter((b) => getStatus(b) === "responded").length;
    const awaiting = items.filter((b) => getStatus(b) === "draft").length;
    const cancelled = items.filter((b) => getStatus(b) === "cancelled").length;
    return [
      { name: "Respondido", value: responded, color: "#2f9e44" },
      { name: "Aguardando", value: awaiting, color: "#d4b065" },
      { name: "Cancelado", value: cancelled, color: "#dd5c4e" },
    ];
  }, [items]);

  return (
    <div className={styles.container}>
      <div className={styles.pageHead}>
        <div>
          <div className={styles.pageTitle}>Briefings</div>
          <div className={styles.pageHint}>Cada briefing é vinculado a uma proposta (mesmo número).</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className={styles.btn} onClick={load} disabled={loading}>Atualizar</button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={onNew}>+ Novo briefing</button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Gráfico de briefings (barras) */}
      {!loading && items.length > 0 && (
        <div className={`${dash.grid} ${dash.cols3}`} style={{ marginBottom: 24 }}>
          <div className={dash.card} style={{ gridColumn: "span 3" }}>
            <div className={dash.cardHead}>
              <div>
                <div className={dash.cardTitleX}>Status dos briefings</div>
                <div className={dash.cardSub}>Respondidos · Aguardando respostas · Cancelados</div>
              </div>
            </div>
            <div style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 6, right: 0, bottom: 0, left: 0 }}>
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} />
                  <Tooltip
                    cursor={{ fill: "rgba(127, 127, 127, 0.12)" }}
                    contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 10, fontSize: 12 }}
                    formatter={(v) => [v, "Briefings"]}
                  />
                  <Bar dataKey="value" radius={[5, 5, 0, 0]}>
                    {chartData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>Carregando…</div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>
          Nenhum briefing ainda. Clique em <strong>"+ Novo briefing"</strong> para começar.
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
                  {g.items.length} briefing{g.items.length === 1 ? "" : "s"}
                </span>
              </button>

              {open && (
                <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Nº</th>
                      <th>Título</th>
                      <th>Status</th>
                      <th>Última resposta</th>
                      <th style={{ textAlign: "right" }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.items.map((b) => {
                      const s = getStatus(b);
                      const meta = STATUS_META[s];
                      return (
                        <tr key={b.number}>
                          <td className={styles.rowNumber}>{b.number}</td>
                          <td>{b.title || "—"}</td>
                          <td>
                            <span className={`${styles.badge} ${styles[meta.cls]}`}>
                              {meta.label}
                            </span>
                          </td>
                          <td style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                            {s === "responded" && b.lastResponseAt
                              ? fmtDate(b.lastResponseAt)
                              : "—"}
                          </td>
                          <td>
                            <div className={styles.rowActions}>
                              {b.status === "published" && (
                                <a className={`${styles.btn} ${styles.btnGhost}`} href={`/briefing/${b.number}`} target="_blank" rel="noopener noreferrer">Ver</a>
                              )}
                              <button className={styles.btn} onClick={() => onEdit(b.number)}>Editar</button>
                              <button className={styles.btn} onClick={() => onResponses(b.number)}>
                                {b.responseCount || 0} resposta{b.responseCount === 1 ? "" : "s"}
                              </button>
                              <button
                                className={`${styles.btn} ${styles.btnGhost}`}
                                onClick={() => duplicate(b.number)}
                                disabled={busy === b.number}
                              >
                                Duplicar
                              </button>
                              <button className={`${styles.btn} ${styles.btnDanger}`} onClick={() => remove(b.number)} disabled={busy === b.number}>Excluir</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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
