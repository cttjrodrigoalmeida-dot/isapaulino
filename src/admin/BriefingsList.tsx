import { useEffect, useMemo, useState, useCallback } from "react";
import { api, ApiError, type BriefingSummary } from "./api";
import { toast } from "./toast";
import BriefingsAnalytics from "./BriefingsAnalytics";
import ActionMenu, { type MenuAction } from "./ActionMenu";
import { confirmDialog } from "./confirmDialog";
import { useSort, SortTh, norm, type SortValue } from "./listSort";
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

// Rank de status p/ agrupar ao clicar em "Status".
const B_STATUS_RANK: Record<string, number> = { responded: 0, awaiting: 1, cancelled: 2 };
// Busca por número, cliente e projeto (título/nome do projeto).
function briefingMatches(b: BriefingSummary, nq: string): boolean {
  return (
    norm(b.number).includes(nq) ||
    norm(b.clientName).includes(nq) ||
    norm(b.projectName || b.proposalTitle).includes(nq)
  );
}
function briefingSortVal(b: BriefingSummary, key: string): SortValue {
  switch (key) {
    case "num": return Number(b.number) || 0;
    case "cliente": return b.clientName ?? null;
    case "titulo": return b.projectName ?? null;
    case "respondido": return b.lastResponseAt ? Date.parse(b.lastResponseAt) : null;
    case "status": return B_STATUS_RANK[getStatus(b)] ?? 9;
    default: return null;
  }
}

