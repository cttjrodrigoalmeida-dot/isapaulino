import { useEffect, useState, useCallback } from "react";
import { api, ApiError, type BriefingSummary } from "./api";
import { groupByYear } from "./grouping";
import { nextProposalNumber } from "../components/proposal/proposalNumber";
import styles from "./Admin.module.css";

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
      // Briefing duplicado recebe um número novo (único). O vínculo com a
      // proposta original (proposalNumber) é mantido para reaproveitar a estrutura.
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

      {loading ? (
        <div className={styles.loading}>Carregando…</div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>
          Nenhum briefing ainda. Clique em <strong>“+ Novo briefing”</strong> para começar.
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
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Nº</th>
                      <th>Título</th>
                      <th>Proposta</th>
                      <th>Status</th>
                      <th>Respostas</th>
                      <th style={{ textAlign: "right" }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.items.map((b) => (
                      <tr key={b.number}>
                        <td className={styles.rowNumber}>{b.number}</td>
                        <td>{b.title || "—"}</td>
                        <td>{b.proposalNumber || "—"}</td>
                        <td>
                          <span className={`${styles.badge} ${b.status === "published" ? styles.badgePublished : styles.badgeDraft}`}>
                            {b.status === "published" ? "Publicado" : "Rascunho"}
                          </span>
                        </td>
                        <td>
                          <button
                            className={`${styles.btn} ${styles.btnGhost}`}
                            onClick={() => onResponses(b.number)}
                            disabled={!b.responseCount}
                          >
                            {b.responseCount || 0} resposta{b.responseCount === 1 ? "" : "s"}
                          </button>
                        </td>
                        <td>
                          <div className={styles.rowActions}>
                            {b.status === "published" && (
                              <a className={`${styles.btn} ${styles.btnGhost}`} href={`/briefing/${b.number}`} target="_blank" rel="noopener noreferrer">Ver</a>
                            )}
                            <button className={styles.btn} onClick={() => onEdit(b.number)}>Editar</button>
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
                    ))}
                  </tbody>
                </table>
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
