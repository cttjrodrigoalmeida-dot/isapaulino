import { useEffect, useMemo, useState, useCallback } from "react";
import { api, ApiError, type ProposalSummary, type ProposalOutcome } from "./api";
import { formatBRL } from "./dashboard/format";
import ProposalsSummary from "./ProposalsSummary";
import { nextProposalNumber } from "../components/proposal/proposalNumber";
import ActionMenu, { type MenuAction } from "./ActionMenu";
import styles from "./Admin.module.css";

// Ano derivado do número (AANN): "2624" → "2026".
const yearOf = (number: string) => (/^\d{2}/.test(number) ? `20${number.slice(0, 2)}` : "Outros");

type OutcomeFilter = "todas" | "aprovada" | "nao-aprovada";
const PAGE_SIZE = 8;

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
  const [year, setYear] = useState<string>("");
  const [tab, setTab] = useState<OutcomeFilter>("todas");
  const [page, setPage] = useState(1);

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

  const cancelP = async (p: ProposalSummary) => {
    if (p.status === "cancelled") return;
    if (!confirm(`Cancelar a proposta Nº ${p.number}?`)) return;
    setBusy(p.number);
    try {
      await api.cancelProposal(p.number);
      setItems((prev) => prev.map((x) => (x.number === p.number ? { ...x, status: "cancelled" } : x)));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Erro ao cancelar.");
    } finally { setBusy(null); }
  };
  const copyLink = async (url: string) => {
    try { await navigator.clipboard.writeText(url); alert("Link copiado!"); }
    catch { window.prompt("Copie o link:", url); }
  };

  const toggleOutcome = async (p: ProposalSummary) => {
    const outcome: ProposalOutcome = p.outcome === "aprovada" ? "nao-aprovada" : "aprovada";
    setBusy(p.number);
    try {
      await api.setProposalOutcome(p.number, outcome);
      setItems((prev) => prev.map((x) => (x.number === p.number ? { ...x, outcome } : x)));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Erro ao alterar o resultado.");
    } finally {
      setBusy(null);
    }
  };

  // Propostas do ano selecionado (base do resumo) e da aba (base da tabela).
  const yearItems = useMemo(() => items.filter((p) => yearOf(p.number) === year), [items, year]);
  const filtered = useMemo(
    () => (tab === "todas" ? yearItems : yearItems.filter((p) => (tab === "aprovada" ? p.outcome === "aprovada" : p.outcome !== "aprovada"))),
    [yearItems, tab]
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const approvedValue = yearItems.filter((p) => p.outcome === "aprovada").reduce((s, p) => s + (p.value || 0), 0);
  const lostValue = yearItems.filter((p) => p.outcome !== "aprovada").reduce((s, p) => s + (p.value || 0), 0);
  const approvedCount = yearItems.filter((p) => p.outcome === "aprovada").length;
  const lostCount = yearItems.length - approvedCount;

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
                  <th>Nº</th>
                  <th>Cliente</th>
                  <th>Serviço</th>
                  <th>Data</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((p) => (
                  <tr key={p.number}>
                    <td className={styles.rowNumber}>
                      {p.number}
                      {p.status === "cancelled" ? (
                        <div style={{ fontSize: 10, color: "#dd5c4e", fontFamily: "var(--font-mono)" }}>cancelada</div>
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
                              ? { color: "#4d7c0f", background: "rgba(132,204,22,0.16)", borderColor: "rgba(132,204,22,0.45)" }
                              : { color: "#c92d4f", background: "rgba(240,80,110,0.16)", borderColor: "rgba(240,80,110,0.5)" }),
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
                          { label: "Duplicar", onSelect: () => duplicate(p.number) },
                          { label: "Copiar link", onSelect: () => copyLink(publicUrl), hidden: !pub },
                          { label: "Baixar PDF", href: pub ? `/proposta/${p.number}` : undefined, hidden: !pub },
                          { label: "Cancelar", onSelect: () => cancelP(p), hidden: p.status === "cancelled" },
                          { label: "Excluir", onSelect: () => remove(p.number), danger: true },
                        ];
                        return <ActionMenu actions={acts} />;
                      })()}
                    </td>
                  </tr>
                ))}
                {pageItems.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--color-text-muted)", padding: 24 }}>Nenhuma proposta neste filtro.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {filtered.length > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, flexWrap: "wrap", gap: 10 }}>
              <span className={styles.pageHint}>
                Mostrando {(page - 1) * PAGE_SIZE + 1} a {Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length} proposta{filtered.length === 1 ? "" : "s"}
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
              totalValue={approvedValue + lostValue}
              approvedValue={approvedValue}
              lostValue={lostValue}
              approvedCount={approvedCount}
              lostCount={lostCount}
            />
          </div>
        </>
      )}
    </div>
  );
}
