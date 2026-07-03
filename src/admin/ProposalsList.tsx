import { useEffect, useState, useCallback } from "react";
import { api, ApiError, type ProposalSummary } from "./api";
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

  const toggleYear = (year: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });

  const groups = groupByYear(items);

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
                      <th>Data</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.items.map((p) => (
                      <tr key={p.number}>
                        <td className={styles.rowNumber}>{p.number}</td>
                        <td>{p.client || "—"}</td>
                        <td>{p.serviceTitle || "—"}</td>
                        <td>{p.date || "—"}</td>
                        <td>
                          <span className={`${styles.badge} ${p.status === "published" ? styles.badgePublished : styles.badgeDraft}`}>
                            {p.status === "published" ? "Publicada" : "Rascunho"}
                          </span>
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
