import { useEffect, useMemo, useState, useCallback } from "react";
import { api, ApiError, type BriefingSummary } from "./api";
import { nextProposalNumber } from "../components/proposal/proposalNumber";
import BriefingsAnalytics from "./BriefingsAnalytics";
import ActionMenu, { type MenuAction } from "./ActionMenu";
import { confirmDialog } from "./confirmDialog";
import styles from "./Admin.module.css";

// Ano derivado do número (AANN): "2624" → "2026".
const yearOf = (number: string) => (/^\d{2}/.test(number) ? `20${number.slice(0, 2)}` : "Outros");

type StatusFilter = "todas" | "responded" | "awaiting" | "cancelled";
const PAGE_SIZE = 8;

const STATUS_META: Record<"responded" | "awaiting" | "cancelled", { label: string; cls: string }> = {
  responded: { label: "Respondido", cls: "badgeGreen" },
  awaiting: { label: "Aguardando respostas", cls: "badgeAmber" },
  cancelled: { label: "Cancelado", cls: "badgeCancelled" },
};

function getStatus(b: BriefingSummary): "responded" | "awaiting" | "cancelled" {
  if (b.status === "cancelled") return "cancelled";
  if (b.responseCount > 0) return "responded";
  return "awaiting";
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("pt-BR"); } catch { return iso.slice(0, 10); }
}

