import { useEffect, useMemo, useState, useCallback } from "react";
import { api, ApiError, type ContractSummary, type ContractStatus } from "./api";
import { formatBRL, formatDate } from "./dashboard/format";
import ContractsAnalytics from "./ContractsAnalytics";
import ActionMenu, { type MenuAction } from "./ActionMenu";
import { confirmDialog } from "./confirmDialog";
import { useSort, SortTh, norm, type SortValue } from "./listSort";
import styles from "./Admin.module.css";

// Vencimento = assinatura + vigência (padrão 3 meses); null se não assinado.
function vencimentoDate(c: ContractSummary): Date | null {
  if (c.status !== "signed" || !c.signedAt) return null;
  const d = new Date(c.signedAt);
  d.setMonth(d.getMonth() + (c.vigenciaMeses ?? 3));
  return d;
}

const STATUS_META: Record<ContractStatus, { label: string; cls: string }> = {
  draft: { label: "Rascunho", cls: "badgeSlate" },
  published: { label: "Aguardando assinatura", cls: "badgeAmber" },
  signed: { label: "Assinado", cls: "badgeGreen" },
  cancelled: { label: "Cancelado", cls: "badgeCancelled" },
};

// Ano derivado do número (AANN): "2622" → "2026".
const yearOf = (number: string | null) =>
  number && /^\d{2}/.test(number) ? `20${number.slice(0, 2)}` : "Outros";

type StatusFilter = "todas" | "draft" | "published" | "signed" | "cancelled";
const PAGE_SIZE = 8;

// Ordem de agrupamento por status (ao clicar em "Status").
const STATUS_RANK: Record<string, number> = { published: 0, signed: 1, draft: 2, cancelled: 3 };
// Busca por número, cliente e projeto (título).
function contractMatches(c: ContractSummary, nq: string): boolean {
  return (
    norm(c.contractNumber).includes(nq) ||
    norm(c.clientName).includes(nq) ||
    norm(c.projectName || c.proposalTitle || c.title).includes(nq)
  );
}
function contractSortVal(c: ContractSummary, key: string): SortValue {
  switch (key) {
    case "num": return Number(c.contractNumber) || 0;
    case "cliente": return c.clientName ?? null;
    case "titulo": return c.projectName || c.proposalTitle || c.title || null;
    case "assinado": return c.signedAt ? Date.parse(c.signedAt) : null;
    case "vence": { const d = vencimentoDate(c); return d ? d.getTime() : null; }
    case "valor": return c.value ?? null;
    case "status": return STATUS_RANK[c.status] ?? 9;
    default: return null;
  }
}

