import { useEffect, useMemo, useState, useCallback } from "react";
import { api, ApiError, type ProposalSummary, type ProposalOutcome } from "./api";
import { toast } from "./toast";
import { formatBRL } from "./dashboard/format";
import ProposalsSummary from "./ProposalsSummary";
import ActionMenu, { type MenuAction } from "./ActionMenu";
import { confirmDialog } from "./confirmDialog";
import { useSort, SortTh, dateKey, norm, type SortValue } from "./listSort";
import styles from "./Admin.module.css";

// Ano derivado do número (AANN): "2624" → "2026".
const yearOf = (number: string) => (/^\d{2}/.test(number) ? `20${number.slice(0, 2)}` : "Outros");

type OutcomeFilter = "todas" | "aprovada" | "nao-aprovada";
const PAGE_SIZE = 8;

// Proposta CANCELADA não conta como aprovada (entra como "não aprovada" nos
// resumos/contagens), mesmo que o outcome salvo ainda seja "aprovada".
const isApproved = (p: ProposalSummary) => p.outcome === "aprovada" && p.status !== "cancelled";

// Rank de status p/ agrupar: aprovada → não aprovada → rascunho → cancelada.
function proposalStatusRank(p: ProposalSummary): number {
  if (p.status === "cancelled") return 3;
  if (p.status !== "published") return 2;
  return p.outcome === "aprovada" ? 0 : 1;
}
// Busca por número, cliente e projeto (serviço).
function proposalMatches(p: ProposalSummary, nq: string): boolean {
  return norm(p.number).includes(nq) || norm(p.client).includes(nq) || norm(p.serviceTitle).includes(nq);
}
function proposalSortVal(p: ProposalSummary, key: string): SortValue {
  switch (key) {
    case "num": return Number(p.number) || 0;
    case "cliente": return p.client ?? null;
    case "servico": return p.serviceTitle ?? null;
    case "data": return dateKey(p.date);
    case "valor": return p.value ?? null;
    case "status": return proposalStatusRank(p);
    default: return null;
  }
}