export default function BriefingsList({
  onNew, onEdit, onResponses,
}: {
  onNew: () => void; onEdit: (number: string) => void; onResponses: (number: string) => void;
}) {
  const [items, setItems] = useState<BriefingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [year, setYear] = useState<string>("");
  const [tab, setTab] = useState<StatusFilter>("todas");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { const { briefings } = await api.listBriefings(); setItems(briefings); }
    catch (err) { setError(err instanceof ApiError ? err.message : "Erro ao carregar."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Anos
  const years = useMemo(() => {
    const set = new Set(items.map((b) => yearOf(b.number)));
    return [...set].sort((a, b) => (a === "Outros" ? 1 : b === "Outros" ? -1 : b.localeCompare(a)));
  }, [items]);
  useEffect(() => { if (years.length && !years.includes(year)) setYear(years[0]); }, [years, year]);
  useEffect(() => { setPage(1); }, [tab, year]);

  // Filtros
  const yearItems = useMemo(() => items.filter((b) => yearOf(b.number) === year), [items, year]);
  const filtered = useMemo(() => {
    if (tab === "todas") return yearItems;
    return yearItems.filter((b) => getStatus(b) === tab);
  }, [yearItems, tab]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Contagens
  const counts = useMemo(() => {
    let responded = 0, awaiting = 0, cancelled = 0;
    for (const b of yearItems) {
      const s = getStatus(b);
      if (s === "responded") responded++;
      else if (s === "cancelled") cancelled++;
      else awaiting++;
    }
    return { todas: yearItems.length, responded, awaiting, cancelled };
  }, [yearItems]);

  const remove = async (number: string) => {
    if (!(await confirmDialog({ message: `Excluir o briefing Nº ${number}? Esta ação não pode ser desfeita.`, confirmLabel: "Excluir" }))) return;
    setBusy(number);
    try { await api.deleteBriefing(number); setItems((prev) => prev.filter((b) => b.number !== number)); }
    catch (err) { alert(err instanceof ApiError ? err.message : "Erro ao excluir."); }
    finally { setBusy(null); }
  };

  const duplicate = async (number: string) => {
    setBusy(number);
    try {
      const { briefing } = await api.getBriefing(number);
      const clone = structuredClone(briefing);
      clone.number = nextProposalNumber(items.map((b) => b.number));
      await api.createBriefing(clone, "draft");
      await load();
    } catch (err) { alert(err instanceof ApiError ? err.message : "Erro ao duplicar."); }
    finally { setBusy(null); }
  };

  const cancelB = async (b: BriefingSummary) => {
    if (getStatus(b) === "cancelled") return;
    if (!(await confirmDialog({ title: "Cancelar briefing", message: `Cancelar o briefing Nº ${b.number}?`, confirmLabel: "Cancelar briefing", cancelLabel: "Voltar" }))) return;
    setBusy(b.number);
    try {
      await api.cancelBriefing(b.number);
      setItems((prev) => prev.map((x) => (x.number === b.number ? { ...x, status: "cancelled" } : x)));
    } catch (err) { alert(err instanceof ApiError ? err.message : "Erro ao cancelar."); }
    finally { setBusy(null); }
  };
  const copyLink = async (url: string) => {
    try { await navigator.clipboard.writeText(url); alert("Link copiado!"); }
    catch { window.prompt("Copie o link:", url); }
  };

  return (
    <div className={styles.container}>
      <div className={styles.pageHead}>
        <div>
          <div className={styles.pageTitle}>Briefings</div>
          <div className={styles.pageHint}>Cada briefing é vinculado a uma proposta (mesmo número).</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {years.length > 0 && (
            <select className={styles.input} style={{ width: "auto", minWidth: 110 }} value={year} onChange={(e) => setYear(e.target.value)}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          )}
          <button className={styles.btn} onClick={load} disabled={loading}>Atualizar</button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={onNew}>+ Novo briefing</button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Abas */}
      {!loading && items.length > 0 && (
        <div className={styles.tabs}>
          {([
            ["todas", "Todos"],
            ["responded", "Respondidos"],
            ["awaiting", "Aguardando respostas"],
            ["cancelled", "Cancelados"],
          ] as [StatusFilter, string][]).map(([id, label]) => (
            <button key={id} className={`${styles.tab} ${tab === id ? styles.tabActive : ""}`} onClick={() => setTab(id)}>
              {label} <span style={{ opacity: 0.6 }}>· {counts[id]}</span>
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>Carregando…</div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>
          Nenhum briefing ainda. Clique em <strong>"+ Novo briefing"</strong> para começar.
        </div>
      ) : (
        <>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Título</th>
                  <th>Respondido em</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((b) => {
                  const s = getStatus(b);
                  const meta = STATUS_META[s];
                  return (
                    <tr key={b.number}>
                      <td className={styles.rowNumber}>{b.number}</td>
                      <td>{b.projectName || "—"}</td>
                      <td style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                        {s === "responded" && b.lastResponseAt ? fmtDate(b.lastResponseAt) : "—"}
                      </td>
                      <td><span className={`${styles.badge} ${styles[meta.cls]}`}>{meta.label}</span></td>
                      <td style={{ textAlign: "right" }}>
                        {(() => {
                          const pub = b.status === "published";
                          const publicUrl = `${location.origin}/briefing/${b.number}`;
                          const acts: MenuAction[] = [
                            { label: "Ver", href: pub ? `/briefing/${b.number}` : undefined, hidden: !pub },
                            { label: "Editar", onSelect: () => onEdit(b.number) },
                            { label: `Respostas (${b.responseCount || 0})`, onSelect: () => onResponses(b.number) },
                            { label: "Duplicar", onSelect: () => duplicate(b.number), disabled: busy === b.number },
                            { label: "Copiar link", onSelect: () => copyLink(publicUrl), hidden: !pub },
                            { label: "Baixar PDF", href: pub ? `/briefing/${b.number}` : undefined, hidden: !pub },
                            { label: "Cancelar", onSelect: () => cancelB(b), disabled: busy === b.number, hidden: s === "cancelled" },
                            { label: "Excluir", onSelect: () => remove(b.number), danger: true, disabled: busy === b.number },
                          ];
                          return <ActionMenu actions={acts} />;
                        })()}
                      </td>
                    </tr>
                  );
                })}
                {pageItems.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--color-text-muted)", padding: 24 }}>Nenhum briefing neste filtro.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {filtered.length > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, flexWrap: "wrap", gap: 10 }}>
              <span className={styles.pageHint}>
                Mostrando {(page - 1) * PAGE_SIZE + 1} a {Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length} briefing{filtered.length === 1 ? "" : "s"}
              </span>
              {totalPages > 1 && (
                <div style={{ display: "flex", gap: 6 }}>
                  <button className={styles.btn} onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                    <button key={n} className={`${styles.btn} ${n === page ? styles.btnPrimary : ""}`} onClick={() => setPage(n)}>{n}</button>
                  ))}
                  <button className={styles.btn} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
                </div>
              )}
            </div>
          )}

          {/* ── Dashboard analítico do ano selecionado ── */}
          <BriefingsAnalytics items={yearItems} year={year} onSeeDetails={() => { setTab("awaiting"); setPage(1); }} />
        </>
      )}
    </div>
  );
}