export default function BriefingsList({
  onNew, onEdit, onResponses, onDuplicate,
}: {
  onNew: () => void; onEdit: (number: string) => void; onResponses: (number: string) => void; onDuplicate: (number: string) => void;
}) {
  const [items, setItems] = useState<BriefingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [year, setYear] = useState<string>("");
  const [tab, setTab] = useState<StatusFilter>("todas");
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");

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
  const nq = norm(q).trim();
  const base = nq ? items.filter((b) => briefingMatches(b, nq)) : filtered;
  const { sorted, sort, toggle } = useSort(base, briefingSortVal);
  useEffect(() => { setPage(1); }, [sort, nq]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageItems = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
    catch (err) { toast(err instanceof ApiError ? err.message : "Erro ao excluir."); }
    finally { setBusy(null); }
  };


  const cancelB = async (b: BriefingSummary) => {
    if (getStatus(b) === "cancelled") return;
    if (!(await confirmDialog({ title: "Cancelar briefing", message: `Cancelar o briefing Nº ${b.number}?`, confirmLabel: "Cancelar briefing", cancelLabel: "Voltar" }))) return;
    setBusy(b.number);
    try {
      await api.cancelBriefing(b.number);
      setItems((prev) => prev.map((x) => (x.number === b.number ? { ...x, status: "cancelled" } : x)));
    } catch (err) { toast(err instanceof ApiError ? err.message : "Erro ao cancelar."); }
    finally { setBusy(null); }
  };
  const copyLink = async (url: string) => {
    try { await navigator.clipboard.writeText(url); toast("Link copiado!", { type: "success" }); }
    catch { window.prompt("Copie o link:", url); }
  };
  // Bloqueia/desbloqueia a edição do cliente direto na lista (sem abrir o briefing).
  const toggleLock = async (b: BriefingSummary) => {
    const next = !b.locked;
    if (next && !(await confirmDialog({
      title: "Bloquear o briefing?",
      message: `Bloquear o briefing Nº ${b.number}? O cliente passa a só visualizar (você ainda edita por aqui).`,
      confirmLabel: "Bloquear",
      cancelLabel: "Voltar",
      danger: false,
    }))) return;
    setBusy(b.number);
    try {
      await api.lockBriefing(b.number, next);
      setItems((prev) => prev.map((x) => (x.number === b.number ? { ...x, locked: next } : x)));
      toast(next ? "Briefing bloqueado — o cliente só visualiza." : "Briefing desbloqueado — o cliente pode editar.", { type: "success" });
    } catch (err) { toast(err instanceof ApiError ? err.message : "Erro ao alterar o bloqueio."); }
    finally { setBusy(null); }
  };

  return (
    <div className={styles.container}>
      <div className={styles.pageHead}>
        <div>
          <div className={styles.pageTitle}>Briefings</div>
          <div className={styles.pageHint}>Cada briefing é vinculado a uma proposta (mesmo número).</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            className={styles.input}
            style={{ width: "auto", minWidth: 210 }}
            placeholder="🔍 Buscar nº, cliente ou projeto"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
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
                  <SortTh label="Nº" k="num" sort={sort} onSort={toggle} />
                  <SortTh label="Cliente" k="cliente" sort={sort} onSort={toggle} />
                  <SortTh label="Título" k="titulo" sort={sort} onSort={toggle} />
                  <SortTh label="Respondido em" k="respondido" sort={sort} onSort={toggle} defaultDir="desc" />
                  <SortTh label="Status" k="status" sort={sort} onSort={toggle} />
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
                      <td>{b.clientName || "—"}</td>
                      <td>{b.projectName || "—"}</td>
                      <td style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                        {s === "responded" && b.lastResponseAt ? fmtDate(b.lastResponseAt) : "—"}
                      </td>
                      <td><span className={`${styles.badge} ${styles[meta.cls]}`}>{meta.label}</span></td>
                      <td style={{ textAlign: "right" }}>
                        {(() => {
                          const pub = b.status === "published";
                          const publicUrl = `${location.origin}/briefing/${b.number}`;
                          const locked = !!b.locked;
                          const lockColor = locked ? "#f0506e" : "#4ade80"; // vermelho = bloqueado, verde = liberado
                          const lockBtn = (
                            <button
                              type="button"
                              onClick={() => toggleLock(b)}
                              disabled={busy === b.number}
                              title={locked ? "Briefing BLOQUEADO — clique para desbloquear (liberar edição do cliente)" : "Briefing LIBERADO — clique para bloquear (o cliente só visualiza)"}
                              aria-label={locked ? "Desbloquear briefing" : "Bloquear briefing"}
                              style={{
                                display: "inline-flex", alignItems: "center", justifyContent: "center",
                                width: 34, height: 32, marginRight: 8, verticalAlign: "middle",
                                borderRadius: "7px 0 7px 0", cursor: busy === b.number ? "default" : "pointer",
                                background: `${lockColor}1e`, border: `1px solid ${lockColor}`, color: lockColor,
                                fontSize: 15, lineHeight: 1, opacity: busy === b.number ? 0.5 : 1,
                              }}
                            >
                              {locked ? "🔒" : "🔓"}
                            </button>
                          );
                          const acts: MenuAction[] = [
                            { label: "Ver", href: pub ? `/briefing/${b.number}` : undefined, hidden: !pub },
                            { label: "Editar", onSelect: () => onEdit(b.number) },
                            { label: `Respostas (${b.responseCount || 0})`, onSelect: () => onResponses(b.number) },
                            { label: "Duplicar", onSelect: () => onDuplicate(b.number), disabled: busy === b.number },
                            { label: "Copiar link", onSelect: () => copyLink(publicUrl), hidden: !pub },
                            { label: "Baixar PDF", href: pub ? `/briefing/${b.number}` : undefined, hidden: !pub },
                            { label: "Cancelar", onSelect: () => cancelB(b), disabled: busy === b.number, hidden: s === "cancelled" },
                            { label: "Excluir", onSelect: () => remove(b.number), danger: true, disabled: busy === b.number },
                          ];
                          return (
                            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "flex-end" }}>
                              {lockBtn}
                              <ActionMenu actions={acts} />
                            </span>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })}
                {pageItems.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--color-text-muted)", padding: 24 }}>{nq ? `Nenhum briefing para "${q}".` : "Nenhum briefing neste filtro."}</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {sorted.length > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, flexWrap: "wrap", gap: 10 }}>
              <span className={styles.pageHint}>
                Mostrando {(page - 1) * PAGE_SIZE + 1} a {Math.min(page * PAGE_SIZE, sorted.length)} de {sorted.length} briefing{sorted.length === 1 ? "" : "s"}{nq ? " (busca em todos os anos)" : ""}
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
          <BriefingsAnalytics items={yearItems} year={year} allItems={items} years={years} onSeeDetails={() => { setTab("awaiting"); setPage(1); }} />
        </>
      )}
    </div>
  );
}