export default function ProposalsList({
  onNew,
  onEdit,
  onDuplicate,
}: {
  onNew: () => void;
  onEdit: (number: string) => void;
  onDuplicate: (number: string) => void;
}) {
  const [items, setItems] = useState<ProposalSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [year, setYear] = useState<string>("");
  const [tab, setTab] = useState<OutcomeFilter>("todas");
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");

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

  // Anos disponíveis + seleciona o mais recente por padrão.
  const years = useMemo(() => {
    const set = new Set(items.map((p) => yearOf(p.number)));
    return [...set].sort((a, b) => (a === "Outros" ? 1 : b === "Outros" ? -1 : b.localeCompare(a)));
  }, [items]);
  useEffect(() => {
    if (years.length && !years.includes(year)) setYear(years[0]);
  }, [years, year]);
  useEffect(() => {
    setPage(1);
  }, [tab, year]);

  const remove = async (number: string) => {
    if (!(await confirmDialog({ message: `Excluir a proposta Nº ${number}? Esta ação não pode ser desfeita.`, confirmLabel: "Excluir" }))) return;
    setBusy(number);
    try {
      await api.deleteProposal(number);
      setItems((prev) => prev.filter((p) => p.number !== number));
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Erro ao excluir.");
    } finally {
      setBusy(null);
    }
  };


  const cancelP = async (p: ProposalSummary) => {
    if (p.status === "cancelled") return;
    if (!(await confirmDialog({ title: "Cancelar proposta", message: `Cancelar a proposta Nº ${p.number}?`, confirmLabel: "Cancelar proposta", cancelLabel: "Voltar" }))) return;
    setBusy(p.number);
    try {
      await api.cancelProposal(p.number);
      setItems((prev) => prev.map((x) => (x.number === p.number ? { ...x, status: "cancelled" } : x)));
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Erro ao cancelar.");
    } finally { setBusy(null); }
  };
  const copyLink = async (url: string) => {
    try { await navigator.clipboard.writeText(url); toast("Link copiado!", { type: "success" }); }
    catch { window.prompt("Copie o link:", url); }
  };

  const toggleOutcome = async (p: ProposalSummary) => {
    const outcome: ProposalOutcome = p.outcome === "aprovada" ? "nao-aprovada" : "aprovada";
    setBusy(p.number);
    try {
      await api.setProposalOutcome(p.number, outcome);
      setItems((prev) => prev.map((x) => (x.number === p.number ? { ...x, outcome } : x)));
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Erro ao alterar o resultado.");
    } finally {
      setBusy(null);
    }
  };

  // Propostas do ano selecionado (base do resumo) e da aba (base da tabela).
  const yearItems = useMemo(() => items.filter((p) => yearOf(p.number) === year), [items, year]);
  const filtered = useMemo(
    () => (tab === "todas" ? yearItems : yearItems.filter((p) => (tab === "aprovada" ? isApproved(p) : !isApproved(p)))),
    [yearItems, tab]
  );
  const nq = norm(q).trim();
  const base = nq ? items.filter((p) => proposalMatches(p, nq)) : filtered;
  const { sorted, sort, toggle } = useSort(base, proposalSortVal);
  useEffect(() => { setPage(1); }, [sort, nq]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageItems = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Três grupos distintos p/ o resumo: aprovadas · não aprovadas · canceladas.
  const isCancelled = (p: ProposalSummary) => p.status === "cancelled";
  const isNotApproved = (p: ProposalSummary) => !isApproved(p) && !isCancelled(p);
  const approvedValue = yearItems.filter(isApproved).reduce((s, p) => s + (p.value || 0), 0);
  const lostValue = yearItems.filter(isNotApproved).reduce((s, p) => s + (p.value || 0), 0);
  const cancelledValue = yearItems.filter(isCancelled).reduce((s, p) => s + (p.value || 0), 0);
  const approvedCount = yearItems.filter(isApproved).length;
  const cancelledCount = yearItems.filter(isCancelled).length;
  const lostCount = yearItems.length - approvedCount - cancelledCount;

  // Agregados por ano (comparação entre anos no resumo).
  const perYear = useMemo(() => {
    const map: Record<string, { approvedValue: number; lostValue: number; cancelledValue: number; approvedCount: number; lostCount: number; cancelledCount: number }> = {};
    for (const p of items) {
      const y = yearOf(p.number);
      const e = map[y] ?? { approvedValue: 0, lostValue: 0, cancelledValue: 0, approvedCount: 0, lostCount: 0, cancelledCount: 0 };
      if (isApproved(p)) { e.approvedValue += p.value || 0; e.approvedCount += 1; }
      else if (isCancelled(p)) { e.cancelledValue += p.value || 0; e.cancelledCount += 1; }
      else { e.lostValue += p.value || 0; e.lostCount += 1; }
      map[y] = e;
    }
    return map;
  }, [items]);

  const counts = {
    todas: yearItems.length,
    aprovada: approvedCount,
    "nao-aprovada": lostCount,
  };

  return (
    <div className={styles.container}>
      <div className={styles.pageHead}>
        <div>
          <div className={styles.pageTitle}>Propostas</div>
          <div className={styles.pageHint}>Crie, edite e publique as propostas dos clientes.</div>
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
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={onNew}>+ Nova proposta</button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Abas: Todas · Aprovadas · Não aprovadas */}
      {!loading && items.length > 0 && (
        <div className={styles.tabs}>
          {([
            ["todas", "Todas"],
            ["aprovada", "Aprovadas"],
            ["nao-aprovada", "Não aprovadas"],
          ] as [OutcomeFilter, string][]).map(([id, label]) => (
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
          Nenhuma proposta ainda. Clique em <strong>“+ Nova proposta”</strong> para começar.
        </div>
      ) : (
        <>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <SortTh label="Nº" k="num" sort={sort} onSort={toggle} />
                  <SortTh label="Cliente" k="cliente" sort={sort} onSort={toggle} />
                  <SortTh label="Serviço" k="servico" sort={sort} onSort={toggle} />
                  <SortTh label="Data" k="data" sort={sort} onSort={toggle} defaultDir="desc" />
                  <SortTh label="Valor" k="valor" sort={sort} onSort={toggle} defaultDir="desc" />
                  <SortTh label="Status" k="status" sort={sort} onSort={toggle} />
                  <th style={{ textAlign: "right" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((p) => (
                  <tr key={p.number}>
                    <td className={styles.rowNumber}>
                      {p.number}
                      {p.status === "cancelled" ? (
                        <div style={{ fontSize: 10, color: "#f0506e", fontFamily: "var(--font-mono)" }}>cancelada</div>
                      ) : p.status !== "published" ? (
                        <div style={{ fontSize: 10, color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}>rascunho</div>
                      ) : null}
                    </td>
                    <td>{p.client || "—"}</td>
                    <td>{p.serviceTitle || "—"}</td>
                    <td>{p.date || "—"}</td>
                    <td className={styles.mono}>{p.value ? formatBRL(p.value) : "—"}</td>
                    <td>
                      {p.status === "cancelled" ? (
                        <span
                          style={{
                            display: "inline-block",
                            fontFamily: "var(--font-mono)",
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            padding: "6px 12px",
                            borderRadius: 999,
                            border: "1px solid rgba(240,80,110,0.5)",
                            color: "#c92d4f",
                            background: "rgba(240,80,110,0.16)",
                          }}
                        >
                          Cancelada
                        </span>
                      ) : (
                        <button
                          onClick={() => toggleOutcome(p)}
                          disabled={busy === p.number}
                          title="Clique para alternar entre Aprovada e Não aprovada"
                          style={{
                            cursor: "pointer",
                            fontFamily: "var(--font-mono)",
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            padding: "6px 12px",
                            borderRadius: 999,
                            border: "1px solid",
                            ...(p.outcome === "aprovada"
                              ? { color: "#4ade80", background: "rgba(74,222,128,0.16)", borderColor: "rgba(74,222,128,0.45)" }
                              : { color: "#d19a2e", background: "rgba(176,122,22,0.16)", borderColor: "rgba(176,122,22,0.5)" }),
                          }}
                        >
                          {p.outcome === "aprovada" ? "Aprovada" : "Não aprovada"}
                        </button>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {(() => {
                        const pub = p.status === "published";
                        const publicUrl = `${location.origin}/proposta/${p.number}`;
                        const acts: MenuAction[] = [
                          { label: "Ver", href: pub ? `/proposta/${p.number}` : undefined, hidden: !pub },
                          { label: "Editar", onSelect: () => onEdit(p.number) },
                          { label: "Duplicar", onSelect: () => onDuplicate(p.number) },
                          { label: "Copiar link", onSelect: () => copyLink(publicUrl), hidden: !pub },
                          { label: "Baixar PDF", href: pub ? `/proposta/${p.number}?pdf=1` : undefined, hidden: !pub },
                          { label: "Cancelar", onSelect: () => cancelP(p), hidden: p.status === "cancelled" },
                          { label: "Excluir", onSelect: () => remove(p.number), danger: true },
                        ];
                        return <ActionMenu actions={acts} />;
                      })()}
                    </td>
                  </tr>
                ))}
                {pageItems.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--color-text-muted)", padding: 24 }}>{nq ? `Nenhuma proposta para "${q}".` : "Nenhuma proposta neste filtro."}</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {sorted.length > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, flexWrap: "wrap", gap: 10 }}>
              <span className={styles.pageHint}>
                Mostrando {(page - 1) * PAGE_SIZE + 1} a {Math.min(page * PAGE_SIZE, sorted.length)} de {sorted.length} proposta{sorted.length === 1 ? "" : "s"}{nq ? " (busca em todos os anos)" : ""}
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

          {/* Resumo por valor (rodapé) */}
          <div style={{ marginTop: 26 }}>
            <ProposalsSummary
              totalValue={approvedValue + lostValue + cancelledValue}
              approvedValue={approvedValue}
              lostValue={lostValue}
              cancelledValue={cancelledValue}
              approvedCount={approvedCount}
              lostCount={lostCount}
              cancelledCount={cancelledCount}
              year={year}
              years={years}
              perYear={perYear}
            />
          </div>
        </>
      )}
    </div>
  );
}