export default function ContractsList({
  onNew,
  onNewAditivo,
  onEdit,
  onPayments,
  onDuplicate,
}: {
  onNew: () => void;
  onNewAditivo: (parentId?: string) => void;
  onEdit: (id: string) => void;
  onPayments: (id: string, title: string) => void;
  onDuplicate: (id: string) => void;
}) {
  const [items, setItems] = useState<ContractSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [year, setYear] = useState<string>("");
  const [tab, setTab] = useState<StatusFilter>("todas");
  const [kindFilter, setKindFilter] = useState<"todos" | "principais" | "aditivos">("todos");
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { contracts } = await api.listContracts();
      setItems(contracts);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Anos disponíveis + seleciona o mais recente por padrão.
  const years = useMemo(() => {
    const set = new Set(items.map((c) => yearOf(c.contractNumber)));
    return [...set].sort((a, b) => (a === "Outros" ? 1 : b === "Outros" ? -1 : b.localeCompare(a)));
  }, [items]);
  useEffect(() => {
    if (years.length && !years.includes(year)) setYear(years[0]);
  }, [years, year]);
  useEffect(() => { setPage(1); }, [tab, year, kindFilter]);

  // Filtros
  const yearItems = useMemo(() => items.filter((c) => yearOf(c.contractNumber) === year), [items, year]);
  const filtered = useMemo(() => {
    let arr = tab === "todas" ? yearItems : yearItems.filter((c) => c.status === tab);
    if (kindFilter === "principais") arr = arr.filter((c) => c.kind !== "aditivo");
    else if (kindFilter === "aditivos") arr = arr.filter((c) => c.kind === "aditivo");
    return arr;
  }, [yearItems, tab, kindFilter]);
  // Busca: quando há termo, procura em TODOS os anos/status; senão, usa o filtro atual.
  const nq = norm(q).trim();
  const base = nq ? items.filter((c) => contractMatches(c, nq)) : filtered;
  const { sorted, sort, toggle } = useSort(base, contractSortVal);
  useEffect(() => { setPage(1); }, [sort, nq]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageItems = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Contagens e valores
  const counts = useMemo(() => {
    const m: Record<StatusFilter, number> = { todas: yearItems.length, draft: 0, published: 0, signed: 0, cancelled: 0 };
    for (const c of yearItems) m[c.status] = (m[c.status] || 0) + 1;
    return m;
  }, [yearItems]);

  const remove = async (c: ContractSummary) => {
    if (!(await confirmDialog({ message: `Excluir o contrato "${c.title}"? Esta ação não pode ser desfeita.`, confirmLabel: "Excluir" }))) return;
    setBusy(c.id);
    try {
      await api.deleteContract(c.id);
      setItems((prev) => prev.filter((x) => x.id !== c.id));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Erro ao excluir.");
    } finally { setBusy(null); }
  };

  const checkSignature = async (c: ContractSummary) => {
    setBusy(c.id);
    try {
      const r = await api.refreshSignature(c.id);
      if (r.status === "signed") {
        setItems((prev) => prev.map((x) => (x.id === c.id ? { ...x, status: "signed" } : x)));
        alert("Contrato assinado por todas as partes! ✅");
      } else {
        const pend = r.signers.filter((s) => !s.signed).length;
        const done = r.signers.filter((s) => s.signed).map((s) => s.name || s.email).join(", ");
        alert(`Ainda faltam ${pend} assinatura(s) para concluir.` + (done ? `\nJá assinaram: ${done}` : ""));
      }
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Erro ao consultar a Autentique.");
    } finally { setBusy(null); }
  };


  const cancelC = async (c: ContractSummary) => {
    if (c.status === "cancelled") return;
    if (!(await confirmDialog({ title: "Cancelar contrato", message: `Cancelar o contrato Nº ${c.contractNumber || "—"}? O briefing e a proposta vinculados também serão cancelados.`, confirmLabel: "Cancelar contrato", cancelLabel: "Voltar" }))) return;
    setBusy(c.id);
    try {
      await api.cancelContract(c.id);
      setItems((prev) => prev.map((x) => (x.id === c.id ? { ...x, status: "cancelled" } : x)));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Erro ao cancelar.");
    } finally { setBusy(null); }
  };
  const copyLink = async (url: string) => {
    try { await navigator.clipboard.writeText(url); alert("Link copiado!"); }
    catch { window.prompt("Copie o link:", url); }
  };

  return (
    <div className={styles.container}>
      <div className={styles.pageHead}>
        <div>
          <div className={styles.pageTitle}>Contratos</div>
          <div className={styles.pageHint}>Crie, edite e publique contratos vinculados aos clientes.</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            className={styles.input}
            style={{ width: "auto", minWidth: 210 }}
            placeholder="🔍 Buscar nº, cliente ou projeto"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className={styles.input}
            style={{ width: "auto", minWidth: 120 }}
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value as typeof kindFilter)}
            title="Filtrar por tipo de contrato"
          >
            <option value="todos">Todos os tipos</option>
            <option value="principais">Só principais</option>
            <option value="aditivos">Só aditivos</option>
          </select>
          {years.length > 0 && (
            <select className={styles.input} style={{ width: "auto", minWidth: 110 }} value={year} onChange={(e) => setYear(e.target.value)}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          )}
          <button className={styles.btn} onClick={load} disabled={loading}>Atualizar</button>
          <button className={styles.btn} onClick={() => onNewAditivo()} title="Cria um Termo Aditivo (altera/inclui itens no contrato principal)">+ Termo aditivo</button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={onNew}>+ Novo contrato</button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Abas */}
      {!loading && items.length > 0 && (
        <div className={styles.tabs}>
          {([
            ["todas", "Todos"],
            ["published", "Aguardando assinatura"],
            ["draft", "Rascunhos"],
            ["signed", "Assinados"],
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
          Nenhum contrato ainda. Clique em <strong>"+ Novo contrato"</strong> para começar.
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
                  <SortTh label="Assinado em" k="assinado" sort={sort} onSort={toggle} defaultDir="desc" />
                  <SortTh label="Vence em" k="vence" sort={sort} onSort={toggle} defaultDir="desc" />
                  <SortTh label="Valor" k="valor" sort={sort} onSort={toggle} defaultDir="desc" />
                  <SortTh label="Status" k="status" sort={sort} onSort={toggle} />
                  <th style={{ textAlign: "right" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((c) => {
                  const meta = STATUS_META[c.status];
                  const isPublic = (c.status === "published" || c.status === "signed") && c.slug;
                  return (
                    <tr key={c.id}>
                      <td className={styles.rowNumber}>
                        {c.contractNumber || "—"}
                        {c.kind === "aditivo" && (
                          <span style={{ display: "inline-block", marginLeft: 6, fontSize: 9, fontFamily: "var(--font-mono)", letterSpacing: "0.06em", padding: "2px 6px", borderRadius: 6, color: "#8a5a00", background: "rgba(176,122,22,0.16)", border: "1px solid rgba(176,122,22,0.4)", verticalAlign: "middle" }}>
                            ADITIVO
                          </span>
                        )}
                      </td>
                      <td>{c.clientName || "—"}</td>
                      <td>{c.projectName || c.proposalTitle || c.title}</td>
                      <td className={styles.mono}>{c.signedAt ? formatDate(c.signedAt) : "—"}</td>
                      <td className={styles.mono}>{(() => { const d = vencimentoDate(c); return d ? d.toLocaleDateString("pt-BR") : "—"; })()}</td>
                      <td className={styles.mono}>{c.value != null ? formatBRL(c.value) : "—"}</td>
                      <td><span className={`${styles.badge} ${styles[meta.cls]}`}>{meta.label}</span></td>
                      <td style={{ textAlign: "right" }}>
                        {(() => {
                          const publicUrl = c.slug ? `${location.origin}/contrato/${c.slug}` : "";
                          const acts: MenuAction[] = [
                            { label: "Ver", href: isPublic ? `/contrato/${c.slug}` : undefined, hidden: !isPublic },
                            { label: "Editar", onSelect: () => onEdit(c.id) },
                            { label: "Pagamentos", onSelect: () => onPayments(c.id, c.title) },
                            { label: "Verificar assinatura", onSelect: () => checkSignature(c), disabled: busy === c.id, hidden: !(c.autentiqueDocumentId && c.status !== "signed" && c.status !== "cancelled") },
                            { label: "Duplicar", onSelect: () => onDuplicate(c.id), disabled: busy === c.id },
                            { label: "Copiar link", onSelect: () => copyLink(publicUrl), hidden: !isPublic },
                            { label: "Baixar PDF", href: isPublic ? `/contrato/${c.slug}` : undefined, hidden: !isPublic },
                            { label: "Gerar contrato aditivo", onSelect: () => onNewAditivo(c.id), hidden: c.kind === "aditivo" },
                            { label: "Cancelar", onSelect: () => cancelC(c), disabled: busy === c.id, hidden: c.status === "cancelled" },
                            { label: "Excluir", onSelect: () => remove(c), danger: true, disabled: busy === c.id },
                          ];
                          return <ActionMenu actions={acts} />;
                        })()}
                      </td>
                    </tr>
                  );
                })}
                {pageItems.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: "center", color: "var(--color-text-muted)", padding: 24 }}>{nq ? `Nenhum contrato para "${q}".` : "Nenhum contrato neste filtro."}</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {sorted.length > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, flexWrap: "wrap", gap: 10 }}>
              <span className={styles.pageHint}>
                Mostrando {(page - 1) * PAGE_SIZE + 1} a {Math.min(page * PAGE_SIZE, sorted.length)} de {sorted.length} contrato{sorted.length === 1 ? "" : "s"}{nq ? " (busca em todos os anos)" : ""}
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

          {/* ── Dashboard analítico do ano selecionado (com comparação entre anos) ── */}
          <ContractsAnalytics items={yearItems} year={year} allItems={items} years={years} />
        </>
      )}
    </div>
  );
}
